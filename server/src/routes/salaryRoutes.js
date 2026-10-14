const express = require('express');
const {
  createSalary,
  getSalaries,
  getMySalary,
  getSalaryByUserId,
  updateSalary,
  createSalaryIncrement
} = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/:userId/increments', authorize('superadmin', 'admin', 'supervisor'), createSalaryIncrement);
router.get('/user/:userId', (req, res, next) => {
  req.params.id = req.params.userId;
  return getSalaryByUserId(req, res, next);
});


/**
 * @openapi
 * /api/v1/salaries/me:
 *   get:
 *     summary: View own salary structure
 *     tags: [Salary Management]
 */
router.get('/me', getMySalary);

/**
 * @openapi
 * /api/v1/salaries:
 *   post:
 *     summary: Assign salary structure (SuperAdmin, HR Admin, HR Supervisor)
 *     tags: [Salary Management]
 *   get:
 *     summary: List salary structures (Scope-filtered)
 *     tags: [Salary Management]
 */
router.route('/')
  .post(createSalary)
  .get(getSalaries);

/**
 * @openapi
 * /api/v1/salaries/{id}:
 *   get:
 *     summary: Get salary structure by User ID or Salary Record ID
 *     tags: [Salary Management]
 *   patch:
 *     summary: Revise salary structure (Preserves historical revisions)
 *     tags: [Salary Management]
 */
router.route('/:id')
  .get(getSalaryByUserId)
  .patch(updateSalary);

module.exports = router;
