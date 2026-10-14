const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    targetEmail: {
      type: String,
      required: true
    },
    requestType: {
      type: String,
      enum: ['password_reset', 'provision_system', 'revoke_access', 'vpn_access'],
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'executed', 'rejected'],
      default: 'pending',
      index: true
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    executedAt: {
      type: Date,
      default: null
    },
    executionAuditLog: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

accessRequestSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
