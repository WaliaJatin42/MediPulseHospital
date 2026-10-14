const mongoose = require('mongoose');

const softwareLicenseSchema = new mongoose.Schema(
  {
    softwareName: {
      type: String,
      required: true,
      trim: true
    },
    vendor: {
      type: String,
      required: true
    },
    licenseKey: {
      type: String,
      required: true
    },
    seatsTotal: {
      type: Number,
      required: true,
      min: 1
    },
    seatsUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    expiryDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

softwareLicenseSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('SoftwareLicense', softwareLicenseSchema);
