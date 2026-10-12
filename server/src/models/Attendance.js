const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    date: {
      type: String,
      required: [true, 'Attendance date (YYYY-MM-DD) is required'],
      index: true
    },
    punchIn: {
      type: Date,
      required: true,
      default: Date.now
    },
    punchOut: {
      type: Date,
      default: null
    },
    totalWorkMinutes: {
      type: Number,
      default: 0
    },
    totalWorkHours: {
      type: Number,
      default: 0
    },
    shiftRequiredHours: {
      type: Number,
      default: 9 // 9-hour work policy
    },
    isShiftCompleted: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['punched_in', 'present', 'late', 'half_day', 'short_hours', 'absent', 'on_leave'],
      default: 'punched_in'
    },
    workMode: {
      type: String,
      enum: ['on_site', 'remote', 'field_duty'],
      default: 'on_site'
    },
    department: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Unique index per user per date
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

attendanceSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
