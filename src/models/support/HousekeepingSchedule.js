const mongoose = require('mongoose');

const housekeepingScheduleSchema = new mongoose.Schema(
  {
    areaLocation: {
      type: String,
      required: true // e.g. "ICU Ward 3", "OPD Waiting Hall", "Main Cafeteria", "Operation Theater 2"
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    scheduleDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    shift: {
      type: String,
      enum: ['morning', 'afternoon', 'night'],
      required: true
    },
    tasks: [
      {
        taskName: String,
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date, default: null }
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'inspected'],
      default: 'pending'
    },
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
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

housekeepingScheduleSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('HousekeepingSchedule', housekeepingScheduleSchema);
