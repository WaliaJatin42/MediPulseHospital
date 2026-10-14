const mongoose = require('mongoose');

const legalHoldSchema = new mongoose.Schema(
  {
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: true
    },
    resources: {
      type: [String],
      default: ['payroll', 'attendance', 'audit_logs']
    },
    targetUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'released'],
      default: 'active',
      index: true
    },
    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    releasedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const LegalHold = mongoose.model('LegalHold', legalHoldSchema);

module.exports = LegalHold;
