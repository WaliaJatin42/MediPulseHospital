const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');
const {
  PERMISSIONS_BY_MODULE,
  ALL_PERMISSIONS
} = require('../config/permissions');
const {
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  assignRolesToUser,
  unassignRoleFromUser,
  bulkAssignRoleToUsers,
  getUserEffectiveRolesAndPermissions
} = require('../services/rbacService');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Get complete catalog of all system permissions grouped by module
// @route   GET /api/v1/rbac/permissions
// @access  Private (Authenticated staff)
const getPermissionsCatalog = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      totalPermissions: ALL_PERMISSIONS.length,
      modulesCount: PERMISSIONS_BY_MODULE.length,
      data: PERMISSIONS_BY_MODULE,
      allPermissions: ALL_PERMISSIONS
    });
  } catch (error) {
    logger.error(`[RBAC Controller] getPermissionsCatalog failed: ${error.message}`);
    next(error);
  }
};

// @desc    List all system and custom roles with user member counts
// @route   GET /api/v1/rbac/roles
// @access  Private (Authenticated staff)
const getRoles = async (req, res, next) => {
  try {
    const { department, status, search } = req.query;
    const filter = {};

    if (department && department !== 'all') {
      filter.department = department.toLowerCase().trim();
    }

    if (status) {
      filter.isActive = status === 'active';
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const roles = await Role.find(filter)
      .populate('createdBy', 'name email designation')
      .sort({ createdAt: -1 });

    // Calculate active user count for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const memberCount = await User.countDocuments({
          $or: [{ customRoles: role._id }, { roles: role._id }],
          isDeleted: false
        });
        return {
          ...role.toObject(),
          memberCount,
          permissionsCount: role.permissions ? role.permissions.length : 0
        };
      })
    );

    res.status(200).json({
      success: true,
      count: rolesWithCounts.length,
      data: rolesWithCounts
    });
  } catch (error) {
    logger.error(`[RBAC Controller] getRoles failed: ${error.message}`);
    next(error);
  }
};

// @desc    Get single role details by ID or Slug with active members list
// @route   GET /api/v1/rbac/roles/:id
// @access  Private
const getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let role;

    if (mongoose.Types.ObjectId.isValid(id)) {
      role = await Role.findById(id).populate('createdBy', 'name email designation');
    } else {
      role = await Role.findOne({ slug: id.toLowerCase().trim() }).populate('createdBy', 'name email designation');
    }

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const members = await User.find({
      $or: [{ customRoles: role._id }, { roles: role._id }],
      isDeleted: false
    })
      .select('name email designation department status role avatar')
      .limit(50);

    const memberCount = await User.countDocuments({
      $or: [{ customRoles: role._id }, { roles: role._id }],
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      data: {
        ...role.toObject(),
        memberCount,
        members
      }
    });
  } catch (error) {
    logger.error(`[RBAC Controller] getRoleById failed: ${error.message}`);
    next(error);
  }
};

