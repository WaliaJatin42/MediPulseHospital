const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');
const {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies
} = require('../utils/generateTokens');

const Session = require('../models/Session');
const { generateSecret, verifyTOTP, getOtpAuthUri, generateRecoveryCodes } = require('../utils/totp');
const { sendPasswordResetEmail } = require('../services/emailService');

// @desc    Authenticate hospital staff & get tokens (with lockout and MFA challenge)
// @route   POST /api/v1/auth/login or POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    logger.info(`[Auth Controller] Login attempt received for email: ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash +mfaSecret');
      
    if (!user) {
      logger.warn(`[Auth Controller] Login failed: Account with email ${email} not found`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check account lockout (5 failed attempts -> 15 min lock)
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / (60 * 1000));
      logger.warn(`[Auth Controller] Login rejected: Account ${email} is locked for ${remainingMinutes} more minutes`);
      return res.status(423).json({
        success: false,
        isLocked: true,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minutes or contact your hospital administrator.`
      });
    }

    if (!user.isActive || user.status !== 'active') {
      logger.warn(`[Auth Controller] Login blocked: Account ${email} is inactive or terminated`);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated or terminated. Please contact your hospital administrator.'
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
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
        logger.warn(`[Auth Controller] Account ${email} LOCKED due to 5 failed attempts`);
      }
      await user.save();

      return res.status(401).json({
        success: false,
        message: user.failedLoginAttempts >= 5
          ? 'Account locked for 15 minutes due to 5 consecutive failed login attempts.'
          : `Invalid email or password. Attempt ${user.failedLoginAttempts} of 5.`
      });
    }

    // Reset failed login attempts upon successful password verification
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Check if MFA is required or enabled
    const mfaMandatoryRoles = ['superadmin', 'admin', 'supervisor'];
    const isMfaEnforced = user.mfaEnabled || (mfaMandatoryRoles.includes(user.role) && user.mfaSecret);

    if (isMfaEnforced) {
      // Issue short-lived challenge token (valid for 5 minutes)
      const challengeToken = jwt.sign(
        { id: user._id, type: 'mfa_challenge' },
        process.env.JWT_SECRET || 'secret-jwt-key',
        { expiresIn: '5m' }
      );

      return res.status(200).json({
        success: true,
        mfaRequired: true,
        challengeToken,
        message: 'MFA is enabled on this account. Please verify with your authenticator code.'
      });
    }

    // Complete login without MFA
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Create session record
    const clientIp = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser';
    await Session.create({
      userId: user._id,
      token: accessToken,
      ip: clientIp,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    setAuthCookies(res, accessToken, refreshToken);

    logger.info(`[Auth Controller] User logged in: ${user.email} (Role: ${user.role}, Dept: ${user.department})`);

    await recordAuditLog({
      actor: user,
      action: 'LOGIN',
      resource: 'auth',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: user.toJSON(),
      forcePasswordChange: user.forcePasswordChange || false,
      forceMfaSetup: user.forceMfaSetup || false
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] Login failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh or POST /api/auth/refresh
// @access  Public
const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    logger.debug('[Auth Controller] Token refresh request received');

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: 'Refresh token is no longer valid'
      });
    }

    if (!user.isActive || user.status !== 'active') {
      clearAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated or terminated.'
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

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
// @route   POST /api/v1/auth/logout or POST /api/auth/logout
// @access  Public / Private
const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
      } catch (err) {
        // Ignore expired tokens during logout
      }
    } else if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }

    clearAuthCookies(res);

    if (req.user) {
      await recordAuditLog({
        actor: req.user,
        action: 'LOGOUT',
        resource: 'auth',
        resourceId: req.user._id.toString(),
        req
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] Logout failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Change password for authenticated user
// @route   POST /api/v1/auth/change-password or POST /api/auth/change-password
// @access  Private (Self)
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both currentPassword and newPassword'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.refreshToken = null; // Invalidate other sessions
    await user.save();

    await recordAuditLog({
      actor: user,
      action: 'CHANGE_PASSWORD',
      resource: 'auth',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again with your new credentials.'
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] changePassword failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Forgot password request - generate reset token
// @route   POST /api/v1/auth/forgot-password or POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return 200 to prevent email enumeration attacks
      return res.status(200).json({
        success: true,
        message: 'If an account with this email exists, password reset instructions have been generated.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    logger.info(`[Auth Controller] Password reset token generated for ${user.email}`);

    // Dispatch branded password reset email via superadmin email account
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      resetToken,
      userName: user.name
    });

    await recordAuditLog({
      actor: { _id: user._id, name: user.name, role: user.role, department: user.department },
      action: 'FORGOT_PASSWORD_REQUESTED',
      resource: 'auth',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: emailResult.success
        ? `Password reset link has been dispatched to ${user.email}.`
        : (emailResult.reason === 'SMTP_CREDENTIALS_MISSING'
          ? 'Password reset link generated. (Configure SMTP_PASS in .env to deliver via Gmail)'
          : `Password reset link generated (${emailResult.error || 'delivery pending'}).`),
      emailSent: emailResult.success,
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] forgotPassword failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Reset password using reset token
// @route   POST /api/v1/auth/reset-password or POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and newPassword are required'
      });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.refreshToken = null;
    await user.save();

    logger.info(`[Auth Controller] Password reset completed for ${user.email}`);

    await recordAuditLog({
      actor: { _id: user._id, name: user.name, role: user.role, department: user.department },
      action: 'RESET_PASSWORD_COMPLETED',
      resource: 'auth',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You may now log in.'
    });
  } catch (error) {
    logger.error(`[Auth Controller Error] resetPassword failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Google OAuth Callback Handler
const googleCallback = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Google authentication failed' });
    }

    const user = req.user;
    if (!user.isActive || user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated or terminated.'
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    if (process.env.CLIENT_URL) {
      return res.redirect(`${process.env.CLIENT_URL}/?status=success`);
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

// @desc    Setup MFA - Generate TOTP secret and QR URI
// @route   POST /api/v1/auth/mfa/setup
// @access  Private
const setupMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+mfaSecret');
    const secret = generateSecret(20);
    const otpAuthUri = getOtpAuthUri('MediPulse Hospital', user.email, secret);

    user.mfaSecret = secret;
    await user.save();

    await recordAuditLog({
      actor: user,
      action: 'MFA_SETUP_INITIATED',
      resource: 'auth',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'MFA setup initiated. Scan the QR code or enter the secret manually into your authenticator app.',
      secret,
      otpAuthUri,
      data: { secret, otpAuthUri }
    });
  } catch (error) {
    logger.error(`[MFA Setup Error] ${error.message}`);
    next(error);
  }
};

// @desc    Verify MFA code and finalize activation
// @route   POST /api/v1/auth/mfa/verify
// @access  Private
const verifyMfa = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Please provide the 6-digit TOTP code' });
    }

    const user = await User.findById(req.user._id).select('+mfaSecret');
    if (!user.mfaSecret) {
      return res.status(400).json({ success: false, message: 'MFA has not been set up. Call /mfa/setup first.' });
    }

    const isValid = verifyTOTP(user.mfaSecret, code);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid authentication code. Please try again.' });
    }

    const recoveryCodesList = generateRecoveryCodes(8);
    user.mfaEnabled = true;
    user.forceMfaSetup = false;
    user.recoveryCodes = recoveryCodesList.map((c) => ({ code: c, used: false }));
    await user.save();

    await recordAuditLog({
      actor: user,
      action: 'MFA_ENABLED',
      resource: 'auth',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Multi-Factor Authentication enabled successfully. Store your recovery codes in a secure location.',
      recoveryCodes: recoveryCodesList,
      data: { recoveryCodes: recoveryCodesList }
    });
  } catch (error) {
    logger.error(`[MFA Verify Error] ${error.message}`);
    next(error);
  }
};

