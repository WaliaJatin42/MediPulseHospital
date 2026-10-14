const express = require('express');
const {
  getMe,
  updateMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
  getUserSensitive,
  reassignUsers,
  getOrphanedUsers,
  getOwnershipHistory,
  transferUser,
  roleChangeUser,
  getAssignmentHistory
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/me')
  .get(getMe)
  .patch(updateMe);

// Specific routes before :id
router.post('/reassign', authorize('superadmin', 'admin'), reassignUsers);
router.get('/orphaned', authorize('superadmin', 'admin'), getOrphanedUsers);

router.route('/')
  .post(authorize('superadmin', 'admin', 'supervisor'), createUser)
  .get(authorize('superadmin', 'admin', 'supervisor'), getUsers);

// Actions on :id
router.get('/:id/sensitive', getUserSensitive);
router.get('/:id/ownership-history', getOwnershipHistory);
router.post('/:id/transfer', authorize('superadmin', 'admin'), transferUser);
router.post('/:id/role-change', authorize('superadmin', 'admin'), roleChangeUser);
router.get('/:id/assignment-history', getAssignmentHistory);
router.patch('/:id/status', authorize('superadmin', 'admin', 'supervisor'), updateUserStatus);

router.route('/:id')
  .get(getUserById)
  .patch(authorize('superadmin', 'admin', 'supervisor'), updateUser)
  .delete(authorize('superadmin', 'admin', 'supervisor'), deleteUser);

module.exports = router;
