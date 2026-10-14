const mongoose = require('mongoose');

const interBranchTransferSchema = new mongoose.Schema(
  {
    fromBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    toBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    transferType: {
      type: String,
      enum: ['stock', 'patient', 'sample', 'doctor_visit'],
      default: 'stock',
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null
    },
    items: [
      {
        itemId: { type: String },
        itemName: { type: String },
        batchNo: { type: String },
        quantity: { type: Number },
        unit: { type: String }
      }
    ],
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['in_transit', 'received', 'rejected', 'cancelled'],
      default: 'in_transit',
      index: true
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    receivedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const InterBranchTransfer = mongoose.model('InterBranchTransfer', interBranchTransferSchema);

module.exports = InterBranchTransfer;
