const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema(
  {
    contractNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    parties: [
      {
        type: String,
        required: true
      }
    ],
    contractType: {
      type: String,
      enum: ['vendor', 'employment', 'clinical_partnership', 'lease', 'nda', 'service_sla', 'other'],
      default: 'vendor'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'under_renewal', 'expired', 'terminated'],
      default: 'active',
      index: true
    },
    isConfidential: {
      type: Boolean,
      default: true
    },
    documentUrl: {
      type: String,
      required: true
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

contractSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Contract', contractSchema);
