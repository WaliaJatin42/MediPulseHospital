const Leave = require('../models/hr/Leave');
const LeaveType = require('../models/hr/LeaveType');
const LeaveBalance = require('../models/hr/LeaveBalance');
const User = require('../models/User');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// ----------------- LEAVE TYPES -----------------

// @desc    Create leave type
// @route   POST /api/v1/leave-types
// @access  Private (Superadmin, HR Admin)
const createLeaveType = async (req, res, next) => {
  try {
    const { name, code, paid, annualQuota, carryForward, maxCarryForward, requiresDocument } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Leave type name is required' });
    }

    const leaveType = await LeaveType.create({
      name: name.toLowerCase(),
      code: code || name.slice(0, 3).toUpperCase(),
      paid: paid !== undefined ? paid : true,
      annualQuota: annualQuota !== undefined ? Number(annualQuota) : 12,
      carryForward: carryForward || false,
      maxCarryForward: maxCarryForward ? Number(maxCarryForward) : 0,
      requiresDocument: requiresDocument || false,
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_LEAVE_TYPE',
      resource: 'leave_types',
      resourceId: leaveType._id.toString(),
      after: leaveType.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      data: leaveType
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Leave type already exists' });
    }
    logger.error(`[Leave Type Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get all leave types
// @route   GET /api/v1/leave-types
// @access  Private
const getLeaveTypes = async (req, res, next) => {
  try {
    let leaveTypes = await LeaveType.find({ isActive: true }).sort({ name: 1 });
    if (leaveTypes.length === 0) {
      // Seed standard defaults if empty
      const defaults = [
        { name: 'casual', code: 'CL', paid: true, annualQuota: 12, carryForward: false },
        { name: 'sick', code: 'SL', paid: true, annualQuota: 10, carryForward: false, requiresDocument: true },
        { name: 'earned', code: 'EL', paid: true, annualQuota: 15, carryForward: true, maxCarryForward: 30 },
        { name: 'unpaid', code: 'LWP', paid: false, annualQuota: 0, carryForward: false }
      ];
      leaveTypes = await LeaveType.insertMany(defaults);
    }

    res.status(200).json({
      success: true,
      count: leaveTypes.length,
      data: leaveTypes
    });
  } catch (error) {
    logger.error(`[Leave Type Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update leave type
// @route   PATCH /api/v1/leave-types/:id
// @access  Private (Superadmin, HR Admin)
const updateLeaveType = async (req, res, next) => {
  try {
    const leaveType = await LeaveType.findById(req.params.id);
    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Leave type not found' });
    }

    const before = leaveType.toObject();
    Object.assign(leaveType, req.body);
    await leaveType.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_LEAVE_TYPE',
      resource: 'leave_types',
      resourceId: leaveType._id.toString(),
      before,
      after: leaveType.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Leave type updated successfully',
      data: leaveType
    });
  } catch (error) {
    logger.error(`[Leave Type Error] ${error.message}`);
    next(error);
  }
};

// ----------------- LEAVE REQUESTS -----------------

// @desc    Submit leave request
// @route   POST /api/v1/leaves
// @access  Private (All staff)
const requestLeave = async (req, res, next) => {
  try {
    let { leaveType = 'casual', startDate, endDate, totalDays, reason, documentRef } = req.body;
    let computedDays = totalDays;
    if (!computedDays && startDate && endDate) {
      computedDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);
    }

    if (!startDate || !endDate || !computedDays || !reason) {
      return res.status(400).json({ success: false, message: 'startDate, endDate, and reason are required' });
    }

    // Verify document requirement
    const typeDef = await LeaveType.findOne({ name: leaveType.toLowerCase() });
    if (typeDef && typeDef.requiresDocument && !documentRef) {
      return res.status(400).json({
        success: false,
        message: `Medical or supporting document is required for ${leaveType} leave.`
      });
    }

    const leave = await Leave.create({
      user: req.user._id,
      userId: req.user._id,
      department: (req.user.department || 'general').toLowerCase(),
      leaveType: leaveType.toLowerCase(),
      startDate,
      endDate,
      totalDays: Number(computedDays),
      reason: reason.trim(),
      documentRef: documentRef || null,
      status: 'pending'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'REQUEST_LEAVE',
      resource: 'leaves',
      resourceId: leave._id.toString(),
      after: leave.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: leave
    });
  } catch (error) {
    logger.error(`[Leave Error] ${error.message}`);
    next(error);
  }
};

