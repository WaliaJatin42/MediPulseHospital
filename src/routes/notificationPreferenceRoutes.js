const express = require('express');
const {
  getMyPreferences,
  updateMyPreferences
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMyPreferences);
router.put('/me', updateMyPreferences);

module.exports = router;
