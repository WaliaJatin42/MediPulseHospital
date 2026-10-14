const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    token: {
      type: String,
      required: true,
      index: true
    },
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    device: {
      type: String,
      default: ''
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0s' } // MongoDB TTL index to auto-expire sessions
    }
  },
  {
    timestamps: true
  }
);

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
