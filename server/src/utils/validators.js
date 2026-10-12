const { body, validationResult } = require('express-validator');
const logger = require('./logger');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array().map(err => ({ field: err.path, message: err.msg }));
    logger.warn(`[Validation Failure] Request payload validation failed on ${req.method} ${req.originalUrl}: ${JSON.stringify(errorList)}`);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorList
    });
  }
  next();
};

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

const createUserValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'supervisor', 'admin', 'superadmin'])
    .withMessage('Role must be user, supervisor, admin, or superadmin'),
  body('designation')
    .optional()
    .trim(),
  body('department')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .trim(),
  validate
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('role')
    .optional()
    .isIn(['user', 'supervisor', 'admin', 'superadmin'])
    .withMessage('Role must be user, supervisor, admin, or superadmin'),
  body('designation')
    .optional()
    .trim(),
  body('department')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .trim(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  validate
];

const resetPasswordValidation = [
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
  validate
];

module.exports = {
  loginValidation,
  createUserValidation,
  updateUserValidation,
  resetPasswordValidation,
  validate
};
