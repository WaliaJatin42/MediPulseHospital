const express = require('express');
const {
  checkInVisitor,
  checkOutVisitor,
  getVisitors,
  reportIncident,
  getIncidents,
  updateIncident,
  createSecurityRoster,
  getMyRoster,
  getSecurityRosters,
  recordPatrol,
  getPatrolLogs,
  logVehicle,
  getVehicles,
  getAccessLogs,
  broadcastAlert,
  getSecurityAlerts
} = require('../controllers/securityController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/security/visitors:
 *   post:
 *     summary: Check-in hospital visitor and issue badge
 *     tags: [Security Module]
 *   get:
 *     summary: List visitor log
 *     tags: [Security Module]
 */
router.route('/visitors')
  .post(authorize('superadmin', 'security:visitors:manage'), checkInVisitor)
  .get(authorize('superadmin', 'security:visitors:read'), getVisitors);

router.patch('/visitors/:id/checkout', authorize('superadmin', 'security:visitors:manage'), checkOutVisitor);

/**
 * @openapi
 * /api/v1/security/incidents:
 *   post:
 *     summary: Report security incident
 *     tags: [Security Module]
 *   get:
 *     summary: List incidents
 *     tags: [Security Module]
 */
router.route('/incidents')
  .post(authorize('superadmin', 'security:incidents:manage', 'security:visitors:read'), reportIncident)
  .get(authorize('superadmin', 'security:incidents:manage', 'security:visitors:read'), getIncidents);

router.patch('/incidents/:id', authorize('superadmin', 'security:incidents:manage'), updateIncident);

/**
 * @openapi
 * /api/v1/security/rosters/me:
 *   get:
 *     summary: Get logged-in guard's assigned security posts
 *     tags: [Security Module]
 */
router.get('/rosters/me', getMyRoster);

/**
 * @openapi
 * /api/v1/security/rosters:
 *   post:
 *     summary: Assign guard to post location
 *     tags: [Security Module]
 *   get:
 *     summary: View guard shift rosters
 *     tags: [Security Module]
 */
router.route('/rosters')
  .post(authorize('superadmin', 'security:incidents:manage'), createSecurityRoster)
  .get(authorize('superadmin', 'security:incidents:manage'), getSecurityRosters);

/**
 * @openapi
 * /api/v1/security/patrols:
 *   post:
 *     summary: Log checkpoint patrol scan
 *     tags: [Security Module]
 *   get:
 *     summary: List patrol log scans
 *     tags: [Security Module]
 */
router.route('/patrols')
  .post(authorize('superadmin', 'security:visitors:manage'), recordPatrol)
  .get(authorize('superadmin', 'security:visitors:read'), getPatrolLogs);

/**
 * @openapi
 * /api/v1/security/vehicles:
 *   post:
 *     summary: Record vehicle gate entry
 *     tags: [Security Module]
 *   get:
 *     summary: List vehicle logs
 *     tags: [Security Module]
 */
router.route('/vehicles')
  .post(authorize('superadmin', 'security:vehicles:manage'), logVehicle)
  .get(authorize('superadmin', 'security:vehicles:manage', 'security:visitors:read'), getVehicles);

/**
 * @openapi
 * /api/v1/security/access-logs:
 *   get:
 *     summary: View access control door scans
 *     tags: [Security Module]
 */
router.get('/access-logs', authorize('superadmin', 'security:incidents:manage'), getAccessLogs);

/**
 * @openapi
 * /api/v1/security/alerts:
 *   post:
 *     summary: Broadcast emergency security alert
 *     tags: [Security Module]
 *   get:
 *     summary: List active security alerts
 *     tags: [Security Module]
 */
router.route('/alerts')
  .post(authorize('superadmin', 'security:alerts:broadcast'), broadcastAlert)
  .get(authorize('superadmin', 'security:visitors:read', 'security:alerts:broadcast'), getSecurityAlerts);

module.exports = router;
