const express = require('express');
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getLogs
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { adminCreateUserValidation, adminUpdateUserValidation } = require('../utils/validators');

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'superadmin'));

/**
 * @openapi
 * /api/admin/logs:
 *   get:
 *     summary: Retrieve system application logs in JSON format with pagination (Default 10 per page)
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (Default is 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of log records per page (Default is 10, user can customize page size)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Alias for limit (custom page size)
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [all, info, warn, error, debug]
 *         description: Filter logs by level
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter logs by text search in message or timestamp
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           example: '2026-10-07'
 *         description: Date of log file in YYYY-MM-DD format (Defaults to today)
 *     responses:
 *       200:
 *         description: Paginated JSON log entries
 *       403:
 *         description: Forbidden - Requires Admin / SuperAdmin role
 */
router.get('/logs', getLogs);

/**
 * @openapi
 * /api/admin/users:
 *   post:
 *     summary: Create a new user account (Admin / Superadmin)
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSignup'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or duplicate email
 *       403:
 *         description: Permission denied (e.g. Admin creating Superadmin)
 */
router.post('/users', adminCreateUserValidation, createUser);

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: List hospital staff (Admin sees only users created by them; Superadmin sees all)
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of users per page
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by user name (partial/case-insensitive regex match)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, superadmin]
 *         description: Filter by staff role
 *       - in: query
 *         name: designation
 *         schema:
 *           type: string
 *         description: Filter by hospital designation
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by hospital department
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: General multi-field search term across name, email, department, designation
 *     responses:
 *       200:
 *         description: Paginated users list with applied filters
 *       403:
 *         description: Forbidden - Admin / SuperAdmin required
 */
router.get('/users', getUsers);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user details by ID (Creator restricted for Admin)
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved
 *       403:
 *         description: Permission denied (Not created by this Admin)
 *       404:
 *         description: User not found
 */
router.get('/users/:id', getUserById);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update staff role, designation, or active status (Creator restricted for Admin)
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUserUpdate'
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Hierarchy or creator restriction error
 */
router.patch('/users/:id', adminUpdateUserValidation, updateUser);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete staff member account (Creator restricted for Admin)
 *     tags: [Admin Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Hierarchy or creator restriction error
 */
router.delete('/users/:id', deleteUser);

module.exports = router;



