const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  broadcastNotification,
  registerFcmToken,
  unregisterFcmToken,
  testFcmNotification
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.post('/broadcast', authorize('superadmin', 'admin'), broadcastNotification);

// FCM Push Notification Management Routes
router.post('/fcm-token', registerFcmToken);
router.delete('/fcm-token', unregisterFcmToken);
router.post('/test-fcm', authorize('superadmin', 'admin'), testFcmNotification);

module.exports = router;
