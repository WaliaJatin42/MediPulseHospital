const mongoose = require('mongoose');

const complianceLicenseSchema = new mongoose.Schema(
  {
    licenseName: {
      type: String,
      required: true,
      trim: true
    },
    regulatoryBody: {
      type: String,
      required: true // e.g. "Department of Health", "Pharmacy Council", "Fire Safety Directorate", "Biomedical Waste Board"
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    issueDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true
    },
    renewalStatus: {
      type: String,
      enum: ['valid', 'expiring_soon', 'renewal_submitted', 'expired'],
      default: 'valid'
    },
    documentUrl: {
      type: String,
      default: ''
    },
    managedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

complianceLicenseSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ComplianceLicense', complianceLicenseSchema);
