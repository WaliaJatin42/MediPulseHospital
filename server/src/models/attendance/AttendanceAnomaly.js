const mongoose = require('mongoose');

const attendanceAnomalySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    attendanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attendance'
    },
    type: {
      type: String,
      enum: ['outside_geofence', 'unauthorized_device', 'multiple_users_same_device', 'impossible_travel', 'identical_timestamps', 'unapproved_ip'],
      required: true,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'dismissed'],
      default: 'pending',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    reviewNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const AttendanceAnomaly = mongoose.model('AttendanceAnomaly', attendanceAnomalySchema);

module.exports = AttendanceAnomaly;
