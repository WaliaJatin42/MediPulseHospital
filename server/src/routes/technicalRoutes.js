const express = require('express');
const {
  createAsset,
  getAssets,
  updateAsset,
  deleteAsset,
  createMaintenance,
  getMaintenanceList,
  updateMaintenance,
  createTicket,
  getTickets,
  updateTicket,
  recordDowntime,
  getDowntimeReports,
  createLicense,
  getLicenses,
  getSystemHealth,
  getSystemBackups,
  getSystemErrors,
  createAccessRequest,
  getAccessRequests,
  executeAccessRequest
} = require('../controllers/technicalController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/technical/assets:
 *   post:
 *     summary: Register IT or biomedical asset
 *     tags: [Technical Module]
 *   get:
 *     summary: List hospital technical assets
 *     tags: [Technical Module]
 */
router.route('/assets')
  .post(authorize('superadmin', 'admin', 'supervisor'), createAsset)
  .get(getAssets);

router.route('/assets/:id')
  .patch(authorize('superadmin', 'admin', 'supervisor'), updateAsset)
  .delete(authorize('superadmin', 'admin', 'supervisor'), deleteAsset);

/**
 * @openapi
 * /api/v1/technical/maintenance:
 *   post:
 *     summary: Schedule preventive/corrective maintenance
 *     tags: [Technical Module]
 *   get:
 *     summary: List maintenance schedules & logs
 *     tags: [Technical Module]
 */
router.route('/maintenance')
  .post(authorize('superadmin', 'admin', 'supervisor'), createMaintenance)
  .get(getMaintenanceList);

router.patch('/maintenance/:id', authorize('superadmin', 'admin', 'supervisor'), updateMaintenance);

/**
 * @openapi
 * /api/v1/technical/tickets:
 *   post:
 *     summary: Submit IT/biomedical issue ticket (any staff)
 *     tags: [Technical Module]
 *   get:
 *     summary: List IT support tickets
 *     tags: [Technical Module]
 */
router.route('/tickets')
  .post(createTicket)
  .get(getTickets);

router.patch('/tickets/:id', authorize('superadmin', 'admin', 'supervisor'), updateTicket);

/**
 * @openapi
 * /api/v1/technical/downtime:
 *   post:
 *     summary: Log clinical or equipment downtime incident
 *     tags: [Technical Module]
 */
router.post('/downtime', authorize('superadmin', 'admin', 'supervisor'), recordDowntime);

/**
 * @openapi
 * /api/v1/technical/reports/downtime:
 *   get:
 *     summary: Equipment downtime analytics report
 *     tags: [Technical Module]
 */
router.get('/reports/downtime', getDowntimeReports);

/**
 * @openapi
 * /api/v1/technical/software-licenses:
 *   post:
 *     summary: Record software/system license
 *     tags: [Technical Module]
 *   get:
 *     summary: View software licenses and seat allocations
 *     tags: [Technical Module]
 */
router.route('/software-licenses')
  .post(authorize('superadmin', 'admin', 'supervisor'), createLicense)
  .get(getLicenses);

/**
 * @openapi
 * /api/v1/technical/system/health:
 *   get:
 *     summary: Check server runtime health, memory, and database connection
 *     tags: [Technical Module]
 */
router.get('/system/health', getSystemHealth);

/**
 * @openapi
 * /api/v1/technical/system/backups:
 *   get:
 *     summary: Check automated database backup status & cloud replication
 *     tags: [Technical Module]
 */
router.get('/system/backups', authorize('superadmin', 'admin', 'supervisor'), getSystemBackups);

/**
 * @openapi
 * /api/v1/technical/system/errors:
 *   get:
 *     summary: Query runtime error logs & unhandled exceptions
 *     tags: [Technical Module]
 */
router.get('/system/errors', authorize('superadmin', 'admin', 'supervisor'), getSystemErrors);

/**
 * @openapi
 * /api/v1/technical/access-requests:
 *   post:
 *     summary: Initiate access provisioning or credential reset (Superadmin or HR initiates)
 *     tags: [Technical Module]
 *   get:
 *     summary: List access support requests
 *     tags: [Technical Module]
 */
router.route('/access-requests')
  .post(authorize('superadmin', 'admin', 'supervisor'), createAccessRequest)
  .get(authorize('superadmin', 'admin', 'supervisor'), getAccessRequests);

/**
 * @openapi
 * /api/v1/technical/access-requests/{id}/execute:
 *   patch:
 *     summary: Execute credential reset or access provisioning via audited flow (Technical executes)
 *     tags: [Technical Module]
 */
router.patch('/access-requests/:id/execute', authorize('superadmin', 'admin', 'supervisor'), executeAccessRequest);

module.exports = router;
