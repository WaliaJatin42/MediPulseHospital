const logger = require('../utils/logger');

/**
 * RBAC Permission Guard Middleware
 * Evaluates user's effective permissions (computed from assigned custom roles,
 * direct permissions, and default department/role capabilities).
 * Superadmins automatically bypass all permission restrictions.
 */

/**
 * Checks whether the authenticated user possesses ALL required permissions
 * @param  {...string} requiredPermissions 
 */
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn(`[RBAC] Access denied: Unauthenticated request to ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role === 'superadmin') {
      return next();
    }

    const effective = req.user.effectivePermissions || [];

    if (effective.includes('*')) {
      return next();
    }

    const missing = requiredPermissions.filter(
      (perm) => !effective.includes(perm)
    );

    if (missing.length > 0) {
      logger.warn(
        `[RBAC] Access denied for ${req.user.email} on ${req.method} ${req.originalUrl}. Missing: [${missing.join(', ')}]`
      );
      return res.status(403).json({
        success: false,
        message: `Permission denied: Missing required permission(s) [${missing.join(', ')}]`,
        requiredPermissions,
        missingPermissions: missing
      });
    }

    next();
  };
};

/**
 * Checks whether the authenticated user possesses AT LEAST ONE of the specified permissions
 * @param  {...string} candidatePermissions 
 */
const requireAnyPermission = (...candidatePermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn(`[RBAC] Access denied: Unauthenticated request to ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role === 'superadmin') {
      return next();
    }

    const effective = req.user.effectivePermissions || [];

    if (effective.includes('*')) {
      return next();
    }

    const hasAny = candidatePermissions.some((perm) => effective.includes(perm));

    if (!hasAny) {
      logger.warn(
        `[RBAC] Access denied for ${req.user.email} on ${req.method} ${req.originalUrl}. Needs one of: [${candidatePermissions.join(', ')}]`
      );
      return res.status(403).json({
        success: false,
        message: `Permission denied: Requires at least one permission from [${candidatePermissions.join(', ')}]`,
        candidatePermissions
      });
    }

    next();
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission
};
