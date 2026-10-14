const express = require('express');
const {
  requestLeave,
  getLeaves,
  decideLeave,
  cancelLeave,
  getMyLeaveBalance,
  getUserLeaveBalance,
  adjustLeaveBalance
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/balance/me', getMyLeaveBalance);
router.get('/balance/:userId', authorize('superadmin', 'admin', 'supervisor'), getUserLeaveBalance);
router.post('/balance/:userId/adjust', authorize('superadmin', 'admin'), adjustLeaveBalance);

router.route('/')
  .post(requestLeave)
  .get(getLeaves);

router.patch('/:id/decision', decideLeave);
router.patch('/:id/cancel', cancelLeave);

module.exports = router;
