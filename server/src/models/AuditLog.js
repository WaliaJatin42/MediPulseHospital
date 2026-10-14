const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    actorName: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      required: true,
      index: true
    },
    department: {
      type: String,
      default: ''
    },
    action: {
      type: String,
      required: true, // e.g. CREATE, UPDATE, DELETE, STATUS_CHANGE, DISBURSE, etc.
      index: true
    },
    resource: {
      type: String,
      required: true, // e.g. 'users', 'salaries', 'attendance', 'payroll', 'medicines', etc.
      index: true
    },
    resourceId: {
      type: String,
      default: null,
      index: true
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    previousHash: {
      type: String,
      required: true,
      default: '0000000000000000000000000000000000000000000000000000000000000000'
    },
    hash: {
      type: String,
      required: true,
      index: true
    },
    isConfidential: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Prevent modifications to maintain tamper-evident append-only guarantee
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    const err = new Error('AuditLog records are immutable and cannot be modified.');
    return next(err);
  }
  next();
});

auditLogSchema.pre('updateOne', function (next) {
  next(new Error('AuditLog collection is append-only. Updates are prohibited.'));
});

auditLogSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('AuditLog collection is append-only. Updates are prohibited.'));
});

auditLogSchema.pre('deleteOne', function (next) {
  next(new Error('AuditLog collection is append-only. Deletions are prohibited.'));
});

auditLogSchema.pre('findOneAndDelete', function (next) {
  next(new Error('AuditLog collection is append-only. Deletions are prohibited.'));
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
