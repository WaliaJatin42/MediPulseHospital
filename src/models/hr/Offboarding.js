const mongoose = require('mongoose');

const offboardingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    resignationDate: {
      type: Date,
      default: Date.now
    },
    lastWorkingDate: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    clearanceChecklist: [
      {
        department: { type: String, required: true },
        item: { type: String, required: true },
        cleared: { type: Boolean, default: false },
        clearedAt: { type: Date, default: null },
        clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
      }
    ],
    status: {
      type: String,
      enum: ['initiated', 'clearance_pending', 'cleared', 'exit_interview_completed', 'completed', 'cancelled'],
      default: 'initiated',
      index: true
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

offboardingSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Offboarding', offboardingSchema);
