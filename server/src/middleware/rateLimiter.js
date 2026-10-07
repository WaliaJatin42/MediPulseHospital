const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`[Rate Limit Exceeded] IP ${req.ip} exceeded rate limit on ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      success: false,
      message: 'Too many login or authentication attempts from this IP, please try again after 15 minutes.'
    });
  }
});

module.exports = { authLimiter };

