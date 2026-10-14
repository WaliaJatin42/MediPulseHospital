const express = require('express');
const {
  triggerPayrollRun,
  getPayrollRuns,
  getPayrollRunById,
  getMyPayslips,
  getMyMonthPayslip,
  approvePayrollRun,
  reversePayrollRun
} = require('../controllers/payrollController');
const {
  getStatutoryReport,
  createPayrollAdjustment,
  getPendingAdjustments,
  lockPayrollRun,
  unlockPayrollRun,
  publishPayslips,
  exportPayrollRun,
  getBankFile,
  getMyPayslipPdf,
  addVariableEarnings
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Specific paths before parameterized /:runId
router.get('/me/:month/payslip.pdf', getMyPayslipPdf);
router.get('/me/:month/payslip', getMyMonthPayslip);
router.get('/me', getMyPayslips);

router.get('/adjustments/pending', authorize('superadmin', 'admin'), getPendingAdjustments);
router.post('/adjustments', authorize('superadmin'), createPayrollAdjustment);
router.post('/variable-earnings', authorize('superadmin', 'admin'), addVariableEarnings);

// Run payroll execution (with idempotency)
router.post('/run', authorize('superadmin'), triggerPayrollRun);
router.post('/process', authorize('superadmin'), triggerPayrollRun);

// List runs
router.get('/', authorize('superadmin', 'admin'), getPayrollRuns);

// Actions on specific runId
router.get('/:runId/export', authorize('superadmin', 'admin'), exportPayrollRun);
router.get('/:runId/bank-file', authorize('superadmin', 'admin'), getBankFile);
router.get('/:runId/statutory-report', authorize('superadmin', 'admin'), getStatutoryReport);
router.post('/:runId/lock', authorize('superadmin'), lockPayrollRun);
router.post('/:runId/unlock', authorize('superadmin'), unlockPayrollRun);
router.post('/:runId/payslips/publish', authorize('superadmin'), publishPayslips);
router.post('/:runId/approve', authorize('superadmin'), approvePayrollRun);
router.post('/:runId/reverse', authorize('superadmin'), reversePayrollRun);

router.get('/:runId', authorize('superadmin', 'admin'), getPayrollRunById);

module.exports = router;
