const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    consentType: {
      type: String,
      enum: ['treatment', 'data_sharing', 'research', 'portal_proxy', 'teleconsult', 'surgery'],
      required: true
    },
    status: {
      type: String,
      enum: ['granted', 'revoked'],
      default: 'granted',
      index: true
    },
    grantedAt: {
      type: Date,
      default: Date.now
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokeReason: {
      type: String,
      default: ''
    },
    witnessName: {
      type: String,
      default: ''
    },
    proxyUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    signatureRef: {
      type: String,
      default: ''
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const Consent = mongoose.model('Consent', consentSchema);

module.exports = Consent;
