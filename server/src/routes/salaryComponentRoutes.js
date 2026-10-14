const express = require('express');
const {
  createSalaryComponent,
  getSalaryComponents,
  updateSalaryComponent
} = require('../controllers/payrollExtrasController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin', 'admin'), createSalaryComponent);
router.get('/', getSalaryComponents);
router.patch('/:id', authorize('superadmin', 'admin'), updateSalaryComponent);

module.exports = router;
