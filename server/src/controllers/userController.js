const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Salary = require('../models/Salary');
const logger = require('../utils/logger');

// Helper function to check if user belongs to HR department or has HR designation
const isHRRole = (user) => {
  if (!user) return false;
  const dept = (user.department || '').toLowerCase();
  const desig = (user.designation || '').toLowerCase();
  return dept === 'hr' || desig.includes('hr');
};

// @desc    Get current logged in user profile (by token)
// @route   GET /api/v1/users/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    logger.debug(`[User Controller] User profile requested for ID ${req.user.id}`);
    const user = await User.findById(req.user.id)
      .populate('createdBy', 'name email role department')
      .populate('updatedBy', 'name email role department');

    if (!user) {
      logger.warn(`[User Controller] Profile fetch failed: User ID ${req.user.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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

// @desc    Create a new user account and initialize salary record
// @route   POST /api/v1/users
// @access  Private (SuperAdmin, HR Admin, HR Supervisor only)
// Rules:
// 1) SuperAdmin: Can create any role ('user', 'supervisor', 'admin', 'superadmin') in any team/dept
// 2) HR Admin / HR Supervisor: Can create 'supervisor' and 'user' in any team/dept and assign salary
// 3) Other department admins or supervisors: RESTRICTED from creating users or assigning salary
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, designation, department, phone, avatar, salary } = req.body;
    logger.info(`[User Controller] User creation attempt by ${req.user.email} (${req.user.role}, ID: ${req.user._id}) for email: ${email}`);

    const isSuperAdmin = req.user.role === 'superadmin';
    const isHR = isHRRole(req.user);
    const canCreateUser = isSuperAdmin || isHR;

    // Strict validation: Only SuperAdmin, HR Admin, or Supervisors under HR department can create users or add salary
    if (!canCreateUser) {
      logger.warn(`[User Controller] Permission denied: ${req.user.email} (${req.user.role}, Dept: ${req.user.department}) attempted to create user`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only SuperAdmin, HR Admin, or Supervisors under HR department are authorized to create users and assign salaries.'
      });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (existingUser) {
      logger.warn(`[User Controller] Create user failed: Email ${email} already exists`);
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    let targetRole = role || 'user';

    // Role creation restrictions:
    // - SuperAdmin: can create any role ('user', 'supervisor', 'admin', 'superadmin')
    // - HR Admin & HR Supervisor: can only create 'user' or 'supervisor'
    if (!isSuperAdmin) {
      if (targetRole !== 'user' && targetRole !== 'supervisor') {
        logger.warn(`[User Controller] Permission denied: ${req.user.email} attempted to create role '${targetRole}'`);
        return res.status(403).json({
          success: false,
          message: 'HR Admin and HR Supervisors can only create users with role "user" or "supervisor".'
        });
      }
    }

    // Unique phone number validation is ONLY enabled for admin or superadmin accounts
    if ((targetRole === 'admin' || targetRole === 'superadmin') && phone && phone.trim() !== '') {
      const existingPhone = await User.findOne({ phone: phone.trim(), isDeleted: { $ne: true } });
      if (existingPhone) {
        logger.warn(`[User Controller] Create user failed: Phone ${phone} already exists`);
        return res.status(400).json({
          success: false,
          message: 'An account with this phone number already exists.'
        });
      }
    }

    // Determine department assignment:
    // SuperAdmin or HR Admin can specify any department / team (default 'General')
    let targetDepartment = department || 'General';

    const numericSalary = salary !== undefined && salary !== null && salary !== '' ? Number(salary) : 0;
    if (isNaN(numericSalary) || numericSalary < 0) {
      return res.status(400).json({
        success: false,
        message: 'Salary must be a non-negative number.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: targetRole,
      designation: designation || 'Staff',
      department: targetDepartment,
      phone: phone ? phone.trim() : '',
      salary: numericSalary,
      avatar: avatar || undefined,
      authProvider: 'local',
      createdBy: req.user._id,
      updatedBy: req.user._id,
      isActive: true
    });

    // Create corresponding Salary record in database
    await Salary.create({
      user_id: newUser._id,
      user_name: newUser.name,
      department: newUser.department,
      designation: newUser.designation,
      salary: numericSalary,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    logger.info(`[Audit Log] User created: ID ${newUser._id}, Email ${newUser.email}, Role ${newUser.role}, Dept ${newUser.department}, Salary ${numericSalary} by ${req.user.email} (${req.user.role}, ID: ${req.user._id})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] createUser failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List users
// @route   GET /api/v1/users
// @access  Private (SuperAdmin, Admin, Supervisor)
// Rules:
// 1) SuperAdmin: Can see all the users
// 2) HR Admin: Only fetch list of users created by them
// 3) Supervisor: Fetch only the users list that are created by the same supervisor user
const getUsers = async (req, res, next) => {
  try {
    let filter = {};

    const isSuperAdmin = req.user.role === 'superadmin';

    // Default to excluding soft-deleted users unless includeDeleted query param is explicitly passed by SuperAdmin
    if (!(req.query.includeDeleted === 'true' && isSuperAdmin)) {
      filter.isDeleted = { $ne: true };
    }

    // Visibility rules:
    // 1) SuperAdmin: sees ALL users (no createdBy filter)
    // 2) HR Admin & Supervisor (and any non-superadmin): ONLY fetches users created by them
    if (!isSuperAdmin) {
      filter.createdBy = req.user._id;
    }

    // Search & Filter query parameters
    const { search, role, designation, department } = req.query;
    if (role) filter.role = role;
    if (designation) filter.designation = designation;
    if (department) filter.department = department;

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { designation: searchRegex }
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .populate('createdBy', 'name email role department')
      .populate('updatedBy', 'name email role department')
      .populate('deletedBy', 'name email role department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    logger.info(`[User Controller] Listed ${users.length} users for ${req.user.email} (${req.user.role})`);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users.map(u => u.toJSON())
    });
  } catch (error) {
    logger.error(`[User Controller Error] getUsers failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get user details by ID
// @route   GET /api/v1/users/:id
// @access  Private (SuperAdmin, Admin, Supervisor)
// Rules:
// 1) SuperAdmin: Can view all users
// 2) Non-SuperAdmin: Can only view users created by them (or self)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('createdBy', 'name email role department')
      .populate('updatedBy', 'name email role department')
      .populate('deletedBy', 'name email role department');

    if (!user) {
      logger.warn(`[User Controller] Get user failed: ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isSuperAdmin = req.user.role === 'superadmin';

    if (!isSuperAdmin) {
      const creatorId = user.createdBy?._id ? user.createdBy._id.toString() : user.createdBy?.toString();
      const isCreator = creatorId === req.user._id.toString();
      const isSelf = user._id.toString() === req.user._id.toString();

      if (!isCreator && !isSelf) {
        logger.warn(`[User Controller] Access denied: ${req.user.email} tried to view user ${user.email} not created by them`);
        return res.status(403).json({
          success: false,
          message: 'Permission denied: You can only view users created by you.'
        });
      }
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

// @desc    Update user details
// @route   PATCH /api/v1/users/:id (or PUT)
// @access  Private (SuperAdmin, Admin, Supervisor)
// Rules:
// 1) SuperAdmin: Can edit all users
// 2) Non-SuperAdmin (HR Admin, Supervisor): Can only edit users created by them (or self)
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      logger.warn(`[User Controller] Update user failed: ID ${req.params.id} not found or deleted`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isSuperAdmin = req.user.role === 'superadmin';
    const isHR = isHRRole(req.user);
    const creatorId = user.createdBy?.toString();
    const isCreator = creatorId === req.user._id.toString();
    const isSelf = user._id.toString() === req.user._id.toString();

    // Prevent non-superadmin from modifying SuperAdmin accounts
    if (user.role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot edit SuperAdmin account.'
      });
    }

    // Permission boundary:
    // 1) SuperAdmin can edit all users
    // 2) Non-SuperAdmin can only edit users created by them (or self)
    if (!isSuperAdmin) {
      if (!isCreator && !isSelf) {
        logger.warn(`[User Controller] Access denied: ${req.user.email} tried to update user ${user.email} not created by them`);
        return res.status(403).json({
          success: false,
          message: 'Permission denied: You can only update users created by you.'
        });
      }
    }

    const { name, email, role, designation, department, phone, isActive, avatar, password, salary } = req.body;

    // Email update uniqueness check
    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }
      user.email = email.toLowerCase();
    }

    const targetRole = role || user.role;

    // Phone update uniqueness check (Only for admin or superadmin accounts)
    if (phone !== undefined) {
      if ((targetRole === 'admin' || targetRole === 'superadmin') && phone.trim() !== '' && phone.trim() !== user.phone) {
        const existingPhone = await User.findOne({ phone: phone.trim(), isDeleted: { $ne: true } });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: 'An account with this phone number already exists.'
          });
        }
      }
      user.phone = phone.trim();
    }

    if (name) user.name = name;
    if (designation) user.designation = designation;
    if (department !== undefined) user.department = department;
    if (avatar !== undefined) user.avatar = avatar;
    if (isActive !== undefined) user.isActive = isActive;

    // Salary update handling (Only SuperAdmin or HR personnel can modify salary)
    if (salary !== undefined) {
      if (!isSuperAdmin && !isHR) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: Only SuperAdmin, HR Admin, or Supervisors under HR department can modify salary.'
        });
      }
      const numericSalary = Number(salary);
      if (isNaN(numericSalary) || numericSalary < 0) {
        return res.status(400).json({
          success: false,
          message: 'Salary must be a non-negative number.'
        });
      }
      user.salary = numericSalary;

      // Sync with Salary collection
      await Salary.findOneAndUpdate(
        { user_id: user._id },
        {
          user_name: user.name,
          department: user.department,
          designation: user.designation,
          salary: numericSalary,
          updatedBy: req.user._id
        },
        { upsert: true, new: true }
      );
    }

    // Role update restrictions
    if (role) {
      if (!isSuperAdmin) {
        if (role !== 'user' && role !== 'supervisor') {
          return res.status(403).json({
            success: false,
            message: 'HR Admins and Supervisors cannot assign admin or superadmin roles.'
          });
        }
      }
      user.role = role;
    }

    // Password update if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    // Record audit: who updated this user's data
    user.updatedBy = req.user._id;

    await user.save();

    logger.info(`[Audit Log] User updated: ${user.email} (ID: ${user._id}) updated by ${req.user.email} (${req.user.role}, ID: ${req.user._id})`);

    const updatedUserObj = await User.findById(user._id)
      .populate('createdBy', 'name email role department')
      .populate('updatedBy', 'name email role department');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUserObj ? updatedUserObj.toJSON() : user.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] updateUser failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Delete user account (Soft deletion with audit trail)
