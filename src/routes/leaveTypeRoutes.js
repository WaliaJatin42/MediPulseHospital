const express = require('express');
const {
  createLeaveType,
  getLeaveTypes,
  updateLeaveType
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin', 'admin'), createLeaveType);
router.get('/', getLeaveTypes);
router.patch('/:id', authorize('superadmin', 'admin'), updateLeaveType);

module.exports = router;
