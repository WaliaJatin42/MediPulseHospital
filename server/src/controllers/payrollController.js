const Payroll = require('../models/Payroll');
const { calculateAndDisburseMonthlyPayroll } = require('../services/payrollService');
const logger = require('../utils/logger');

const isHRRole = (user) => {
  if (!user) return false;
  const dept = (user.department || '').toLowerCase();
  const desig = (user.designation || '').toLowerCase();
  return dept === 'hr' || desig.includes('hr');
};

const canManagePayroll = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if ((user.role === 'admin' || user.role === 'supervisor') && isHRRole(user)) {
    return true;
  }
  return false;
};

// @desc    Process / Trigger monthly payroll calculation based on attendance
// @route   POST /api/v1/payroll/process
// @access  Private (SuperAdmin, HR Admin only)
const processMonthlyPayroll = async (req, res, next) => {
  try {
    if (!canManagePayroll(req.user)) {
      logger.warn(`[Payroll Controller] Permission denied: ${req.user.email} (${req.user.role}) attempted to trigger payroll process`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin or HR Admin can trigger payroll calculation.'
      });
    }

    const { month, forceRecalculate, grantFullIfNoRecords } = req.body;

    logger.info(`[Payroll Controller] Manual payroll execution triggered by ${req.user.email} for month: ${month || 'previous month'}`);

    const result = await calculateAndDisburseMonthlyPayroll(month, {
      forceRecalculate: !!forceRecalculate,
      grantFullIfNoRecords: !!grantFullIfNoRecords,
      processedAutomatically: false
    });

    res.status(200).json({
      success: true,
      message: `Monthly payroll processed successfully for month ${result.month}`,
      data: result
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] processMonthlyPayroll failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get monthly payroll records list
// @route   GET /api/v1/payroll
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const getMonthlyPayrolls = async (req, res, next) => {
  try {
    if (!canManagePayroll(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin, HR Admin, or Supervisors under HR department can view all payroll records.'
      });
    }

    let filter = {};
    const { month, department, status, search } = req.query;

    if (month) filter.month = month;
    if (department) filter.department = department.toLowerCase();
    if (status) filter.status = status;

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { user_name: searchRegex },
        { department: searchRegex },
        { designation: searchRegex },
        { transactionReference: searchRegex }
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await Payroll.countDocuments(filter);
    const payrolls = await Payroll.find(filter)
      .populate('user_id', 'name email role department designation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    logger.info(`[Payroll Controller] Listed ${payrolls.length} payroll records for ${req.user.email}`);

    res.status(200).json({
      success: true,
      count: payrolls.length,
      total,
      page,
      data: payrolls.map(p => p.toJSON())
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] getMonthlyPayrolls failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get current logged-in employee's monthly salary records (pay slips)
// @route   GET /api/v1/payroll/my
// @access  Private (All authenticated users)
const getMyPayroll = async (req, res, next) => {
  try {
    let filter = { user_id: req.user._id };
    if (req.query.month) {
      filter.month = req.query.month;
    }

    const payrolls = await Payroll.find(filter).sort({ month: -1 });

    res.status(200).json({
      success: true,
      count: payrolls.length,
      data: payrolls.map(p => p.toJSON())
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] getMyPayroll failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get specific payroll record by ID
// @route   GET /api/v1/payroll/:id
// @access  Private (SuperAdmin, HR Admin, HR Supervisor, or Self)
const getPayrollById = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('user_id', 'name email role department designation');

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: 'Payroll record not found.'
      });
    }

    const isSelf = payroll.user_id?._id.toString() === req.user._id.toString();
    if (!canManagePayroll(req.user) && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: You can only view your own payroll records.'
      });
    }

    res.status(200).json({
      success: true,
      data: payroll.toJSON()
    });
  } catch (error) {
    logger.error(`[Payroll Controller Error] getPayrollById failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  processMonthlyPayroll,
  getMonthlyPayrolls,
  getMyPayroll,
  getPayrollById
};
