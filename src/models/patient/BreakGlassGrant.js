const mongoose = require('mongoose');

const breakGlassGrantSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    reviewStatus: {
      type: String,
      enum: ['pending_review', 'justified', 'unjustified'],
      default: 'pending_review',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewRemarks: {
      type: String,
      default: ''
    },
    reviewedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

breakGlassGrantSchema.index({ userId: 1, patientId: 1, expiresAt: 1 });

const BreakGlassGrant = mongoose.model('BreakGlassGrant', breakGlassGrantSchema);

module.exports = BreakGlassGrant;
