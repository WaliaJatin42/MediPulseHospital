const Notification = require('../models/notification/Notification');
const NotificationTemplate = require('../models/notification/NotificationTemplate');
const NotificationPreference = require('../models/notification/NotificationPreference');
const User = require('../models/User');
const { paginate } = require('../utils/pagination');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Get user's notifications (paginated)
// @route   GET /api/v1/notifications
// @access  Private (Own)
const getNotifications = async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.unreadOnly === 'true') filter.read = false;

    const result = await paginate(Notification, filter, req.query, {
      sort: { createdAt: -1 },
      searchFields: ['title', 'message'],
      dateField: 'createdAt'
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Notification Error] ${error.message}`);
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/v1/notifications/:id/read
// @access  Private (Own)
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification marked as read', data: notification });
  } catch (error) {
    logger.error(`[Notification Error] ${error.message}`);
    next(error);
  }
};

// @desc    Mark all user notifications as read
// @route   PATCH /api/v1/notifications/read-all
// @access  Private (Own)
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error(`[Notification Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get user's notification preferences
// @route   GET /api/v1/notification-preferences/me
// @access  Private (Self)
const getMyPreferences = async (req, res, next) => {
  try {
    let prefs = await NotificationPreference.findOne({ userId: req.user._id });
    if (!prefs) {
      prefs = await NotificationPreference.create({ userId: req.user._id });
    }

    res.status(200).json({ success: true, data: prefs });
  } catch (error) {
    logger.error(`[Notification Preference Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update notification preferences
// @route   PUT /api/v1/notification-preferences/me
// @access  Private (Self)
const updateMyPreferences = async (req, res, next) => {
  try {
    const prefs = await NotificationPreference.findOneAndUpdate(
      { userId: req.user._id },
      { preferences: req.body.preferences || req.body },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, message: 'Notification preferences updated', data: prefs });
  } catch (error) {
    logger.error(`[Notification Preference Error] ${error.message}`);
    next(error);
  }
};

// @desc    Create notification template
// @route   POST /api/v1/notification-templates
// @access  Private (Superadmin, HR Admin)
const createTemplate = async (req, res, next) => {
  try {
    const { eventType, titleTemplate, bodyTemplate, defaultChannels } = req.body;
    if (!eventType || !titleTemplate || !bodyTemplate) {
      return res.status(400).json({ success: false, message: 'eventType, titleTemplate, and bodyTemplate are required' });
    }

    const template = await NotificationTemplate.create({
      eventType,
      titleTemplate,
      bodyTemplate,
      defaultChannels: defaultChannels || ['in_app', 'email'],
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Template created', data: template });
  } catch (error) {
    logger.error(`[Notification Template Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get all notification templates
// @route   GET /api/v1/notification-templates
// @access  Private
const getTemplates = async (req, res, next) => {
  try {
    const count = await NotificationTemplate.countDocuments();
    if (count === 0) {
      // Seed default templates
      const defaults = [
        { eventType: 'payslip_published', titleTemplate: 'Payslip Available for {month}', bodyTemplate: 'Your payslip for {month} has been published.' },
        { eventType: 'leave_decided', titleTemplate: 'Leave Request {status}', bodyTemplate: 'Your leave request for {date} has been {status}.' },
        { eventType: 'attendance_correction', titleTemplate: 'Attendance Correction {status}', bodyTemplate: 'Your attendance correction for {date} was {status}.' },
        { eventType: 'expiring_license', titleTemplate: 'License Expiring Soon', bodyTemplate: 'Your professional license {licenseNumber} expires in {days} days.' }
      ];
      await NotificationTemplate.insertMany(defaults);
    }

    const result = await paginate(NotificationTemplate, { isActive: true }, req.query, {
      sort: { createdAt: -1 },
      searchFields: ['eventType', 'titleTemplate'],
      dateField: 'createdAt'
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Notification Template Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update notification template
// @route   PATCH /api/v1/notification-templates/:id
// @access  Private (Superadmin, HR Admin)
const updateTemplate = async (req, res, next) => {
  try {
    const template = await NotificationTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    res.status(200).json({ success: true, message: 'Template updated', data: template });
  } catch (error) {
    logger.error(`[Notification Template Error] ${error.message}`);
    next(error);
  }
};

// @desc    Broadcast message to department or hospital-wide with FCM push notifications
// @route   POST /api/v1/notifications/broadcast
// @access  Private (Superadmin, HR Admin, Department Admin for own department)
const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, department, eventType = 'broadcast', data = {} } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    const caller = req.user;
    let targetDept = department;

    // Dept Admin can only broadcast to own department
    if (caller.role !== 'superadmin' && caller.department !== 'hr') {
      targetDept = caller.department;
    }

    const filter = { status: 'active', isDeleted: false };
    if (targetDept && targetDept !== 'all') {
      filter.department = targetDept.toLowerCase();
    }

    const targetUsers = await User.find(filter).select('_id fcmTokens');
    const notificationDocs = targetUsers.map((u) => ({
      userId: u._id,
      title,
      message,
      eventType,
      channel: 'in_app'
    }));

    if (notificationDocs.length > 0) {
      await Notification.insertMany(notificationDocs);
    }

    // Dispatch FCM Push Notification to all active recipient devices
    const fcmTokens = [];
    targetUsers.forEach((u) => {
      if (u.fcmTokens && u.fcmTokens.length > 0) {
        u.fcmTokens.forEach((t) => {
          if (t.token) fcmTokens.push(t.token);
        });
      }
    });

    const fcmService = require('../services/fcmService');
    let fcmResult = { success: true, count: 0 };
    if (fcmTokens.length > 0) {
      fcmResult = await fcmService.sendMulticast(fcmTokens, {
        title,
        body: message,
        data: { eventType, department: targetDept || 'all', ...data }
      });

      // Cleanup invalid tokens if any
      if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
        await User.updateMany(
          { 'fcmTokens.token': { $in: fcmResult.invalidTokens } },
          { $pull: { fcmTokens: { token: { $in: fcmResult.invalidTokens } } } }
        );
      }
    }

    // Also dispatch to FCM topic
    const topicName = targetDept && targetDept !== 'all' ? `dept_${targetDept}` : 'hospital_all';
    await fcmService.sendToTopic(topicName, {
      title,
      body: message,
      data: { eventType, ...data }
    });

    await recordAuditLog({
      actor: caller,
      action: 'BROADCAST_NOTIFICATION',
      resource: 'notifications',
      after: {
        title,
        targetDept: targetDept || 'all',
        count: targetUsers.length,
        fcmDevicesTargeted: fcmTokens.length
      },
      req
    });

    res.status(201).json({
      success: true,
      message: `Broadcast message sent to ${targetUsers.length} staff member(s) and pushed via FCM`,
      recipientCount: targetUsers.length,
      fcm: {
        devicesTargeted: fcmTokens.length,
        fcmConfigured: fcmService.isFcmConfigured(),
        result: fcmResult
      }
    });
  } catch (error) {
    logger.error(`[Broadcast Error] ${error.message}`);
    next(error);
  }
};

// @desc    Register user's FCM device push token
// @route   POST /api/v1/notifications/fcm-token
// @access  Private (Own)
const registerFcmToken = async (req, res, next) => {
  try {
    const { token, deviceId, platform = 'web' } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }

    // Check if token already registered for this user
    const existingIndex = user.fcmTokens.findIndex((t) => t.token === token);
    if (existingIndex > -1) {
      user.fcmTokens[existingIndex].updatedAt = new Date();
      if (deviceId) user.fcmTokens[existingIndex].deviceId = deviceId;
      if (platform) user.fcmTokens[existingIndex].platform = platform;
    } else {
      user.fcmTokens.push({
        token,
        deviceId: deviceId || '',
        platform,
        updatedAt: new Date()
      });
    }

    await user.save();

    // Also update Device model if deviceId supplied
    if (deviceId) {
      const Device = require('../models/Device');
      await Device.findOneAndUpdate(
        { userId: req.user._id, deviceId },
        { fcmToken: token, lastUsedAt: new Date() }
      );
    }

    // Subscribe to user's department topic and hospital-wide topic
    const fcmService = require('../services/fcmService');
    await fcmService.subscribeToTopic([token], 'hospital_all');
    if (user.department) {
      await fcmService.subscribeToTopic([token], `dept_${user.department.toLowerCase()}`);
    }

    res.status(200).json({
      success: true,
      message: 'FCM push registration token saved successfully',
      data: {
        registeredTokensCount: user.fcmTokens.length,
        fcmConfigured: fcmService.isFcmConfigured()
      }
    });
  } catch (error) {
    logger.error(`[FCM Token Registration Error] ${error.message}`);
    next(error);
  }
};

// @desc    Unregister FCM device push token (e.g. on logout)
// @route   DELETE /api/v1/notifications/fcm-token
// @access  Private (Own)
const unregisterFcmToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    await User.updateOne(
      { _id: req.user._id },
      { $pull: { fcmTokens: { token } } }
    );

    res.status(200).json({
      success: true,
      message: 'FCM push token removed successfully'
    });
  } catch (error) {
    logger.error(`[FCM Unregister Error] ${error.message}`);
    next(error);
  }
};

// @desc    Test FCM push notification delivery
// @route   POST /api/v1/notifications/test-fcm
// @access  Private (Superadmin, HR Admin)
const testFcmNotification = async (req, res, next) => {
  try {
    const { token, userId, topic, title = 'MediPulse Hospital Test Alert', body = 'This is a test notification from MediPulse Hospital Systems.' } = req.body;
    const fcmService = require('../services/fcmService');

    let result;
    if (token) {
      result = await fcmService.sendToToken(token, {
        title,
        body,
        data: { test: 'true', timestamp: new Date().toISOString() }
      });
    } else if (userId) {
      const recipient = await User.findById(userId).select('fcmTokens');
      const tokens = (recipient?.fcmTokens || []).map((t) => t.token);
      if (tokens.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Target user has no registered FCM push tokens. Register a token first via POST /api/v1/notifications/fcm-token'
        });
      }
      result = await fcmService.sendMulticast(tokens, {
        title,
        body,
        data: { test: 'true', recipientId: userId }
      });
    } else if (topic) {
      result = await fcmService.sendToTopic(topic, {
        title,
        body,
        data: { test: 'true', topic }
      });
    } else {
      // Test with caller's own tokens
      const caller = await User.findById(req.user._id).select('fcmTokens');
      const tokens = (caller?.fcmTokens || []).map((t) => t.token);
      if (tokens.length > 0) {
        result = await fcmService.sendMulticast(tokens, { title, body, data: { test: 'true' } });
      } else {
        // Send a simulated token test
        result = await fcmService.sendToToken('test-fcm-device-token-sample', { title, body, data: { test: 'true' } });
      }
    }

    res.status(200).json({
      success: true,
      message: 'FCM push notification dispatch tested',
      fcmConfigured: fcmService.isFcmConfigured(),
      dispatchResult: result
    });
  } catch (error) {
    logger.error(`[FCM Test Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getMyPreferences,
  updateMyPreferences,
  createTemplate,
  getTemplates,
  updateTemplate,
  broadcastNotification,
  registerFcmToken,
  unregisterFcmToken,
  testFcmNotification
};
