const Department = require('../models/Department');
const User = require('../models/User');
const { paginate } = require('../utils/pagination');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    List all hospital departments
// @route   GET /api/v1/departments or GET /api/departments
// @access  Private (All authenticated staff)
const getDepartments = async (req, res, next) => {
  try {
    const result = await paginate(Department, {}, req.query, {
      populate: { path: 'head', select: 'name email designation employeeId' },
      sort: { name: 1 },
      searchFields: ['name', 'code', 'description'],
      dateField: 'createdAt'
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Department Controller Error] getDepartments failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get department details by ID or code
// @route   GET /api/v1/departments/:id or GET /api/departments/:id
// @access  Private (All authenticated staff)
const getDepartmentById = async (req, res, next) => {
  try {
    let dept = await Department.findById(req.params.id)
      .populate('head', 'name email designation employeeId phone');

    if (!dept) {
      dept = await Department.findOne({ code: req.params.id.toLowerCase() })
        .populate('head', 'name email designation employeeId phone');
    }

    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.status(200).json({
      success: true,
      data: dept
    });
  } catch (error) {
    logger.error(`[Department Controller Error] getDepartmentById failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Create new department
// @route   POST /api/v1/departments or POST /api/departments
// @access  Private (SuperAdmin only)
const createDepartment = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Superadmin can create hospital departments.'
      });
    }

    const { name, code, description, head } = req.body;

    const existing = await Department.findOne({
      $or: [{ code: code.toLowerCase() }, { name: name.trim() }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A department with this name or code already exists.'
      });
    }

    const dept = await Department.create({
      name: name.trim(),
      code: code.toLowerCase().trim(),
      description: description || '',
      head: head || null,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_DEPARTMENT',
      resource: 'departments',
      resourceId: dept._id.toString(),
      after: dept.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: dept
    });
  } catch (error) {
    logger.error(`[Department Controller Error] createDepartment failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Update department
// @route   PATCH /api/v1/departments/:id or PATCH /api/departments/:id
// @access  Private (SuperAdmin only)
const updateDepartment = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Superadmin can update department configurations.'
      });
    }

    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const beforeState = dept.toJSON();
    const { name, description, head, status } = req.body;

    if (name) dept.name = name.trim();
    if (description !== undefined) dept.description = description;
    if (head !== undefined) dept.head = head;
    if (status) dept.status = status;
    dept.updatedBy = req.user._id;

    await dept.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_DEPARTMENT',
      resource: 'departments',
      resourceId: dept._id.toString(),
      before: beforeState,
      after: dept.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: dept
    });
  } catch (error) {
    logger.error(`[Department Controller Error] updateDepartment failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get staff members in a specific department
// @route   GET /api/v1/departments/:id/staff or GET /api/departments/:id/staff
// @access  Private (Superadmin, HR, or members of this department)
const getDepartmentStaff = async (req, res, next) => {
  try {
    let dept = await Department.findById(req.params.id);
    if (!dept) {
      dept = await Department.findOne({ code: req.params.id.toLowerCase() });
    }

    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHR = caller.department === 'hr';
    const isSameDept = (caller.department || '').toLowerCase() === dept.code.toLowerCase();

    if (!isSuperAdmin && !isHR && !isSameDept) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: You can only view staff list of your own department.'
      });
    }

    const result = await paginate(User, {
      department: dept.code,
      isDeleted: { $ne: true }
    }, req.query, {
      select: 'name email employeeId role designation phone avatar status shiftPolicy',
      searchFields: ['name', 'email', 'employeeId', 'designation'],
      dateField: 'createdAt'
    });

    res.status(200).json({
      department: dept.name,
      code: dept.code,
      ...result
    });
  } catch (error) {
    logger.error(`[Department Controller Error] getDepartmentStaff failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  getDepartmentStaff
};
