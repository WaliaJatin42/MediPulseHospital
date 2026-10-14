const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema(
  {
    doorLocation: {
      type: String,
      required: true,
      index: true
    },
    cardId: {
      type: String,
      default: ''
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    userName: {
      type: String,
      default: 'Unknown'
    },
    granted: {
      type: Boolean,
      required: true
    },
    reason: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

accessLogSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('AccessLog', accessLogSchema);
