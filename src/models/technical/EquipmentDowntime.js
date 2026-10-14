const mongoose = require('mongoose');

const equipmentDowntimeSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicalAsset',
      required: true,
      index: true
    },
    assetName: {
      type: String,
      default: ''
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      default: null
    },
    durationMinutes: {
      type: Number,
      default: 0
    },
    cause: {
      type: String,
      required: true
    },
    impact: {
      type: String,
      enum: ['negligible', 'minor', 'moderate', 'severe_clinical_impact'],
      default: 'moderate'
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolutionSummary: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

equipmentDowntimeSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('EquipmentDowntime', equipmentDowntimeSchema);
