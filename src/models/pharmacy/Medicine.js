const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medicine brand name is required'],
      trim: true,
      index: true
    },
    genericName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true, // e.g. Antibiotics, Analgesics, Cardiac, etc.
      trim: true,
      index: true
    },
    dosageForm: {
      type: String,
      default: 'Tablet' // Tablet, Capsule, Syrup, Injection, Ointment
    },
    strength: {
      type: String,
      default: '' // e.g. 500mg, 10ml
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    reorderLevel: {
      type: Number,
      default: 50,
      min: 0
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0
    },
    isControlledSubstance: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'discontinued'],
      default: 'active'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

medicineSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Medicine', medicineSchema);
