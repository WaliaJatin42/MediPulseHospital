const mongoose = require('mongoose');

const legalCaseSchema = new mongoose.Schema(
  {
    caseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    courtOrTribunal: {
      type: String,
      required: true // e.g. "High Court of Justice", "Labor Relations Board", "Consumer Disputes Commission"
    },
    opposingParty: {
      type: String,
      required: true
    },
    caseType: {
      type: String,
      enum: ['malpractice_defense', 'employment_dispute', 'regulatory_compliance', 'commercial_contract', 'other'],
      default: 'regulatory_compliance'
    },
    status: {
      type: String,
      enum: ['pre_litigation', 'filed', 'hearings_ongoing', 'settled', 'judgement_received', 'closed'],
      default: 'filed',
      index: true
    },
    nextHearingDate: {
      type: Date,
      default: null
    },
    externalCounsel: {
      type: String,
      default: ''
    },
    documents: [
      {
        title: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    notes: {
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

legalCaseSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('LegalCase', legalCaseSchema);
