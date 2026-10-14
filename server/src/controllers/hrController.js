const Hire = require('../models/hr/Hire');
const Leave = require('../models/hr/Leave');
const Holiday = require('../models/hr/Holiday');
const EmployeeDocument = require('../models/hr/EmployeeDocument');
const Offboarding = require('../models/hr/Offboarding');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');
const { isHRDepartment } = require('../config/permissions');

// Guard for HR management
const canManageHR = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if ((user.role === 'admin' || user.role === 'supervisor') && isHRDepartment(user)) {
    return true;
  }
  return false;
};

// ==================== HIRING PIPELINE ====================

// @desc    Create hiring candidate in pipeline
// @route   POST /api/v1/hr/hires or POST /api/hr/hires
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const createHire = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR personnel only.' });
    }

    const { candidateName, email, phone, department, designation, stage, offeredSalary, joiningDate, notes } = req.body;

    const hire = await Hire.create({
      candidateName: candidateName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      department: department.toLowerCase().trim(),
      designation: designation.trim(),
      stage: stage || 'offer',
      offeredSalary: Number(offeredSalary) || 0,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      notes: notes || '',
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_HIRE_CANDIDATE',
      resource: 'hr_hires',
      resourceId: hire._id.toString(),
      after: hire.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Candidate added to hiring pipeline',
      data: hire
    });
  } catch (error) {
    logger.error(`[HR Controller Error] createHire failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List hiring candidates (Creator scoped for HR)
// @route   GET /api/v1/hr/hires or GET /api/hr/hires
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const getHires = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR personnel only.' });
    }

    let filter = {};
    if (req.user.role !== 'superadmin') {
      filter.createdBy = req.user._id;
    }

    if (req.query.stage) filter.stage = req.query.stage;
    if (req.query.department) filter.department = req.query.department.toLowerCase();

    const hires = await Hire.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: hires.length,
      data: hires
    });
  } catch (error) {
    logger.error(`[HR Controller Error] getHires failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Update hiring candidate stage (offer, accepted, joined, rejected)
// @route   PATCH /api/v1/hr/hires/:id or PATCH /api/hr/hires/:id
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const updateHireStage = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR personnel only.' });
    }

    const hire = await Hire.findById(req.params.id);
    if (!hire) {
      return res.status(404).json({ success: false, message: 'Candidate record not found' });
    }

    if (req.user.role !== 'superadmin' && hire.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Permission denied: You can only update candidates created by you.' });
    }

    const beforeState = hire.toJSON();
    const { stage, offeredSalary, joiningDate, notes } = req.body;

    if (stage) hire.stage = stage;
    if (offeredSalary !== undefined) hire.offeredSalary = Number(offeredSalary);
    if (joiningDate !== undefined) hire.joiningDate = joiningDate ? new Date(joiningDate) : null;
    if (notes !== undefined) hire.notes = notes;

    await hire.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_HIRE_STAGE',
      resource: 'hr_hires',
      resourceId: hire._id.toString(),
      before: beforeState,
      after: hire.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Hiring status updated to ${hire.stage}`,
      data: hire
    });
  } catch (error) {
    logger.error(`[HR Controller Error] updateHireStage failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== LEAVE MANAGEMENT ====================

// @desc    Submit a leave request
// @route   POST /api/v1/leaves or POST /api/leaves
// @access  Private (All staff)
const requestLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, totalDays, reason } = req.body;

    if (!startDate || !endDate || !totalDays || !reason) {
      return res.status(400).json({ success: false, message: 'startDate, endDate, totalDays, and reason are required' });
    }

    const leave = await Leave.create({
      user: req.user._id,
      department: (req.user.department || 'general').toLowerCase(),
      leaveType: leaveType || 'casual',
      startDate,
      endDate,
      totalDays: Number(totalDays),
      reason: reason.trim(),
      status: 'pending'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'REQUEST_LEAVE',
      resource: 'leaves',
      resourceId: leave._id.toString(),
      after: leave.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: leave
    });
  } catch (error) {
    logger.error(`[HR Controller Error] requestLeave failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List leave requests (Scope filtered)
// @route   GET /api/v1/leaves or GET /api/leaves
// @access  Private (All authenticated)
const getLeaves = async (req, res, next) => {
  try {
    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHR = isHRDepartment(caller);
    const isDeptAdminOrSupervisor = (caller.role === 'admin' || caller.role === 'supervisor') && !isHR;

    let filter = {};

    if (caller.role === 'user') {
      filter.user = caller._id;
    } else if (isDeptAdminOrSupervisor) {
      filter.department = (caller.department || '').toLowerCase();
    } else if (isHR && !isSuperAdmin) {
      const myUsers = await User.find({ createdBy: caller._id }).select('_id');
      filter.user = { $in: myUsers.map(u => u._id) };
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.department && isSuperAdmin) filter.department = req.query.department.toLowerCase();

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
    logger.error(`[HR Controller Error] getLeaves failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Approve or reject leave request
// @route   PATCH /api/v1/leaves/:id/decision or PATCH /api/leaves/:id/decision
// @access  Private (SuperAdmin, HR Admin, HR Supervisor, Dept Admin)
const decideLeave = async (req, res, next) => {
  try {
    const { status, decisionNotes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
    }

    const leave = await Leave.findById(req.params.id).populate('user', 'name email department createdBy');
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHR = isHRDepartment(caller);
    const isDeptAdmin = caller.role === 'admin' && (caller.department || '').toLowerCase() === leave.department.toLowerCase();

    if (!isSuperAdmin && !isHR && !isDeptAdmin) {
      return res.status(403).json({ success: false, message: 'Permission denied: Cannot decide on this leave request.' });
    }

    const beforeState = leave.toJSON();

    leave.status = status;
    leave.decisionBy = caller._id;
    leave.decisionNotes = decisionNotes || '';
    leave.decisionAt = new Date();
    await leave.save();

    await recordAuditLog({
      actor: caller,
      action: `LEAVE_${status.toUpperCase()}`,
      resource: 'leaves',
      resourceId: leave._id.toString(),
      before: beforeState,
      after: leave.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Leave request has been ${status}.`,
      data: leave
    });
  } catch (error) {
    logger.error(`[HR Controller Error] decideLeave failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get logged in user's leave balance
// @route   GET /api/v1/leaves/balance/me or GET /api/leaves/balance/me
// @access  Private (Self)
const getMyLeaveBalance = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const approvedLeaves = await Leave.find({
      user: req.user._id,
      status: 'approved',
      startDate: { $regex: `^${currentYear}` }
    });

    const usedAnnual = approvedLeaves.filter(l => l.leaveType === 'annual').reduce((a, b) => a + b.totalDays, 0);
    const usedSick = approvedLeaves.filter(l => l.leaveType === 'sick').reduce((a, b) => a + b.totalDays, 0);
    const usedCasual = approvedLeaves.filter(l => l.leaveType === 'casual').reduce((a, b) => a + b.totalDays, 0);

    const balance = {
      year: currentYear,
      entitlement: { annual: 18, sick: 12, casual: 10 },
      used: { annual: usedAnnual, sick: usedSick, casual: usedCasual },
      remaining: {
        annual: Math.max(0, 18 - usedAnnual),
        sick: Math.max(0, 12 - usedSick),
        casual: Math.max(0, 10 - usedCasual)
      }
    };

    res.status(200).json({
      success: true,
      balance
    });
  } catch (error) {
    logger.error(`[HR Controller Error] getMyLeaveBalance failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== HOLIDAYS ====================

// @desc    Create holiday entry
// @route   POST /api/v1/hr/holidays or POST /api/hr/holidays
// @access  Private (SuperAdmin, HR Admin)
const createHoliday = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR Admin only.' });
    }

    const { name, date, description, isRecurring } = req.body;
    const holiday = await Holiday.create({
      name: name.trim(),
      date,
      description: description || '',
      isRecurring: !!isRecurring,
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_HOLIDAY',
      resource: 'holidays',
      resourceId: holiday._id.toString(),
      after: holiday.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday
    });
  } catch (error) {
    logger.error(`[HR Controller Error] createHoliday failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List hospital holidays
// @route   GET /api/v1/hr/holidays or GET /api/hr/holidays
// @access  Private (All staff)
const getHolidays = async (req, res, next) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.status(200).json({
      success: true,
      count: holidays.length,
      data: holidays
    });
  } catch (error) {
    logger.error(`[HR Controller Error] getHolidays failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== EMPLOYEE DOCUMENTS ====================

// @desc    Upload / attach employee documents (contracts, ID proofs, certificates)
// @route   POST /api/v1/hr/employees/:id/documents or POST /api/hr/employees/:id/documents
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const addEmployeeDocument = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR personnel only.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { documentType, title, fileUrl, notes } = req.body;

    const doc = await EmployeeDocument.create({
      user: targetUser._id,
      documentType: documentType || 'other',
      title: title.trim(),
      fileUrl,
      notes: notes || '',
      uploadedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'ADD_EMPLOYEE_DOCUMENT',
      resource: 'employee_documents',
      resourceId: doc._id.toString(),
      after: doc.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Document attached to employee profile',
      data: doc
    });
  } catch (error) {
    logger.error(`[HR Controller Error] addEmployeeDocument failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== OFFBOARDING ====================

// @desc    Initiate offboarding & exit clearance checklist
// @route   POST /api/v1/hr/employees/:id/exit or POST /api/hr/employees/:id/exit
// @access  Private (SuperAdmin, HR Admin)
const initiateOffboarding = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR Admin only.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const { lastWorkingDate, reason, notes } = req.body;

    const defaultChecklist = [
      { department: 'technical', item: 'Revoke IT logins, VPN & return laptop' },
      { department: 'security', item: 'Surrender hospital ID badge & parking tag' },
      { department: 'pharmacy', item: 'Return medication locker keys & inventory stamp' },
      { department: 'finance', item: 'Settle travel advances and loan balances' },
      { department: 'support', item: 'Return locker keys and uniform' }
    ];

    const offboarding = await Offboarding.create({
      user: targetUser._id,
      resignationDate: new Date(),
      lastWorkingDate: new Date(lastWorkingDate),
      reason: reason || 'Voluntary resignation',
      clearanceChecklist: defaultChecklist,
      status: 'clearance_pending',
      processedBy: req.user._id,
      notes: notes || ''
    });

    await recordAuditLog({
      actor: req.user,
      action: 'INITIATE_OFFBOARDING',
      resource: 'offboarding',
      resourceId: offboarding._id.toString(),
      after: offboarding.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Offboarding workflow initiated with clearance checklist.',
      data: offboarding
    });
  } catch (error) {
    logger.error(`[HR Controller Error] initiateOffboarding failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== HR REPORTS ====================

// @desc    Headcount Report
// @route   GET /api/v1/hr/reports/headcount or GET /api/hr/reports/headcount
// @access  Private (SuperAdmin, HR Admin)
const getHeadcountReport = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR Admin only.' });
    }

    const aggregation = await User.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { department: '$department', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalActive = await User.countDocuments({ status: 'active', isDeleted: { $ne: true } });

    res.status(200).json({
      success: true,
      totalActiveStaff: totalActive,
      breakdown: aggregation
    });
  } catch (error) {
    logger.error(`[HR Controller Error] getHeadcountReport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Attrition Report
// @route   GET /api/v1/hr/reports/attrition or GET /api/hr/reports/attrition
// @access  Private (SuperAdmin, HR Admin)
const getAttritionReport = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR Admin only.' });
    }

    const offboardings = await Offboarding.find().populate('user', 'name email department designation');
    const terminatedCount = await User.countDocuments({ status: 'terminated' });

    res.status(200).json({
      success: true,
      totalTerminated: terminatedCount,
      exits: offboardings
    });
  } catch (error) {
    logger.error(`[HR Controller Error] getAttritionReport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Attendance Compliance Report
// @route   GET /api/v1/hr/reports/attendance-compliance or GET /api/hr/reports/attendance-compliance
// @access  Private (SuperAdmin, HR Admin)
const getAttendanceComplianceReport = async (req, res, next) => {
  try {
    if (!canManageHR(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR Admin only.' });
    }

    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const stats = await Attendance.aggregate([
      { $match: { date: { $regex: `^${month}` } } },
      {
        $group: {
          _id: '$department',
          totalLogs: { $sum: 1 },
          fullShiftCount: { $sum: { $cond: [{ $eq: ['$isShiftCompleted', true] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ['$isLate', true] }, 1, 0] } },
          halfDayCount: { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      month,
      complianceByDepartment: stats
    });
  } catch (error) {
    logger.error(`[HR Controller Error] getAttendanceComplianceReport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  createHire,
  getHires,
  updateHireStage,
  requestLeave,
  getLeaves,
  decideLeave,
  getMyLeaveBalance,
  createHoliday,
  getHolidays,
  addEmployeeDocument,
  initiateOffboarding,
  getHeadcountReport,
  getAttritionReport,
  getAttendanceComplianceReport
};
