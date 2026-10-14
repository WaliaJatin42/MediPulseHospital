const mongoose = require('mongoose');

const overtimeRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true
    },
    month: {
      type: String, // 'YYYY-MM'
      required: true,
      index: true
    },
    hours: {
      type: Number,
      required: true,
      min: 0.5
    },
    rateMultiplier: {
      type: Number,
      default: 1.5
    },
    reason: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'dept_approved', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    approvedHours: {
      type: Number,
      default: 0
    },
    calculatedPay: {
      type: Number,
      default: 0
    },
    approvals: [
      {
        level: String, // 'supervisor' or 'hr'
        approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        decision: String,
        remarks: String,
        decidedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

const OvertimeRecord = mongoose.model('OvertimeRecord', overtimeRecordSchema);

module.exports = OvertimeRecord;
