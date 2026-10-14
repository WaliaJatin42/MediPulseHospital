const mongoose = require('mongoose');

const jobLockSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    lockedBy: {
      type: String,
      default: process.pid ? `pid-${process.pid}` : 'node-instance'
    },
    lockedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0s' } // TTL index automatically clears expired locks
    }
  },
  {
    timestamps: true
  }
);

/**
 * Acquire a distributed lock for a job with duration in milliseconds
 */
jobLockSchema.statics.acquire = async function (jobName, durationMs = 60000, holder = `pid-${process.pid}`) {
  const expiresAt = new Date(Date.now() + durationMs);
  try {
    const lock = await this.findOneAndUpdate(
      {
        jobName,
        $or: [{ expiresAt: { $lt: new Date() } }, { expiresAt: { $exists: false } }]
      },
      {
        jobName,
        lockedBy: holder,
        lockedAt: new Date(),
        expiresAt
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );
    return lock;
  } catch (err) {
    // Duplicate key error means another instance holds the lock
    return null;
  }
};

/**
 * Release a distributed lock
 */
jobLockSchema.statics.release = async function (jobName, holder = `pid-${process.pid}`) {
  return await this.deleteOne({ jobName, lockedBy: holder });
};

const JobLock = mongoose.model('JobLock', jobLockSchema);

module.exports = JobLock;
