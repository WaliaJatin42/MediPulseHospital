const express = require('express');
const passport = require('passport');
const {
  login,
  refresh,
  logout,
  googleCallback
} = require('../controllers/authController');
const { loginValidation } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Sign in with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "superadmin@hospital.com"
 *             password: "SuperAdmin123!"
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 *       429:
 *         description: Too many authentication attempts
 */
router.post('/login', authLimiter, loginValidation, login);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', refresh);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     summary: Sign out and clear auth cookies
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', logout);

/**
 * @openapi
 * /api/v1/auth/google:
 *   get:
 *     summary: Trigger Google OAuth 2.0 Login Flow
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Google consent screen
 */
router.get(
  '/google',
  authLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * @openapi
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth 2.0 callback
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Google authentication successful
 *       302:
 *         description: Redirect to frontend application
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_failed` }),
  googleCallback
);

module.exports = router;
