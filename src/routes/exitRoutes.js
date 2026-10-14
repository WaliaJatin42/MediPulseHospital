const express = require('express');
const {
  createExit,
  getExits,
  getExitById,
  updateClearance,
  calculateSettlement,
  approveSettlement,
  completeExit
} = require('../controllers/exitController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin', 'admin', 'supervisor'), createExit);
router.get('/', getExits);
router.get('/:id', getExitById);
router.patch('/:id/clearance', authorize('superadmin', 'admin', 'supervisor'), updateClearance);
router.post('/:id/settlement/calculate', authorize('superadmin', 'admin'), calculateSettlement);
router.post('/:id/settlement/approve', authorize('superadmin'), approveSettlement);
router.patch('/:id/complete', authorize('superadmin', 'admin'), completeExit);

module.exports = router;
