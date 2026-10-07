const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies
} = require('../utils/generateTokens');

// @desc    Authenticate hospital staff & get tokens
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    logger.info(`[Auth Controller] Login attempt received for email: ${email}`);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      logger.warn(`[Auth Controller] Login failed: Account with email ${email} not found`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      logger.warn(`[Auth Controller] Login blocked: Account ${email} is deactivated`);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your hospital administrator.'
      });
    }

    if (!user.passwordHash) {
      logger.warn(`[Auth Controller] Login failed: Account ${email} was created via Google OAuth`);
      return res.status(400).json({
        success: false,
        message: 'This account was registered using Google OAuth. Please use "GET /api/v1/auth/google" to log in.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.warn(`[Auth Controller] Login failed: Incorrect password for ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    logger.info(`[Auth Controller] User logged in successfully: ID ${user._id}, Email: ${user.email} (Role: ${user.role}, Designation: ${user.designation})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] Login failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (requires valid refresh token cookie or body)
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    logger.debug('[Auth Controller] Token refresh request received');

    if (!refreshToken) {
      logger.warn('[Auth Controller] Token refresh failed: Refresh token missing');
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      logger.warn(`[Auth Controller] Token refresh failed: Invalid or expired refresh token (${err.message})`);
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      logger.warn(`[Auth Controller] Token refresh failed: Mismatch or user ID ${decoded.id} not found`);
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: 'Refresh token is no longer valid'
      });
    }

    if (!user.isActive) {
      logger.warn(`[Auth Controller] Token refresh blocked: Account ${user.email} is deactivated`);
      clearAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your hospital administrator.'
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    logger.info(`[Auth Controller] Token refreshed successfully for user: ID ${user._id}, Email: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] Refresh token failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Logout user & clear tokens
// @route   POST /api/auth/logout
// @access  Public / Private
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    logger.info('[Auth Controller] Logout request received');

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
        logger.info(`[Auth Controller] Invalidated stored refresh token for user ID: ${decoded.id}`);
      } catch (err) {
        logger.debug(`[Auth Controller] Logout refresh token invalidation skipped: ${err.message}`);
      }
    }

    clearAuthCookies(res);
    logger.info('[Auth Controller] User logged out successfully, auth cookies cleared');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] Logout failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Google OAuth Callback Handler
// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = async (req, res, next) => {
  try {
    logger.info('[Auth Controller] Google OAuth callback handler reached');

    if (!req.user) {
      logger.error('[Auth Controller] Google OAuth callback error: Missing user profile in request');
      return res.status(401).json({
        success: false,
        message: 'Google authentication failed'
      });
    }

    const user = req.user;
    if (!user.isActive) {
      logger.warn(`[Auth Controller] Google OAuth login blocked: Account ${user.email} is deactivated`);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your hospital administrator.'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    logger.info(`[Auth Controller] Google OAuth login successful for user: ID ${user._id}, Email: ${user.email}`);

    if (process.env.CLIENT_URL) {
      logger.info(`[Auth Controller] Redirecting Google OAuth user to ${process.env.CLIENT_URL}/oauth-callback`);
      return res.redirect(`${process.env.CLIENT_URL}/oauth-callback?status=success`);
    }

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      accessToken,
      user: user.toJSON()
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] Google callback failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  googleCallback
};
