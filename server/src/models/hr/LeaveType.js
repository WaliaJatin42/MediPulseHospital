const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    paid: {
      type: Boolean,
      default: true
    },
    annualQuota: {
      type: Number,
      default: 12,
      min: 0
    },
    carryForward: {
      type: Boolean,
      default: false
    },
    maxCarryForward: {
      type: Number,
      default: 0
    },
    requiresDocument: {
      type: Boolean,
      default: false
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

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);

module.exports = LeaveType;
