const mongoose = require('mongoose');

const jobRunSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
      index: true
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    endTime: {
      type: Date
    },
    durationMs: {
      type: Number
    },
    triggeredBy: {
      type: String,
      default: 'scheduler' // 'scheduler' or user ID / 'manual'
    },
    error: {
      type: String
    },
    logs: [
      {
        timestamp: { type: Date, default: Date.now },
        level: { type: String, default: 'info' },
        message: { type: String, required: true }
      }
    ]
  },
  {
    timestamps: true
  }
);

const JobRun = mongoose.model('JobRun', jobRunSchema);

module.exports = JobRun;
