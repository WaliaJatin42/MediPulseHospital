const mongoose = require('mongoose');

const taxSlabSchema = new mongoose.Schema(
  {
    financialYear: {
      type: String, // e.g. "2026-2027"
      required: true,
      index: true
    },
    regime: {
      type: String,
      enum: ['new', 'old', 'standard'],
      default: 'new'
    },
    standardDeduction: {
      type: Number,
      default: 75000
    },
    slabs: [
      {
        from: { type: Number, required: true },
        to: { type: Number, default: null }, // null means infinity / above
        ratePercent: { type: Number, required: true }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

taxSlabSchema.index({ financialYear: 1, regime: 1 }, { unique: true });

const TaxSlab = mongoose.model('TaxSlab', taxSlabSchema);

module.exports = TaxSlab;
