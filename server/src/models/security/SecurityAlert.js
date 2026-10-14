const mongoose = require('mongoose');

const securityAlertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high',
      index: true
    },
    message: {
      type: String,
      required: true
    },
    location: {
      type: String,
      default: 'Hospital-wide'
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    broadcastedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

securityAlertSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('SecurityAlert', securityAlertSchema);
