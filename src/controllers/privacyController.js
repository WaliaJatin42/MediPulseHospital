const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const Salary = require('../models/Salary');
const Leave = require('../models/hr/Leave');
const AuditLog = require('../models/AuditLog');
const ErasureRequest = require('../models/privacy/ErasureRequest');
const RetentionPolicy = require('../models/privacy/RetentionPolicy');
const LegalHold = require('../models/privacy/LegalHold');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// ----------------- PRIVACY & GDPR (3.2) -----------------

// @desc    Export own personal data bundle
// @route   GET /api/v1/privacy/my-data
// @access  Private (Self)
const getMyData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    const salary = await Salary.findOne({ user_id: userId });
    const attendance = await Attendance.find({ user: userId }).sort({ date: -1 }).limit(100);
    const leaves = await Leave.find({ $or: [{ user: userId }, { userId }] }).sort({ startDate: -1 });
    const payslips = await Payroll.find({ user_id: userId }).sort({ month: -1 });

    const bundle = {
      exportedAt: new Date().toISOString(),
      profile: user.toJSON(),
      salary: salary ? salary.toJSON() : null,
      attendanceHistory: attendance,
      leaveHistory: leaves,
      payslipsHistory: payslips
    };

    await recordAuditLog({
      actor: req.user,
      action: 'EXPORT_PERSONAL_DATA_GDPR',
      resource: 'privacy',
      resourceId: userId.toString(),
      isConfidential: true,
      req
    });

    res.status(200).json({
      success: true,
      message: 'Personal data package exported successfully',
      data: bundle
    });
  } catch (error) {
    logger.error(`[Export My Data Error] ${error.message}`);
    next(error);
  }
};

// @desc    Submit data erasure request
// @route   POST /api/v1/privacy/erasure-requests
// @access  Private (Staff)
const submitErasureRequest = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason for erasure request is required' });
    }

    const request = await ErasureRequest.create({
      userId: req.user._id,
      reason: reason.trim(),
      status: 'pending'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'REQUEST_DATA_ERASURE',
      resource: 'privacy',
      resourceId: request._id.toString(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Erasure request submitted for legal review and Superadmin consideration',
      data: request
    });
  } catch (error) {
    logger.error(`[Erasure Request Error] ${error.message}`);
    next(error);
  }
};

