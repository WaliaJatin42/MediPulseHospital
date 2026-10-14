const express = require('express');
const {
  getSystemSettings,
  updateSystemSettings,
  getJobs,
  triggerJob,
  getJobLogs,
  getReadiness,
  getVersion
} = require('../controllers/systemController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public endpoints
router.get('/health/ready', getReadiness);
router.get('/version', getVersion);

// Protected endpoints
router.get('/settings/system', protect, authorize('superadmin', 'admin'), getSystemSettings);
router.put('/settings/system', protect, authorize('superadmin'), updateSystemSettings);

router.get('/jobs', protect, authorize('superadmin'), getJobs);
router.post('/jobs/:name/trigger', protect, authorize('superadmin'), triggerJob);
router.get('/jobs/:id/logs', protect, authorize('superadmin'), getJobLogs);

module.exports = router;
