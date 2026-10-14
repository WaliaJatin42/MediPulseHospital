const express = require('express');
const {
  createBonus,
  getBonuses
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin', 'admin'), createBonus);
router.get('/', getBonuses);

module.exports = router;
