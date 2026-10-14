const mongoose = require('mongoose');

const allergySchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    allergen: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['drug', 'food', 'environmental', 'other'],
      default: 'drug'
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'life_threatening'],
      default: 'moderate'
    },
    reaction: {
      type: String,
      default: ''
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const Allergy = mongoose.model('Allergy', allergySchema);

module.exports = Allergy;
