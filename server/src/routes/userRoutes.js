const express = require('express');
const { getMe, updateMe } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { updateProfileValidation } = require('../utils/validators');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     summary: Get logged-in user profile
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

/**
 * @openapi
 * /api/users/me:
 *   put:
 *     summary: Update user profile or change password
 *     tags: [User Profile]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error or incorrect password
 *       401:
 *         description: Unauthorized
 */
router.put('/me', updateProfileValidation, updateMe);

module.exports = router;

