const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Strict rate limiter for sensitive authentication endpoints (Login, Google OAuth)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
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
  max: 300, // Limit each IP to 300 API requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[Rate Limit Exceeded] IP ${req.ip} exceeded API rate limit on ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP. Please slow down and try again later.'
    });
  }
});

module.exports = { authLimiter, apiLimiter };
