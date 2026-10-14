const express = require('express');
const passport = require('passport');
const {
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
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { loginValidation } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Sign in with email and password
 *     tags: [Authentication]
 */
router.post('/login', authLimiter, loginValidation, login);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 */
router.post('/refresh', refresh);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Sign out and clear auth tokens
 *     tags: [Authentication]
 */
router.post('/logout', logout);

/**
 * @openapi
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password for currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 */
router.post('/change-password', protect, changePassword);

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset token
 *     tags: [Authentication]
 */
router.post('/forgot-password', authLimiter, forgotPassword);

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with reset token
 *     tags: [Authentication]
 */
router.post('/reset-password', authLimiter, resetPassword);

/**
 * @openapi
 * /api/v1/auth/google:
 *   get:
 *     summary: Trigger Google OAuth 2.0 Login Flow
 *     tags: [Authentication]
 */
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_failed` }),
  googleCallback
);

// MFA Routes
router.post('/mfa/setup', protect, setupMfa);
router.post('/mfa/verify', protect, verifyMfa);
router.post('/mfa/disable', protect, disableMfa);
router.post('/mfa/recovery-codes/regenerate', protect, regenerateRecoveryCodes);
router.post('/mfa/challenge', authLimiter, solveMfaChallenge);

// Account Lockout Management
router.post('/unlock/:userId', protect, authorize('superadmin', 'admin'), unlockUser);

// Session Management
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:id', protect, deleteSession);
router.post('/logout-all', protect, logoutAll);

// Superadmin Management
router.post('/superadmins', protect, authorize('superadmin'), createSuperadmin);
router.patch('/superadmins/:id/demote', protect, authorize('superadmin'), demoteSuperadmin);
router.delete('/superadmins/:id', protect, authorize('superadmin'), deleteSuperadmin);

module.exports = router;
