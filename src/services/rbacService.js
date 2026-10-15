const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');
const { ALL_PERMISSIONS } = require('../config/permissions');
const logger = require('../utils/logger');

/**
 * Convert role display name into a clean unique slug
 * @param {string} text 
 * @returns {string}
 */
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '_');

/**
 * Validate and filter permissions array against system catalog
 * @param {string[]} permissions 
 * @returns {string[]}
 */
const sanitizePermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter((p) => p === '*' || ALL_PERMISSIONS.includes(p));
};

/**
 * Create a new custom role with a specific set of permissions
 * @param {Object} data 
 * @param {string} data.name - Human-friendly role name
 * @param {string} [data.slug] - Optional custom slug
 * @param {string} [data.description] - What this role does
 * @param {string} [data.department] - Associated department
 * @param {string[]} [data.permissions] - Granular permissions assigned to this role
 * @param {string} [data.createdBy] - Admin User ID creating this role
 */
const createCustomRole = async ({ name, slug, description, department, permissions = [], createdBy = null }) => {
  if (!name || !name.trim()) {
    throw new Error('Role name is required');
  }

  const finalSlug = slug ? slugify(slug) : slugify(name);

  const existing = await Role.findOne({ slug: finalSlug });
  if (existing) {
    throw new Error(`A role with slug '${finalSlug}' already exists. Please choose a different role name.`);
  }

  const validPermissions = sanitizePermissions(permissions);

  const role = await Role.create({
    name: name.trim(),
    slug: finalSlug,
    description: description || '',
    department: (department || 'general').toLowerCase().trim(),
    permissions: validPermissions,
    isSystem: false,
    isActive: true,
    createdBy
  });

  logger.info(`[RBAC Service] Created role '${role.name}' (${role.slug}) with ${validPermissions.length} permissions`);
  return role;
};

/**
 * Update an existing role's name, description, department, or permissions set
 * @param {string} roleId 
 * @param {Object} updates 
 */
const updateCustomRole = async (roleId, updates = {}) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new Error('Role not found');
  }

  if (updates.name) role.name = updates.name.trim();
  if (updates.description !== undefined) role.description = updates.description;
  if (updates.department) role.department = updates.department.toLowerCase().trim();
  if (updates.isActive !== undefined) role.isActive = !!updates.isActive;

  if (Array.isArray(updates.permissions)) {
    role.permissions = sanitizePermissions(updates.permissions);
  }

  await role.save();
  logger.info(`[RBAC Service] Updated role '${role.name}' (${role._id}) with ${role.permissions.length} permissions`);
  return role;
};

/**
 * Delete a custom role and automatically detach it from all users who hold it
 * @param {string} roleId 
 */
const deleteCustomRole = async (roleId) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw new Error('Role not found');
  }

  if (role.isSystem) {
    throw new Error(`Built-in system role '${role.name}' cannot be deleted`);
  }

  // Remove role reference from all users
  const unbindResult = await User.updateMany(
    { $or: [{ customRoles: role._id }, { roles: role._id }] },
    { $pull: { customRoles: role._id, roles: role._id } }
  );

  await Role.findByIdAndDelete(roleId);
  logger.info(`[RBAC Service] Deleted role '${role.name}' and detached from ${unbindResult.modifiedCount} users`);
  return { role, unboundUsersCount: unbindResult.modifiedCount };
};

/**
 * Assign one or more roles to a specific user
 * @param {string} userId - Target user ID
 * @param {string|string[]} roleIds - Single role ID or array of role IDs
 * @param {boolean} [append=false] - Whether to merge with existing roles or replace
 */
const assignRolesToUser = async (userId, roleIds, append = false) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const idsToProcess = Array.isArray(roleIds) ? roleIds : [roleIds].filter(Boolean);

  // Validate that all specified roles exist and are active
  const roles = await Role.find({
    _id: { $in: idsToProcess },
    isActive: true
  });

  const validRoleIds = roles.map((r) => r._id);

  if (append) {
    const existingIds = (user.customRoles || []).map((id) => id.toString());
    const merged = new Set([...existingIds, ...validRoleIds.map((id) => id.toString())]);
    user.customRoles = Array.from(merged);
  } else {
    user.customRoles = validRoleIds;
  }
  user.roles = user.customRoles;

  await user.save();

  const effectivePermissions = await user.getEffectivePermissions();
  const assignedRoles = await Role.find({ _id: { $in: user.customRoles } }).select('name slug department permissions');

  logger.info(`[RBAC Service] Assigned ${user.customRoles.length} role(s) to ${user.email}`);

  return {
    user,
    assignedRoles,
    effectivePermissions
  };
};

/**
 * Remove/unassign a specific role from a user
 * @param {string} userId 
 * @param {string} roleId 
 */
const unassignRoleFromUser = async (userId, roleId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.customRoles = (user.customRoles || []).filter((r) => r.toString() !== roleId.toString());
  user.roles = user.customRoles;
  await user.save();

  const effectivePermissions = await user.getEffectivePermissions();
  const remainingRoles = await Role.find({ _id: { $in: user.customRoles } }).select('name slug department permissions');

  logger.info(`[RBAC Service] Removed role ${roleId} from ${user.email}. Remaining roles: ${user.customRoles.length}`);

  return {
    user,
    assignedRoles: remainingRoles,
    effectivePermissions
  };
};

/**
 * Bulk assign a role to multiple users
 * @param {string} roleId 
 * @param {string[]} userIds 
 */
const bulkAssignRoleToUsers = async (roleId, userIds = []) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('userIds array is required and must not be empty');
  }

  const role = await Role.findById(roleId);
  if (!role) {
    throw new Error('Role not found');
  }

  const result = await User.updateMany(
    { _id: { $in: userIds }, isDeleted: false },
    { $addToSet: { customRoles: role._id, roles: role._id } }
  );

  logger.info(`[RBAC Service] Bulk assigned role '${role.name}' to ${result.modifiedCount} users`);
  return { role, modifiedCount: result.modifiedCount };
};

/**
 * Inspect a user's assigned roles and their resulting effective permissions
 * @param {string} userId 
 */
const getUserEffectiveRolesAndPermissions = async (userId) => {
  const user = await User.findById(userId).populate('customRoles');
  if (!user) {
    throw new Error('User not found');
  }

  const effectivePermissions = await user.getEffectivePermissions();

  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    department: user.department,
    designation: user.designation,
    legacyRole: user.role,
    assignedRoles: user.customRoles || [],
    effectivePermissionsCount: effectivePermissions.length,
    effectivePermissions
  };
};

module.exports = {
  slugify,
  sanitizePermissions,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  assignRolesToUser,
  unassignRoleFromUser,
  bulkAssignRoleToUsers,
  getUserEffectiveRolesAndPermissions
};
