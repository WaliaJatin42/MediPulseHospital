const express = require('express');
const {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
  setWeeklyOffs,
  getWorkingDays
} = require('../controllers/calendarController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/holidays', authorize('superadmin', 'admin'), createHoliday);
router.get('/holidays', getHolidays);
router.patch('/holidays/:id', authorize('superadmin', 'admin'), updateHoliday);
router.delete('/holidays/:id', authorize('superadmin', 'admin'), deleteHoliday);

router.post('/weekly-offs', authorize('superadmin', 'admin'), setWeeklyOffs);
router.get('/working-days', getWorkingDays);

module.exports = router;
