const express = require('express');
const {
  collectSample,
  receiveSample,
  getLabWorklist,
  enterLabResult,
  validateLabResult,
  releaseLabResult,
  acknowledgeCriticalAlert,
  scheduleRadiologyStudy,
  getRadiologyWorklist,
  completeRadiologyExam,
  createRadiologyReport
} = require('../controllers/diagnosticController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

router.use(['/lab', '/radiology'], protect, branchContext);

// Laboratory Endpoints
router.post('/lab/orders/:id/collect-sample', collectSample);
router.post('/lab/samples/:id/receive', receiveSample);
router.get('/lab/worklist', getLabWorklist);
router.post('/lab/results', enterLabResult);
router.patch('/lab/results/:id/validate', authorize('superadmin', 'admin', 'doctor'), validateLabResult);
router.patch('/lab/results/:id/release', releaseLabResult);
router.patch('/lab/critical-alerts/:id/acknowledge', acknowledgeCriticalAlert);

// Radiology Endpoints
router.post('/radiology/schedule', scheduleRadiologyStudy);
router.get('/radiology/worklist', getRadiologyWorklist);
router.patch('/radiology/studies/:id/complete', completeRadiologyExam);
router.post('/radiology/reports', authorize('superadmin', 'admin', 'doctor'), createRadiologyReport);

module.exports = router;
