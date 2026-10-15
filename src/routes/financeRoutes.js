const express = require('express');
const {
  createBudget,
  getBudgets,
  updateBudget,
  submitExpense,
  getExpenses,
  decideExpense,
  createInvoice,
  getInvoices,
  recordPayment,
  getPayments,
  reviewPayrollRun,
  confirmPayrollDisbursement,
  getLedger,
  createReconciliation,
  getReconciliations,
  getExpenseSummaryReport,
  getBudgetVsActualReport,
  getPayrollCostReport
} = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/finance/budgets:
 *   post:
 *     summary: Allocate department budget
 *     tags: [Finance Module]
 *   get:
 *     summary: View department budgets
 *     tags: [Finance Module]
 */
router.route('/budgets')
  .post(authorize('superadmin', 'finance:budgets:manage'), createBudget)
  .get(authorize('superadmin', 'finance:budgets:read', 'finance:expenses:read'), getBudgets);

router.patch('/budgets/:id', authorize('superadmin', 'finance:budgets:manage'), updateBudget);

/**
 * @openapi
 * /api/v1/finance/expenses:
 *   post:
 *     summary: Submit operational expense claim
 *     tags: [Finance Module]
 *   get:
 *     summary: List department expense claims
 *     tags: [Finance Module]
 */
router.route('/expenses')
  .post(submitExpense)
  .get(authorize('superadmin', 'finance:expenses:read'), getExpenses);

router.patch('/expenses/:id/decision', authorize('superadmin', 'finance:expenses:approve'), decideExpense);

/**
 * @openapi
 * /api/v1/finance/invoices:
 *   post:
 *     summary: Register vendor invoice
 *     tags: [Finance Module]
 *   get:
 *     summary: View vendor invoices
 *     tags: [Finance Module]
 */
router.route('/invoices')
  .post(authorize('superadmin', 'finance:invoices:manage'), createInvoice)
  .get(authorize('superadmin', 'finance:invoices:manage', 'finance:expenses:read'), getInvoices);

/**
 * @openapi
 * /api/v1/finance/payments:
 *   post:
 *     summary: Record disbursement / vendor payment
 *     tags: [Finance Module]
 *   get:
 *     summary: List payment disbursements
 *     tags: [Finance Module]
 */
router.route('/payments')
  .post(authorize('superadmin', 'finance:invoices:manage'), recordPayment)
  .get(authorize('superadmin', 'finance:invoices:manage', 'finance:expenses:read'), getPayments);

/**
 * @openapi
 * /api/v1/finance/payroll/{runId}:
 *   get:
 *     summary: Read-only finance review of monthly payroll run
 *     tags: [Finance Module]
 */
router.get('/payroll/:runId', authorize('superadmin', 'finance:payroll:run', 'finance:budgets:read'), reviewPayrollRun);

/**
 * @openapi
 * /api/v1/finance/payroll/{runId}/disbursement-confirm:
 *   post:
 *     summary: Confirm payroll disbursement and release funds
 *     tags: [Finance Module]
 */
router.post('/payroll/:runId/disbursement-confirm', authorize('superadmin', 'finance:payroll:run'), confirmPayrollDisbursement);

/**
 * @openapi
 * /api/v1/finance/ledger:
 *   get:
 *     summary: View general accounting ledger
 *     tags: [Finance Module]
 */
router.get('/ledger', authorize('superadmin', 'finance:budgets:read', 'finance:expenses:read'), getLedger);

/**
 * @openapi
 * /api/v1/finance/reconciliations:
 *   post:
 *     summary: Perform bank and book reconciliation
 *     tags: [Finance Module]
 *   get:
 *     summary: List reconciliations
 *     tags: [Finance Module]
 */
router.route('/reconciliations')
  .post(authorize('superadmin', 'finance:budgets:manage'), createReconciliation)
  .get(authorize('superadmin', 'finance:budgets:read'), getReconciliations);

/**
 * @openapi
 * /api/v1/finance/reports/expense-summary:
 *   get:
 *     summary: Expense breakdown by category and department
 *     tags: [Finance Module]
 */
router.get('/reports/expense-summary', authorize('superadmin', 'finance:expenses:read', 'finance:budgets:read'), getExpenseSummaryReport);

/**
 * @openapi
 * /api/v1/finance/reports/budget-vs-actual:
 *   get:
 *     summary: Budget vs Actual expenditure comparison
 *     tags: [Finance Module]
 */
router.get('/reports/budget-vs-actual', authorize('superadmin', 'finance:budgets:read'), getBudgetVsActualReport);

/**
 * @openapi
 * /api/v1/finance/reports/payroll-cost:
 *   get:
 *     summary: Hospital-wide payroll cost trend report
 *     tags: [Finance Module]
 */
router.get('/reports/payroll-cost', authorize('superadmin', 'finance:payroll:run', 'finance:budgets:read'), getPayrollCostReport);

module.exports = router;
