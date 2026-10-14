const mongoose = require('mongoose');

const financeLedgerSchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    account: {
      type: String,
      required: true // e.g. "Operational Expenses", "Payroll Disbursement", "Pharmacy Inventory", "Facility Maintenance"
    },
    type: {
      type: String,
      enum: ['debit', 'credit'],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    department: {
      type: String,
      default: 'hospital-wide'
    },
    description: {
      type: String,
      required: true
    },
    referenceModel: {
      type: String,
      default: null // e.g. 'PayrollRun', 'Expense', 'FinancePayment'
    },
    referenceId: {
      type: String,
      default: null
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

financeLedgerSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('FinanceLedger', financeLedgerSchema);
