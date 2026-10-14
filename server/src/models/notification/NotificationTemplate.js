const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    titleTemplate: {
      type: String,
      required: true
    },
    bodyTemplate: {
      type: String,
      required: true
    },
    defaultChannels: {
      type: [String],
      default: ['in_app', 'email']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const NotificationTemplate = mongoose.model('NotificationTemplate', notificationTemplateSchema);

module.exports = NotificationTemplate;
