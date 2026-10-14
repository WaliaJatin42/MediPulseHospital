const ReportJob = require('../models/report/ReportJob');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const Leave = require('../models/hr/Leave');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// All available report definitions
const AVAILABLE_REPORTS = [
  { type: 'attendance_summary', name: 'Attendance Summary Report', allowedRoles: ['superadmin', 'admin', 'supervisor'] },
  { type: 'late_and_absence', name: 'Late Arrivals & Absence Report', allowedRoles: ['superadmin', 'admin', 'supervisor'] },
  { type: 'overtime', name: 'Staff Overtime & Payout Report', allowedRoles: ['superadmin', 'admin'] },
  { type: 'headcount', name: 'Hospital Headcount Distribution', allowedRoles: ['superadmin', 'admin'] },
  { type: 'attrition', name: 'Staff Turnover & Attrition', allowedRoles: ['superadmin', 'admin'] },
  { type: 'leave_utilization', name: 'Leave Utilization & Balance Report', allowedRoles: ['superadmin', 'admin', 'supervisor'] },
  { type: 'payroll_register', name: 'Monthly Payroll Register', allowedRoles: ['superadmin', 'admin'] },
  { type: 'statutory_contribution', name: 'PF & ESI Statutory Contributions', allowedRoles: ['superadmin', 'admin'] },
  { type: 'department_cost', name: 'Departmental Salary Cost Center', allowedRoles: ['superadmin', 'admin'] }
];

// @desc    List available reports for caller's role
// @route   GET /api/v1/reports
// @access  Private
const getAvailableReports = async (req, res, next) => {
  try {
    const callerRole = req.user.role;
    const allowed = AVAILABLE_REPORTS.filter((r) => r.allowedRoles.includes(callerRole));
    res.status(200).json({ success: true, count: allowed.length, reports: allowed, data: allowed });
  } catch (error) {
    logger.error(`[Reports Error] ${error.message}`);
    next(error);
  }
};

// @desc    Trigger async report generation job
// @route   POST /api/v1/reports/:type/generate
// @access  Private
const generateReportJob = async (req, res, next) => {
  try {
    const reportType = req.params.type;
    const { format = 'json', filters = {} } = req.body;

    const reportDef = AVAILABLE_REPORTS.find((r) => r.type === reportType);
    if (!reportDef) {
      return res.status(404).json({ success: false, message: `Report type '${reportType}' is invalid.` });
    }

    if (!reportDef.allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Cannot generate this report.' });
    }

    const job = await ReportJob.create({
      reportType,
      format,
      filters,
      generatedBy: req.user._id,
      status: 'processing'
    });

    // Execute generation asynchronously
    (async () => {
      try {
        let resultSummary = {};

        if (reportType === 'headcount') {
          const count = await User.countDocuments({ status: 'active', isDeleted: false });
          const depts = await User.aggregate([
            { $match: { status: 'active', isDeleted: false } },
            { $group: { _id: '$department', total: { $sum: 1 } } }
          ]);
          resultSummary = { totalStaff: count, byDepartment: depts };
        } else if (reportType === 'payroll_register') {
          const month = filters.month || new Date().toISOString().substring(0, 7);
          const payslips = await Payroll.find({ month });
          const totalNet = payslips.reduce((s, p) => s + p.netSalary, 0);
          resultSummary = { month, totalPayslips: payslips.length, totalNetPayout: totalNet };
        } else if (reportType === 'attendance_summary') {
          const month = filters.month || new Date().toISOString().substring(0, 7);
          const totalPunches = await Attendance.countDocuments({ date: { $regex: `^${month}` } });
          resultSummary = { month, totalRecordedPunches: totalPunches };
        } else {
          resultSummary = { message: `Report data compiled for ${reportType}` };
        }

        job.status = 'completed';
        job.resultSummary = resultSummary;
        job.downloadUrl = `/api/v1/reports/jobs/${job._id}/download`;
        await job.save();
      } catch (err) {
        job.status = 'failed';
        job.error = err.message;
        await job.save();
      }
    })();

    await recordAuditLog({
      actor: req.user,
      action: 'GENERATE_REPORT_JOB',
      resource: 'reports',
      resourceId: job._id.toString(),
      after: { reportType, format },
      req
    });

    res.status(201).json({
      success: true,
      message: `Report job for '${reportDef.name}' initiated`,
      jobId: job._id,
      status: job.status,
      data: {
        jobId: job._id,
        status: job.status
      }
    });
  } catch (error) {
    logger.error(`[Generate Report Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get report job status
// @route   GET /api/v1/reports/jobs/:id
// @access  Private
const getReportJobStatus = async (req, res, next) => {
  try {
    const job = await ReportJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Report job not found' });

    res.status(200).json({
      success: true,
      jobId: job._id,
      reportType: job.reportType,
      status: job.status,
      downloadUrl: job.status === 'completed' ? job.downloadUrl : null,
      resultSummary: job.resultSummary,
      error: job.error,
      data: job
    });
  } catch (error) {
    logger.error(`[Report Job Status Error] ${error.message}`);
    next(error);
  }
};

// @desc    Download completed report
// @route   GET /api/v1/reports/jobs/:id/download
// @access  Private
const downloadReport = async (req, res, next) => {
  try {
    const job = await ReportJob.findById(req.params.id);
    if (!job || job.status !== 'completed') {
      return res.status(404).json({ success: false, message: 'Completed report not found' });
    }

    await recordAuditLog({
      actor: req.user,
      action: 'DOWNLOAD_REPORT',
      resource: 'reports',
      resourceId: job._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      reportType: job.reportType,
      generatedAt: job.updatedAt,
      data: job.resultSummary
    });
  } catch (error) {
    logger.error(`[Download Report Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  getAvailableReports,
  generateReportJob,
  getReportJobStatus,
  downloadReport
};
