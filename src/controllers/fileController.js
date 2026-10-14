const crypto = require('crypto');
const StoredFile = require('../models/file/StoredFile');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// Allowlist of safe MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// @desc    Generate pre-signed upload URL / token
// @route   POST /api/v1/files/upload-url
// @access  Private
const getUploadUrl = async (req, res, next) => {
  try {
    const filename = req.body.filename || req.body.fileName;
    const mimeType = req.body.mimeType || 'application/pdf';
    const size = req.body.size || req.body.fileSize || 1024;
    const ownerType = req.body.ownerType || 'User';
    const ownerId = req.body.ownerId || req.user._id;
    const category = req.body.category || 'hr_document';
    const confidential = req.body.confidential !== undefined ? req.body.confidential : false;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'filename is required'
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: `MIME type '${mimeType}' is not supported. Allowed formats: PDF, JPEG, PNG, DOCX, XLSX, CSV.`
      });
    }

    if (size > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, message: 'File size exceeds 25 MB limit.' });
    }

    const storageKey = `hospital-storage/${ownerType.toLowerCase()}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${filename}`;
    const uploadToken = crypto.randomBytes(24).toString('hex');
    const uploadUrl = `https://storage.hospital.internal/v1/upload?token=${uploadToken}&key=${encodeURIComponent(storageKey)}`;

    const file = await StoredFile.create({
      ownerType,
      ownerId,
      filename,
      category,
      confidential: !!confidential,
      mimeType,
      size: Number(size),
      storageKey,
      uploadStatus: 'pending',
      uploadedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Pre-signed upload endpoint generated. Upload file and call /confirm.',
      fileId: file._id,
      uploadUrl,
      uploadToken,
      expiresInSeconds: 900,
      data: {
        fileId: file._id,
        uploadUrl,
        uploadToken,
        expiresInSeconds: 900
      }
    });
  } catch (error) {
    logger.error(`[Upload URL Error] ${error.message}`);
    next(error);
  }
};

// @desc    Confirm file upload completion
// @route   POST /api/v1/files/:id/confirm
// @access  Private
const confirmUpload = async (req, res, next) => {
  try {
    const { checksum } = req.body;
    const file = await StoredFile.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ success: false, message: 'File record not found' });
    }

    file.uploadStatus = 'confirmed';
    if (checksum) file.checksum = checksum;
    await file.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPLOAD_FILE',
      resource: 'files',
      resourceId: file._id.toString(),
      isConfidential: file.confidential,
      after: { filename: file.filename, size: file.size, category: file.category },
      req
    });

    res.status(200).json({
      success: true,
      message: 'File upload confirmed and indexed into hospital private storage',
      data: file
    });
  } catch (error) {
    logger.error(`[Confirm Upload Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get pre-signed download URL (checks permission & audits confidential reads)
// @route   GET /api/v1/files/:id/download-url
// @access  Private
const getDownloadUrl = async (req, res, next) => {
  try {
    const file = await StoredFile.findById(req.params.id);
    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Confidential files check: only SA, HR Admin, or uploader
    if (file.confidential) {
      const isPrivileged = req.user.role === 'superadmin' || req.user.department === 'hr';
      const isUploader = file.uploadedBy?.toString() === req.user._id.toString();

      if (!isPrivileged && !isUploader) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: This document is confidential.'
        });
      }

      // Log download of confidential file
      await recordAuditLog({
        actor: req.user,
        action: 'DOWNLOAD_CONFIDENTIAL_FILE',
        resource: 'files',
        resourceId: file._id.toString(),
        isConfidential: true,
        after: { filename: file.filename, category: file.category },
        req
      });
    }

    const downloadToken = crypto.randomBytes(24).toString('hex');
    const signedUrl = `https://storage.hospital.internal/v1/download?token=${downloadToken}&key=${encodeURIComponent(file.storageKey)}`;

    res.status(200).json({
      success: true,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      downloadUrl: signedUrl,
      expiresInSeconds: 300,
      data: {
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        downloadUrl: signedUrl,
        expiresInSeconds: 300
      }
    });
  } catch (error) {
    logger.error(`[Download URL Error] ${error.message}`);
    next(error);
  }
};

// @desc    Soft delete file
// @route   DELETE /api/v1/files/:id
// @access  Private
const deleteFile = async (req, res, next) => {
  try {
    const file = await StoredFile.findById(req.params.id);
    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    file.isDeleted = true;
    file.deletedAt = new Date();
    file.uploadStatus = 'deleted';
    await file.save();

    await recordAuditLog({
      actor: req.user,
      action: 'DELETE_FILE',
      resource: 'files',
      resourceId: file._id.toString(),
      req
    });

    res.status(200).json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    logger.error(`[Delete File Error] ${error.message}`);
    next(error);
  }
};

// @desc    List files by owner
// @route   GET /api/v1/files
// @access  Private
const getFiles = async (req, res, next) => {
  try {
    const filter = { isDeleted: false };
    if (req.query.ownerType) filter.ownerType = req.query.ownerType;
    if (req.query.ownerId) filter.ownerId = req.query.ownerId;
    if (req.query.category) filter.category = req.query.category;

    const files = await StoredFile.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: files.length, data: files });
  } catch (error) {
    logger.error(`[Get Files Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  getUploadUrl,
  confirmUpload,
  getDownloadUrl,
  deleteFile,
  getFiles
};
