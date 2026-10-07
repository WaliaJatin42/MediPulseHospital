const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Get current logged in user profile (by token)
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    logger.debug(`[User Controller] User profile requested for ID ${req.user.id}`);
    const user = await User.findById(req.user.id);
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

// @desc    Create a new user account (SuperAdmin sees all, Admin creates users owned by them)
// @route   POST /api/users
// @access  Private (Admin / SuperAdmin)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, designation, department, phone, avatar } = req.body;
    logger.info(`[User Controller] User creation attempt by ${req.user.email} (${req.user.role}) for new email: ${email}`);

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn(`[User Controller] Create user failed: Email ${email} already exists`);
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Check duplicate phone number if provided
    if (phone && phone.trim() !== '') {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        logger.warn(`[User Controller] Create user failed: Phone ${phone} already exists`);
        return res.status(400).json({
          success: false,
          message: 'An account with this phone number already exists.'
        });
      }
    }

    // Role restrictions for Admin vs SuperAdmin
    let targetRole = role || 'user';
    if (req.user.role === 'admin') {
      if (targetRole !== 'user') {
        logger.warn(`[User Controller] Permission denied: Admin ${req.user.email} attempted to create user with role '${targetRole}'`);
        return res.status(403).json({
          success: false,
          message: 'Admins can only create standard users with role "user".'
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: targetRole,
      designation: designation || 'Doctor',
      department: department || 'General',
      phone: phone || '',
      avatar: avatar || undefined,
      authProvider: 'local',
      createdBy: req.user._id,
      isActive: true
    });

    logger.info(`[User Controller] User created successfully: ID ${newUser._id}, Email ${newUser.email}, Role ${newUser.role}, CreatedBy ${req.user.email}`);

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

// @desc    List users with creator restriction for Admin and full access for SuperAdmin
// @route   GET /api/users
// @access  Private (Admin / SuperAdmin)
const getUsers = async (req, res, next) => {
  try {
    let filter = {};

    // Ownership rule:
    // Superadmin sees ALL users.
    // Admin ONLY sees users created by that specific Admin.
    if (req.user.role === 'admin') {
      filter.createdBy = req.user._id;
    }

    // Search query parameters
    const { search, role, designation, department } = req.query;
    if (role) filter.role = role;
    if (designation) filter.designation = designation;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .populate('createdBy', 'name email role')
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

// @desc    Get user details by ID (Creator restricted for Admin)
// @route   GET /api/users/:id
// @access  Private (Admin / SuperAdmin)
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('createdBy', 'name email role');
    if (!user) {
      logger.warn(`[User Controller] Get user failed: ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ownership rule check for Admin
    if (req.user.role === 'admin') {
      const creatorId = user.createdBy?._id ? user.createdBy._id.toString() : user.createdBy?.toString();
      if (creatorId !== req.user._id.toString()) {
        logger.warn(`[User Controller] Access denied: Admin ${req.user.email} tried to view user ${user.email} not created by them`);
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

// @desc    Update user details (Creator restricted for Admin)
// @route   PATCH /api/users/:id (or PUT /api/users/:id)
// @access  Private (Admin / SuperAdmin)
const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      logger.warn(`[User Controller] Update user failed: ID ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Ownership rule check for Admin
    if (req.user.role === 'admin') {
      const creatorId = user.createdBy?.toString();
      if (creatorId !== req.user._id.toString()) {
        logger.warn(`[User Controller] Access denied: Admin ${req.user.email} tried to update user ${user.email} not created by them`);
        return res.status(403).json({
          success: false,
          message: 'Permission denied: You can only update users created by you.'
        });
      }
    }

    const { name, email, role, designation, department, phone, isActive, avatar, password } = req.body;

    // Email update uniqueness check
    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }
      user.email = email.toLowerCase();
    }

    // Phone update uniqueness check
    if (phone && phone.trim() !== '' && phone.trim() !== user.phone) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'An account with this phone number already exists.'
        });
      }
      user.phone = phone.trim();
    }

    if (name) user.name = name;
    if (designation) user.designation = designation;
    if (department !== undefined) user.department = department;
    if (avatar !== undefined) user.avatar = avatar;
    if (isActive !== undefined) user.isActive = isActive;

    // Role update restrictions
    if (role) {
      if (req.user.role === 'admin' && role !== 'user') {
        return res.status(403).json({
          success: false,
          message: 'Admins cannot assign admin or superadmin roles.'
        });
      }
      user.role = role;
    }

    // Password update if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password, salt);
    }

    await user.save();

    logger.info(`[User Controller] Updated user ${user.email} by ${req.user.email}`);

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

// @desc    Delete user account (Creator restricted for Admin)
// @route   DELETE /api/users/:id
// @access  Private (Admin / SuperAdmin)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      logger.warn(`[User Controller] Delete user failed: ID ${req.params.id} not found`);
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

    // Ownership rule check for Admin
    if (req.user.role === 'admin') {
      const creatorId = user.createdBy?.toString();
      if (creatorId !== req.user._id.toString()) {
        logger.warn(`[User Controller] Access denied: Admin ${req.user.email} tried to delete user ${user.email} not created by them`);
        return res.status(403).json({
          success: false,
          message: 'Permission denied: You can only delete users created by you.'
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    logger.info(`[User Controller] Deleted user ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`[User Controller Error] deleteUser failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  getMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};
