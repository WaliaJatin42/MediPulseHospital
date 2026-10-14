const express = require('express');
const {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  manualCorrection,
  getAttendanceSummary,
  getAttendanceHistory,
  requestCorrection,
  getCorrections,
  decideCorrection,
  getAnomalies,
  reviewAnomaly
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Check in/out
router.post('/check-in', checkIn);
router.post('/punch-in', checkIn);
router.post('/clock-in', checkIn);
router.post('/check-out', checkOut);
router.post('/punch-out', checkOut);
router.post('/clock-out', checkOut);

// View attendance & summaries
router.get('/me', getMyAttendance);
router.get('/summary', getAttendanceSummary);
router.get('/anomalies', authorize('superadmin', 'admin', 'supervisor'), getAnomalies);
router.patch('/anomalies/:id', authorize('superadmin', 'admin'), reviewAnomaly);

// Attendance Corrections
router.post('/corrections', requestCorrection);
router.get('/corrections', getCorrections);
router.patch('/corrections/:id/decision', authorize('superadmin', 'admin', 'supervisor'), decideCorrection);

// Attendance records
router.get('/', authorize('superadmin', 'admin', 'supervisor'), getAllAttendance);
router.get('/:id/history', getAttendanceHistory);
router.patch('/:id', authorize('superadmin'), manualCorrection);

module.exports = router;
