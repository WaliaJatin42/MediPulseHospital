const mongoose = require('mongoose');

const arrearSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    fromMonth: {
      type: String, // 'YYYY-MM'
      required: true
    },
    toMonth: {
      type: String, // 'YYYY-MM'
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'applied', 'cancelled'],
      default: 'pending'
    },
    appliedInRunId: {
      type: String,
      default: null
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

const Arrear = mongoose.model('Arrear', arrearSchema);

module.exports = Arrear;
