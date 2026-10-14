const mongoose = require('mongoose');

const bonusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    type: {
      type: String, // 'performance', 'festival', 'retention', 'annual'
      default: 'performance'
    },
    payMonth: {
      type: String, // 'YYYY-MM'
      required: true,
      index: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'approved'
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

const Bonus = mongoose.model('Bonus', bonusSchema);

module.exports = Bonus;
