const mongoose = require('mongoose');

const patrolLogSchema = new mongoose.Schema(
  {
    officer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    officerName: {
      type: String,
      default: ''
    },
    checkpoint: {
      type: String,
      required: true // e.g. North Perimeter, Oxygen Plant, Medical Records Vault, Morgue
    },
    scannedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['all_clear', 'irregularity_noted', 'hazard_reported'],
      default: 'all_clear'
    },
    observations: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

patrolLogSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('PatrolLog', patrolLogSchema);
