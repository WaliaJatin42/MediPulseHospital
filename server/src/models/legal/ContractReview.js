const mongoose = require('mongoose');

const contractReviewSchema = new mongoose.Schema(
  {
    reviewNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true
    },
    title: {
      type: String,
      required: true
    },
    contractDocUrl: {
      type: String,
      required: true
    },
    urgency: {
      type: String,
      enum: ['standard', 'urgent', 'immediate'],
      default: 'standard'
    },
    status: {
      type: String,
      enum: ['submitted', 'in_review', 'revisions_requested', 'cleared', 'rejected'],
      default: 'submitted',
      index: true
    },
    legalNotes: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

contractReviewSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ContractReview', contractReviewSchema);
