const mongoose = require('mongoose');

const calendarHolidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String, // 'YYYY-MM-DD'
      required: true,
      index: true
    },
    year: {
      type: Number,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['public', 'restricted'],
      default: 'public'
    },
    departments: {
      type: [String],
      default: [] // Empty array means all departments observe this holiday
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

calendarHolidaySchema.index({ date: 1, name: 1 }, { unique: true });

const CalendarHoliday = mongoose.model('CalendarHoliday', calendarHolidaySchema);

module.exports = CalendarHoliday;
