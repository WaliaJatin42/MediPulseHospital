const express = require('express');
const {
  createShift,
  getShifts,
  updateShift,
  assignRoster,
  getRosters,
  getMyRoster,
  updateRoster,
  createSwapRequest,
  decideSwapRequest
} = require('../controllers/rosterController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use('/shifts', protect);
router.use('/rosters', protect);

// Shift routes
router.post('/shifts', authorize('superadmin', 'admin'), createShift);
router.get('/shifts', getShifts);
router.patch('/shifts/:id', authorize('superadmin', 'admin'), updateShift);

// Roster routes
router.post('/rosters', authorize('superadmin', 'admin', 'supervisor'), assignRoster);
router.get('/rosters/me', getMyRoster);
router.get('/rosters', getRosters);
router.patch('/rosters/:id', authorize('superadmin', 'admin', 'supervisor'), updateRoster);

// Roster Swap routes
router.post('/rosters/swap-requests', createSwapRequest);
router.patch('/rosters/swap-requests/:id/decision', authorize('superadmin', 'admin', 'supervisor'), decideSwapRequest);

module.exports = router;
