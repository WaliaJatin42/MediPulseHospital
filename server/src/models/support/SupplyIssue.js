const mongoose = require('mongoose');

const supplyIssueSchema = new mongoose.Schema(
  {
    supplyItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplyItem',
      required: true
    },
    supplyName: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    issuedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true
    },
    purpose: {
      type: String,
      required: true
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

supplyIssueSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('SupplyIssue', supplyIssueSchema);
