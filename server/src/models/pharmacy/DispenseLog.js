const mongoose = require('mongoose');

const dispenseLogSchema = new mongoose.Schema(
  {
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockBatch',
      required: true
    },
    batchNo: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    dispensedTo: {
      type: String,
      required: true,
      trim: true
    },
    isControlledSubstance: {
      type: Boolean,
      default: false,
      index: true
    },
    dispensedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dispenserName: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

dispenseLogSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('DispenseLog', dispenseLogSchema);
