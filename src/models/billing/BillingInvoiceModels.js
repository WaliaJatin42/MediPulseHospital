const mongoose = require('mongoose');

// Invoices
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true, index: true },
    billingAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingAccount', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    financialYear: { type: String, required: true }, // e.g. 2026-2027
    type: { type: String, enum: ['interim', 'final'], default: 'final' },
    grossAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, required: true },
    payerShare: { type: Number, default: 0 },
    patientShare: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'finalized', 'paid', 'void'],
      default: 'draft',
      index: true
    },
    finalizedAt: { type: Date },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Payments & Receipts
const paymentSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, required: true, unique: true, index: true },
    billingAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingAccount', required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'cheque', 'online', 'deposit_draw'],
      required: true
    },
    transactionRef: { type: String, default: '' },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);

// Advance Deposits
const depositSchema = new mongoose.Schema(
  {
    depositNo: { type: String, required: true, unique: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    billingAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingAccount' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    method: { type: String, default: 'cash' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const Deposit = mongoose.model('Deposit', depositSchema);

// Insurance Preauth & Claims
const preauthSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
    payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payer', required: true },
    policyNumber: { type: String, required: true },
    requestedAmount: { type: Number, required: true },
    approvedAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['submitted', 'queried', 'approved', 'rejected', 'settled'],
      default: 'submitted',
      index: true
    },
    queryReason: { type: String, default: '' },
    rejectionReason: { type: String, default: '' }
  },
  { timestamps: true }
);

const PreauthRequest = mongoose.model('PreauthRequest', preauthSchema);

const claimSchema = new mongoose.Schema(
  {
    claimNo: { type: String, required: true, unique: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
    payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payer', required: true },
    claimAmount: { type: Number, required: true },
    settledAmount: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['submitted', 'queried', 'approved', 'partial', 'rejected', 'settled'],
      default: 'submitted',
      index: true
    }
  },
  { timestamps: true }
);

const InsuranceClaim = mongoose.model('InsuranceClaim', claimSchema);

module.exports = {
  Invoice,
  Payment,
  Deposit,
  PreauthRequest,
  InsuranceClaim
};