// @route   DELETE /api/v1/users/:id
// @access  Private (SuperAdmin, Admin, Supervisor)
// Rules:
// 1) SuperAdmin: Can delete any user (except self)
// 2) Non-SuperAdmin: Can only delete users created by them
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) {
      logger.warn(`[User Controller] Delete user failed: ID ${req.params.id} not found or already deleted`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Self-deletion check
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }

    // SuperAdmin protection
    if (user.role === 'superadmin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot delete SuperAdmin account.'
      });
    }

    const isSuperAdmin = req.user.role === 'superadmin';
    const creatorId = user.createdBy?.toString();
    const isCreator = creatorId === req.user._id.toString();

    // Deletion permissions:
    // 1) SuperAdmin: can delete any user/admin/supervisor
    // 2) Non-SuperAdmin: can only delete users created by them
    if (!isSuperAdmin) {
      if (!isCreator) {
        logger.warn(`[User Controller] Access denied: ${req.user.email} tried to delete user ${user.email} not created by them`);
        return res.status(403).json({
          success: false,
          message: 'Permission denied: You can only delete users created by you.'
        });
      }
    }

    // Record deletion audit trail (Soft Delete)
    user.isDeleted = true;
    user.deletedBy = req.user._id;
    user.deletedAt = new Date();
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    // Also remove / update corresponding salary record
    await Salary.findOneAndDelete({ user_id: user._id });

    logger.info(`[Audit Log] User deleted: ${user.name} (Original Email: ${user.email}, ID: ${user._id}) soft-deleted by ${req.user.email} (${req.user.role}, ID: ${req.user._id}) at ${user.deletedAt}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      deletedBy: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      deletedAt: user.deletedAt
    });
  } catch (error) {
    logger.error(`[User Controller Error] deleteUser failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Reset password for a user
// @route   POST /api/v1/users/:id/reset-password
// @access  Private (SuperAdmin, HR Admin/Supervisor, Dept Admin, Self)
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser || targetUser.isDeleted) {
      logger.warn(`[User Controller] Reset password failed: User ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isSelf = targetUser._id.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'superadmin';
    const isHR = isHRRole(req.user);
    const isDeptAdmin = req.user.role === 'admin' && !isHR;

    logger.info(`[User Controller] Password reset attempt for ${targetUser.email} by ${req.user.email} (${req.user.role})`);

    // Target is SuperAdmin check: non-superadmin cannot reset SuperAdmin's password
    if (targetUser.role === 'superadmin' && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Cannot reset SuperAdmin password.'
      });
    }

    // Department boundary check for Department Admins and non-HR staff
    if (!isSuperAdmin && !isHR && !isSelf) {
      if (isDeptAdmin) {
        if (targetUser.department.toLowerCase() !== req.user.department.toLowerCase()) {
          return res.status(403).json({
            success: false,
            message: 'Permission denied: Department Admins can only reset passwords for users in their own department.'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Permission denied: You can only reset your own password.'
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    targetUser.passwordHash = await bcrypt.hash(newPassword, salt);
    targetUser.refreshToken = null; // Revoke active refresh tokens
    targetUser.updatedBy = req.user._id;
    await targetUser.save();

    logger.info(`[Audit Log] Password reset successfully for user ${targetUser.email} by ${req.user.email} (${req.user.role}, ID: ${req.user._id})`);

    res.status(200).json({
      success: true,
      message: `Password reset successfully for user ${targetUser.email}`
    });
  } catch (error) {
    logger.error(`[User Controller Error] resetPassword failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  getMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword
};
