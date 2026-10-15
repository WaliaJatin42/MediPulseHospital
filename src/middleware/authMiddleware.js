const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  try {
    let token = req.cookies.accessToken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      logger.warn(`[Auth Middleware] Access denied: Access token missing for route ${req.method} ${req.originalUrl} from IP ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, access token missing'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Security Isolation: Patient Portal tokens cannot access internal hospital staff endpoints
      if (decoded.aud === 'patient_portal') {
        logger.warn(`[Auth Middleware] Access denied: Portal token attempted calling staff route ${req.method} ${req.originalUrl}`);
        return res.status(401).json({
          success: false,
          message: 'Not authorized: Patient portal tokens cannot call staff endpoints'
        });
      }

      const user = await User.findById(decoded.id).populate('customRoles');

      if (!user) {
        logger.warn(`[Auth Middleware] Access denied: User for token ID ${decoded.id} no longer exists`);
        return res.status(401).json({
          success: false,
          message: 'User belonging to this token no longer exists'
        });
      }

      if (!user.isActive || user.isDeleted) {
        logger.warn(`[Auth Middleware] Access denied: Account ${user.email} is deactivated or removed`);
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated or removed. Please contact your hospital administrator.'
        });
      }

      req.user = user;
      req.user.effectivePermissions = await user.getEffectivePermissions();
      logger.debug(`[Auth Middleware] Authenticated ${user.email} (${user.role}) with ${req.user.effectivePermissions.length} permissions for ${req.method} ${req.originalUrl}`);
      next();
    } catch (jwtError) {
      logger.warn(`[Auth Middleware] Access denied: Token invalid or expired (${jwtError.message}) for ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        message: 'Token invalid or expired',
        code: 'TOKEN_EXPIRED'
      });
    }
  } catch (error) {
    logger.error(`[Auth Middleware Error] ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const authorize = (...rolesOrPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn(`[Authorize Middleware] Access denied: Unauthenticated request for restricted route ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Superadmin always has full access
    if (req.user.role === 'superadmin') {
      return next();
    }

    const effective = req.user.effectivePermissions || [];
    if (effective.includes('*')) {
      return next();
    }

    // 1. Check if user's role matches
    if (rolesOrPermissions.includes(req.user.role)) {
      return next();
    }

    // 2. Check if user has an assigned custom role matching slug, name, or id
    const customRoles = req.user.customRoles || req.user.roles || [];
    const hasMatchingRole = customRoles.some(
      (r) =>
        rolesOrPermissions.includes(r.slug) ||
        rolesOrPermissions.includes(r.name) ||
        rolesOrPermissions.includes(r._id?.toString())
    );
    if (hasMatchingRole) {
      return next();
    }

    // 3. Check if user possesses any of the required permissions
    const hasMatchingPermission = rolesOrPermissions.some((p) => effective.includes(p));
    if (hasMatchingPermission) {
      return next();
    }

    logger.warn(`[Authorize Middleware] Access denied for user ${req.user.email} (Role: '${req.user.role}'). Required: [${rolesOrPermissions.join(', ')}] on route ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: `Permission denied: Your assigned role does not grant permission to perform this action.`,
      required: rolesOrPermissions
    });
  };
};

module.exports = { protect, authorize };

