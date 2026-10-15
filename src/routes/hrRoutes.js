const express = require('express');
const {
  createHire,
  getHires,
  updateHireStage,
  createHoliday,
  getHolidays,
  addEmployeeDocument,
  initiateOffboarding,
  getHeadcountReport,
  getAttritionReport,
  getAttendanceComplianceReport
} = require('../controllers/hrController');
const { getExpiringLicenses } = require('../controllers/clinicalController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/licenses/expiring', authorize('superadmin', 'hr:hires:read', 'technical:licenses:manage'), getExpiringLicenses);

/**
 * @openapi
 * /api/v1/hr/hires:
 *   post:
 *     summary: Add candidate to hiring pipeline
 *     tags: [HR Module]
 *   get:
 *     summary: List candidates in hiring pipeline
 *     tags: [HR Module]
 */
router.route('/hires')
  .post(authorize('superadmin', 'hr:hires:write'), createHire)
  .get(authorize('superadmin', 'hr:hires:read'), getHires);

router.patch('/hires/:id', authorize('superadmin', 'hr:hires:write'), updateHireStage);

/**
 * @openapi
 * /api/v1/hr/holidays:
 *   post:
 *     summary: Add hospital holiday
 *     tags: [HR Module]
 *   get:
 *     summary: List hospital holidays
 *     tags: [HR Module]
 */
router.route('/holidays')
  .post(authorize('superadmin', 'hr:leaves:manage'), createHoliday)
  .get(getHolidays);

/**
 * @openapi
 * /api/v1/hr/employees/{id}/documents:
 *   post:
 *     summary: Attach staff documents (contracts, ID proofs, certificates)
 *     tags: [HR Module]
 */
router.post('/employees/:id/documents', authorize('superadmin', 'hr:documents:manage'), addEmployeeDocument);

/**
 * @openapi
 * /api/v1/hr/employees/{id}/exit:
 *   post:
 *     summary: Initiate employee exit & clearance checklist
 *     tags: [HR Module]
 */
router.post('/employees/:id/exit', authorize('superadmin', 'hr:offboarding:manage'), initiateOffboarding);

/**
 * @openapi
 * /api/v1/hr/reports/headcount:
 *   get:
 *     summary: Hospital headcount breakdown by department and status
 *     tags: [HR Module]
 */
router.get('/reports/headcount', authorize('superadmin', 'hr:attendance:manage', 'hr:hires:read'), getHeadcountReport);

/**
 * @openapi
 * /api/v1/hr/reports/attrition:
 *   get:
 *     summary: Staff attrition and turnover report
 *     tags: [HR Module]
 */
router.get('/reports/attrition', authorize('superadmin', 'hr:attendance:manage', 'hr:hires:read'), getAttritionReport);

/**
 * @openapi
 * /api/v1/hr/reports/attendance-compliance:
 *   get:
 *     summary: 9-Hour shift attendance compliance report
 *     tags: [HR Module]
 */
router.get('/reports/attendance-compliance', authorize('superadmin', 'hr:attendance:manage'), getAttendanceComplianceReport);

module.exports = router;
