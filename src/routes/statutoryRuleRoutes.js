const express = require('express');
const {
  createStatutoryRule,
  getStatutoryRules
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin'), createStatutoryRule);
router.get('/', getStatutoryRules);

module.exports = router;
