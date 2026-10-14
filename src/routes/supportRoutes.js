const express = require('express');
const {
  createRequest,
  getRequests,
  updateRequest,
  assignRequest,
  submitFeedback,
  createHousekeepingSchedule,
  getHousekeepingSchedules,
  getMyHousekeepingSchedules,
  createSupplyItem,
  getSupplyItems,
  issueSupplyItem,
  bookTransport,
  getTransportBookings,
  updateTransportBooking,
  getSLAReport,
  getWorkloadReport
} = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/support/requests:
 *   post:
 *     summary: Submit a facility/support request ticket (any staff)
 *     tags: [Support Module]
 *   get:
 *     summary: List support tickets
 *     tags: [Support Module]
 */
router.route('/requests')
  .post(createRequest)
  .get(getRequests);

router.patch('/requests/:id', updateRequest);
router.patch('/requests/:id/assign', authorize('superadmin', 'admin', 'supervisor'), assignRequest);
router.post('/requests/:id/feedback', submitFeedback);

/**
 * @openapi
 * /api/v1/support/schedules/me:
 *   get:
 *     summary: View personal housekeeping cleaning duties
 *     tags: [Support Module]
 */
router.get('/schedules/me', getMyHousekeepingSchedules);

/**
 * @openapi
 * /api/v1/support/schedules:
 *   post:
 *     summary: Create housekeeping task schedule
 *     tags: [Support Module]
 *   get:
 *     summary: List housekeeping schedules
 *     tags: [Support Module]
 */
router.route('/schedules')
  .post(authorize('superadmin', 'admin', 'supervisor'), createHousekeepingSchedule)
  .get(getHousekeepingSchedules);

/**
 * @openapi
 * /api/v1/support/supplies:
 *   post:
 *     summary: Add supply item to catalog
 *     tags: [Support Module]
 *   get:
 *     summary: List hospital supplies inventory
 *     tags: [Support Module]
 */
router.route('/supplies')
  .post(authorize('superadmin', 'admin', 'supervisor'), createSupplyItem)
  .get(getSupplyItems);

router.post('/supplies/:id/issue', authorize('superadmin', 'admin', 'supervisor', 'user'), issueSupplyItem);

/**
 * @openapi
 * /api/v1/support/transport/bookings:
 *   post:
 *     summary: Book hospital logistics vehicle or transport
 *     tags: [Support Module]
 *   get:
 *     summary: List transport bookings
 *     tags: [Support Module]
 */
router.route('/transport/bookings')
  .post(bookTransport)
  .get(getTransportBookings);

router.patch('/transport/bookings/:id', authorize('superadmin', 'admin', 'supervisor'), updateTransportBooking);

/**
 * @openapi
 * /api/v1/support/reports/sla:
 *   get:
 *     summary: Support ticket resolution SLA performance report
 *     tags: [Support Module]
 */
router.get('/reports/sla', authorize('superadmin', 'admin', 'supervisor'), getSLAReport);

/**
 * @openapi
 * /api/v1/support/reports/workload:
 *   get:
 *     summary: Support staff workload distribution report
 *     tags: [Support Module]
 */
router.get('/reports/workload', authorize('superadmin', 'admin', 'supervisor'), getWorkloadReport);

module.exports = router;
