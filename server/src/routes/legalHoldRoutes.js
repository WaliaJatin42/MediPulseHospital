const express = require('express');
const {
  createLegalHold,
  getLegalHolds,
  releaseLegalHold
} = require('../controllers/privacyController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin', 'admin'), createLegalHold);
router.get('/', authorize('superadmin', 'admin'), getLegalHolds);
router.patch('/:id/release', authorize('superadmin', 'admin'), releaseLegalHold);

module.exports = router;
