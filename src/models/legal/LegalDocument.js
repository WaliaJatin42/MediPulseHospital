const mongoose = require('mongoose');

const legalDocumentSchema = new mongoose.Schema(
  {
    documentNumber: {
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
      enum: ['litigation', 'confidential_mou', 'intellectual_property', 'executive_minutes', 'regulatory_filing', 'audit_report', 'other'],
      default: 'confidential_mou'
    },
    isConfidential: {
      type: Boolean,
      default: true,
      index: true
    },
    allowedRoles: [
      {
        type: String,
        enum: ['superadmin', 'admin', 'supervisor', 'user']
      }
    ],
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    fileUrl: {
      type: String,
      required: true
    },
    accessLogs: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        userRole: String,
        accessedAt: { type: Date, default: Date.now },
        ip: String
      }
    ],
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

legalDocumentSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('LegalDocument', legalDocumentSchema);
