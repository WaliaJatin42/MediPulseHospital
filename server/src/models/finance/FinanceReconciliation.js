const mongoose = require('mongoose');

const financeReconciliationSchema = new mongoose.Schema(
  {
    month: {
      type: String, // YYYY-MM
      required: true,
      index: true
    },
    bankStatementBalance: {
      type: Number,
      required: true
    },
    bookBalance: {
      type: Number,
      required: true
    },
    discrepancy: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['balanced', 'discrepancy_detected', 'reconciled'],
      default: 'balanced'
    },
    notes: {
      type: String,
      default: ''
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reconciledAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

financeReconciliationSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('FinanceReconciliation', financeReconciliationSchema);
