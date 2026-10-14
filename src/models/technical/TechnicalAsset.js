const mongoose = require('mongoose');

const technicalAssetSchema = new mongoose.Schema(
  {
    assetTag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['computer', 'biomedical_device', 'networking', 'server', 'diagnostic_equipment', 'mobile_terminal', 'other'],
      required: true,
      index: true
    },
    serialNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    manufacturer: {
      type: String,
      default: ''
    },
    model: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      required: true,
      lowercase: true
    },
    location: {
      type: String,
      required: true
    },
    purchaseDate: {
      type: Date,
      default: null
    },
    warrantyExpiry: {
      type: Date,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['operational', 'maintenance', 'decommissioned'],
      default: 'operational',
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

technicalAssetSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('TechnicalAsset', technicalAssetSchema);
