const Salary = require('../models/Salary');
const User = require('../models/User');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');
const { isHRDepartment } = require('../config/permissions');

// Check if user has permission to manage salaries (Superadmin, HR Admin, HR Supervisor)
const canManageSalary = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if ((user.role === 'admin' || user.role === 'supervisor') && isHRDepartment(user)) {
    return true;
  }
  return false;
};

// @desc    Assign or create initial salary structure
// @route   POST /api/v1/salaries or POST /api/salaries
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const createSalary = async (req, res, next) => {
  try {
    const caller = req.user;
    if (!canManageSalary(caller)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin and HR roles can assign salaries.'
      });
    }

    const { user_id, userId, basic, allowances = 0, deductions = 0, effectiveFrom, reason } = req.body;
    const targetUserId = user_id || userId;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser || targetUser.isDeleted) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    // HR scoping check: HR can only assign salary to users they created
    if (caller.role !== 'superadmin') {
      const creatorId = targetUser.createdBy?.toString();
      if (creatorId !== caller._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: HR staff can only assign salary to users created by them.'
        });
      }
    }

    const numBasic = Number(basic) || 0;
    const numAllowances = Number(allowances) || 0;
    const numDeductions = Number(deductions) || 0;
    const netSalary = Math.max(0, numBasic + numAllowances - numDeductions);
    const effDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

    let salaryRecord = await Salary.findOne({ user_id: targetUser._id });

    if (salaryRecord) {
      // Create new revision without overwriting history
      const nextRevNumber = (salaryRecord.currentRevision || 1) + 1;
      
      // Close previous revision effectiveUntil
      if (salaryRecord.revisions && salaryRecord.revisions.length > 0) {
        salaryRecord.revisions[salaryRecord.revisions.length - 1].effectiveUntil = effDate;
      }

      const newRev = {
        revisionNumber: nextRevNumber,
        basic: numBasic,
        allowances: numAllowances,
        deductions: numDeductions,
        salary: netSalary,
        effectiveFrom: effDate,
        effectiveUntil: null,
        reason: reason || `Revision #${nextRevNumber}`,
        updatedBy: caller._id,
        createdAt: new Date()
      };

      salaryRecord.basic = numBasic;
      salaryRecord.allowances = numAllowances;
      salaryRecord.deductions = numDeductions;
      salaryRecord.salary = netSalary;
      salaryRecord.effectiveFrom = effDate;
      salaryRecord.currentRevision = nextRevNumber;
      salaryRecord.revisions.push(newRev);
      salaryRecord.updatedBy = caller._id;
      await salaryRecord.save();
    } else {
      salaryRecord = await Salary.create({
        user_id: targetUser._id,
        user_name: targetUser.name,
        department: targetUser.department,
        designation: targetUser.designation,
        basic: numBasic,
        allowances: numAllowances,
        deductions: numDeductions,
        salary: netSalary,
        effectiveFrom: effDate,
        currentRevision: 1,
        revisions: [
          {
            revisionNumber: 1,
            basic: numBasic,
            allowances: numAllowances,
            deductions: numDeductions,
            salary: netSalary,
            effectiveFrom: effDate,
            reason: reason || 'Initial salary setup',
            updatedBy: caller._id,
            createdAt: new Date()
          }
        ],
        createdBy: caller._id,
        updatedBy: caller._id
      });
    }

    // Synchronize base salary on User model
    targetUser.salary = netSalary;
    await targetUser.save();

    await recordAuditLog({
      actor: caller,
      action: 'ASSIGN_SALARY',
      resource: 'salaries',
      resourceId: salaryRecord._id.toString(),
      after: salaryRecord.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Salary record assigned with revision history.',
      data: salaryRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] createSalary failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List salary records (scope filtered)
// @route   GET /api/v1/salaries or GET /api/salaries
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const getSalaries = async (req, res, next) => {
  try {
    const caller = req.user;
    if (!canManageSalary(caller)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin and HR roles can view salary records.'
      });
    }

    let filter = {};

    // Creator scope for HR staff
    if (caller.role !== 'superadmin') {
      filter.createdBy = caller._id;
    }

    if (req.query.department) {
      filter.department = req.query.department.toLowerCase();
    }

    if (req.query.search) {
      const regex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [{ user_name: regex }, { designation: regex }, { department: regex }];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await Salary.countDocuments(filter);
    const records = await Salary.find(filter)
      .populate('user_id', 'name email role employeeId department designation')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: records.length,
      total,
      page,
      data: records.map(r => r.toJSON())
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] getSalaries failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get user's own salary structure
// @route   GET /api/v1/salaries/me or GET /api/salaries/me
// @access  Private (All users: own salary)
const getMySalary = async (req, res, next) => {
  try {
    const record = await Salary.findOne({ user_id: req.user._id })
      .populate('user_id', 'name email employeeId department designation');

    if (!record) {
      return res.status(200).json({
        success: true,
        data: {
          user_id: req.user._id,
          user_name: req.user.name,
          department: req.user.department,
          designation: req.user.designation,
          basic: req.user.salary || 0,
          allowances: 0,
          deductions: 0,
          salary: req.user.salary || 0,
          revisions: []
        }
      });
    }

    res.status(200).json({
      success: true,
      data: record.toJSON()
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] getMySalary failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get salary record by user ID or salary ID
// @route   GET /api/v1/salaries/:userId or GET /api/salaries/:userId
// @access  Private (SuperAdmin, HR Admin, HR Supervisor, or Self)
const getSalaryByUserId = async (req, res, next) => {
  try {
    const param = req.params.userId || req.params.id;
    const isSelf = param === req.user._id.toString();

    let salaryRecord = await Salary.findOne({ user_id: param })
      .populate('user_id', 'name email employeeId department designation')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    if (!salaryRecord) {
      salaryRecord = await Salary.findById(param)
        .populate('user_id', 'name email employeeId department designation')
        .populate('createdBy', 'name email role')
        .populate('updatedBy', 'name email role');
    }

    const caller = req.user;
    if (caller.role !== 'superadmin' && !isSelf) {
      if (!isHRDepartment(caller)) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: Department-scope callers cannot view sensitive salary data.'
        });
      }
    }

    if (!salaryRecord) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    if (caller.role !== 'superadmin' && !isSelf) {
      // HR user requesting record created by another HR user returns 404 (creator scope isolation)
      if (salaryRecord.createdBy && salaryRecord.createdBy.toString() !== caller._id.toString()) {
        return res.status(404).json({
          success: false,
          message: 'Salary record not found within your creator scope.'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: salaryRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] getSalaryByUserId failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Add increment to employee salary (creates salary revision)
// @route   POST /api/v1/salaries/:userId/increments
// @access  Private (HRA, HRS for own created users, SA)
const createSalaryIncrement = async (req, res, next) => {
  try {
    const caller = req.user;
    const { userId } = req.params;
    const { newAmount, effectiveFrom, reason } = req.body;

    if (!newAmount || !reason) {
      return res.status(400).json({ success: false, message: 'newAmount and reason are required' });
    }

    if (!canManageSalary(caller)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Only HR and Superadmin can process increments.' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isHRA = caller.department === 'hr' && caller.role === 'admin';
    const isSA = caller.role === 'superadmin';
    if (!isSA && !isHRA && targetUser.createdBy?.toString() !== caller._id.toString()) {
      return res.status(403).json({ success: false, message: 'Permission denied: HR Supervisors can only increment salary for users created by them.' });
    }

    const previousSalary = targetUser.salary || 0;
    const numericNewAmount = Number(newAmount);
    const effDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

    // Update or create Salary document
    let salaryDoc = await Salary.findOne({ user_id: targetUser._id });
    if (!salaryDoc) {
      salaryDoc = new Salary({
        user_id: targetUser._id,
        user_name: targetUser.name,
        department: targetUser.department,
        designation: targetUser.designation,
        basic: numericNewAmount,
        salary: numericNewAmount,
        createdBy: caller._id
      });
    }

    const nextRev = (salaryDoc.revisions?.length || 0) + 1;
    salaryDoc.revisions.push({
      revisionNumber: nextRev,
      basic: numericNewAmount,
      salary: numericNewAmount,
      allowances: salaryDoc.allowances || 0,
      deductions: salaryDoc.deductions || 0,
      effectiveFrom: effDate,
      reason: reason.trim(),
      updatedBy: caller._id
    });

    salaryDoc.basic = numericNewAmount;
    salaryDoc.salary = numericNewAmount;
    salaryDoc.updatedBy = caller._id;
    await salaryDoc.save();

    targetUser.salary = numericNewAmount;
    await targetUser.save();

    await recordAuditLog({
      actor: caller,
      action: 'SALARY_INCREMENT',
      resource: 'salaries',
      resourceId: salaryDoc._id.toString(),
      before: { salary: previousSalary },
      after: { salary: numericNewAmount, reason },
      req
    });

    res.status(201).json({
      success: true,
      message: `Salary increment applied for ${targetUser.name}: ${previousSalary} -> ${numericNewAmount}`,
      data: {
        userId: targetUser._id,
        name: targetUser.name,
        previousSalary,
        newSalary: numericNewAmount,
        effectiveFrom: effDate,
        reason
      }
    });
  } catch (error) {
    logger.error(`[Salary Increment Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update salary structure - creates new revision to keep history
// @route   PATCH /api/v1/salaries/:id or PATCH /api/salaries/:id
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const updateSalary = async (req, res, next) => {
  try {
    const caller = req.user;
    if (!canManageSalary(caller)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin and HR personnel can revise salary records.'
      });
    }

    const param = req.params.id;
    let salaryRecord = await Salary.findById(param);
    if (!salaryRecord) {
      salaryRecord = await Salary.findOne({ user_id: param });
    }

    if (!salaryRecord) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    // HR creator check
    if (caller.role !== 'superadmin') {
      if (salaryRecord.createdBy?.toString() !== caller._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: You can only revise salaries of users created by you.'
        });
      }
    }

    const beforeState = salaryRecord.toJSON();
    const { basic, allowances, deductions, effectiveFrom, reason } = req.body;

    const newBasic = basic !== undefined ? Number(basic) : salaryRecord.basic;
    const newAllowances = allowances !== undefined ? Number(allowances) : salaryRecord.allowances;
    const newDeductions = deductions !== undefined ? Number(deductions) : salaryRecord.deductions;
    const newNet = Math.max(0, newBasic + newAllowances - newDeductions);
    const effDate = effectiveFrom ? new Date(effectiveFrom) : new Date();

    const nextRevNumber = (salaryRecord.currentRevision || 1) + 1;

    // Close previous revision
    if (salaryRecord.revisions && salaryRecord.revisions.length > 0) {
      salaryRecord.revisions[salaryRecord.revisions.length - 1].effectiveUntil = effDate;
    }

    const newRevision = {
      revisionNumber: nextRevNumber,
      basic: newBasic,
      allowances: newAllowances,
      deductions: newDeductions,
      salary: newNet,
      effectiveFrom: effDate,
      effectiveUntil: null,
      reason: reason || `Revision #${nextRevNumber} approved`,
      updatedBy: caller._id,
      createdAt: new Date()
    };

    salaryRecord.basic = newBasic;
    salaryRecord.allowances = newAllowances;
    salaryRecord.deductions = newDeductions;
    salaryRecord.salary = newNet;
    salaryRecord.effectiveFrom = effDate;
    salaryRecord.currentRevision = nextRevNumber;
    salaryRecord.revisions.push(newRevision);
    salaryRecord.updatedBy = caller._id;

    await salaryRecord.save();

    // Synchronize User model
    await User.findByIdAndUpdate(salaryRecord.user_id, { salary: newNet });

    await recordAuditLog({
      actor: caller,
      action: 'REVISE_SALARY',
      resource: 'salaries',
      resourceId: salaryRecord._id.toString(),
      before: beforeState,
      after: salaryRecord.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Salary revised to #${nextRevNumber}. Historical records preserved.`,
      data: salaryRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] updateSalary failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  createSalary,
  getSalaries,
  getMySalary,
  getSalaryByUserId,
  updateSalary,
  createSalaryIncrement,
  canManageSalary
};
