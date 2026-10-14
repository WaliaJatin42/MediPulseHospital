const Branch = require('../models/branch/Branch');
const logger = require('../utils/logger');

let cachedMainBranchId = null;

/**
 * Resolves the default main branch ID
 */
async function getMainBranchId() {
  if (cachedMainBranchId) return cachedMainBranchId;
  const mainBranch = await Branch.findOne({ isMain: true });
  if (mainBranch) {
    cachedMainBranchId = mainBranch._id;
    return cachedMainBranchId;
  }
  const anyBranch = await Branch.findOne();
  if (anyBranch) {
    cachedMainBranchId = anyBranch._id;
    return cachedMainBranchId;
  }
  return null;
}

/**
 * Multi-Branch Scoping Middleware
 * 1. Resolves active branch from token (activeBranchId), x-branch-id header, or system default
 * 2. Overrides any client-provided branchId in req.body to prevent privilege escalation / cross-branch spoofing
 * 3. Injects req.branchId and req.branchFilter() helper
 */
const branchContext = async (req, res, next) => {
  try {
    let resolvedBranchId = null;

    // 1. From authenticated user context
    if (req.user) {
      if (req.user.activeBranchId) {
        resolvedBranchId = req.user.activeBranchId;
      }

      // Check header override if user is superadmin or member of that branch
      const headerBranchId = req.headers['x-branch-id'];
      if (headerBranchId) {
        if (req.user.role === 'superadmin') {
          resolvedBranchId = headerBranchId;
        } else if (req.user.branchIds && req.user.branchIds.some((b) => b.toString() === headerBranchId)) {
          resolvedBranchId = headerBranchId;
        }
      }
    }

    // 2. Fallback to main branch
    if (!resolvedBranchId) {
      resolvedBranchId = await getMainBranchId();
    }

    req.branchId = resolvedBranchId;

    // Security Rule: Every write takes branchId from the token/context, never from the request body.
    if (req.body && typeof req.body === 'object') {
      req.body.branchId = resolvedBranchId;
    }

    // Helper to apply branch filter to Mongoose query criteria
    req.branchFilter = (filter = {}) => {
      if (req.user && req.user.role === 'superadmin' && req.query && req.query.allBranches === 'true') {
        return filter; // Superadmin consolidated view
      }
      if (resolvedBranchId) {
        filter.branchId = resolvedBranchId;
      }
      return filter;
    };

    next();
  } catch (error) {
    logger.error(`[Branch Middleware Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  branchContext,
  getMainBranchId
};
