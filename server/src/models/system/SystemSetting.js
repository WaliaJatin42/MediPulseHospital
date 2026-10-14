const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    timezone: {
      type: String,
      default: 'Asia/Kolkata' // ISO standard time zone identifier
    },
    currency: {
      type: String,
      default: 'INR'
    },
    financialYearStart: {
      type: String,
      default: '04-01' // MM-DD
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD'
    },
    payableDaysFormula: {
      type: String,
      enum: ['calendarDays', 'workingDays'],
      default: 'calendarDays'
    },
    mfaMandatoryRoles: {
      type: [String],
      default: ['superadmin', 'admin', 'supervisor']
    },
    passwordExpiryDays: {
      type: Number,
      default: 90
    },
    lockoutThreshold: {
      type: Number,
      default: 5 // 5 failed attempts
    },
    lockoutMinutes: {
      type: Number,
      default: 15 // 15 mins lock
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = SystemSetting;
