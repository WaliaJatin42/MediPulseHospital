const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id is required'],
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
    month: {
      type: String, // Format: YYYY-MM, e.g., '2026-09'
      required: [true, 'Payroll month (YYYY-MM) is required'],
      index: true
    },
    baseSalary: {
      type: Number,
      required: [true, 'baseSalary is required'],
      min: [0, 'Base salary cannot be negative']
    },
    totalDaysInMonth: {
      type: Number,
      required: true,
      default: 30
    },
    presentDays: {
      type: Number,
      default: 0
    },
    halfDays: {
      type: Number,
      default: 0
    },
    shortHoursDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    payableDays: {
      type: Number,
      default: 0
    },
    calculatedSalary: {
      type: Number,
      required: [true, 'calculatedSalary is required'],
      min: [0, 'Calculated salary cannot be negative']
    },
    deductions: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'paid'],
      default: 'paid'
    },
    disbursedAt: {
      type: Date,
      default: Date.now
    },
    transactionReference: {
      type: String,
      unique: true,
      index: true
    },
    processedAutomatically: {
      type: Boolean,
      default: true
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index: Each employee can only have one payroll record per month
payrollSchema.index({ user_id: 1, month: 1 }, { unique: true });

// Virtual aliases
payrollSchema.virtual('userId').get(function () {
  return this.user_id;
});
payrollSchema.virtual('userName').get(function () {
  return this.user_name;
});

payrollSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Payroll = mongoose.model('Payroll', payrollSchema);

module.exports = Payroll;
