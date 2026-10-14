const mongoose = require('mongoose');

const billingAccountSchema = new mongoose.Schema(
  {
    accountNo: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
      index: true
    },
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      default: null
    },
    accountType: {
      type: String,
      enum: ['opd', 'ipd', 'emergency', 'daycare'],
      default: 'opd'
    },
    status: {
      type: String,
      enum: ['open', 'invoiced', 'closed'],
      default: 'open',
      index: true
    },
    totalCharges: {
      type: Number,
      default: 0
    },
    totalDiscounts: {
      type: Number,
      default: 0
    },
    totalDeposits: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      default: 0
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    balanceDue: {
      type: Number,
      default: 0
    },
    payerCoverage: {
      payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payer' },
      preauthAmount: { type: Number, default: 0 },
      approvedAmount: { type: Number, default: 0 },
      patientCoPay: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

const BillingAccount = mongoose.model('BillingAccount', billingAccountSchema);

module.exports = BillingAccount;
