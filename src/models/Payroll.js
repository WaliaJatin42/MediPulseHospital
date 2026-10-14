const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      index: true
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id is required'],
      index: true
    },
    employeeId: {
      type: String,
      default: ''
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
      type: String, // Format: YYYY-MM
      required: [true, 'Payroll month (YYYY-MM) is required'],
      index: true
    },
    baseSalary: {
      type: Number,
      required: [true, 'baseSalary is required'],
      min: [0, 'Base salary cannot be negative']
    },
    allowances: {
      type: Number,
      default: 0
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
    paidLeaveDays: {
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
    grossSalary: {
      type: Number,
      default: 0
    },
    deductions: {
      type: Number,
      default: 0
    },
    calculatedSalary: {
      type: Number,
      required: [true, 'calculatedSalary is required'],
      min: [0, 'Calculated salary cannot be negative']
    },
    netSalary: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'approved', 'paid', 'reversed'],
      default: 'paid',
      index: true
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
    },
    // Detailed itemized breakdown
    overtimeHours: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 },
    advancesDeducted: { type: Number, default: 0 },
    arrears: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    variableEarnings: { type: Number, default: 0 },
    statutoryBreakdown: {
      pfEmployee: { type: Number, default: 0 },
      pfEmployer: { type: Number, default: 0 },
      insuranceEmployee: { type: Number, default: 0 },
      insuranceEmployer: { type: Number, default: 0 },
      tax: { type: Number, default: 0 }
    },
    splitTransfers: [
      {
        department: String,
        days: Number,
        amount: Number
      }
    ],
    isPayslipVisible: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index per employee per month per run (or per month for non-reversed)
payrollSchema.index({ user_id: 1, month: 1, runId: 1 });

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
