const express = require('express');
const {
  processMonthlyPayroll,
  getMonthlyPayrolls,
  getMyPayroll,
  getPayrollById
} = require('../controllers/payrollController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/payroll/process:
 *   post:
 *     summary: Trigger attendance-based monthly salary calculation & distribution (SuperAdmin, HR Admin only)
 *     tags: [Payroll & Salary Distribution]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           example:
 *             month: "2026-09"
 *             forceRecalculate: true
 *     responses:
 *       200:
 *         description: Monthly payroll processed and disbursed successfully
 *       403:
 *         description: Permission denied - Only SuperAdmin or HR Admin authorized
 */
router.post('/process', processMonthlyPayroll);

/**
 * @openapi
 * /api/v1/payroll/my:
 *   get:
 *     summary: Get current logged-in employee's monthly pay slips
 *     tags: [Payroll & Salary Distribution]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month (YYYY-MM)
 *     responses:
 *       200:
 *         description: Pay slips retrieved successfully
 */
router.get('/my', getMyPayroll);

/**
 * @openapi
 * /api/v1/payroll:
 *   get:
 *     summary: List all monthly payroll records (SuperAdmin, HR Admin, HR Supervisor only)
 *     tags: [Payroll & Salary Distribution]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month (YYYY-MM)
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by employee name or transaction reference
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
 *         description: List of payroll records
 *       403:
 *         description: Permission denied
 */
router.get('/', getMonthlyPayrolls);

/**
 * @openapi
 * /api/v1/payroll/{id}:
 *   get:
 *     summary: Get specific payroll record by ID
 *     tags: [Payroll & Salary Distribution]
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
 *         description: Payroll record details
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Payroll record not found
 */
router.get('/:id', getPayrollById);

module.exports = router;
