const crypto = require('crypto');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Generate a canonical SHA-256 hash of an audit log entry chained to previousHash
 */
const computeAuditHash = (logData, previousHash = GENESIS_HASH) => {
  // Normalize fields to ensure deterministic hashing
  const canonicalPayload = {
    actorId: logData.actorId ? String(logData.actorId) : '',
    action: String(logData.action || '').toUpperCase(),
    resource: String(logData.resource || '').toLowerCase(),
    resourceId: logData.resourceId ? String(logData.resourceId) : '',
    timestamp: logData.timestamp ? new Date(logData.timestamp).toISOString() : new Date().toISOString(),
    before: logData.before || null,
    after: logData.after || null,
    ip: String(logData.ip || ''),
    previousHash: previousHash || GENESIS_HASH
  };

  const payloadString = JSON.stringify(canonicalPayload);
  return crypto.createHash('sha256').update(payloadString).digest('hex');
};

module.exports = {
  GENESIS_HASH,
  computeAuditHash
};
