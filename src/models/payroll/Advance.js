const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    installments: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    monthlyDeduction: {
      type: Number,
      required: true
    },
    startMonth: {
      type: String, // 'YYYY-MM'
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'disbursed', 'completed', 'rejected'],
      default: 'pending',
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    disbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    disbursedAt: {
      type: Date
    },
    remainingBalance: {
      type: Number,
      default: 0
    },
    schedule: [
      {
        month: String, // 'YYYY-MM'
        amount: Number,
        isDeducted: { type: Boolean, default: false },
        deductedInRunId: String,
        deductedAt: Date
      }
    ]
  },
  {
    timestamps: true
  }
);

const Advance = mongoose.model('Advance', advanceSchema);

module.exports = Advance;
