const express = require('express');
const { getAuditLogs, getAuditLogById, verifyAuditLogs, exportAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/audit-logs/verify:
 *   get:
 *     summary: Verify cryptographic hash chain integrity of audit logs (Superadmin only)
 *     tags: [Audit Logging]
 */
router.get('/verify', authorize('superadmin'), verifyAuditLogs);

/**
 * @openapi
 * /api/v1/audit-logs/export:
 *   post:
 *     summary: Cryptographically signed export of audit logs for auditors (Superadmin only)
 *     tags: [Audit Logging]
 */
router.post('/export', authorize('superadmin'), exportAuditLogs);

/**
 * @openapi
 * /api/v1/audit-logs:
 *   get:
 *     summary: View tamper-evident audit logs (Superadmin sees all, staff sees own actions)
 *     tags: [Audit Logging]
 */
router.get('/', authorize('superadmin', 'admin', 'supervisor'), getAuditLogs);

/**
 * @openapi
 * /api/v1/audit-logs/{id}:
 *   get:
 *     summary: View specific audit log entry
 *     tags: [Audit Logging]
 */
router.get('/:id', authorize('superadmin', 'admin', 'supervisor'), getAuditLogById);

module.exports = router;

