const mongoose = require('mongoose');

const payrollAdjustmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sourceRunId: {
      type: String, // e.g. "RUN-2026-09"
      default: null
    },
    attendanceCorrectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceCorrection',
      default: null
    },
    month: {
      type: String, // Month of occurrence: "YYYY-MM"
      required: true
    },
    type: {
      type: String,
      enum: ['earning', 'deduction', 'arrear'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'applied', 'cancelled'],
      default: 'pending',
      index: true
    },
    appliedInRunId: {
      type: String,
      default: null
    },
    appliedAt: {
      type: Date,
      default: null
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

const PayrollAdjustment = mongoose.model('PayrollAdjustment', payrollAdjustmentSchema);

module.exports = PayrollAdjustment;
