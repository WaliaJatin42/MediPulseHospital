const mongoose = require('mongoose');

const weeklyOffSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    days: {
      type: [String],
      default: ['Sunday'] // e.g. ['Sunday'] or ['Friday', 'Saturday']
    },
    effectiveFrom: {
      type: Date,
      default: Date.now
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

const WeeklyOff = mongoose.model('WeeklyOff', weeklyOffSchema);

module.exports = WeeklyOff;
