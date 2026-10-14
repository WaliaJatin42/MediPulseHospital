const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    incidentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true
    },
    location: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
      index: true
    },
    evidence: [
      {
        url: String,
        description: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    closedAt: {
      type: Date,
      default: null
    },
    isClosed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Prevent modification once incident is closed (Immutability guarantee)
incidentSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified() && this.isClosed && !this.isModified('isClosed')) {
    const err = new Error('Closed incidents are immutable and cannot be modified.');
    return next(err);
  }
  next();
});

incidentSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Incident', incidentSchema);
