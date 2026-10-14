const mongoose = require('mongoose');

const cpoeOrderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      default: null
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null
    },
    type: {
      type: String,
      enum: ['lab', 'radiology', 'procedure', 'diet', 'consult', 'pharmacy'],
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: ['routine', 'urgent', 'stat'],
      default: 'routine'
    },
    clinicalNote: {
      type: String,
      default: ''
    },
    items: [
      {
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem' },
        name: { type: String, required: true },
        code: { type: String },
        price: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 },
        specimen: { type: String, default: '' },
        instructions: { type: String, default: '' }
      }
    ],
    status: {
      type: String,
      enum: ['ordered', 'acknowledged', 'in-progress', 'completed', 'cancelled'],
      default: 'ordered',
      index: true
    },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String },
    orderedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

cpoeOrderSchema.index({ type: 1, status: 1 });
cpoeOrderSchema.index({ patientId: 1, createdAt: -1 });

const CpoeOrder = mongoose.model('CpoeOrder', cpoeOrderSchema);

module.exports = CpoeOrder;
