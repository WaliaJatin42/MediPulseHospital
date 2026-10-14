const mongoose = require('mongoose');

const securityRosterSchema = new mongoose.Schema(
  {
    guard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    postLocation: {
      type: String, // e.g. Main Gate, ER Entrance, Pharmacy Vault, ICU Ward, Parking
      required: true
    },
    shiftDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    shiftType: {
      type: String,
      enum: ['morning', 'evening', 'night', 'rotating'],
      required: true
    },
    startTime: {
      type: String,
      required: true // e.g. "08:00"
    },
    endTime: {
      type: String,
      required: true // e.g. "17:00"
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['assigned', 'completed', 'swapped', 'absent'],
      default: 'assigned'
    }
  },
  {
    timestamps: true
  }
);

securityRosterSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('SecurityRoster', securityRosterSchema);
