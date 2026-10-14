const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true
    },
    originalIn: {
      type: Date
    },
    originalOut: {
      type: Date
    },
    correctedIn: {
      type: Date,
      required: true
    },
    correctedOut: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    evidenceRef: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'dept_approved', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    level1Decision: {
      approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      decision: String,
      remarks: String,
      decidedAt: Date
    },
    level2Decision: {
      approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      decision: String,
      remarks: String,
      decidedAt: Date
    },
    isPayrollAdjustmentCreated: {
      type: Boolean,
      default: false
    },
    payrollAdjustmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollAdjustment'
    }
  },
  {
    timestamps: true
  }
);

const AttendanceCorrection = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);

module.exports = AttendanceCorrection;
