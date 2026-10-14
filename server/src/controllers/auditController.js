const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// @desc    List audit logs (Superadmin: all; others: own actions only)
// @route   GET /api/v1/audit-logs or GET /api/audit-logs
// @access  Private (SuperAdmin, Admin, Supervisor)
const getAuditLogs = async (req, res, next) => {
  try {
    const caller = req.user;
    let filter = {};

    if (caller.role !== 'superadmin') {
      // Non-superadmins see only their own actions
      filter.actorId = caller._id;
    }

    if (req.query.action) filter.action = req.query.action.toUpperCase();
    if (req.query.resource) filter.resource = req.query.resource.toLowerCase();
    if (req.query.role) filter.role = req.query.role;

    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('actorId', 'name email role department')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    logger.error(`[Audit Controller Error] getAuditLogs failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get audit log entry by ID
// @route   GET /api/v1/audit-logs/:id or GET /api/audit-logs/:id
// @access  Private
const getAuditLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('actorId', 'name email role department');

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log entry not found' });
    }

    // Access check: only superadmin or the actor who initiated the action
    if (req.user.role !== 'superadmin' && log.actorId?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: You can only view audit logs of your own actions.'
      });
    }

    res.status(200).json({
      success: true,
      data: log
    });
  } catch (error) {
    logger.error(`[Audit Controller Error] getAuditLogById failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Verify cryptographic hash chain integrity of audit logs
// @route   GET /api/v1/audit-logs/verify
// @access  Private (Superadmin only)
const { GENESIS_HASH, computeAuditHash } = require('../utils/hashChain');
const crypto = require('crypto');

const verifyAuditLogs = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.from || req.query.to) {
      filter.timestamp = {};
      if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
      if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
    }

    // Sort in ascending order to walk the chain chronologically
    const logs = await AuditLog.find({ hash: { $exists: true, $ne: null }, ...filter }).sort({ timestamp: 1, _id: 1 });

    let isBroken = false;
    let brokenIndex = -1;
    let expectedHash = null;
    let actualHash = null;

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];
      let prevHash = GENESIS_HASH;

      if (i > 0) {
        prevHash = logs[i - 1].hash;
      } else if (current.previousHash) {
        prevHash = current.previousHash;
      }

      // Check if previousHash link is intact
      if (current.previousHash !== prevHash) {
        isBroken = true;
        brokenIndex = i;
        expectedHash = prevHash;
        actualHash = current.previousHash;
        break;
      }

      // Check if current.hash matches recomputed hash
      const recalculated = computeAuditHash({
        actorId: current.actorId,
        action: current.action,
        resource: current.resource,
        resourceId: current.resourceId,
        timestamp: current.timestamp,
        before: current.before,
        after: current.after,
        ip: current.ip
      }, current.previousHash);

      if (recalculated !== current.hash) {
        isBroken = true;
        brokenIndex = i;
        expectedHash = recalculated;
        actualHash = current.hash;
        break;
      }
    }

    if (isBroken) {
      return res.status(200).json({
        success: false,
        verified: false,
        isValid: false,
        totalChecked: logs.length,
        brokenAtLogId: logs[brokenIndex]._id,
        brokenAtTimestamp: logs[brokenIndex].timestamp,
        reason: `Cryptographic chain broken at record index ${brokenIndex}. Expected ${expectedHash}, found ${actualHash}`
      });
    }

    res.status(200).json({
      success: true,
      verified: true,
      isValid: true,
      totalChecked: logs.length,
      message: 'Cryptographic hash chain is verified and completely intact with 0 breaks.'
    });
  } catch (error) {
    logger.error(`[Audit Verification Error] ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Export signed audit logs for auditors
// @route   POST /api/v1/audit-logs/export
// @access  Private (Superadmin only)
const exportAuditLogs = async (req, res, next) => {
  try {
    const { from, to, resource, role } = req.body;
    let filter = {};
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }
    if (resource) filter.resource = resource.toLowerCase();
    if (role) filter.role = role;

    const logs = await AuditLog.find(filter)
      .populate('actorId', 'name email role department')
      .sort({ timestamp: 1 });

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: req.user._id,
        name: req.user.name,
        role: req.user.role
      },
      count: logs.length,
      logs
    };

    // Digital signature of export bundle
    const signKey = process.env.AUDIT_SIGNING_KEY || 'medipulse-audit-signing-secret';
    const signature = crypto.createHmac('sha256', signKey)
      .update(JSON.stringify(exportPayload))
      .digest('hex');

    res.status(200).json({
      success: true,
      signature,
      algorithm: 'HMAC-SHA256',
      data: { ...exportPayload, signature }
    });
  } catch (error) {
    logger.error(`[Audit Export Error] ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  verifyAuditLogs,
  exportAuditLogs
};

