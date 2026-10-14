const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    leaveType: {
      type: String,
      default: 'casual'
    },
    startDate: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    endDate: {
      type: String, // YYYY-MM-DD
      required: true
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    documentRef: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true
    },
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decisionNotes: {
      type: String,
      default: ''
    },
    decisionAt: {
      type: Date,
      default: null
    },
    approvals: [
      {
        level: String, // 'department' or 'hr'
        approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        decision: String,
        remarks: String,
        decidedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

leaveSchema.pre('save', function (next) {
  if (this.user && !this.userId) {
    this.userId = this.user;
  } else if (this.userId && !this.user) {
    this.user = this.userId;
  }
  next();
});

leaveSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Leave', leaveSchema);
