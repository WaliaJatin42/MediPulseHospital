const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    startTime: {
      type: String, // 'HH:MM' (24-hour format e.g. '22:00')
      required: true
    },
    endTime: {
      type: String, // 'HH:MM' (e.g. '07:00')
      required: true
    },
    crossesMidnight: {
      type: Boolean,
      default: false
    },
    breakMinutes: {
      type: Number,
      default: 60
    },
    nightAllowance: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
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

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;
