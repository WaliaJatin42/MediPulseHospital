const mongoose = require('mongoose');

const maintenanceScheduleSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicalAsset',
      required: true,
      index: true
    },
    maintenanceType: {
      type: String,
      enum: ['preventive', 'corrective', 'calibration', 'firmware_update', 'safety_audit'],
      default: 'preventive'
    },
    scheduledDate: {
      type: Date,
      required: true
    },
    performedDate: {
      type: Date,
      default: null
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'overdue'],
      default: 'scheduled',
      index: true
    },
    findings: {
      type: String,
      default: ''
    },
    cost: {
      type: Number,
      default: 0
    },
    checklist: [
      {
        task: String,
        passed: { type: Boolean, default: true }
      }
    ],
    nextServiceDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

maintenanceScheduleSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);
