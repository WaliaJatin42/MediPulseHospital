const express = require('express');
const {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  getDepartmentStaff
} = require('../controllers/departmentController');
const { updateDepartmentPolicy } = require('../controllers/clinicalController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.patch('/:id/policy', authorize('superadmin', 'admin'), updateDepartmentPolicy);


/**
 * @openapi
 * /api/v1/departments:
 *   get:
 *     summary: List hospital departments
 *     tags: [Department Management]
 *   post:
 *     summary: Create new department (SuperAdmin only)
 *     tags: [Department Management]
 */
router.route('/')
  .get(getDepartments)
  .post(authorize('superadmin'), createDepartment);

/**
 * @openapi
 * /api/v1/departments/{id}/staff:
 *   get:
 *     summary: List staff members belonging to this department
 *     tags: [Department Management]
 */
router.get('/:id/staff', getDepartmentStaff);

/**
 * @openapi
 * /api/v1/departments/{id}:
 *   get:
 *     summary: Get department details by ID or code
 *     tags: [Department Management]
 *   patch:
 *     summary: Update department metadata (SuperAdmin only)
 *     tags: [Department Management]
 */
router.route('/:id')
  .get(getDepartmentById)
  .patch(authorize('superadmin'), updateDepartment);

module.exports = router;
