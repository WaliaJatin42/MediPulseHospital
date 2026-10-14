const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    preferences: {
      payslip: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true }, sms: { type: Boolean, default: false } },
      leave: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true }, sms: { type: Boolean, default: false } },
      attendance: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: false }, sms: { type: Boolean, default: false } },
      security: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true }, sms: { type: Boolean, default: true } },
      system: { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true }, sms: { type: Boolean, default: false } }
    }
  },
  {
    timestamps: true
  }
);

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

module.exports = NotificationPreference;
