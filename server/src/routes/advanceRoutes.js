const express = require('express');
const {
  requestAdvance,
  getAdvances,
  getMyAdvances,
  decideAdvance,
  getAdvanceSchedule
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMyAdvances);
router.get('/:id/schedule', getAdvanceSchedule);
router.patch('/:id/decision', authorize('superadmin', 'admin'), decideAdvance);
router.post('/', requestAdvance);
router.get('/', authorize('superadmin', 'admin', 'supervisor'), getAdvances);

module.exports = router;
