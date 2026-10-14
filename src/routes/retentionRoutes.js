const express = require('express');
const {
  getRetentionPolicies,
  updateRetentionPolicy,
  runRetention
} = require('../controllers/privacyController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use('/retention-policies', protect);
router.use('/retention', protect);

router.get('/retention-policies', authorize('superadmin'), getRetentionPolicies);
router.put('/retention-policies/:resource', authorize('superadmin'), updateRetentionPolicy);
router.post('/retention/run', authorize('superadmin'), runRetention);

module.exports = router;
