const express = require('express');
const {
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
} = require('../controllers/rbacController');
const { protect } = require('../middleware/authMiddleware');
const { requireAnyPermission } = require('../middleware/rbacMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/rbac/permissions:
 *   get:
 *     summary: Get complete catalog of hospital system permissions grouped by module
 *     description: Returns all available permissions with module names, keys, and descriptions so administrators can choose which permissions to grant when creating or editing a role.
 *     tags: [Role-Based Access Control (RBAC)]
 *     responses:
 *       200:
 *         description: Permissions catalog loaded successfully
 */
router.get('/permissions', getPermissionsCatalog);

/**
 * @openapi
 * /api/v1/rbac/roles:
 *   get:
 *     summary: List all custom roles with member counts and permissions count
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter roles by department
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by role name or slug
 *     responses:
 *       200:
 *         description: List of roles
 *   post:
 *     summary: Create a new role with a designated set of permissions
 *     description: Administrators create different roles and define the exact set of permissions each role should possess.
 *     tags: [Role-Based Access Control (RBAC)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Clinical Pharmacist
 *               slug:
 *                 type: string
 *                 example: clinical_pharmacist
 *               description:
 *                 type: string
 *                 example: Clinical pharmacy specialist managing inpatient dispensing and reconciliation
 *               department:
 *                 type: string
 *                 example: pharmacy
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["pharmacy:medicines:read", "pharmacy:dispense"]
 *     responses:
 *       201:
 *         description: Role created successfully
 */
router.route('/roles')
  .get(getRoles)
  .post(requireAnyPermission('roles:create', 'superadmin'), createRole);

/**
 * @openapi
 * /api/v1/rbac/roles/{id}:
 *   get:
 *     summary: Get role details by ID or Slug with active members list
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role details
 *   put:
 *     summary: Update an existing role's permissions or properties
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               department:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
 *   delete:
 *     summary: Delete a custom role and unassign it from all users
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted successfully
 */
router.route('/roles/:id')
  .get(getRoleById)
  .put(requireAnyPermission('roles:update', 'superadmin'), updateRole)
  .patch(requireAnyPermission('roles:update', 'superadmin'), updateRole)
  .delete(requireAnyPermission('roles:delete', 'superadmin'), deleteRole);

/**
 * @openapi
 * /api/v1/rbac/assign-role:
 *   post:
 *     summary: Apply / Assign a role to a specific user
 *     description: Apply one or more created roles to a specific user. The user will automatically inherit all permissions belonging to those roles.
 *     tags: [Role-Based Access Control (RBAC)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 6ac6936744a9e3fab015ceee
 *               roleId:
 *                 type: string
 *                 example: 6ac6936744a9e3fab015cf01
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               append:
 *                 type: boolean
 *                 default: false
 *                 description: If true, adds to existing roles; if false, replaces existing roles
 *     responses:
 *       200:
 *         description: Role successfully applied to user
 */
router.post('/assign-role', requireAnyPermission('roles:assign', 'superadmin'), assignRoleToUser);
router.post('/assign', requireAnyPermission('roles:assign', 'superadmin'), assignRoleToUser);

/**
 * @openapi
 * /api/v1/rbac/users/{userId}/roles:
 *   post:
 *     summary: Apply a role to a specific user by User ID
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roleId:
 *                 type: string
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               append:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Role applied to user
 *   get:
 *     summary: Inspect assigned roles and effective permissions for a user
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID or 'me'
 *     responses:
 *       200:
 *         description: User roles and permissions loaded
 */
router.route('/users/:userId/roles')
  .get(getUserPermissions)
  .post(requireAnyPermission('roles:assign', 'superadmin'), assignRoleToUser);

/**
 * @openapi
 * /api/v1/rbac/users/{userId}/roles/{roleId}:
 *   delete:
 *     summary: Remove / Unassign a role from a specific user
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role removed from user
 */
router.delete('/users/:userId/roles/:roleId', requireAnyPermission('roles:assign', 'superadmin'), unassignUserRole);

/**
 * @openapi
 * /api/v1/rbac/roles/{roleId}/assign-users:
 *   post:
 *     summary: Bulk assign a role to multiple users
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role assigned to users
 */
router.post('/roles/:roleId/assign-users', requireAnyPermission('roles:assign', 'superadmin'), assignRoleToMultipleUsers);

/**
 * @openapi
 * /api/v1/rbac/users/{userId}/permissions:
 *   get:
 *     summary: Inspect effective permissions derived from assigned roles for a staff member (use 'me' for self)
 *     tags: [Role-Based Access Control (RBAC)]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Effective user permissions
 */
router.get('/users/:userId/permissions', getUserPermissions);

module.exports = router;
