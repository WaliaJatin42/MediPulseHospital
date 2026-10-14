const mongoose = require('mongoose');

const payrollPolicySchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      unique: true
    },
    effectiveDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true
    },
    workingHoursPerDay: {
      type: Number,
      default: 9
    },
    fullDayMinHours: {
      type: Number,
      default: 8
    },
    halfDayMinHours: {
      type: Number,
      default: 4
    },
    graceMinutes: {
      type: Number,
      default: 15
    },
    lateMarksPerHalfDay: {
      type: Number,
      default: 3
    },
    weeklyOffDays: {
      type: [String],
      default: ['Sunday']
    },
    overtime: {
      enabled: { type: Boolean, default: true },
      thresholdHours: { type: Number, default: 9 },
      rateMultiplier: { type: Number, default: 1.5 },
      weeklyOffMultiplier: { type: Number, default: 2.0 },
      holidayMultiplier: { type: Number, default: 2.0 },
      maxOvertimeHoursPerMonth: { type: Number, default: 40 },
      requiresApproval: { type: Boolean, default: true }
    },
    leaveTreatment: {
      casual: { type: String, enum: ['paid', 'unpaid'], default: 'paid' },
      sick: { type: String, enum: ['paid', 'unpaid'], default: 'paid' },
      earned: { type: String, enum: ['paid', 'unpaid'], default: 'paid' },
      unpaid: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' }
    },
    payableDaysFormula: {
      type: String,
      enum: ['calendarDays', 'workingDays'],
      default: 'calendarDays'
    },
    rounding: {
      salaryRounding: { type: String, enum: ['round', 'ceil', 'floor'], default: 'round' },
      nearestInteger: { type: Number, default: 1 }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

const PayrollPolicy = mongoose.model('PayrollPolicy', payrollPolicySchema);

module.exports = PayrollPolicy;
