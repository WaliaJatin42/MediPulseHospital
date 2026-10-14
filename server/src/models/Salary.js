const mongoose = require('mongoose');

const salaryRevisionSchema = new mongoose.Schema({
  revisionNumber: { type: Number, required: true },
  basic: { type: Number, required: true, default: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  salary: { type: Number, required: true }, // net base salary
  effectiveFrom: { type: Date, required: true, default: Date.now },
  effectiveUntil: { type: Date, default: null },
  reason: { type: String, default: 'Initial assignment' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const salarySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id is required'],
      unique: true,
      index: true
    },
    user_name: {
      type: String,
      required: [true, 'user_name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'department is required'],
      trim: true,
      index: true
    },
    designation: {
      type: String,
      required: [true, 'designation is required'],
      trim: true
    },
    basic: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Basic cannot be negative']
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances cannot be negative']
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative']
    },
    salary: {
      type: Number,
      required: [true, 'salary is required'],
      min: [0, 'salary cannot be negative'],
      default: 0
    },
    effectiveFrom: {
      type: Date,
      required: true,
      default: Date.now
    },
    currentRevision: {
      type: Number,
      default: 1
    },
    revisions: [salaryRevisionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Virtual aliases for camelCase compatibility
salarySchema.virtual('userId').get(function () {
  return this.user_id;
});
salarySchema.virtual('userName').get(function () {
  return this.user_name;
});
salarySchema.virtual('createdAt').get(function () {
  return this.created_at;
});
salarySchema.virtual('updatedAt').get(function () {
  return this.updated_at;
});

salarySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Salary = mongoose.model('Salary', salarySchema);

module.exports = Salary;