// @desc    Create a new role with a designated set of permissions
// @route   POST /api/v1/rbac/roles
// @access  Private (Requires 'roles:create' or Superadmin)
const createRole = async (req, res, next) => {
  try {
    const { name, slug, description, department, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const role = await createCustomRole({
      name,
      slug,
      description,
      department,
      permissions: Array.isArray(permissions) ? permissions : [],
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_RBAC_ROLE',
      resource: 'roles',
      resourceId: role._id.toString(),
      after: role.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: `Role '${role.name}' created successfully with ${role.permissions.length} permissions`,
      data: role
    });
  } catch (error) {
    logger.error(`[RBAC Controller] createRole failed: ${error.message}`);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Update an existing role's metadata and permissions
// @route   PUT /api/v1/rbac/roles/:id or PATCH /api/v1/rbac/roles/:id
// @access  Private (Requires 'roles:update' or Superadmin)
const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await Role.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const beforeState = existing.toObject();
    const updated = await updateCustomRole(id, req.body);

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_RBAC_ROLE',
      resource: 'roles',
      resourceId: updated._id.toString(),
      before: beforeState,
      after: updated.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Role '${updated.name}' updated successfully with ${updated.permissions.length} permissions`,
      data: updated
    });
  } catch (error) {
    logger.error(`[RBAC Controller] updateRole failed: ${error.message}`);
    next(error);
  }
};

// @desc    Delete a role and unbind it from all assigned users
// @route   DELETE /api/v1/rbac/roles/:id
// @access  Private (Requires 'roles:delete' or Superadmin)
const deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await Role.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const beforeState = existing.toObject();
    const { role, unboundUsersCount } = await deleteCustomRole(id);

    await recordAuditLog({
      actor: req.user,
      action: 'DELETE_RBAC_ROLE',
      resource: 'roles',
      resourceId: id,
      before: beforeState,
      req
    });

    res.status(200).json({
      success: true,
      message: `Role '${role.name}' deleted and unassigned from ${unboundUsersCount} user(s)`
    });
  } catch (error) {
    logger.error(`[RBAC Controller] deleteRole failed: ${error.message}`);
    if (error.message.includes('cannot be deleted')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Apply / Assign a role or set of roles to a specific user
// @route   POST /api/v1/rbac/assign-role or POST /api/v1/rbac/users/:userId/roles
// @access  Private (Requires 'roles:assign' or Superadmin)
const assignRoleToUser = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.body.userId;
    const { roleId, roleIds, append } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Target userId is required' });
    }

    let rolesToAssign = [];
    if (roleId) rolesToAssign.push(roleId);
    if (Array.isArray(roleIds)) rolesToAssign.push(...roleIds);

    if (rolesToAssign.length === 0 && !Array.isArray(roleIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide roleId or roleIds to assign to the user'
      });
    }

    const { user, assignedRoles, effectivePermissions } = await assignRolesToUser(
      userId,
      rolesToAssign,
      append === true
    );

    await recordAuditLog({
      actor: req.user,
      action: 'ASSIGN_USER_ROLE',
      resource: 'users',
      resourceId: user._id.toString(),
      after: {
        userId: user._id,
        assignedRoles: assignedRoles.map((r) => r.name),
        effectivePermissionsCount: effectivePermissions.length
      },
      req
    });

    res.status(200).json({
      success: true,
      message: `Assigned ${assignedRoles.length} role(s) to ${user.name} (${user.email}). Effective permissions: ${effectivePermissions.length}`,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        assignedRoles,
        effectivePermissionsCount: effectivePermissions.length,
        effectivePermissions
      }
    });
  } catch (error) {
    logger.error(`[RBAC Controller] assignRoleToUser failed: ${error.message}`);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Unassign / Remove a specific role from a user
// @route   DELETE /api/v1/rbac/users/:userId/roles/:roleId
// @access  Private (Requires 'roles:assign' or Superadmin)
const unassignUserRole = async (req, res, next) => {
  try {
    const { userId, roleId } = req.params;

    const { user, assignedRoles, effectivePermissions } = await unassignRoleFromUser(userId, roleId);

    await recordAuditLog({
      actor: req.user,
      action: 'UNASSIGN_USER_ROLE',
      resource: 'users',
      resourceId: user._id.toString(),
      after: {
        userId: user._id,
        removedRoleId: roleId,
        remainingRolesCount: assignedRoles.length,
        effectivePermissionsCount: effectivePermissions.length
      },
      req
    });

    res.status(200).json({
      success: true,
      message: `Role removed from ${user.name}. User now has ${assignedRoles.length} role(s)`,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        assignedRoles,
        effectivePermissionsCount: effectivePermissions.length,
        effectivePermissions
      }
    });
  } catch (error) {
    logger.error(`[RBAC Controller] unassignUserRole failed: ${error.message}`);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Assign a specific role to multiple users in bulk
// @route   POST /api/v1/rbac/roles/:roleId/assign-users
// @access  Private (Requires 'roles:assign' or Superadmin)
const assignRoleToMultipleUsers = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { userIds } = req.body;

    const { role, modifiedCount } = await bulkAssignRoleToUsers(roleId, userIds);

    await recordAuditLog({
      actor: req.user,
      action: 'BULK_ASSIGN_ROLE',
      resource: 'roles',
      resourceId: roleId,
      after: { roleId, roleName: role.name, userIds, modifiedCount },
      req
    });

    res.status(200).json({
      success: true,
      message: `Role '${role.name}' assigned to ${modifiedCount} user(s)`,
      data: {
        roleId: role._id,
        roleName: role.name,
        modifiedUsersCount: modifiedCount
      }
    });
  } catch (error) {
    logger.error(`[RBAC Controller] assignRoleToMultipleUsers failed: ${error.message}`);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get effective permissions and assigned roles for a specific user
// @route   GET /api/v1/rbac/users/:userId/roles or GET /api/v1/rbac/users/:userId/permissions
// @access  Private
const getUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetId = userId === 'me' ? req.user._id : userId;

    const result = await getUserEffectiveRolesAndPermissions(targetId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`[RBAC Controller] getUserPermissions failed: ${error.message}`);
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getPermissionsCatalog,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignRoleToUser,
  unassignUserRole,
  assignRoleToMultipleUsers,
  getUserPermissions
};
