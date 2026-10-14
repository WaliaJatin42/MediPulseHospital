const mongoose = require('mongoose');

const financePaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorInvoice',
      default: null
    },
    recipient: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'corporate_card', 'cash'],
      default: 'bank_transfer'
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    transactionRef: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'reversed'],
      default: 'completed'
    },
    recordedBy: {
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

financePaymentSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('FinancePayment', financePaymentSchema);
