const express = require('express');
const {
  createWorkLocation,
  getWorkLocations
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin', 'admin'), createWorkLocation);
router.get('/', getWorkLocations);

module.exports = router;