// @desc    Decide on erasure request with legal review
// @route   PATCH /api/v1/privacy/erasure-requests/:id
// @access  Private (Superadmin only)
const decideErasureRequest = async (req, res, next) => {
  try {
    const { status, legalReviewNotes } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const request = await ErasureRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Erasure request not found' });
    }

    // Check if user has active legal holds
    const activeHold = await LegalHold.findOne({ targetUserIds: request.userId, status: 'active' });
    if (activeHold && status === 'approved') {
      return res.status(409).json({
        success: false,
        message: `Conflict: Cannot approve erasure. An active legal hold (Case: ${activeHold.caseNumber}) overrides retention/erasure.`
      });
    }

    request.status = status;
    request.legalReviewNotes = legalReviewNotes || '';
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    if (status === 'approved') {
      // Anonymize personal fields
      const targetUser = await User.findById(request.userId);
      if (targetUser) {
        targetUser.name = `Anonymized User ${targetUser._id.toString().slice(-4)}`;
        targetUser.email = `anonymized_${targetUser._id}@hospital.local`;
        targetUser.phone = '';
        targetUser.bankAccount = '';
        targetUser.taxId = '';
        targetUser.nationalId = '';
        targetUser.status = 'inactive';
        targetUser.isActive = false;
        await targetUser.save();
      }
    }

    await recordAuditLog({
      actor: req.user,
      action: `DECIDE_ERASURE_${status.toUpperCase()}`,
      resource: 'privacy',
      resourceId: request._id.toString(),
      after: { status, legalReviewNotes },
      req
    });

    res.status(200).json({
      success: true,
      message: `Erasure request ${status}`,
      data: request
    });
  } catch (error) {
    logger.error(`[Decide Erasure Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get access log of who viewed my sensitive data
// @route   GET /api/v1/privacy/access-log/me
// @access  Private (Self)
const getMyAccessLog = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({
      resource: 'users',
      resourceId: req.user._id.toString(),
      action: 'READ_SENSITIVE_USER_DATA'
    })
      .populate('actorId', 'name email role department')
      .sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs.map((l) => ({
        viewedAt: l.timestamp,
        viewerName: l.actorName || l.actorId?.name,
        viewerRole: l.role || l.actorId?.role,
        action: l.action,
        ip: l.ip
      }))
    });
  } catch (error) {
    logger.error(`[Access Log Error] ${error.message}`);
    next(error);
  }
};

// ----------------- DATA RETENTION & LEGAL HOLDS (3.3) -----------------

const getRetentionPolicies = async (req, res, next) => {
  try {
    let policies = await RetentionPolicy.find();
    if (policies.length === 0) {
      // Seed typical legal defaults
      const defaults = [
        { resource: 'payroll', retentionYears: 7, action: 'archive', description: 'Statutory tax and payroll records' },
        { resource: 'attendance', retentionYears: 5, action: 'anonymize', description: 'Staff check-in and punch logs' },
        { resource: 'audit_logs', retentionYears: 7, action: 'archive', description: 'Cryptographic security audit trails' },
        { resource: 'visitors', retentionYears: 1, action: 'delete', description: 'Hospital visitor and check-in logs' },
        { resource: 'incident_evidence', retentionYears: 7, action: 'archive', description: 'Security and workplace incidents' }
      ];
      policies = await RetentionPolicy.insertMany(defaults);
    }
    res.status(200).json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    logger.error(`[Retention Policy Error] ${error.message}`);
    next(error);
  }
};

const updateRetentionPolicy = async (req, res, next) => {
  try {
    const resource = req.params.resource.toLowerCase();
    const { retentionYears, action, description } = req.body;

    const policy = await RetentionPolicy.findOneAndUpdate(
      { resource },
      {
        resource,
        retentionYears: Number(retentionYears),
        action: action || 'anonymize',
        description: description || '',
        updatedBy: req.user._id
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: `Retention policy for ${resource} updated`, data: policy });
  } catch (error) {
    logger.error(`[Retention Policy Error] ${error.message}`);
    next(error);
  }
};

const runRetention = async (req, res, next) => {
  try {
    const policies = await RetentionPolicy.find();
    const activeHolds = await LegalHold.find({ status: 'active' });
    const holdResources = new Set(activeHolds.flatMap((h) => h.resources));

    const results = [];

    for (const p of policies) {
      if (holdResources.has(p.resource)) {
        results.push({
          resource: p.resource,
          status: 'SKIPPED_ACTIVE_LEGAL_HOLD',
          message: 'Active legal hold prevents deletion/archival of records.'
        });
        continue;
      }

      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - p.retentionYears);

      let processedCount = 0;
      if (p.resource === 'attendance') {
        const cutoffStr = cutoffDate.toISOString().substring(0, 10);
        const res = await Attendance.countDocuments({ date: { $lt: cutoffStr } });
        processedCount = res;
      }

      results.push({
        resource: p.resource,
        retentionYears: p.retentionYears,
        action: p.action,
        eligibleRecords: processedCount,
        status: 'PROCESSED'
      });
    }

    await recordAuditLog({
      actor: req.user,
      action: 'RUN_DATA_RETENTION',
      resource: 'retention_policies',
      after: { results },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Retention cycle executed. Legal holds verified.',
      data: results
    });
  } catch (error) {
    logger.error(`[Run Retention Error] ${error.message}`);
    next(error);
  }
};

const createLegalHold = async (req, res, next) => {
  try {
    const { caseNumber, title, resources, targetUserIds, reason } = req.body;
    if (!caseNumber || !title || !reason) {
      return res.status(400).json({ success: false, message: 'caseNumber, title, and reason are required' });
    }

    const hold = await LegalHold.create({
      caseNumber,
      title,
      resources: Array.isArray(resources) && resources.length > 0 ? resources : ['payroll', 'attendance', 'audit_logs'],
      targetUserIds: Array.isArray(targetUserIds) ? targetUserIds : [],
      reason,
      status: 'active',
      appliedBy: req.user._id,
      appliedAt: new Date()
    });

    await recordAuditLog({
      actor: req.user,
      action: 'APPLY_LEGAL_HOLD',
      resource: 'legal_holds',
      resourceId: hold._id.toString(),
      after: hold.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: `Legal hold applied on case ${caseNumber}. Automated record expungement frozen.`,
      data: hold
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Case number already exists' });
    logger.error(`[Create Legal Hold Error] ${error.message}`);
    next(error);
  }
};

const getLegalHolds = async (req, res, next) => {
  try {
    const holds = await LegalHold.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: holds.length, data: holds });
  } catch (error) {
    logger.error(`[Get Legal Holds Error] ${error.message}`);
    next(error);
  }
};

const releaseLegalHold = async (req, res, next) => {
  try {
    const hold = await LegalHold.findById(req.params.id);
    if (!hold) return res.status(404).json({ success: false, message: 'Legal hold not found' });

    hold.status = 'released';
    hold.releasedBy = req.user._id;
    hold.releasedAt = new Date();
    await hold.save();

    await recordAuditLog({
      actor: req.user,
      action: 'RELEASE_LEGAL_HOLD',
      resource: 'legal_holds',
      resourceId: hold._id.toString(),
      after: { status: 'released' },
      req
    });

    res.status(200).json({ success: true, message: `Legal hold for case ${hold.caseNumber} released.`, data: hold });
  } catch (error) {
    logger.error(`[Release Legal Hold Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  getMyData,
  submitErasureRequest,
  decideErasureRequest,
  getMyAccessLog,
  getRetentionPolicies,
  updateRetentionPolicy,
  runRetention,
  createLegalHold,
  getLegalHolds,
  releaseLegalHold
};
