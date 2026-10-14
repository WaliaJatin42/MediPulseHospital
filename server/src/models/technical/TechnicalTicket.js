const mongoose = require('mongoose');

const technicalTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TechnicalAsset',
      default: null
    },
    category: {
      type: String,
      enum: ['hardware', 'software', 'network_wifi', 'printer', 'biomedical_device', 'email_telephony', 'other'],
      default: 'software'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    resolution: {
      type: String,
      default: ''
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

technicalTicketSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('TechnicalTicket', technicalTicketSchema);
