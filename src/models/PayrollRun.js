const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    month: {
      type: String, // Format: YYYY-MM
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'calculated', 'approved', 'disbursed', 'reversed'],
      default: 'calculated',
      index: true
    },
    isDryRun: {
      type: Boolean,
      default: false
    },
    totalEmployees: {
      type: Number,
      default: 0
    },
    totalGross: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      default: 0
    },
    totalNet: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    disbursedAt: {
      type: Date,
      default: null
    },
    disbursementConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reversedAt: {
      type: Date,
      default: null
    },
    reversalReason: {
      type: String,
      default: null
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    lockedAt: {
      type: Date,
      default: null
    },
    unlockReason: {
      type: String,
      default: null
    },
    payslipsPublished: {
      type: Boolean,
      default: false
    },
    publishedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

payrollRunSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const PayrollRun = mongoose.model('PayrollRun', payrollRunSchema);

module.exports = PayrollRun;
