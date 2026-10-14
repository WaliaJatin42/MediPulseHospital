const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Salary = require('../models/Salary');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');
const { isHRDepartment } = require('../config/permissions');

// Helper to generate unique employeeId if not supplied
const generateEmployeeId = async () => {
  const count = await User.countDocuments();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `EMP-${nextNum}`;
};

// @desc    Get current logged in user profile (by token)
// @route   GET /api/v1/users/me or GET /api/users/me
// @access  Private (All authenticated)
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('createdBy', 'name email role department designation')
      .populate('updatedBy', 'name email role department');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }

    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] getMe failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Update current logged in user's personal profile
// @route   PATCH /api/v1/users/me or PATCH /api/users/me
// @access  Private (Self)
const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, phone, avatar } = req.body;
    const beforeState = user.toJSON();

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar) user.avatar = avatar;

    user.updatedBy = user._id;
    await user.save();

    await recordAuditLog({
      actor: user,
      action: 'UPDATE_PROFILE_SELF',
      resource: 'users',
      resourceId: user._id.toString(),
      before: beforeState,
      after: user.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] updateMe failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Create a new user account & initialize salary record
// @route   POST /api/v1/users or POST /api/users
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      designation,
      department,
      phone,
      avatar,
      salary,
      employeeId,
      shiftPolicy,
      joiningDate
    } = req.body;

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHR = isHRDepartment(caller);

    // Permission guard
    if (!isSuperAdmin && !isHR) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin and HR personnel are authorized to hire/create users.'
      });
    }

    let targetRole = role || 'user';

    // Role creation hierarchy checks:
    // Superadmin: can create any role
    // HR Admin: can create 'supervisor' or 'user'
    // HR Supervisor: can create 'user' only
    if (!isSuperAdmin) {
      if (caller.role === 'supervisor') {
        if (targetRole !== 'user') {
          return res.status(403).json({
            success: false,
            message: 'Permission denied: HR Supervisors are restricted to hiring staff with role "user" only.'
          });
        }
      } else if (caller.role === 'admin') {
        if (targetRole !== 'user' && targetRole !== 'supervisor') {
          return res.status(403).json({
            success: false,
            message: 'Permission denied: HR Admin can only create staff with role "user" or "supervisor".'
          });
        }
      }
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Assign or auto-generate employeeId
    let finalEmpId = employeeId;
    if (!finalEmpId) {
      finalEmpId = await generateEmployeeId();
    } else {
      const empExists = await User.findOne({ employeeId: finalEmpId });
      if (empExists) {
        return res.status(400).json({
          success: false,
          message: `Employee ID '${finalEmpId}' is already registered.`
        });
      }
    }

    const numericSalary = salary !== undefined && salary !== null && salary !== '' ? Number(salary) : 0;
    if (isNaN(numericSalary) || numericSalary < 0) {
      return res.status(400).json({
        success: false,
        message: 'Salary must be a non-negative number.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'Welcome123!', salt);

    const targetDept = (department || 'general').toLowerCase();

    const newUser = await User.create({
      employeeId: finalEmpId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: targetRole,
      designation: designation || 'Staff',
      department: targetDept,
      phone: phone ? phone.trim() : '',
      shiftPolicy: shiftPolicy || 'standard_9h',
      status: 'active',
      isActive: true,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      salary: numericSalary,
      avatar: avatar || undefined,
      authProvider: 'local',
      createdBy: caller._id,
      updatedBy: caller._id
    });

    // Create corresponding Salary record
    await Salary.create({
      user_id: newUser._id,
      user_name: newUser.name,
      department: newUser.department,
      designation: newUser.designation,
      basic: numericSalary,
      allowances: 0,
      deductions: 0,
      salary: numericSalary,
      effectiveFrom: newUser.joiningDate,
      currentRevision: 1,
      revisions: [
        {
          revisionNumber: 1,
          basic: numericSalary,
          allowances: 0,
          deductions: 0,
          salary: numericSalary,
          effectiveFrom: newUser.joiningDate,
          reason: 'Initial appointment',
          updatedBy: caller._id,
          createdAt: new Date()
        }
      ],
      createdBy: caller._id,
      updatedBy: caller._id
    });

    // Record tamper-evident audit log
    await recordAuditLog({
      actor: caller,
      action: 'CREATE_USER',
      resource: 'users',
      resourceId: newUser._id.toString(),
      after: newUser.toJSON(),
      req
    });

    logger.info(`[User Controller] User created: ${newUser.email} (${newUser.role}, Dept: ${newUser.department}) by ${caller.email}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully and assigned initial salary record.',
      user: newUser.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] createUser failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List users with scoping rules & pagination
// @route   GET /api/v1/users or GET /api/users
// @access  Private (SuperAdmin, HR Admin, HR Supervisor, Dept Admin, Dept Supervisor)
// Rules:
// 1. Superadmin: views all hospital users
// 2. HR Admin / HR Supervisor: views only users created by them (createdBy == caller._id)
// 3. Other Department Admins / Supervisors: views only staff in their department (department == caller.department)
const getUsers = async (req, res, next) => {
  try {
    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHR = isHRDepartment(caller);
    const isDeptAdminOrSupervisor = (caller.role === 'admin' || caller.role === 'supervisor') && !isHR;

    let filter = {};

    // Soft delete filter
    if (!(req.query.includeDeleted === 'true' && isSuperAdmin)) {
      filter.isDeleted = { $ne: true };
    }

    // Apply strict scoping
    if (isSuperAdmin) {
      // Global scope - can filter by any department
      if (req.query.department) {
        filter.department = req.query.department.toLowerCase();
      }
    } else if (isHR) {
      // Creator scope - HR roles only see users created by their own ID
      filter.createdBy = caller._id;
      if (req.query.department) {
        filter.department = req.query.department.toLowerCase();
      }
    } else if (isDeptAdminOrSupervisor) {
      // Department scope - other admins/supervisors only see their own department users
      filter.department = (caller.department || '').toLowerCase();
    } else {
      // User role should not access list endpoint
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Staff cannot view hospital user directory.'
      });
    }

    // Additional filters
    if (req.query.role) filter.role = req.query.role;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.designation) filter.designation = req.query.designation;

    // Date range filter
    const startDateStr = req.query.startDate || req.query.from;
    const endDateStr = req.query.endDate || req.query.to;
    if (startDateStr || endDateStr) {
      filter.createdAt = filter.createdAt || {};
      if (startDateStr) {
        const start = new Date(startDateStr);
        if (!isNaN(start.getTime())) filter.createdAt.$gte = start;
      }
      if (endDateStr) {
        const end = new Date(endDateStr);
        if (!isNaN(end.getTime())) {
          if (typeof endDateStr === 'string' && endDateStr.length === 10) end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
    }

    // Search query
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex },
        { designation: searchRegex },
        { department: searchRegex }
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .populate('createdBy', 'name email role department')
      .populate('updatedBy', 'name email role department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const isDeptScopeCaller = (caller.role === 'admin' || caller.role === 'supervisor') && !isHR && !isSuperAdmin;

    const projectedUsers = users.map((u) => {
      const json = u.toJSON();
      if (isDeptScopeCaller) {
        // Return only public non-sensitive fields
        return {
          _id: json._id,
          name: json.name,
          employeeId: json.employeeId,
          designation: json.designation,
          department: json.department,
          status: json.status,
          email: json.email,
          phone: json.phone,
          joiningDate: json.joiningDate,
          avatar: json.avatar
        };
      }
      return json;
    });

    const totalPages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      count: projectedUsers.length,
      total,
      page,
      limit,
      pages: totalPages,
      totalPages,
      hasMore: page < totalPages,
      data: projectedUsers
    });
  } catch (error) {
    logger.error(`[User Controller Error] getUsers failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get user details by ID with scope validation
// @route   GET /api/v1/users/:id or GET /api/users/:id
// @access  Private (SuperAdmin, HR Admin, HR Supervisor, Dept Admin, Dept Supervisor, Self)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('createdBy', 'name email role department')
      .populate('updatedBy', 'name email role department');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isSelf = user._id.toString() === caller._id.toString();
    const isHR = isHRDepartment(caller);
    const isCreator = user.createdBy?._id?.toString() === caller._id.toString() || user.createdBy?.toString() === caller._id.toString();
    const isSameDept = (caller.department || '').toLowerCase() === (user.department || '').toLowerCase();
    const isDeptAdminOrSupervisor = (caller.role === 'admin' || caller.role === 'supervisor') && isSameDept;

    if (!isSuperAdmin && !isSelf) {
      if (isHR && !isCreator) {
        // Obscure existence with 404 per security rules
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      if (!isHR && !isDeptAdminOrSupervisor) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
    }

    // Department scope callers receive only public projection
    if (isDeptAdminOrSupervisor && !isSuperAdmin && !isCreator && !isSelf) {
      return res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          employeeId: user.employeeId,
          designation: user.designation,
          department: user.department,
          status: user.status,
          email: user.email,
          phone: user.phone,
          joiningDate: user.joiningDate,
          avatar: user.avatar
        }
      });
    }

    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] getUserById failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Update user profile, designation, or department transfer
// @route   PATCH /api/v1/users/:id or PATCH /api/users/:id
// @access  Private (SuperAdmin, HR Admin, HR Supervisor for own created users)
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHR = isHRDepartment(caller);
    const isCreator = user.createdBy?.toString() === caller._id.toString();

    // Only Superadmin and HR roles (for their created users) can manage profiles
    if (!isSuperAdmin) {
      if (!isHR || !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: You can only edit users created by you.'
        });
      }
    }

    // Protect SuperAdmin accounts
    if (user.role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot edit SuperAdmin account.'
      });
    }

    const beforeState = user.toJSON();
    const { name, email, designation, department, phone, avatar, shiftPolicy, role } = req.body;

    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email address already in use.' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (designation) user.designation = designation.trim();
    if (department) user.department = department.toLowerCase().trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar) user.avatar = avatar;
    if (shiftPolicy) user.shiftPolicy = shiftPolicy;

    // Role elevation guard
    if (role) {
      if (!isSuperAdmin) {
        if (role !== 'user' && role !== 'supervisor') {
          return res.status(403).json({
            success: false,
            message: 'HR staff cannot assign Admin or Superadmin roles.'
          });
        }
      }
      user.role = role;
    }

    user.updatedBy = caller._id;
    await user.save();

    // Synchronize department/designation on Salary document
    await Salary.findOneAndUpdate(
      { user_id: user._id },
      {
        user_name: user.name,
        department: user.department,
        designation: user.designation,
        updatedBy: caller._id
      }
    );

    // Record audit log
    await recordAuditLog({
      actor: caller,
      action: 'UPDATE_USER',
      resource: 'users',
      resourceId: user._id.toString(),
      before: beforeState,
      after: user.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] updateUser failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Update user status (activate, deactivate, terminate)
// @route   PATCH /api/v1/users/:id/status or PATCH /api/users/:id/status
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    if (!['active', 'inactive', 'terminated'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'active', 'inactive', or 'terminated'."
      });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isHR = isHRDepartment(caller);
    const isCreator = user.createdBy?.toString() === caller._id.toString();

    if (!isSuperAdmin && (!isHR || !isCreator)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: You can only change status for users created by you.'
      });
    }

    if (user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'SuperAdmin status cannot be altered.'
      });
    }

    // Section 2.1 Rule: Block deactivation of an HR user who still owns staff unless a reassignment target is provided
    if (status === 'inactive' || status === 'terminated') {
      const ownedStaffCount = await User.countDocuments({ createdBy: user._id, isDeleted: false, status: 'active' });
      if (ownedStaffCount > 0) {
        if (!req.body.reassignToUserId) {
          return res.status(400).json({
            success: false,
            message: `Cannot deactivate HR user who still owns ${ownedStaffCount} active staff member(s). Please provide 'reassignToUserId' in the request body to reassign ownership.`
          });
        }

        const targetHR = await User.findOne({
          _id: req.body.reassignToUserId,
          department: 'hr',
          role: { $in: ['admin', 'supervisor'] },
          status: 'active'
        });

        if (!targetHR) {
          return res.status(400).json({
            success: false,
            message: 'Reassignment target must be an active HR Admin or HR Supervisor.'
          });
        }

        await User.updateMany(
          { createdBy: user._id, isDeleted: false },
          {
            $set: { createdBy: targetHR._id },
            $push: {
              ownershipHistory: {
                fromUserId: user._id,
                toUserId: targetHR._id,
                reassignedAt: new Date(),
                reassignedBy: caller._id,
                reason: reason || 'HR user deactivation reassignment'
              }
            }
          }
        );
      }
    }

    const beforeState = user.toJSON();

    user.status = status;
    user.isActive = status === 'active';
    user.updatedBy = caller._id;
    if (status === 'inactive' || status === 'terminated') {
      user.refreshToken = null; // Invalidate active sessions immediately
    }

    await user.save();

    await recordAuditLog({
      actor: caller,
      action: `USER_STATUS_${status.toUpperCase()}`,
      resource: 'users',
      resourceId: user._id.toString(),
      before: beforeState,
      after: { ...user.toJSON(), reason: reason || 'Not specified' },
      req
    });

    logger.info(`[User Controller] User ${user.email} status changed to ${status} by ${caller.email}`);

    res.status(200).json({
      success: true,
      message: `User account has been set to ${status}.`,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] updateUserStatus failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Soft delete user account
// @route   DELETE /api/v1/users/:id or DELETE /api/users/:id
// @access  Private (SuperAdmin, HR Admin, HR Supervisor)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isCreator = user.createdBy?.toString() === caller._id.toString();

    if (user._id.toString() === caller._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    if (user.role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'SuperAdmin accounts cannot be deleted.' });
    }

    if (!isSuperAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: You can only delete users created by you.'
      });
    }

    user.isDeleted = true;
    user.status = 'terminated';
    user.isActive = false;
    user.deletedBy = caller._id;
    user.deletedAt = new Date();
    user.refreshToken = null;
    await user.save();

    await recordAuditLog({
      actor: caller,
      action: 'SOFT_DELETE_USER',
      resource: 'users',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'User account deactivated and archived successfully.'
    });
  } catch (error) {
    logger.error(`[User Controller Error] deleteUser failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get user sensitive data (audited on every read, only SA and creator HR)
// @route   GET /api/v1/users/:id/sensitive
// @access  Private (Superadmin, Creator HR)
const getUserSensitive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('+passwordHistory +taxId +nationalId +bankAccount +bankIfsc');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const caller = req.user;
    const isSuperAdmin = caller.role === 'superadmin';
    const isCreator = user.createdBy?.toString() === caller._id.toString();

    if (!isSuperAdmin && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Sensitive financial and identity records are restricted to Superadmin and creator HR staff.'
      });
    }

    const salaryDoc = await Salary.findOne({ user_id: user._id });

    // Audited on EVERY read of sensitive data
    await recordAuditLog({
      actor: caller,
      action: 'READ_SENSITIVE_USER_DATA',
      resource: 'users',
      resourceId: user._id.toString(),
      isConfidential: true,
      req
    });

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        salary: user.salary,
        salaryStructure: salaryDoc ? salaryDoc.toJSON() : null,
        bankAccount: user.bankAccount,
        bankIfsc: user.bankIfsc,
        taxId: user.taxId,
        nationalId: user.nationalId,
        licenseNumber: user.licenseNumber,
        specialization: user.specialization,
        registrationBody: user.registrationBody,
        payType: user.payType
      }
    });
  } catch (error) {
    logger.error(`[Get Sensitive User Error] ${error.message}`);
    next(error);
  }
};

// @desc    Reassign staff ownership from one HR user to another
// @route   POST /api/v1/users/reassign
// @access  Private (Superadmin, HR Admin)
const reassignUsers = async (req, res, next) => {
  try {
    const { fromUserId, toUserId, userIds, reason } = req.body;
    if (!fromUserId || !toUserId) {
      return res.status(400).json({ success: false, message: 'fromUserId and toUserId are required' });
    }

    const targetHR = await User.findOne({
      _id: toUserId,
      department: 'hr',
      role: { $in: ['admin', 'supervisor'] },
      status: 'active'
    });

    if (!targetHR) {
      return res.status(400).json({
        success: false,
        message: 'toUserId must be an active HR Admin or HR Supervisor.'
      });
    }

    let filter = { createdBy: fromUserId, isDeleted: false };
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      filter._id = { $in: userIds };
    }

    const matchedUsers = await User.find(filter);
    const count = matchedUsers.length;

    await User.updateMany(filter, {
      $set: { createdBy: toUserId },
      $push: {
        ownershipHistory: {
          fromUserId,
          toUserId,
          reassignedAt: new Date(),
          reassignedBy: req.user._id,
          reason: reason || 'Staff ownership reassignment'
        }
      }
    });

    await recordAuditLog({
      actor: req.user,
      action: 'REASSIGN_USER_OWNERSHIP',
      resource: 'users',
      before: { fromUserId, count },
      after: { toUserId, count, userIds: matchedUsers.map((u) => u._id) },
      req
    });

    res.status(200).json({
      success: true,
      message: `Successfully reassigned ${count} staff member(s) to ${targetHR.name}`,
      count
    });
  } catch (error) {
    logger.error(`[Reassign Users Error] ${error.message}`);
    next(error);
  }
};

// @desc    List staff whose creator is inactive or terminated
// @route   GET /api/v1/users/orphaned
// @access  Private (Superadmin, HR Admin)
const getOrphanedUsers = async (req, res, next) => {
  try {
    const inactiveHRs = await User.find({
      $or: [{ status: { $in: ['inactive', 'terminated'] } }, { isDeleted: true }]
    }).select('_id');

    const inactiveHrIds = inactiveHRs.map((h) => h._id);

    const orphanedUsers = await User.find({
      isDeleted: false,
      status: 'active',
      role: { $nin: ['superadmin'] },
      $or: [{ createdBy: { $in: inactiveHrIds } }, { createdBy: null }, { createdBy: { $exists: false } }]
    }).populate('createdBy', 'name email status role department');

    res.status(200).json({
      success: true,
      count: orphanedUsers.length,
      data: orphanedUsers
    });
  } catch (error) {
    logger.error(`[Orphaned Users Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get user's ownership reassignment history
// @route   GET /api/v1/users/:id/ownership-history
// @access  Private
const getOwnershipHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('ownershipHistory.fromUserId', 'name email role')
      .populate('ownershipHistory.toUserId', 'name email role')
      .populate('ownershipHistory.reassignedBy', 'name email role');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      userId: user._id,
      name: user.name,
      ownershipHistory: user.ownershipHistory || [],
      data: user.ownershipHistory || []
    });
  } catch (error) {
    logger.error(`[Ownership History Error] ${error.message}`);
    next(error);
  }
};

