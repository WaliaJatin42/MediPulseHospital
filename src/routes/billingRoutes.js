const express = require('express');
const {
  createBillingAccount,
  getBillingAccountById,
  addManualCharge,
  createDeposit,
  createInvoice,
  finalizeInvoice,
  recordPayment,
  applyDiscount,
  submitPreauth,
  updatePreauthStatus,
  submitClaim
} = require('../controllers/billingController');
const { protect } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

router.use(['/billing', '/insurance'], protect, branchContext);

// Billing Accounts & Charges
router.route('/billing/accounts')
  .post(createBillingAccount);

router.route('/billing/accounts/:id')
  .get(getBillingAccountById);

router.post('/billing/charges', addManualCharge);
router.post('/billing/deposits', createDeposit);

// Invoices & Payments
router.post('/billing/invoices', createInvoice);
router.post('/billing/invoices/:id/finalize', finalizeInvoice);
router.post('/billing/payments', recordPayment);
router.post('/billing/discounts', applyDiscount);

// Insurance & TPA
router.post('/insurance/preauths', submitPreauth);
router.patch('/insurance/preauths/:id/status', updatePreauthStatus);
router.post('/insurance/claims', submitClaim);

module.exports = router;
