const express = require('express');
const {
  getMyData,
  submitErasureRequest,
  decideErasureRequest,
  getMyAccessLog
} = require('../controllers/privacyController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/my-data', getMyData);
router.get('/access-log/me', getMyAccessLog);
router.post('/erasure-requests', submitErasureRequest);
router.patch('/erasure-requests/:id', authorize('superadmin'), decideErasureRequest);

module.exports = router;
