const mongoose = require('mongoose');

const exitRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    lastWorkingDay: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    noticePeriod: {
      type: Number,
      default: 30 // in days
    },
    status: {
      type: String,
      enum: ['initiated', 'clearance_in_progress', 'settlement_calculated', 'settlement_approved', 'completed'],
      default: 'initiated',
      index: true
    },
    clearances: {
      technical: {
        cleared: { type: Boolean, default: false },
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: Date,
        remarks: { type: String, default: '' } // Assets returned
      },
      pharmacy: {
        cleared: { type: Boolean, default: false },
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: Date,
        remarks: { type: String, default: '' } // Stock returned
      },
      finance: {
        cleared: { type: Boolean, default: false },
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        clearedAt: Date,
        remarks: { type: String, default: '' } // Advances recovered
      }
    },
    settlement: {
      pendingSalary: { type: Number, default: 0 },
      leaveEncashment: { type: Number, default: 0 },
      recoveries: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      gratuity: { type: Number, default: 0 },
      netPayable: { type: Number, default: 0 },
      calculatedAt: Date,
      isApproved: { type: Boolean, default: false },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date
    },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const ExitRecord = mongoose.model('ExitRecord', exitRecordSchema);

module.exports = ExitRecord;
