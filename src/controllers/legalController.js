const Contract = require('../models/legal/Contract');
const ContractReview = require('../models/legal/ContractReview');
const LegalCase = require('../models/legal/LegalCase');
const ComplianceLicense = require('../models/legal/ComplianceLicense');
const LegalPolicy = require('../models/legal/LegalPolicy');
const LegalDocument = require('../models/legal/LegalDocument');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper for Legal department access
const isLegalStaff = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return (user.department || '').toLowerCase() === 'legal';
};

const isLegalAdmin = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return user.role === 'admin' && (user.department || '').toLowerCase() === 'legal';
};

// ==================== CONTRACTS ====================

const createContract = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal staff only.' });
    }

    const { title, parties, contractType, startDate, endDate, documentUrl, isConfidential } = req.body;
    const contractNumber = `CTR-${Date.now().toString().slice(-6)}`;

    const contract = await Contract.create({
      contractNumber,
      title: title.trim(),
      parties: Array.isArray(parties) ? parties : [parties],
      contractType: contractType || 'vendor',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      version: 1,
      documentUrl,
      isConfidential: isConfidential !== undefined ? !!isConfidential : true,
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_LEGAL_CONTRACT',
      resource: 'legal_contracts',
      resourceId: contract._id.toString(),
      after: contract.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Contract ${contractNumber} drafted (v1)`, data: contract });
  } catch (error) {
    logger.error(`[Legal Controller Error] createContract failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getContracts = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal staff only.' });
    }

    const contracts = await Contract.find()
      .populate('createdBy', 'name email employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: contracts.length, data: contracts });
  } catch (error) {
    logger.error(`[Legal Controller Error] getContracts failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const updateContract = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal staff only.' });
    }

    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Contract not found' });

    const beforeState = contract.toJSON();
    const { title, parties, endDate, status, documentUrl, incrementVersion } = req.body;

    if (title) contract.title = title.trim();
    if (parties) contract.parties = Array.isArray(parties) ? parties : [parties];
    if (endDate) contract.endDate = new Date(endDate);
    if (status) contract.status = status;
    if (documentUrl) contract.documentUrl = documentUrl;
    if (incrementVersion) contract.version = (contract.version || 1) + 1;

    await contract.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_LEGAL_CONTRACT',
      resource: 'legal_contracts',
      resourceId: contract._id.toString(),
      before: beforeState,
      after: contract.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: `Contract updated (version: ${contract.version})`, data: contract });
  } catch (error) {
    logger.error(`[Legal Controller Error] updateContract failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== CONTRACT REVIEW REQUESTS ====================

const submitContractReview = async (req, res, next) => {
  try {
    const { title, contractDocUrl, urgency } = req.body;
    const reviewNumber = `REV-${Date.now().toString().slice(-6)}`;

    const review = await ContractReview.create({
      reviewNumber,
      requestedBy: req.user._id,
      department: (req.user.department || 'general').toLowerCase(),
      title: title.trim(),
      contractDocUrl,
      urgency: urgency || 'standard',
      status: 'submitted'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'SUBMIT_CONTRACT_REVIEW',
      resource: 'legal_reviews',
      resourceId: review._id.toString(),
      after: review.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Contract review #${reviewNumber} submitted to Legal`, data: review });
  } catch (error) {
    logger.error(`[Legal Controller Error] submitContractReview failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getContractReviews = async (req, res, next) => {
  try {
    let filter = {};
    if (!isLegalStaff(req.user)) {
      filter.department = (req.user.department || '').toLowerCase();
    }

    const reviews = await ContractReview.find(filter)
      .populate('requestedBy', 'name email employeeId department')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    logger.error(`[Legal Controller Error] getContractReviews failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const respondToReview = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal counsel only.' });
    }

    const review = await ContractReview.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review request not found' });

    const { status, legalNotes } = req.body;
    const beforeState = review.toJSON();

    review.status = status || 'cleared';
    review.legalNotes = legalNotes || '';
    review.reviewedBy = req.user._id;
    review.reviewedAt = new Date();
    await review.save();

    await recordAuditLog({
      actor: req.user,
      action: 'LEGAL_REVIEW_DECISION',
      resource: 'legal_reviews',
      resourceId: review._id.toString(),
      before: beforeState,
      after: review.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: `Review #${review.reviewNumber} finalized: ${review.status}`, data: review });
  } catch (error) {
    logger.error(`[Legal Controller Error] respondToReview failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== CASES & LITIGATION ====================

const createCase = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal counsel only.' });
    }

    const { title, courtOrTribunal, opposingParty, caseType, nextHearingDate, externalCounsel, notes } = req.body;
    const caseNumber = `CASE-${Date.now().toString().slice(-6)}`;

    const legalCase = await LegalCase.create({
      caseNumber,
      title: title.trim(),
      courtOrTribunal: courtOrTribunal.trim(),
      opposingParty: opposingParty.trim(),
      caseType: caseType || 'regulatory_compliance',
      status: 'filed',
      nextHearingDate: nextHearingDate ? new Date(nextHearingDate) : null,
      externalCounsel: externalCounsel || '',
      notes: notes || '',
      managedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'FILE_LEGAL_CASE',
      resource: 'legal_cases',
      resourceId: legalCase._id.toString(),
      after: legalCase.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Legal case ${caseNumber} docketed`, data: legalCase });
  } catch (error) {
    logger.error(`[Legal Controller Error] createCase failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getCases = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal counsel only.' });
    }

    const cases = await LegalCase.find()
      .populate('managedBy', 'name email employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    logger.error(`[Legal Controller Error] getCases failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const updateCase = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal counsel only.' });
    }

    const legalCase = await LegalCase.findById(req.params.id);
    if (!legalCase) return res.status(404).json({ success: false, message: 'Legal case not found' });

    const beforeState = legalCase.toJSON();
    const { status, nextHearingDate, externalCounsel, notes, documents } = req.body;

    if (status) legalCase.status = status;
    if (nextHearingDate !== undefined) legalCase.nextHearingDate = nextHearingDate ? new Date(nextHearingDate) : null;
    if (externalCounsel !== undefined) legalCase.externalCounsel = externalCounsel;
    if (notes !== undefined) legalCase.notes = notes;
    if (documents && Array.isArray(documents)) {
      legalCase.documents.push(...documents);
    }

    await legalCase.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_LEGAL_CASE',
      resource: 'legal_cases',
      resourceId: legalCase._id.toString(),
      before: beforeState,
      after: legalCase.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: `Case ${legalCase.caseNumber} updated`, data: legalCase });
  } catch (error) {
    logger.error(`[Legal Controller Error] updateCase failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== COMPLIANCE & LICENSES ====================

const createLicense = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal staff only.' });
    }

    const { licenseName, regulatoryBody, licenseNumber, issueDate, expiryDate, documentUrl } = req.body;

    const license = await ComplianceLicense.create({
      licenseName: licenseName.trim(),
      regulatoryBody: regulatoryBody.trim(),
      licenseNumber: licenseNumber.trim(),
      issueDate: new Date(issueDate),
      expiryDate: new Date(expiryDate),
      documentUrl: documentUrl || '',
      renewalStatus: 'valid',
      managedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'REGISTER_COMPLIANCE_LICENSE',
      resource: 'legal_licenses',
      resourceId: license._id.toString(),
      after: license.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Compliance license ${license.licenseName} registered`, data: license });
  } catch (error) {
    logger.error(`[Legal Controller Error] createLicense failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getLicenses = async (req, res, next) => {
  try {
    const licenses = await ComplianceLicense.find().sort({ expiryDate: 1 });
    res.status(200).json({ success: true, count: licenses.length, data: licenses });
  } catch (error) {
    logger.error(`[Legal Controller Error] getLicenses failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getExpiringLicenses = async (req, res, next) => {
  try {
    const sixtyDaysAhead = new Date();
    sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60);

    const expiring = await ComplianceLicense.find({
      expiryDate: { $lte: sixtyDaysAhead }
    }).sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      alert: 'Licenses requiring regulatory renewal within 60 days',
      count: expiring.length,
      data: expiring
    });
  } catch (error) {
    logger.error(`[Legal Controller Error] getExpiringLicenses failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== POLICIES (Visible to all staff) ====================

const createPolicy = async (req, res, next) => {
  try {
    if (!isLegalAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal Admin only.' });
    }

    const { title, category, version, summary, documentUrl, isPublished } = req.body;
    const policyNumber = `POL-${Date.now().toString().slice(-6)}`;

    const policy = await LegalPolicy.create({
      policyNumber,
      title: title.trim(),
      category: category || 'code_of_conduct',
      version: version || '1.0',
      summary: summary.trim(),
      documentUrl: documentUrl || '',
      isPublished: isPublished !== undefined ? !!isPublished : true,
      publishedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'PUBLISH_HOSPITAL_POLICY',
      resource: 'legal_policies',
      resourceId: policy._id.toString(),
      after: policy.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Hospital policy ${policy.policyNumber} published`, data: policy });
  } catch (error) {
    logger.error(`[Legal Controller Error] createPolicy failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getPolicies = async (req, res, next) => {
  try {
    const policies = await LegalPolicy.find({ isPublished: true }).sort({ category: 1, title: 1 });
    res.status(200).json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    logger.error(`[Legal Controller Error] getPolicies failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== CONFIDENTIAL DOCUMENTS WITH ACCESS CHECK & AUDIT ====================

const uploadDocument = async (req, res, next) => {
  try {
    if (!isLegalStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Legal staff only.' });
    }

    const { title, category, isConfidential, allowedRoles, allowedUsers, fileUrl } = req.body;
    const documentNumber = `DOC-${Date.now().toString().slice(-6)}`;

    const doc = await LegalDocument.create({
      documentNumber,
      title: title.trim(),
      category: category || 'confidential_mou',
      isConfidential: isConfidential !== undefined ? !!isConfidential : true,
      allowedRoles: allowedRoles || ['superadmin', 'admin'],
      allowedUsers: allowedUsers || [],
      fileUrl,
      uploadedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'UPLOAD_LEGAL_DOCUMENT',
      resource: 'legal_documents',
      resourceId: doc._id.toString(),
      after: doc.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Confidential document ${documentNumber} securely archived`, data: doc });
  } catch (error) {
    logger.error(`[Legal Controller Error] uploadDocument failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getDocuments = async (req, res, next) => {
  try {
    const caller = req.user;
    let filter = {};

    if (caller.role !== 'superadmin' && !isLegalStaff(caller)) {
      // Must be explicitly allowed via allowedRoles or allowedUsers
      filter.$or = [
        { isConfidential: false },
        { allowedRoles: caller.role },
        { allowedUsers: caller._id }
      ];
    }

    const docs = await LegalDocument.find(filter)
      .populate('uploadedBy', 'name email employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    logger.error(`[Legal Controller Error] getDocuments failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getDocumentById = async (req, res, next) => {
  try {
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isLegal = isLegalStaff(caller);
    const hasRoleAccess = doc.allowedRoles && doc.allowedRoles.includes(caller.role);
    const hasUserAccess = doc.allowedUsers && doc.allowedUsers.some(u => u.toString() === caller._id.toString());

    if (doc.isConfidential && !isSuperAdmin && !isLegal && !hasRoleAccess && !hasUserAccess) {
      logger.warn(`[Legal Document Guard] Access denied to confidential doc ${doc.documentNumber} for ${caller.email}`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied: This document is classified as confidential and restricted.'
      });
    }

    // Spec note: "log every read of confidential documents"
    if (doc.isConfidential) {
      doc.accessLogs.push({
        user: caller._id,
        userName: caller.name,
        userRole: caller.role,
        accessedAt: new Date(),
        ip: req.ip || 'unknown'
      });
      await doc.save();

      await recordAuditLog({
        actor: caller,
        action: 'READ_CONFIDENTIAL_DOCUMENT',
        resource: 'legal_documents',
        resourceId: doc._id.toString(),
        req
      });
    }

    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    logger.error(`[Legal Controller Error] getDocumentById failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  createContract,
  getContracts,
  updateContract,
  submitContractReview,
  getContractReviews,
  respondToReview,
  createCase,
  getCases,
  updateCase,
  createLicense,
  getLicenses,
  getExpiringLicenses,
  createPolicy,
  getPolicies,
  uploadDocument,
  getDocuments,
  getDocumentById
};
