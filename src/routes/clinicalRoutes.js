const express = require('express');
const {
  createRole,
  getRoles
} = require('../controllers/clinicalController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin'), createRole);
router.get('/', getRoles);

module.exports = router;
