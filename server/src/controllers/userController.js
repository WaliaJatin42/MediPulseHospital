const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../utils/logger');

// @desc    Get current logged in user profile
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

    logger.debug(`[User Controller] Profile retrieved successfully for ${user.email}`);

    res.status(200).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] getMe failed for user ID ${req.user?.id}: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Update current logged in user profile
// @route   PUT /api/users/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    logger.info(`[User Controller] Profile update request received for user ID ${req.user.id} (${req.user.email})`);
    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      logger.warn(`[User Controller] Profile update failed: User ID ${req.user.id} not found`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, avatar, designation, department, phone, currentPassword, newPassword } = req.body;

    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (designation) user.designation = designation;
    if (department !== undefined) user.department = department;
    if (phone !== undefined) user.phone = phone;

    // Handle password update if provided
    if (newPassword) {
      if (user.authProvider === 'google' && !user.passwordHash) {
        logger.warn(`[User Controller] Password change blocked: Google OAuth user ${user.email} attempted password change`);
        return res.status(400).json({
          success: false,
          message: 'Google authenticated users without a password cannot change password directly. Please use Google login.'
        });
      }

      if (!currentPassword) {
        logger.warn(`[User Controller] Password change failed: Current password missing for user ${user.email}`);
        return res.status(400).json({
          success: false,
          message: 'Current password is required to set a new password.'
        });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        logger.warn(`[User Controller] Password change failed: Incorrect current password for user ${user.email}`);
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      logger.info(`[User Controller] Password updated successfully for user ${user.email}`);
    }

    await user.save();

    logger.info(`[User Controller] Profile updated successfully for user ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[User Controller Error] updateMe failed for user ID ${req.user?.id}: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  getMe,
  updateMe
};

