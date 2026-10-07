const express = require('express');
const passport = require('passport');
const {
  signup,
  login,
  refresh,
  logout,
  googleCallback
} = require('../controllers/authController');
const { signupValidation, loginValidation } = require('../utils/validators');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     summary: Register a new hospital staff member
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignup'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or duplicate email
 */
router.post('/signup', authLimiter, signupValidation, signup);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Sign in with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, loginValidation, login);

/**
 * @openapi
 * /api/auth/refresh:
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
 * /api/auth/logout:
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
 * /api/auth/google:
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
 * /api/auth/google/callback:
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

