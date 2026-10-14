const express = require('express');
const {
  getAvailableReports,
  generateReportJob,
  getReportJobStatus,
  downloadReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getAvailableReports);
router.post('/:type/generate', generateReportJob);
router.get('/jobs/:id/download', downloadReport);
router.get('/jobs/:id', getReportJobStatus);

module.exports = router;
