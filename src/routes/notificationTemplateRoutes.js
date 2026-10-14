const express = require('express');
const {
  createTemplate,
  getTemplates,
  updateTemplate
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('superadmin', 'admin'), createTemplate);
router.get('/', getTemplates);
router.patch('/:id', authorize('superadmin', 'admin'), updateTemplate);

module.exports = router;
