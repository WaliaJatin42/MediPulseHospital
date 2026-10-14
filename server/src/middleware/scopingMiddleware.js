const { isHRDepartment } = require('../config/permissions');
const logger = require('../utils/logger');

/**
 * Determine and attach scope filter to req based on role and department
 * 
 * Rules:
 * 1. Global Scope: Superadmin sees everything (filter: {})
 * 2. Creator Scope: HR roles (admin / supervisor) see documents where createdBy == user._id
 * 3. Department Scope: Non-HR Admins / Supervisors see documents where department == user.department
 * 4. Self Scope: Regular staff/users see documents where user == user._id (or _id == user._id)
 */
const applyUserScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const user = req.user;
  const isSuperAdmin = user.role === 'superadmin';
  const isHR = isHRDepartment(user);
  const isDeptAdminOrSupervisor = (user.role === 'admin' || user.role === 'supervisor') && !isHR;
  const isRegularUser = user.role === 'user';

  if (isSuperAdmin) {
    req.scopeType = 'global';
    req.scopeFilter = {};
  } else if (isHR) {
    req.scopeType = 'creator';
    req.scopeFilter = { createdBy: user._id };
  } else if (isDeptAdminOrSupervisor) {
    req.scopeType = 'department';
    req.scopeFilter = { department: (user.department || '').toLowerCase() };
  } else {
    req.scopeType = 'self';
    req.scopeFilter = { _id: user._id };
  }

  next();
};

/**
 * Verify department access guard
 * Ensures a caller belongs to the target department or is Superadmin
 */
const requireDepartment = (deptName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.user.role === 'superadmin') {
      return next();
    }

    const targetDept = (deptName || '').toLowerCase();
    const callerDept = (req.user.department || '').toLowerCase();

    if (callerDept !== targetDept) {
      logger.warn(`[Department Guard] Access denied for ${req.user.email} (Dept: ${callerDept}) requesting ${targetDept} module`);
      return res.status(403).json({
        success: false,
        message: `Forbidden: Only ${targetDept.toUpperCase()} department members or SuperAdmin can access this resource.`
      });
    }

    next();
  };
};

/**
 * Role-based authorization with department awareness
 */
const authorizeDeptRole = ({ department, roles = ['admin', 'supervisor'] }) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (req.user.role === 'superadmin') {
      return next();
    }

    const callerDept = (req.user.department || '').toLowerCase();
    const targetDept = department ? department.toLowerCase() : null;

    if (targetDept && callerDept !== targetDept) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to ${targetDept} department.`
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your role (${req.user.role}) is not authorized for this operation.`
      });
    }

    next();
  };
};

module.exports = {
  applyUserScope,
  requireDepartment,
  authorizeDeptRole
};
