const mongoose = require('mongoose');

const outboxEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
      enum: [
        'admission_created',
        'order_completed',
        'prescription_signed',
        'ot_case_ended',
        'discharge_initiated',
        'discharge_completed',
        'death_recorded',
        'doctor_leave_approved',
        'payment_received',
        'stock_transferred'
      ]
    },
    aggregateId: {
      type: String,
      required: true,
      index: true
    },
    aggregateType: {
      type: String,
      required: true
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
      index: true
    },
    retryCount: {
      type: Number,
      default: 0
    },
    error: {
      type: String,
      default: null
    },
    processedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

outboxEventSchema.index({ status: 1, createdAt: 1 });

const OutboxEvent = mongoose.model('OutboxEvent', outboxEventSchema);

module.exports = OutboxEvent;
