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


const signupValidation = [
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
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('designation')
    .optional()
    .isIn(['Doctor', 'Compounder', 'Pharmacist', 'Nurse', 'Lab Technician', 'Administrator', 'Staff', 'Other'])
    .withMessage('Invalid hospital designation'),
  body('department')
    .optional()
    .trim(),
  validate
];

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

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('designation')
    .optional()
    .isIn(['Doctor', 'Compounder', 'Pharmacist', 'Nurse', 'Lab Technician', 'Administrator', 'Staff', 'Other'])
    .withMessage('Invalid hospital designation'),
  body('department')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .trim(),
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  validate
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('New password must contain at least one number'),
  validate
];

const adminCreateUserValidation = [
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
    .withMessage('Password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'superadmin'])
    .withMessage('Role must be user, admin, or superadmin'),
  body('designation')
    .optional()
    .isIn(['Doctor', 'Compounder', 'Pharmacist', 'Nurse', 'Lab Technician', 'Administrator', 'Staff', 'Other'])
    .withMessage('Invalid hospital designation'),
  body('department')
    .optional()
    .trim(),
  body('phone')
    .optional()
    .trim(),
  validate
];

const adminUpdateUserValidation = [
  body('role')
    .optional()
    .isIn(['user', 'admin', 'superadmin'])
    .withMessage('Role must be user, admin, or superadmin'),
  body('designation')
    .optional()
    .isIn(['Doctor', 'Compounder', 'Pharmacist', 'Nurse', 'Lab Technician', 'Administrator', 'Staff', 'Other'])
    .withMessage('Invalid hospital designation'),
  body('department')
    .optional()
    .trim(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  validate
];

module.exports = {
  signupValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  adminCreateUserValidation,
  adminUpdateUserValidation
};

