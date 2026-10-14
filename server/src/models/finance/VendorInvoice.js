const mongoose = require('mongoose');

const vendorInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    vendorName: {
      type: String,
      required: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid', 'cancelled'],
      default: 'unpaid',
      index: true
    },
    fileUrl: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

vendorInvoiceSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('VendorInvoice', vendorInvoiceSchema);
