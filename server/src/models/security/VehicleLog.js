const mongoose = require('mongoose');

const vehicleLogSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    driverName: {
      type: String,
      required: true,
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['ambulance', 'visitor', 'staff', 'supplier', 'emergency_service'],
      default: 'visitor'
    },
    purpose: {
      type: String,
      default: ''
    },
    entryTime: {
      type: Date,
      default: Date.now
    },
    exitTime: {
      type: Date,
      default: null
    },
    gateNumber: {
      type: String,
      default: 'Gate 1'
    },
    status: {
      type: String,
      enum: ['inside', 'exited'],
      default: 'inside',
      index: true
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

vehicleLogSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('VehicleLog', vehicleLogSchema);
