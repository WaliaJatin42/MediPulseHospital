const ExitRecord = require('../models/hr/ExitRecord');
const User = require('../models/User');
const Salary = require('../models/Salary');
const LeaveBalance = require('../models/hr/LeaveBalance');
const Advance = require('../models/payroll/Advance');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Initiate employee exit/offboarding
// @route   POST /api/v1/exits
// @access  Private (HRA, HRS for own created users, SA)
const createExit = async (req, res, next) => {
  try {
    const { userId, lastWorkingDay, reason, noticePeriod = 30 } = req.body;
    if (!userId || !lastWorkingDay || !reason) {
      return res.status(400).json({ success: false, message: 'userId, lastWorkingDay, and reason are required' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.user.role !== 'superadmin' && targetUser.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Permission denied: You can only initiate exits for staff created by you.' });
    }

    const exitRecord = await ExitRecord.create({
      userId: targetUser._id,
      lastWorkingDay: new Date(lastWorkingDay),
      reason,
      noticePeriod: Number(noticePeriod),
      status: 'clearance_in_progress',
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'INITIATE_EXIT',
      resource: 'exits',
      resourceId: exitRecord._id.toString(),
      after: exitRecord.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: `Exit process initiated for ${targetUser.name}`,
      data: exitRecord
    });
  } catch (error) {
    logger.error(`[Exit Error] ${error.message}`);
    next(error);
  }
};

// @desc    List exits
// @route   GET /api/v1/exits
// @access  Private
const getExits = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const exits = await ExitRecord.find(filter)
      .populate('userId', 'name email employeeId department designation')
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: exits.length, data: exits });
  } catch (error) {
    logger.error(`[Exit Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get exit by ID
// @route   GET /api/v1/exits/:id
// @access  Private
const getExitById = async (req, res, next) => {
  try {
    const exitRecord = await ExitRecord.findById(req.params.id)
      .populate('userId', 'name email employeeId department designation')
      .populate('createdBy', 'name email role');

    if (!exitRecord) {
      return res.status(404).json({ success: false, message: 'Exit record not found' });
    }

    res.status(200).json({ success: true, data: exitRecord });
  } catch (error) {
    logger.error(`[Exit Error] ${error.message}`);
    next(error);
  }
};

// @desc    Department marks clearance (Technical for assets, Pharmacy for stock, Finance for advances)
// @route   PATCH /api/v1/exits/:id/clearance
// @access  Private (Department Head or Superadmin)
const updateClearance = async (req, res, next) => {
  try {
    const { department, cleared = true, remarks = '' } = req.body;
    if (!department) {
      return res.status(400).json({ success: false, message: 'department (technical, pharmacy, or finance) is required' });
    }

    const deptKey = department.toLowerCase();
    if (!['technical', 'pharmacy', 'finance'].includes(deptKey)) {
      return res.status(400).json({ success: false, message: 'department must be technical, pharmacy, or finance' });
    }

    const exitRecord = await ExitRecord.findById(req.params.id);
    if (!exitRecord) {
      return res.status(404).json({ success: false, message: 'Exit record not found' });
    }

    exitRecord.clearances[deptKey] = {
      cleared: !!cleared,
      clearedBy: req.user._id,
      clearedAt: new Date(),
      remarks
    };

    await exitRecord.save();

    await recordAuditLog({
      actor: req.user,
      action: `EXIT_CLEARANCE_${deptKey.toUpperCase()}`,
      resource: 'exits',
      resourceId: exitRecord._id.toString(),
      after: { department: deptKey, cleared, remarks },
      req
    });

    res.status(200).json({
      success: true,
      message: `${department} department clearance marked as ${cleared ? 'CLEARED' : 'PENDING'}`,
      data: exitRecord
    });
  } catch (error) {
    logger.error(`[Clearance Error] ${error.message}`);
    next(error);
  }
};

// @desc    Calculate settlement (pending salary, leave encashment, recoveries, bonus)
// @route   POST /api/v1/exits/:id/settlement/calculate
// @access  Private (Finance Admin, HR Admin, Superadmin)
const calculateSettlement = async (req, res, next) => {
  try {
    const exitRecord = await ExitRecord.findById(req.params.id);
    if (!exitRecord) {
      return res.status(404).json({ success: false, message: 'Exit record not found' });
    }

    const user = await User.findById(exitRecord.userId);
    const monthlySalary = user?.salary || 30000;
    const dailyRate = Math.round(monthlySalary / 30);

    // 1. Pending salary (pro-rated for days worked in final month)
    const lastDay = new Date(exitRecord.lastWorkingDay);
    const dayOfMonth = lastDay.getDate();
    const pendingSalary = Math.round(dailyRate * dayOfMonth);

    // 2. Leave encashment (earned leave remaining * dailyRate)
    const currentYear = new Date().getFullYear();
    const balanceDoc = await LeaveBalance.findOne({ userId: user._id, year: currentYear });
    const earnedLeave = balanceDoc?.balances?.find((b) => b.leaveTypeName === 'earned');
    const remainingLeaves = earnedLeave?.remaining || 5;
    const leaveEncashment = Math.round(remainingLeaves * dailyRate);

    // 3. Outstanding advances recovery
    const activeAdvances = await Advance.find({ userId: user._id, status: { $in: ['approved', 'disbursed'] } });
    const recoveries = activeAdvances.reduce((sum, a) => sum + (a.remainingBalance || 0), 0);

    // 4. Bonus/Gratuity
    const bonus = 0;
    const gratuity = Math.round(dailyRate * 15); // 15 days basic per completed year

    const netPayable = Math.max(0, pendingSalary + leaveEncashment + bonus + gratuity - recoveries);

    exitRecord.settlement = {
      pendingSalary,
      leaveEncashment,
      recoveries,
      bonus,
      gratuity,
      netPayable,
      calculatedAt: new Date(),
      isApproved: false
    };
    exitRecord.status = 'settlement_calculated';
    await exitRecord.save();

    res.status(200).json({
      success: true,
      message: 'Settlement calculated successfully',
      settlement: exitRecord.settlement
    });
  } catch (error) {
    logger.error(`[Calculate Settlement Error] ${error.message}`);
    next(error);
  }
};

// @desc    Approve exit settlement
// @route   POST /api/v1/exits/:id/settlement/approve
// @access  Private (Superadmin only)
const approveSettlement = async (req, res, next) => {
  try {
    const exitRecord = await ExitRecord.findById(req.params.id);
    if (!exitRecord) {
      return res.status(404).json({ success: false, message: 'Exit record not found' });
    }

    if (!exitRecord.settlement || !exitRecord.settlement.netPayable) {
      return res.status(400).json({ success: false, message: 'Settlement must be calculated first before approval.' });
    }

    exitRecord.settlement.isApproved = true;
    exitRecord.settlement.approvedBy = req.user._id;
    exitRecord.settlement.approvedAt = new Date();
    exitRecord.status = 'settlement_approved';
    await exitRecord.save();

    await recordAuditLog({
      actor: req.user,
      action: 'APPROVE_EXIT_SETTLEMENT',
      resource: 'exits',
      resourceId: exitRecord._id.toString(),
      after: exitRecord.settlement,
      req
    });

    res.status(200).json({
      success: true,
      message: 'Settlement approved by Superadmin',
      data: exitRecord
    });
  } catch (error) {
    logger.error(`[Approve Settlement Error] ${error.message}`);
    next(error);
  }
};

// @desc    Complete exit (deactivates login, closes salary record)
// @route   PATCH /api/v1/exits/:id/complete
// @access  Private (Superadmin, HR Admin)
const completeExit = async (req, res, next) => {
  try {
    const exitRecord = await ExitRecord.findById(req.params.id);
    if (!exitRecord) {
      return res.status(404).json({ success: false, message: 'Exit record not found' });
    }

    // Deactivate user account
    const user = await User.findById(exitRecord.userId);
    if (user) {
      user.status = 'terminated';
      user.isActive = false;
      user.refreshToken = null;
      await user.save();
    }

    // Close salary record
    await Salary.findOneAndUpdate({ user_id: exitRecord.userId }, { isActive: false });

    exitRecord.status = 'completed';
    exitRecord.completedAt = new Date();
    exitRecord.completedBy = req.user._id;
    await exitRecord.save();

    await recordAuditLog({
      actor: req.user,
      action: 'COMPLETE_EMPLOYEE_EXIT',
      resource: 'exits',
      resourceId: exitRecord._id.toString(),
      after: { userId: exitRecord.userId, status: 'completed' },
      req
    });

    res.status(200).json({
      success: true,
      message: `Exit completed: User ${user?.name} account deactivated and salary record closed.`,
      data: exitRecord
    });
  } catch (error) {
    logger.error(`[Complete Exit Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  createExit,
  getExits,
  getExitById,
  updateClearance,
  calculateSettlement,
  approveSettlement,
  completeExit
};