// @desc    Disable MFA
// @route   POST /api/v1/auth/mfa/disable
// @access  Private
const disableMfa = async (req, res, next) => {
  try {
    const { password, code } = req.body;
    if (!password || !code) {
      return res.status(400).json({ success: false, message: 'Both password and current MFA code are required to disable MFA' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash +mfaSecret');
    const isPassMatch = await user.matchPassword(password);
    if (!isPassMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const isValid = verifyTOTP(user.mfaSecret, code);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid authentication code' });
    }

    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.recoveryCodes = [];
    await user.save();

    await recordAuditLog({
      actor: user,
      action: 'MFA_DISABLED',
      resource: 'auth',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Multi-Factor Authentication has been disabled on your account'
    });
  } catch (error) {
    logger.error(`[MFA Disable Error] ${error.message}`);
    next(error);
  }
};

// @desc    Regenerate MFA recovery codes
// @route   POST /api/v1/auth/mfa/recovery-codes/regenerate
// @access  Private
const regenerateRecoveryCodes = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+passwordHash');
    if (password) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
    }

    if (!user.mfaEnabled) {
      return res.status(400).json({ success: false, message: 'MFA is not enabled on this account' });
    }

    const newCodes = generateRecoveryCodes(8);
    user.recoveryCodes = newCodes.map((c) => ({ code: c, used: false }));
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Recovery codes regenerated successfully',
      recoveryCodes: newCodes
    });
  } catch (error) {
    logger.error(`[Regenerate Recovery Codes Error] ${error.message}`);
    next(error);
  }
};

