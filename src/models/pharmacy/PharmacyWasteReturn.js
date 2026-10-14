const mongoose = require('mongoose');

const pharmacyWasteReturnSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['return', 'wastage'],
      required: true,
      index: true
    },
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true
    },
    batchNo: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      required: true, // e.g. Expired, Damaged, Recalled, Overstock
      trim: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
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

pharmacyWasteReturnSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('PharmacyWasteReturn', pharmacyWasteReturnSchema);
