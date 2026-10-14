const AuditLog = require('../models/AuditLog');
const logger = require('./logger');
const { GENESIS_HASH, computeAuditHash } = require('./hashChain');

/**
 * Record an audit log entry into the append-only AuditLog collection with cryptographic hash chaining
 */
const recordAuditLog = async ({
  actor,
  action,
  resource,
  resourceId = null,
  before = null,
  after = null,
  req = null,
  ip = null,
  userAgent = null,
  isConfidential = false
}) => {
  try {
    const actorId = actor?._id || actor?.id;
    const actorName = actor?.name || 'System';
    const role = actor?.role || 'system';
    const department = actor?.department || '';

    const clientIp = ip || (req ? req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress : 'unknown');
    const clientUserAgent = userAgent || (req ? req.headers['user-agent'] || 'unknown' : 'unknown');

    // Clean sensitive fields from before / after payloads
    const sanitize = (data) => {
      if (!data) return null;
      const copy = JSON.parse(JSON.stringify(data));
      delete copy.password;
      delete copy.passwordHash;
      delete copy.refreshToken;
      delete copy.passwordResetToken;
      return copy;
    };

    // Find the latest audit log to chain hashes
    const lastLog = await AuditLog.findOne().sort({ timestamp: -1, _id: -1 }).select('hash');
    const previousHash = lastLog && lastLog.hash ? lastLog.hash : GENESIS_HASH;

    const logTimestamp = new Date();
    const sanitizedBefore = sanitize(before);
    const sanitizedAfter = sanitize(after);

    const hash = computeAuditHash({
      actorId,
      action: action.toUpperCase(),
      resource: resource.toLowerCase(),
      resourceId: resourceId ? resourceId.toString() : null,
      timestamp: logTimestamp,
      before: sanitizedBefore,
      after: sanitizedAfter,
      ip: clientIp
    }, previousHash);

    const auditEntry = new AuditLog({
      actorId,
      actorName,
      role,
      department,
      action: action.toUpperCase(),
      resource: resource.toLowerCase(),
      resourceId: resourceId ? resourceId.toString() : null,
      before: sanitizedBefore,
      after: sanitizedAfter,
      ip: clientIp,
      userAgent: clientUserAgent,
      timestamp: logTimestamp,
      previousHash,
      hash,
      isConfidential
    });

    await auditEntry.save();
    logger.debug(`[AuditLog] Chained ${action} on ${resource} (${resourceId}) by ${actorName} [hash: ${hash.substring(0, 10)}...]`);
    return auditEntry;
  } catch (error) {
    logger.error(`[AuditLog Error] Failed to write audit record: ${error.message}`, { stack: error.stack });
    return null;
  }
};

module.exports = { recordAuditLog };
