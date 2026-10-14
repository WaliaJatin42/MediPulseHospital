const express = require('express');
const {
  createTaxSlab,
  getTaxSlabs
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin'), createTaxSlab);
router.get('/', getTaxSlabs);

module.exports = router;
