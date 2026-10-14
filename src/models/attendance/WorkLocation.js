const mongoose = require('mongoose');

const workLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    radiusMeters: {
      type: Number,
      default: 200 // Default 200m geofence radius
    },
    allowedIpRanges: {
      type: [String],
      default: []
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

const WorkLocation = mongoose.model('WorkLocation', workLocationSchema);

module.exports = WorkLocation;
