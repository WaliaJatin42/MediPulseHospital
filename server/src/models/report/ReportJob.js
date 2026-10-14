const mongoose = require('mongoose');

const reportJobSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      required: true,
      enum: [
        'attendance_summary',
        'late_and_absence',
        'overtime',
        'headcount',
        'attrition',
        'leave_utilization',
        'payroll_register',
        'statutory_contribution',
        'department_cost'
      ],
      index: true
    },
    format: {
      type: String,
      enum: ['json', 'csv', 'pdf'],
      default: 'json'
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    resultSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    downloadUrl: {
      type: String,
      default: ''
    },
    error: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const ReportJob = mongoose.model('ReportJob', reportJobSchema);

module.exports = ReportJob;
