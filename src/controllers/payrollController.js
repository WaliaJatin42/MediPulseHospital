const Payroll = require('../models/Payroll');
const PayrollRun = require('../models/PayrollRun');
const { runMonthlyPayroll } = require('../services/payrollService');
const { paginate } = require('../utils/pagination');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Run monthly payroll calculation (supports dry-run)
// @route   POST /api/v1/payroll/run or POST /api/payroll/run
// @access  Private (SuperAdmin only)
const triggerPayrollRun = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Superadmin can run hospital payroll.'
      });
    }

    const { month, dryRun = false } = req.body;

    const result = await runMonthlyPayroll({
      month,
      isDryRun: !!dryRun,
      caller: req.user,
      req
    });

    res.status(200).json({
      success: true,
      message: dryRun
        ? `Dry-run completed for ${result.month}. No records committed.`
        : `Payroll run ${result.runId} successfully generated and committed for ${result.month}.`,
      data: result
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] triggerPayrollRun failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List payroll runs and statuses
// @route   GET /api/v1/payroll or GET /api/payroll
// @access  Private (SuperAdmin, Finance Admin, HR Admin)
const getPayrollRuns = async (req, res, next) => {
  try {
    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isFinanceOrHR = caller.role === 'admin' && (caller.department === 'finance' || caller.department === 'hr');

    if (!isSuperAdmin && !isFinanceOrHR) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Superadmin, Finance Admin, and HR Admin can view payroll run summaries.'
      });
    }

    const result = await paginate(PayrollRun, {}, req.query, {
      populate: [
        { path: 'createdBy', select: 'name email' },
        { path: 'approvedBy', select: 'name email' },
        { path: 'disbursementConfirmedBy', select: 'name email' }
      ],
      sort: { createdAt: -1 },
      dateField: 'createdAt'
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Payroll Controller Error] getPayrollRuns failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get per-employee breakdown for a specific payroll run
// @route   GET /api/v1/payroll/:runId or GET /api/payroll/:runId
// @access  Private (SuperAdmin, Finance Admin, HR Admin)
const getPayrollRunById = async (req, res, next) => {
  try {
    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isFinanceOrHR = caller.role === 'admin' && (caller.department === 'finance' || caller.department === 'hr');

    if (!isSuperAdmin && !isFinanceOrHR) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: You do not have access to payroll run details.'
      });
    }

    const run = await PayrollRun.findOne({ runId: req.params.runId })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    const payslips = await Payroll.find({ runId: req.params.runId })
      .populate('user_id', 'name email employeeId department designation');

    res.status(200).json({
      success: true,
      run: run.toJSON(),
      count: payslips.length,
      payslips: payslips.map(p => p.toJSON())
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] getPayrollRunById failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get logged in user's own payslips
// @route   GET /api/v1/payroll/me or GET /api/payroll/me
// @access  Private (All authenticated staff)
const getMyPayslips = async (req, res, next) => {
  try {
    const result = await paginate(Payroll, {
      user_id: req.user._id,
      status: { $in: ['approved', 'paid', 'disbursed'] }
    }, req.query, {
      sort: { month: -1 },
      dateField: 'createdAt'
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Payroll Controller Error] getMyPayslips failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get logged in user's specific month payslip
// @route   GET /api/v1/payroll/me/:month/payslip or GET /api/payroll/me/:month/payslip
// @access  Private (Self)
const getMyMonthPayslip = async (req, res, next) => {
  try {
    const { month } = req.params;
    const payslip = await Payroll.findOne({
      user_id: req.user._id,
      month,
      status: { $in: ['approved', 'paid', 'disbursed'] }
    });

    if (!payslip) {
      return res.status(404).json({
        success: false,
        message: `No approved payslip found for month ${month}.`
      });
    }

    res.status(200).json({
      success: true,
      data: payslip.toJSON()
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] getMyMonthPayslip failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Approve payroll run
// @route   POST /api/v1/payroll/:runId/approve or POST /api/payroll/:runId/approve
// @access  Private (SuperAdmin only)
const approvePayrollRun = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Permission denied: Superadmin only.' });
    }

    const run = await PayrollRun.findOne({ runId: req.params.runId });
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (run.status === 'approved' || run.status === 'disbursed') {
      return res.status(400).json({ success: false, message: `Payroll run is already ${run.status}.` });
    }

    const beforeState = run.toJSON();

    run.status = 'approved';
    run.approvedBy = req.user._id;
    run.approvedAt = new Date();
    await run.save();

    await Payroll.updateMany({ runId: run.runId }, { status: 'approved' });

    await recordAuditLog({
      actor: req.user,
      action: 'APPROVE_PAYROLL_RUN',
      resource: 'payroll',
      resourceId: run.runId,
      before: beforeState,
      after: run.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Payroll run ${run.runId} has been approved.`,
      run: run.toJSON()
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] approvePayrollRun failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Reverse payroll run
// @route   POST /api/v1/payroll/:runId/reverse or POST /api/payroll/:runId/reverse
// @access  Private (SuperAdmin only)
const reversePayrollRun = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Permission denied: Superadmin only.' });
    }

    const { reason } = req.body;
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ success: false, message: 'A mandatory reversal reason must be provided.' });
    }

    const run = await PayrollRun.findOne({ runId: req.params.runId });
    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (run.status === 'reversed') {
      return res.status(400).json({ success: false, message: 'This payroll run is already reversed.' });
    }

    const beforeState = run.toJSON();

    run.status = 'reversed';
    run.reversedBy = req.user._id;
    run.reversedAt = new Date();
    run.reversalReason = reason.trim();
    await run.save();

    await Payroll.updateMany({ runId: run.runId }, { status: 'reversed', remarks: `Reversed: ${reason}` });

    await recordAuditLog({
      actor: req.user,
      action: 'REVERSE_PAYROLL_RUN',
      resource: 'payroll',
      resourceId: run.runId,
      before: beforeState,
      after: run.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Payroll run ${run.runId} has been reversed.`,
      run: run.toJSON()
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] reversePayrollRun failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  triggerPayrollRun,
  getPayrollRuns,
  getPayrollRunById,
  getMyPayslips,
  getMyMonthPayslip,
  approvePayrollRun,
  reversePayrollRun
};
