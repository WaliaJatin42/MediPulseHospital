const mongoose = require('mongoose');

const portalAccountSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      unique: true,
      index: true
    },
    uhid: {
      type: String,
      required: true,
      index: true
    },
    phone: {
      type: String,
      required: true,
      index: true
    },
    otpSecret: {
      type: String,
      default: '123456' // In dev/demo; replaced by SMS gateway OTP in prod
    },
    otpExpiresAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['active', 'locked', 'suspended'],
      default: 'active'
    },
    familyProxies: [
      {
        dependantPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
        relationship: { type: String, required: true },
        hasConsent: { type: Boolean, default: true }
      }
    ]
  },
  {
    timestamps: true
  }
);

const PortalAccount = mongoose.model('PortalAccount', portalAccountSchema);

module.exports = PortalAccount;
