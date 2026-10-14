const mongoose = require('mongoose');

const billingChargeSchema = new mongoose.Schema(
  {
    billingAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillingAccount',
      required: true,
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
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceItem'
    },
    serviceName: {
      type: String,
      required: true
    },
    department: {
      type: String,
      default: 'clinical'
    },
    rate: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    totalAmount: {
      type: Number,
      required: true
    },
    sourceType: {
      type: String,
      enum: ['order', 'pharmacy', 'bed_rent', 'nursing', 'ot', 'ambulance', 'appointment', 'manual'],
      default: 'manual'
    },
    sourceId: {
      type: String
    },
    status: {
      type: String,
      enum: ['posted', 'cancelled'],
      default: 'posted',
      index: true
    },
    cancelReason: {
      type: String
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const BillingCharge = mongoose.model('BillingCharge', billingChargeSchema);

module.exports = BillingCharge;
