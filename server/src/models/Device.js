const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    deviceName: {
      type: String,
      default: 'Unknown Device'
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'biometric_kiosk'],
      default: 'mobile'
    },
    fcmToken: {
      type: String,
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'revoked'],
      default: 'pending',
      index: true
    },
    registeredAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    lastUsedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