// @desc    Transfer user to another department (with mid-month split assignment tracking)
// @route   POST /api/v1/users/:id/transfer
// @access  Private (HR Admin, Superadmin)
const transferUser = async (req, res, next) => {
  try {
    const { toDepartment, newRole, effectiveDate, reason } = req.body;
    if (!toDepartment) {
      return res.status(400).json({ success: false, message: 'toDepartment is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const fromDept = user.department;
    const fromRole = user.role;
    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();

    user.assignments.push({
      department: toDepartment.toLowerCase(),
      role: newRole || user.role,
      designation: user.designation,
      from: effDate,
      reason: reason || 'Department transfer',
      changedBy: req.user._id
    });

    user.department = toDepartment.toLowerCase();
    if (newRole) user.role = newRole;
    await user.save();

    await recordAuditLog({
      actor: req.user,
      action: 'TRANSFER_DEPARTMENT',
      resource: 'users',
      resourceId: user._id.toString(),
      before: { department: fromDept, role: fromRole },
      after: { department: user.department, role: user.role, effectiveDate: effDate, reason },
      req
    });

    res.status(200).json({
      success: true,
      message: `User ${user.name} transferred from ${fromDept} to ${toDepartment}`,
      data: user.toJSON()
    });
  } catch (error) {
    logger.error(`[Transfer User Error] ${error.message}`);
    next(error);
  }
};

// @desc    Change user role
// @route   POST /api/v1/users/:id/role-change
// @access  Private (HR Admin, Superadmin)
const roleChangeUser = async (req, res, next) => {
  try {
    const { newRole, effectiveDate, reason } = req.body;
    if (!newRole) {
      return res.status(400).json({ success: false, message: 'newRole is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const previousRole = user.role;
    const effDate = effectiveDate ? new Date(effectiveDate) : new Date();

    user.assignments.push({
      department: user.department,
      role: newRole,
      designation: user.designation,
      from: effDate,
      reason: reason || 'Role change',
      changedBy: req.user._id
    });

    user.role = newRole;
    await user.save();

    await recordAuditLog({
      actor: req.user,
      action: 'ROLE_CHANGE',
      resource: 'users',
      resourceId: user._id.toString(),
      before: { role: previousRole },
      after: { role: newRole, effectiveDate: effDate },
      req
    });

    res.status(200).json({
      success: true,
      message: `User ${user.name} role changed to ${newRole}`,
      data: user.toJSON()
    });
  } catch (error) {
    logger.error(`[Role Change Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get user's assignment history
// @route   GET /api/v1/users/:id/assignment-history
// @access  Private
const getAssignmentHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('assignments.changedBy', 'name email role');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      userId: user._id,
      name: user.name,
      assignments: user.assignments || [],
      data: user.assignments || []
    });
  } catch (error) {
    logger.error(`[Assignment History Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  getUserSensitive,
  reassignUsers,
  getOrphanedUsers,
  getOwnershipHistory,
  transferUser,
  roleChangeUser,
  getAssignmentHistory
};

