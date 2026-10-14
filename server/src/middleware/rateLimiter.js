const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Strict rate limiter for sensitive authentication endpoints (Login, Google OAuth)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 500, // Higher limit in dev/test for test runners
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    logger.warn(`[Rate Limit Exceeded] IP ${req.ip} exceeded auth rate limit on ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
    });
  }
});

// General API rate limiter for DDoS and flood protection across all endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 5000, // Higher limit in dev/test for test runners
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    logger.warn(`[Rate Limit Exceeded] IP ${req.ip} exceeded API rate limit on ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP. Please slow down and try again later.'
    });
  }
});

module.exports = { authLimiter, apiLimiter };
