const mongoose = require('mongoose');

const rosterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true
    },
    date: {
      type: String, // 'YYYY-MM-DD' - Start date of the shift
      required: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'swapped', 'cancelled'],
      default: 'scheduled'
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

rosterSchema.index({ userId: 1, date: 1 }, { unique: true });

const Roster = mongoose.model('Roster', rosterSchema);

module.exports = Roster;
