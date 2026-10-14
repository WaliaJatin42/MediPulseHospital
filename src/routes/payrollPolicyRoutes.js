const express = require('express');
const {
  createPayrollPolicy,
  getPayrollPolicies,
  getActivePayrollPolicy,
  getPayrollPolicyById,
  activatePayrollPolicy
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin'), createPayrollPolicy);
router.get('/active', getActivePayrollPolicy);
router.get('/:id', getPayrollPolicyById);
router.get('/', authorize('superadmin', 'admin'), getPayrollPolicies);
router.post('/:id/activate', authorize('superadmin'), activatePayrollPolicy);

module.exports = router;
