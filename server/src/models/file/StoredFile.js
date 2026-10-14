const mongoose = require('mongoose');

const storedFileSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      required: true,
      index: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    filename: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['hr_document', 'contract', 'incident_evidence', 'receipt', 'license', 'medical_record'],
      default: 'hr_document'
    },
    confidential: {
      type: Boolean,
      default: false
    },
    checksum: {
      type: String, // SHA-256
      default: ''
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    storageKey: {
      type: String,
      required: true
    },
    uploadStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'deleted'],
      default: 'pending'
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const StoredFile = mongoose.model('StoredFile', storedFileSchema);

module.exports = StoredFile;
