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
    isLate: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['punched_in', 'present', 'late', 'half_day', 'short_hours', 'absent', 'on_leave', 'holiday'],
      default: 'punched_in',
      index: true
    },
    workMode: {
      type: String,
      enum: ['on_site', 'remote', 'field_duty', 'night_shift'],
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
    },
    manualCorrection: {
      isCorrected: { type: Boolean, default: false },
      reason: { type: String, default: null },
      correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      correctedAt: { type: Date, default: null },
      previousStatus: { type: String, default: null }
    },
    // Fraud prevention & geofencing fields
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    deviceId: {
      type: String,
      default: null,
      index: true
    },
    photoRef: {
      type: String,
      default: null
    },
    clientIp: {
      type: String,
      default: ''
    },
    validationStatus: {
      type: String,
      enum: ['verified', 'pending_review', 'flagged'],
      default: 'verified',
      index: true
    },
    history: [
      {
        timestamp: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, default: '' },
        changes: { type: mongoose.Schema.Types.Mixed }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Virtual aliases
attendanceSchema.virtual('checkIn').get(function () {
  return this.punchIn;
});
attendanceSchema.virtual('checkOut').get(function () {
  return this.punchOut;
});

// Unique index per user per date
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

attendanceSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
