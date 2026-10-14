const CustomRole = require('../models/clinical/CustomRole');
const Department = require('../models/Department');
const User = require('../models/User');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Create custom clinical or operational designation/role
// @route   POST /api/v1/roles
// @access  Private (Superadmin only)
const createRole = async (req, res, next) => {
  try {
    const { name, department, level, description, isClinical, requiresLicense } = req.body;
    if (!name || !department) {
      return res.status(400).json({ success: false, message: 'name and department are required' });
    }

    const role = await CustomRole.create({
      name,
      department: department.toLowerCase(),
      level: level || 'user',
      description: description || '',
      isClinical: isClinical !== undefined ? isClinical : true,
      requiresLicense: requiresLicense !== undefined ? requiresLicense : false,
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_CUSTOM_ROLE',
      resource: 'roles',
      resourceId: role._id.toString(),
      after: role.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: `Role ${name} created in ${department} department`,
      data: role
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Role with this name already exists' });
    }
    logger.error(`[Clinical Role Error] ${error.message}`);
    next(error);
  }
};

// @desc    List roles
// @route   GET /api/v1/roles
// @access  Private
const getRoles = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department.toLowerCase();
    const roles = await CustomRole.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles
    });
  } catch (error) {
    logger.error(`[Clinical Role Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update department-specific attendance and shift policy override
// @route   PATCH /api/v1/departments/:id/policy
// @access  Private (Superadmin, HR Admin)
const updateDepartmentPolicy = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const { shiftPolicy, weeklyOffDays, attendanceRules } = req.body;
    const before = department.toObject();

    if (shiftPolicy) department.shiftPolicy = shiftPolicy;
    if (weeklyOffDays) department.weeklyOffDays = weeklyOffDays;
    if (attendanceRules) department.attendanceRules = attendanceRules;
    await department.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_DEPARTMENT_POLICY',
      resource: 'departments',
      resourceId: department._id.toString(),
      before,
      after: department.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Department policy for ${department.name} updated successfully`,
      data: department
    });
  } catch (error) {
    logger.error(`[Department Policy Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get expiring professional licenses (within 60 days)
// @route   GET /api/v1/hr/licenses/expiring
// @access  Private (HR Admin, Superadmin)
const getExpiringLicenses = async (req, res, next) => {
  try {
    const daysAhead = parseInt(req.query.days, 10) || 60;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiringStaff = await User.find({
      licenseNumber: { $ne: '' },
      licenseExpiry: { $lte: futureDate },
      status: 'active',
      isDeleted: false
    })
      .select('name email employeeId department designation licenseNumber licenseExpiry specialization registrationBody')
      .sort({ licenseExpiry: 1 });

    res.status(200).json({
      success: true,
      thresholdDays: daysAhead,
      count: expiringStaff.length,
      data: expiringStaff
    });
  } catch (error) {
    logger.error(`[Expiring Licenses Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  createRole,
  getRoles,
  updateDepartmentPolicy,
  getExpiringLicenses
};
