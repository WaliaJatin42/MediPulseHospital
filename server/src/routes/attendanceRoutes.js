const express = require('express');
const {
  punchIn,
  punchOut,
  getMyAttendance,
  getAllAttendance,
  markManualAttendance
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/attendance/punch-in:
 *   post:
 *     summary: Punch-In / Start 9-hour work shift
 *     tags: [Attendance Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           example:
 *             workMode: "on_site"
 *             notes: "Morning shift start"
 *     responses:
 *       201:
 *         description: Punched in successfully
 *       400:
 *         description: Already punched in today
 */
router.post('/punch-in', punchIn);
router.post('/clock-in', punchIn);

/**
 * @openapi
 * /api/v1/attendance/punch-out:
 *   post:
 *     summary: Punch-Out / Evaluate 9-hour shift policy & calculate total work duration
 *     tags: [Attendance Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Punched out successfully
 */
router.post('/punch-out', punchOut);
router.post('/clock-out', punchOut);

/**
 * @openapi
 * /api/v1/attendance/me:
 *   get:
 *     summary: Get logged-in user's personal attendance history
 *     tags: [Attendance Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal attendance logs
 */
router.get('/me', getMyAttendance);

/**
 * @openapi
 * /api/v1/attendance:
 *   get:
 *     summary: List attendance records (Superadmin, HR Admin, & HR Supervisors see ALL; Dept Admins see their department)
 *     tags: [Attendance Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *         description: Filter by date (YYYY-MM-DD)
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department (hr, pharmacy, technical, security, support, legal, accounts)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [punched_in, present, late, half_day, short_hours, absent, on_leave]
 *         description: Filter by attendance status
 *     responses:
 *       200:
 *         description: Attendance logs
 */
router.get('/', authorize('superadmin', 'admin', 'supervisor'), getAllAttendance);

/**
 * @openapi
 * /api/v1/attendance/manual:
 *   post:
 *     summary: Manually mark/update attendance for a staff member (HR Admin & Superadmin)
 *     tags: [Attendance Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             userId: "65c8f1e29a34b2811a45d0f5"
 *             date: "2026-10-08"
 *             status: "present"
 *             notes: "Manual approval by HR Admin"
 *     responses:
 *       200:
 *         description: Manual attendance saved
 */
router.post('/manual', authorize('superadmin', 'admin'), markManualAttendance);

module.exports = router;