// @desc    List leaves (scope filtered)
// @route   GET /api/v1/leaves
// @access  Private
const getLeaves = async (req, res, next) => {
  try {
    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHR = caller.department === 'hr';
    const isDeptAdminOrSupervisor = ['admin', 'supervisor'].includes(caller.role) && !isHR;

    let filter = {};
    if (caller.role === 'user') {
      filter.$or = [{ user: caller._id }, { userId: caller._id }];
    } else if (isDeptAdminOrSupervisor) {
      filter.department = (caller.department || '').toLowerCase();
    } else if (isHR && !isSuperAdmin) {
      const myUsers = await User.find({ createdBy: caller._id }).select('_id');
      const userIds = myUsers.map((u) => u._id);
      filter.$or = [{ user: { $in: userIds } }, { userId: { $in: userIds } }];
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.department && isSuperAdmin) filter.department = req.query.department.toLowerCase();
    if (req.query.userId) filter.$or = [{ user: req.query.userId }, { userId: req.query.userId }];
    if (req.query.month) filter.startDate = { $regex: `^${req.query.month}` };

    const leaves = await Leave.find(filter)
      .populate('user', 'name email employeeId designation department')
      .populate('decisionBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (error) {
    logger.error(`[Leave Error] ${error.message}`);
    next(error);
  }
};

// @desc    Decide on leave request (approver: DS or DA for department, HRA for final)
// @route   PATCH /api/v1/leaves/:id/decision
// @access  Private (DS, DA, HRA, SA)
const decideLeave = async (req, res, next) => {
  try {
    const { status, remarks, decisionNotes } = req.body;
    const decision = status || req.body.decision;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'approved' or 'rejected'" });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHRA = caller.department === 'hr' && caller.role === 'admin';
    const isDeptApprover = ['admin', 'supervisor'].includes(caller.role) && caller.department.toLowerCase() === leave.department.toLowerCase();

    if (!isSuperAdmin && !isHRA && !isDeptApprover) {
      return res.status(403).json({ success: false, message: 'Permission denied: Cannot decide on this leave request.' });
    }

    const before = leave.toObject();
    leave.status = decision;
    leave.decisionBy = caller._id;
    leave.decisionNotes = remarks || decisionNotes || '';
    leave.decisionAt = new Date();
    leave.approvals.push({
      level: isHRA || isSuperAdmin ? 'hr' : 'department',
      approverId: caller._id,
      decision,
      remarks: remarks || decisionNotes || '',
      decidedAt: new Date()
    });
    await leave.save();

    await recordAuditLog({
      actor: caller,
      action: `LEAVE_${decision.toUpperCase()}`,
      resource: 'leaves',
      resourceId: leave._id.toString(),
      before,
      after: leave.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Leave request has been ${decision}.`,
      data: leave
    });
  } catch (error) {
    logger.error(`[Leave Error] ${error.message}`);
    next(error);
  }
};

// @desc    Cancel leave request (requester only, before start date)
// @route   PATCH /api/v1/leaves/:id/cancel
// @access  Private (Requester)
const cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const targetUserId = (leave.user || leave.userId).toString();
    if (targetUserId !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'You can only cancel your own leave requests.' });
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    if (leave.startDate <= todayStr && req.user.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Leaves cannot be cancelled on or after the start date.' });
    }

    if (leave.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Leave is already cancelled.' });
    }

    const before = leave.toObject();
    leave.status = 'cancelled';
    await leave.save();

    await recordAuditLog({
      actor: req.user,
      action: 'CANCEL_LEAVE',
      resource: 'leaves',
      resourceId: leave._id.toString(),
      before,
      after: leave.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: leave
    });
  } catch (error) {
    logger.error(`[Cancel Leave Error] ${error.message}`);
    next(error);
  }
};

// ----------------- LEAVE BALANCES -----------------

// Helper to compute or get user balance
const calculateUserBalance = async (userId, year = new Date().getFullYear()) => {
  const types = await LeaveType.find({ isActive: true });
  const approvedLeaves = await Leave.find({
    $or: [{ user: userId }, { userId }],
    status: 'approved',
    startDate: { $regex: `^${year}` }
  });

  const pendingLeaves = await Leave.find({
    $or: [{ user: userId }, { userId }],
    status: 'pending',
    startDate: { $regex: `^${year}` }
  });

  let balanceDoc = await LeaveBalance.findOne({ userId, year });

  const balances = types.map((t) => {
    const existing = balanceDoc?.balances?.find((b) => b.leaveTypeName === t.name);
    const quota = existing?.quota !== undefined ? existing.quota : t.annualQuota;
    const carriedOver = existing?.carriedOver || 0;
    const totalAllowed = quota + carriedOver;

    const used = approvedLeaves
      .filter((l) => (l.leaveType || '').toLowerCase() === t.name)
      .reduce((sum, l) => sum + (l.totalDays || 0), 0);

    const pending = pendingLeaves
      .filter((l) => (l.leaveType || '').toLowerCase() === t.name)
      .reduce((sum, l) => sum + (l.totalDays || 0), 0);

    const remaining = Math.max(0, totalAllowed - used);

    return {
      leaveTypeName: t.name,
      paid: t.paid,
      quota,
      carriedOver,
      used,
      pending,
      remaining
    };
  });

  return { year, userId, balances };
};

// @desc    Get personal leave balance
// @route   GET /api/v1/leaves/balance/me
// @access  Private (Self)
const getMyLeaveBalance = async (req, res, next) => {
  try {
    const data = await calculateUserBalance(req.user._id);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    logger.error(`[Leave Balance Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get specific user's leave balance
// @route   GET /api/v1/leaves/balance/:userId
// @access  Private (HRA, HRS, SA)
const getUserLeaveBalance = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const data = await calculateUserBalance(targetUser._id);
    res.status(200).json({
      success: true,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        department: targetUser.department
      },
      data
    });
  } catch (error) {
    logger.error(`[User Leave Balance Error] ${error.message}`);
    next(error);
  }
};

// @desc    Adjust user's leave balance (mandatory reason, audited)
// @route   POST /api/v1/leaves/balance/:userId/adjust
// @access  Private (HR Admin, Superadmin)
const adjustLeaveBalance = async (req, res, next) => {
  try {
    let typeName = req.body.leaveTypeName || req.body.leaveType || req.body.name;
    const deltaVal = req.body.delta !== undefined ? req.body.delta : req.body.adjustment;
    const reasonVal = req.body.reason;

    if (!typeName && req.body.leaveTypeId) {
      const lt = await LeaveType.findById(req.body.leaveTypeId);
      if (lt) typeName = lt.name;
    }
    if (!typeName && req.body.leaveTypeCode) {
      const lt = await LeaveType.findOne({ code: req.body.leaveTypeCode });
      if (lt) typeName = lt.name;
    }
    if (!typeName) typeName = 'casual';

    if (deltaVal === undefined || !reasonVal) {
      return res.status(400).json({ success: false, message: 'delta or adjustment and mandatory reason are required' });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const year = new Date().getFullYear();
    let balanceDoc = await LeaveBalance.findOne({ userId: targetUser._id, year });
    if (!balanceDoc) {
      balanceDoc = new LeaveBalance({
        userId: targetUser._id,
        year,
        balances: [],
        adjustments: []
      });
    }

    let item = balanceDoc.balances.find((b) => b.leaveTypeName.toLowerCase() === typeName.toLowerCase());
    if (!item) {
      const typeDef = await LeaveType.findOne({ name: typeName.toLowerCase() });
      const baseQuota = typeDef ? typeDef.annualQuota : 12;
      item = {
        leaveTypeName: typeName.toLowerCase(),
        quota: baseQuota + Number(deltaVal),
        carriedOver: 0,
        used: 0,
        pending: 0,
        remaining: baseQuota + Number(deltaVal)
      };
      balanceDoc.balances.push(item);
    } else {
      item.quota = Math.max(0, item.quota + Number(deltaVal));
      item.remaining = Math.max(0, item.remaining + Number(deltaVal));
    }

    balanceDoc.adjustments.push({
      leaveTypeName: typeName.toLowerCase(),
      delta: Number(deltaVal),
      reason: reasonVal.trim(),
      adjustedBy: req.user._id,
      adjustedAt: new Date()
    });

    await balanceDoc.save();

    await recordAuditLog({
      actor: req.user,
      action: 'ADJUST_LEAVE_BALANCE',
      resource: 'leave_balances',
      resourceId: balanceDoc._id.toString(),
      after: { userId: targetUser._id, leaveTypeName: typeName, delta: deltaVal, reason: reasonVal },
      req
    });

    res.status(200).json({
      success: true,
      message: `Adjusted ${typeName} balance by ${deltaVal} for ${targetUser.name}`,
      data: balanceDoc
    });
  } catch (error) {
    logger.error(`[Adjust Leave Balance Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  createLeaveType,
  getLeaveTypes,
  updateLeaveType,
  requestLeave,
  getLeaves,
  decideLeave,
  cancelLeave,
  getMyLeaveBalance,
  getUserLeaveBalance,
  adjustLeaveBalance
};
