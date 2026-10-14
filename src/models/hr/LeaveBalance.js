const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
      index: true
    },
    balances: [
      {
        leaveTypeName: {
          type: String,
          required: true
        },
        quota: {
          type: Number,
          default: 12
        },
        carriedOver: {
          type: Number,
          default: 0
        },
        used: {
          type: Number,
          default: 0
        },
        pending: {
          type: Number,
          default: 0
        },
        remaining: {
          type: Number,
          default: 12
        }
      }
    ],
    adjustments: [
      {
        leaveTypeName: String,
        delta: Number,
        reason: { type: String, required: true },
        adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        adjustedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = LeaveBalance;
