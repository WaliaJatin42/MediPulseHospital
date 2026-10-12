const express = require('express');
const {
  createSalary,
  getSalaries,
  getSalaryById,
  updateSalary,
  deleteSalary
} = require('../controllers/salaryController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createSalaryValidation, updateSalaryValidation } = require('../utils/validators');

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin', 'admin', 'supervisor'));

/**
 * @openapi
 * /api/v1/salary:
 *   post:
 *     summary: Create or assign a salary record (SuperAdmin, HR Admin, HR Supervisor only)
 *     tags: [Salary Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             user_id: "670498abc1234567890ef123"
 *             salary: 75000
 *             department: "Pharmacy"
 *             designation: "Pharmacist"
 *     responses:
 *       201:
 *         description: Salary record saved successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Permission denied - Only SuperAdmin or HR staff authorized
 *       404:
 *         description: Target user not found
 */
router.post('/', createSalaryValidation, createSalary);

/**
 * @openapi
 * /api/v1/salary:
 *   get:
 *     summary: List all salary records (SuperAdmin, HR Admin, HR Supervisor only)
 *     tags: [Salary Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: designation
 *         schema:
 *           type: string
 *         description: Filter by designation
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by user name or department
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of salary records
 *       403:
 *         description: Permission denied
 */
router.get('/', getSalaries);

/**
 * @openapi
 * /api/v1/salary/{id}:
 *   get:
 *     summary: Get salary record by Salary ID or User ID
 *     tags: [Salary Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Salary ID or User ID
 *     responses:
 *       200:
 *         description: Salary record retrieved
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Salary record not found
 */
router.get('/:id', getSalaryById);

/**
 * @openapi
 * /api/v1/salary/{id}:
 *   patch:
 *     summary: Update salary record (SuperAdmin, HR Admin, HR Supervisor only)
 *     tags: [Salary Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           example:
 *             salary: 82000
 *             designation: "Senior Pharmacist"
 *     responses:
 *       200:
 *         description: Salary record updated successfully
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Salary record not found
 */
router.patch('/:id', updateSalaryValidation, updateSalary);
router.put('/:id', updateSalaryValidation, updateSalary);

/**
 * @openapi
 * /api/v1/salary/{id}:
 *   delete:
 *     summary: Delete salary record (SuperAdmin, HR Admin, HR Supervisor only)
 *     tags: [Salary Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Salary record deleted successfully
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Salary record not found
 */
router.delete('/:id', deleteSalary);

module.exports = router;
