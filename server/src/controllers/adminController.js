const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Create a new user account (Admin / Superadmin)
// @route   POST /api/admin/users
// @access  Private (Admin / Superadmin)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, designation, department, phone } = req.body;
    const currentUserRole = req.user.role;

    logger.info(`[Admin Controller] Admin user ${req.user.email} (${currentUserRole}) creating new staff account: ${email}`);

    // Admin cannot create a superadmin account
    if (role === 'superadmin' && currentUserRole !== 'superadmin') {
      logger.warn(`[Admin Controller] Creation denied: Admin ${req.user.email} attempted to create Superadmin account`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Only a Superadmin can create Superadmin accounts.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn(`[Admin Controller] User creation failed: Email ${email} already registered`);
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role || 'user',
      designation: designation || 'Doctor',
      department: department || 'General',
      phone: phone || '',
      authProvider: 'local',
      createdBy: req.user.id,
      isActive: true
    });

    logger.info(`[Admin Controller] User account created successfully: ID ${newUser._id}, Email: ${newUser.email}, Created By Admin: ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser.toJSON()
    });
  } catch (error) {
    logger.error(`[Admin Controller Error] createUser failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get all users with creator-based visibility, pagination, and multi-field filters
// @route   GET /api/admin/users
// @access  Private (Admin / Superadmin)
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const nameFilter = req.query.name || '';
    const roleFilter = req.query.role || '';
    const designationFilter = req.query.designation || '';
    const departmentFilter = req.query.department || '';
    const searchQuery = req.query.search || req.query.query || '';

    logger.info(`[Admin Controller] User ${req.user.email} (${req.user.role}) fetching users list. Filters -> name: "${nameFilter}", role: "${roleFilter}", designation: "${designationFilter}", department: "${departmentFilter}", search: "${searchQuery}", page: ${page}, limit: ${limit}`);

    const queryObj = {};

    // Creator Visibility Requirement:
    // If the logged in user is an Admin, they should ONLY see users created by THAT specific admin!
    if (req.user.role === 'admin') {
      queryObj.createdBy = req.user.id;
    }

    // Name Filter
    if (nameFilter) {
      queryObj.name = { $regex: nameFilter, $options: 'i' };
    }

    // Role Filter
    if (roleFilter) {
      queryObj.role = roleFilter;
    }

    // Designation Filter
    if (designationFilter) {
      queryObj.designation = { $regex: designationFilter, $options: 'i' };
    }

    // Department Filter
    if (departmentFilter) {
      queryObj.department = { $regex: departmentFilter, $options: 'i' };
    }

    // Multi-field Search Query fallback/supplement
    if (searchQuery) {
      queryObj.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { department: { $regex: searchQuery, $options: 'i' } },
        { designation: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    const totalUsers = await User.countDocuments(queryObj);
    const users = await User.find(queryObj)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    logger.info(`[Admin Controller] Retrieved ${users.length} users (Total match: ${totalUsers}) for Admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      count: users.length,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      filtersApplied: {
        name: nameFilter || null,
        role: roleFilter || null,
        designation: designationFilter || null,
        department: departmentFilter || null,
        search: searchQuery || null
      },
      users: users.map(user => user.toJSON())
    });
  } catch (error) {
    logger.error(`[Admin Controller Error] getUsers failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private (Admin / Superadmin)
const getUserById = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const user = await User.findById(targetUserId).populate('createdBy', 'name email role');

    if (!user) {
      logger.warn(`[Admin Controller] getUserById failed: User ID ${targetUserId} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Creator Visibility Enforcement: Admin can only view user created by them
    if (req.user.role === 'admin' && user.createdBy?._id?.toString() !== req.user.id && user._id.toString() !== req.user.id) {
      logger.warn(`[Admin Controller] Access denied: Admin ${req.user.email} attempted to view user ${user.email} not created by them`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Admins can only view users created by them.'
      });
    }

    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[Admin Controller Error] getUserById failed for ID ${req.params.id}: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Update user role, designation, or activation status
// @route   PATCH /api/admin/users/:id
// @access  Private (Admin / Superadmin)
const updateUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const { role, designation, department, isActive } = req.body;
    const currentUserRole = req.user.role; // 'admin' or 'superadmin'

    logger.info(`[Admin Controller] Admin ${req.user.email} (${currentUserRole}) attempting to update user ID ${targetUserId}`);

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      logger.warn(`[Admin Controller] Update failed: Target user ID ${targetUserId} not found`);
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // Creator CRUD Enforcement: Admin can only update users created by them
    if (currentUserRole === 'admin' && targetUser.createdBy?.toString() !== req.user.id && targetUser._id.toString() !== req.user.id) {
      logger.warn(`[Admin Controller] Update denied: Admin ${req.user.email} attempted to modify user ${targetUser.email} not created by them`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Admins can only update users created by them.'
      });
    }

    // Admin cannot modify a superadmin account
    if (targetUser.role === 'superadmin' && currentUserRole !== 'superadmin') {
      logger.warn(`[Admin Controller] Permission denied: Admin ${req.user.email} attempted to modify Superadmin account ${targetUser.email}`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Only a Superadmin can modify Superadmin accounts.'
      });
    }

    // Admin cannot grant superadmin role
    if (role === 'superadmin' && currentUserRole !== 'superadmin') {
      logger.warn(`[Admin Controller] Permission denied: Admin ${req.user.email} attempted to assign Superadmin role to ${targetUser.email}`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Only a Superadmin can assign the Superadmin role.'
      });
    }

    // Prevent user from changing their own role or deactivating themselves
    if (req.user.id === targetUserId) {
      if (role !== undefined && role !== targetUser.role) {
        logger.warn(`[Admin Controller] Self-update blocked: Admin ${req.user.email} attempted to change their own role`);
        return res.status(400).json({
          success: false,
          message: 'You cannot change your own role.'
        });
      }
      if (isActive === false) {
        logger.warn(`[Admin Controller] Self-update blocked: Admin ${req.user.email} attempted to deactivate their own account`);
        return res.status(400).json({
          success: false,
          message: 'You cannot deactivate your own account.'
        });
      }
    }

    if (role) targetUser.role = role;
    if (designation) targetUser.designation = designation;
    if (department !== undefined) targetUser.department = department;
    if (isActive !== undefined) targetUser.isActive = isActive;

    await targetUser.save();

    logger.info(`[Admin Controller] User updated successfully: Target Email: ${targetUser.email}, Updated by Admin: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: targetUser.toJSON()
    });
  } catch (error) {
    logger.error(`[Admin Controller Error] updateUser failed for target ID ${req.params.id}: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin / Superadmin)
const deleteUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserRole = req.user.role;

    logger.info(`[Admin Controller] Admin ${req.user.email} attempting to delete user ID ${targetUserId}`);

    if (req.user.id === targetUserId) {
      logger.warn(`[Admin Controller] Self-deletion blocked: Admin ${req.user.email} attempted to delete their own account`);
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      logger.warn(`[Admin Controller] Deletion failed: User ID ${targetUserId} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Creator CRUD Enforcement: Admin can only delete users created by them
    if (currentUserRole === 'admin' && targetUser.createdBy?.toString() !== req.user.id) {
      logger.warn(`[Admin Controller] Deletion denied: Admin ${req.user.email} attempted to delete user ${targetUser.email} not created by them`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Admins can only delete users created by them.'
      });
    }

    // Admin cannot delete a superadmin or another admin
    if (targetUser.role === 'superadmin' && currentUserRole !== 'superadmin') {
      logger.warn(`[Admin Controller] Deletion denied: Admin ${req.user.email} attempted to delete Superadmin ${targetUser.email}`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Superadmin accounts cannot be deleted by an Admin.'
      });
    }

    if (targetUser.role === 'admin' && currentUserRole !== 'superadmin') {
      logger.warn(`[Admin Controller] Deletion denied: Admin ${req.user.email} attempted to delete Admin ${targetUser.email}`);
      return res.status(403).json({
        success: false,
        message: 'Permission denied. Admin accounts can only be deleted by a Superadmin.'
      });
    }

    await User.findByIdAndDelete(targetUserId);

    logger.info(`[Admin Controller] User deleted successfully: ${targetUser.email} (ID: ${targetUserId}) deleted by Admin ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `User ${targetUser.email} deleted successfully`
    });
  } catch (error) {
    logger.error(`[Admin Controller Error] deleteUser failed for target ID ${req.params.id}: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get paginated system application logs in JSON format
// @route   GET /api/admin/logs
// @access  Private (Admin / Superadmin)
const getLogs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit || req.query.pageSize, 10) || 10);
    const levelFilter = (req.query.level || '').toLowerCase();
    const searchQuery = (req.query.search || req.query.query || '').toLowerCase();
    const targetDate = req.query.date || new Date().toISOString().split('T')[0]; // Default: YYYY-MM-DD

    const logDirectory = path.join(__dirname, '../../logs');
    const logFileName = `application-${targetDate}.log`;
    const logFilePath = path.join(logDirectory, logFileName);

    logger.info(`[Admin Controller] Admin ${req.user.email} fetching logs. Date: "${targetDate}", Page: ${page}, Limit/PageSize: ${limit}, Level: "${levelFilter || 'all'}", Search: "${searchQuery}"`);

    let parsedLogs = [];

    if (fs.existsSync(logFilePath)) {
      const fileContent = fs.readFileSync(logFilePath, 'utf8');
      const lines = fileContent.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const logEntry = JSON.parse(line);
          parsedLogs.push(logEntry);
        } catch (err) {
          parsedLogs.push({ message: line.trim(), timestamp: null, level: 'info' });
        }
      }
    }

    // Newest logs first
    parsedLogs.reverse();

    // Level Filter
    if (levelFilter && levelFilter !== 'all') {
      parsedLogs = parsedLogs.filter(log => (log.level || '').toLowerCase() === levelFilter);
    }

    // Search Filter
    if (searchQuery) {
      parsedLogs = parsedLogs.filter(log =>
        (log.message || '').toLowerCase().includes(searchQuery) ||
        (log.timestamp || '').toLowerCase().includes(searchQuery)
      );
    }

    const totalLogs = parsedLogs.length;
    const totalPages = Math.ceil(totalLogs / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = parsedLogs.slice(startIndex, startIndex + limit);

    res.status(200).json({
      success: true,
      count: paginatedLogs.length,
      totalLogs,
      totalPages,
      currentPage: page,
      limit,
      date: targetDate,
      filtersApplied: {
        level: levelFilter || 'all',
        search: searchQuery || null
      },
      logs: paginatedLogs
    });
  } catch (error) {
    logger.error(`[Admin Controller Error] getLogs failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getLogs
};



