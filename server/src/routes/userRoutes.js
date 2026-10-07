const express = require('express');
const {
  getMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createUserValidation, updateUserValidation } = require('../utils/validators');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     summary: Get logged-in user profile (by token)
 *     tags: [User Profile]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', getMe);

// Admin / SuperAdmin CRUD routes below
router.use(authorize('admin', 'superadmin'));

/**
 * @openapi
 * /api/v1/users:
 *   post:
 *     summary: Create a new user account (Admin creates user createdBy them, SuperAdmin can create any role)
 *     tags: [User Management]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             name: "Dr. Sarah Jenkins"
 *             email: "doctor@hospital.com"
 *             password: "Doctor123!"
 *             role: "user"
 *             designation: "Doctor"
 *             department: "Cardiology"
 *             phone: "+1 (555) 000-0003"
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or duplicate email
 *       403:
 *         description: Permission denied (e.g. Admin creating SuperAdmin)
 */
router.post('/', createUserValidation, createUser);

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     summary: List users (SuperAdmin sees all users, Admin sees ONLY users created by them)
 *     tags: [User Management]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Multi-field search term across name, email, department, designation
 *     responses:
 *       200:
 *         description: List of accessible users
 *       403:
 *         description: Forbidden - Requires Admin / SuperAdmin role
 */
router.get('/', getUsers);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user details by ID (Creator restricted for Admin)
 *     tags: [User Management]
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
router.get('/:id', getUserById);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   patch:
 *     summary: Update user details (Creator restricted for Admin)
 *     tags: [User Management]
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
 *           example:
 *             name: "Dr. Sarah Jenkins"
 *             designation: "Senior Cardiologist"
 *             department: "Cardiology"
 *     responses:
 *       200:
 *         description: User updated successfully
 *       403:
 *         description: Hierarchy or creator restriction error
 *       404:
 *         description: User not found
 */
router.patch('/:id', updateUserValidation, updateUser);
router.put('/:id', updateUserValidation, updateUser);

/**
 * @openapi
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user account (Creator restricted for Admin)
 *     tags: [User Management]
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
 *         description: Permission denied (Not created by this Admin)
 *       404:
 *         description: User not found
 */
router.delete('/:id', deleteUser);

module.exports = router;