// @desc    Solve MFA challenge from login
// @route   POST /api/v1/auth/mfa/challenge
// @access  Public
const solveMfaChallenge = async (req, res, next) => {
  try {
    const { challengeToken, code } = req.body;
    if (!challengeToken || !code) {
      return res.status(400).json({ success: false, message: 'challengeToken and code are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(challengeToken, process.env.JWT_SECRET || 'secret-jwt-key');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'MFA challenge expired or invalid. Please log in again.' });
    }

    if (decoded.type !== 'mfa_challenge') {
      return res.status(400).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.id).select('+mfaSecret');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check TOTP code or recovery code
    let isCodeValid = verifyTOTP(user.mfaSecret, code);
    let usedRecoveryCode = false;

    if (!isCodeValid && user.recoveryCodes && user.recoveryCodes.length > 0) {
      const cleanCode = String(code).trim().toUpperCase();
      const recIndex = user.recoveryCodes.findIndex((r) => r.code === cleanCode && !r.used);
      if (recIndex !== -1) {
        user.recoveryCodes[recIndex].used = true;
        isCodeValid = true;
        usedRecoveryCode = true;
      }
    }

    if (!isCodeValid) {
      return res.status(401).json({ success: false, message: 'Invalid MFA verification code or recovery code' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Create session record
    const clientIp = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser';
    await Session.create({
      userId: user._id,
      token: accessToken,
      ip: clientIp,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    setAuthCookies(res, accessToken, refreshToken);

    await recordAuditLog({
      actor: user,
      action: usedRecoveryCode ? 'LOGIN_MFA_RECOVERY_CODE' : 'LOGIN_MFA_SUCCESS',
      resource: 'auth',
      resourceId: user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'MFA verification successful',
      accessToken,
      user: user.toJSON(),
      usedRecoveryCode
    });
  } catch (error) {
    logger.error(`[MFA Challenge Error] ${error.message}`);
    next(error);
  }
};

// @desc    Unlock a locked user account
// @route   POST /api/v1/auth/unlock/:userId
// @access  Private (Superadmin, HR Admin)
const unlockUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    targetUser.failedLoginAttempts = 0;
    targetUser.lockUntil = null;
    await targetUser.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UNLOCK_ACCOUNT',
      resource: 'users',
      resourceId: targetUser._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Account for ${targetUser.name} (${targetUser.email}) unlocked successfully`
    });
  } catch (error) {
    logger.error(`[Unlock User Error] ${error.message}`);
    next(error);
  }
};

// @desc    List own active sessions
// @route   GET /api/v1/auth/sessions
// @access  Private
const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      userId: req.user._id,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActive: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    logger.error(`[Get Sessions Error] ${error.message}`);
    next(error);
  }
};

// @desc    Revoke specific session
// @route   DELETE /api/v1/auth/sessions/:id
// @access  Private
const deleteSession = async (req, res, next) => {
  try {
    const session = await Session.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or already revoked' });
    }

    res.status(200).json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    logger.error(`[Delete Session Error] ${error.message}`);
    next(error);
  }
};

// @desc    Logout from all active sessions
// @route   POST /api/v1/auth/logout-all
// @access  Private
const logoutAll = async (req, res, next) => {
  try {
    await Session.deleteMany({ userId: req.user._id });
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    clearAuthCookies(res);

    await recordAuditLog({
      actor: req.user,
      action: 'LOGOUT_ALL_SESSIONS',
      resource: 'auth',
      resourceId: req.user._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'All active sessions have been revoked successfully'
    });
  } catch (error) {
    logger.error(`[Logout All Error] ${error.message}`);
    next(error);
  }
};

// @desc    Create another Superadmin (requires Superadmin role)
// @route   POST /api/v1/superadmins
// @access  Private (Superadmin only)
const createSuperadmin = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const superadmin = await User.create({
      employeeId: `EMP-SA-${Date.now().toString().slice(-4)}`,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'superadmin',
      department: 'general',
      designation: 'Superadministrator',
      phone: phone || '',
      status: 'active',
      isActive: true,
      forcePasswordChange: true,
      forceMfaSetup: true,
      createdBy: req.user._id,
      assignments: [
        {
          department: 'general',
          role: 'superadmin',
          designation: 'Superadministrator',
          from: new Date(),
          reason: 'Created by Superadmin ' + req.user.name,
          changedBy: req.user._id
        }
      ]
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_SUPERADMIN',
      resource: 'users',
      resourceId: superadmin._id.toString(),
      after: { email: superadmin.email, name: superadmin.name },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Superadmin created successfully',
      data: superadmin.toJSON()
    });
  } catch (error) {
    logger.error(`[Create Superadmin Error] ${error.message}`);
    next(error);
  }
};

// @desc    Demote a Superadmin to another role (checks at least 2 active exist before and 1 after)
// @route   PATCH /api/v1/superadmins/:id/demote
// @access  Private (Superadmin only)
const demoteSuperadmin = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const { newRole = 'admin', toDepartment = 'general', reason } = req.body;

    const targetUser = await User.findById(targetId);
    if (!targetUser || targetUser.role !== 'superadmin') {
      return res.status(404).json({ success: false, message: 'Target Superadmin not found' });
    }

    const activeSuperadminsCount = await User.countDocuments({
      role: 'superadmin',
      status: 'active',
      isDeleted: false
    });

    if (activeSuperadminsCount < 2) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: Cannot demote Superadmin. System requires at least 2 active Superadmins in production before demotion.'
      });
    }

    const before = targetUser.toObject();
    targetUser.role = newRole;
    targetUser.department = toDepartment;
    targetUser.assignments.push({
      department: toDepartment,
      role: newRole,
      from: new Date(),
      reason: reason || 'Demoted from Superadmin',
      changedBy: req.user._id
    });
    await targetUser.save();

    await recordAuditLog({
      actor: req.user,
      action: 'DEMOTE_SUPERADMIN',
      resource: 'users',
      resourceId: targetUser._id.toString(),
      before: { role: before.role, department: before.department },
      after: { role: targetUser.role, department: targetUser.department },
      req
    });

    res.status(200).json({
      success: true,
      message: `Superadmin ${targetUser.name} demoted to ${newRole} in ${toDepartment}`,
      data: targetUser.toJSON()
    });
  } catch (error) {
    logger.error(`[Demote Superadmin Error] ${error.message}`);
    next(error);
  }
};

// @desc    Delete or deactivate a Superadmin (checks at least 2 active exist before and 1 after)
// @route   DELETE /api/v1/superadmins/:id
// @access  Private (Superadmin only)
const deleteSuperadmin = async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const targetUser = await User.findById(targetId);

    if (!targetUser || targetUser.role !== 'superadmin') {
      return res.status(404).json({ success: false, message: 'Target Superadmin not found' });
    }

    const activeSuperadminsCount = await User.countDocuments({
      role: 'superadmin',
      status: 'active',
      isDeleted: false
    });

    if (activeSuperadminsCount < 2) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: Cannot remove Superadmin. At least 2 active Superadmins must exist before and 1 after.'
      });
    }

    targetUser.status = 'inactive';
    targetUser.isActive = false;
    targetUser.isDeleted = true;
    targetUser.deletedAt = new Date();
    targetUser.deletedBy = req.user._id;
    await targetUser.save();

    await recordAuditLog({
      actor: req.user,
      action: 'DELETE_SUPERADMIN',
      resource: 'users',
      resourceId: targetUser._id.toString(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Superadmin ${targetUser.name} deactivated successfully`
    });
  } catch (error) {
    logger.error(`[Delete Superadmin Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  googleCallback,
  setupMfa,
  verifyMfa,
  disableMfa,
  regenerateRecoveryCodes,
  solveMfaChallenge,
  unlockUser,
  getSessions,
  deleteSession,
  logoutAll,
  createSuperadmin,
  demoteSuperadmin,
  deleteSuperadmin
};

