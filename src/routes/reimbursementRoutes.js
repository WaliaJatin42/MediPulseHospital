const express = require('express');
const {
  submitReimbursement,
  getReimbursements,
  decideReimbursement
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', submitReimbursement);
router.get('/', getReimbursements);
router.patch('/:id/decision', authorize('superadmin', 'admin', 'supervisor'), decideReimbursement);

module.exports = router;
