const mongoose = require('mongoose');

const legalPolicySchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['clinical_ethics', 'data_privacy', 'code_of_conduct', 'whistleblower', 'health_safety', 'anti_harassment'],
      default: 'code_of_conduct'
    },
    version: {
      type: String,
      default: '1.0'
    },
    summary: {
      type: String,
      required: true
    },
    documentUrl: {
      type: String,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

legalPolicySchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('LegalPolicy', legalPolicySchema);
