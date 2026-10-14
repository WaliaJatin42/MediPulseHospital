const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    financialYear: {
      type: String,
      required: true // e.g. "2026-2027"
    },
    period: {
      type: String,
      required: true // e.g. "Q1", "Annual", "Monthly-2026-10"
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0
    },
    spentAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['active', 'exhausted', 'closed'],
      default: 'active'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

budgetSchema.index({ department: 1, financialYear: 1, period: 1 }, { unique: true });

budgetSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Budget', budgetSchema);
