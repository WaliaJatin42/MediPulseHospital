const mongoose = require('mongoose');

const rosterSwapRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    requesterRosterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roster',
      required: true
    },
    targetRosterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roster',
      required: true
    },
    department: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decisionAt: {
      type: Date
    },
    decisionRemarks: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const RosterSwapRequest = mongoose.model('RosterSwapRequest', rosterSwapRequestSchema);

module.exports = RosterSwapRequest;
