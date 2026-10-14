const express = require('express');
const {
  getOvertimeRecords,
  requestOvertime,
  decideOvertime,
  getOvertimeSummary
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/summary', getOvertimeSummary);
router.post('/requests', requestOvertime);
router.get('/', getOvertimeRecords);
router.patch('/:id/decision', authorize('superadmin', 'admin', 'supervisor'), decideOvertime);

module.exports = router;
