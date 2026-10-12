const Salary = require('../models/Salary');
const User = require('../models/User');
const logger = require('../utils/logger');

// Helper function to check if user belongs to HR department or has HR designation
const isHRRole = (user) => {
  if (!user) return false;
  const dept = (user.department || '').toLowerCase();
  const desig = (user.designation || '').toLowerCase();
  return dept === 'hr' || desig.includes('hr');
};

// Check if requester has authority to create/manage salary records
const canManageSalary = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  // HR Admin or Supervisor under HR department
  if ((user.role === 'admin' || user.role === 'supervisor') && isHRRole(user)) {
    return true;
  }
  return false;
};

// @desc    Create / Assign salary for a user
// @route   POST /api/v1/salary
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const createSalary = async (req, res, next) => {
  try {
    if (!canManageSalary(req.user)) {
      logger.warn(`[Salary Controller] Permission denied: ${req.user.email} (${req.user.role}, Dept: ${req.user.department}) attempted to create salary record`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin, HR Admin, or Supervisors under HR department are authorized to create or add salary records.'
      });
    }

    const { user_id, userId, salary, user_name, department, designation } = req.body;
    const targetUserId = user_id || userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID (user_id) is required to assign salary.'
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser || targetUser.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found.'
      });
    }

    const numericSalary = Number(salary);
    if (isNaN(numericSalary) || numericSalary < 0) {
      return res.status(400).json({
        success: false,
        message: 'Salary must be a positive number.'
      });
    }

    // Check if salary record already exists for this user
    let salaryRecord = await Salary.findOne({ user_id: targetUser._id });
    if (salaryRecord) {
      // Update existing record
      salaryRecord.salary = numericSalary;
      salaryRecord.user_name = user_name || targetUser.name;
      salaryRecord.department = department || targetUser.department;
      salaryRecord.designation = designation || targetUser.designation;
      salaryRecord.updatedBy = req.user._id;
      await salaryRecord.save();
    } else {
      // Create new salary record
      salaryRecord = await Salary.create({
        user_id: targetUser._id,
        user_name: user_name || targetUser.name,
        department: department || targetUser.department,
        designation: designation || targetUser.designation,
        salary: numericSalary,
        createdBy: req.user._id,
        updatedBy: req.user._id
      });
    }

    // Synchronize salary on User document
    targetUser.salary = numericSalary;
    await targetUser.save();

    logger.info(`[Salary Controller] Salary assigned for ${targetUser.email}: Amount ${numericSalary} by ${req.user.email} (${req.user.role})`);

    res.status(201).json({
      success: true,
      message: 'Salary record saved successfully',
      data: salaryRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] createSalary failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List all salary records
// @route   GET /api/v1/salary
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const getSalaries = async (req, res, next) => {
  try {
    if (!canManageSalary(req.user)) {
      logger.warn(`[Salary Controller] Access denied: ${req.user.email} (${req.user.role}) attempted to list salaries`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin, HR Admin, or Supervisors under HR department can view salary records.'
      });
    }

    let filter = {};
    const { department, designation, search } = req.query;

    if (department) filter.department = department;
    if (designation) filter.designation = designation;

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { user_name: searchRegex },
        { department: searchRegex },
        { designation: searchRegex }
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await Salary.countDocuments(filter);
    const salaries = await Salary.find(filter)
      .populate('user_id', 'name email role department designation')
      .populate('createdBy', 'name email role department')
      .populate('updatedBy', 'name email role department')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    logger.info(`[Salary Controller] Listed ${salaries.length} salary records for ${req.user.email}`);

    res.status(200).json({
      success: true,
      count: salaries.length,
      total,
      page,
      data: salaries.map(s => s.toJSON())
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] getSalaries failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get salary record by Salary ID or User ID
// @route   GET /api/v1/salary/:id
// @access  Private (SuperAdmin, HR Admin, HR Supervisor, or Self)
const getSalaryById = async (req, res, next) => {
  try {
    const isSelf = req.user._id.toString() === req.params.id;
    if (!canManageSalary(req.user) && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: You are not authorized to view this salary record.'
      });
    }

    let salaryRecord = await Salary.findById(req.params.id)
      .populate('user_id', 'name email role department designation')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role');

    // If not found by Salary _id, check if param is user_id
    if (!salaryRecord) {
      salaryRecord = await Salary.findOne({ user_id: req.params.id })
        .populate('user_id', 'name email role department designation')
        .populate('createdBy', 'name email role')
        .populate('updatedBy', 'name email role');
    }

    if (!salaryRecord) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: salaryRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] getSalaryById failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Update salary record
// @route   PATCH /api/v1/salary/:id (or PUT)
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const updateSalary = async (req, res, next) => {
  try {
    if (!canManageSalary(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin, HR Admin, or Supervisors under HR department can update salary records.'
      });
    }

    let salaryRecord = await Salary.findById(req.params.id);
    if (!salaryRecord) {
      salaryRecord = await Salary.findOne({ user_id: req.params.id });
    }

    if (!salaryRecord) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found.'
      });
    }

    const { salary, department, designation, user_name } = req.body;

    if (salary !== undefined) {
      const numericSalary = Number(salary);
      if (isNaN(numericSalary) || numericSalary < 0) {
        return res.status(400).json({
          success: false,
          message: 'Salary must be a positive number.'
        });
      }
      salaryRecord.salary = numericSalary;

      // Sync with User
      await User.findByIdAndUpdate(salaryRecord.user_id, { salary: numericSalary });
    }

    if (department) salaryRecord.department = department;
    if (designation) salaryRecord.designation = designation;
    if (user_name) salaryRecord.user_name = user_name;

    salaryRecord.updatedBy = req.user._id;
    await salaryRecord.save();

    logger.info(`[Salary Controller] Updated salary record for user ${salaryRecord.user_name} (${salaryRecord.user_id}) by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Salary record updated successfully',
      data: salaryRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] updateSalary failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Delete salary record
// @route   DELETE /api/v1/salary/:id
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const deleteSalary = async (req, res, next) => {
  try {
    if (!canManageSalary(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin, HR Admin, or Supervisors under HR department can delete salary records.'
      });
    }

    let salaryRecord = await Salary.findById(req.params.id);
    if (!salaryRecord) {
      salaryRecord = await Salary.findOne({ user_id: req.params.id });
    }

    if (!salaryRecord) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found.'
      });
    }

    const targetUserId = salaryRecord.user_id;
    await Salary.findByIdAndDelete(salaryRecord._id);

    // Reset user salary to 0
    await User.findByIdAndUpdate(targetUserId, { salary: 0 });

    logger.info(`[Salary Controller] Deleted salary record for user ${salaryRecord.user_name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Salary record deleted successfully'
    });
  } catch (error) {
    logger.error(`[Salary Controller Error] deleteSalary failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  createSalary,
  getSalaries,
  getSalaryById,
  updateSalary,
  deleteSalary,
  canManageSalary
};
