const express = require('express');
const {
  registerDevice,
  approveDevice
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/register', registerDevice);
router.patch('/:id/approve', authorize('superadmin', 'admin'), approveDevice);

module.exports = router;
