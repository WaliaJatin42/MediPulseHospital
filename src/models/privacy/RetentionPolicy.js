const mongoose = require('mongoose');

const retentionPolicySchema = new mongoose.Schema(
  {
    resource: {
      type: String, // 'payroll', 'attendance', 'audit_logs', 'visitors', 'incident_evidence'
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    retentionYears: {
      type: Number,
      required: true,
      default: 7
    },
    action: {
      type: String,
      enum: ['archive', 'anonymize', 'delete'],
      default: 'anonymize'
    },
    description: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const RetentionPolicy = mongoose.model('RetentionPolicy', retentionPolicySchema);

module.exports = RetentionPolicy;
