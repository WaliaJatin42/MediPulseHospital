const express = require('express');
const {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  getBranchSettings,
  updateBranchSettings,
  getBranchModules,
  updateBranchModules,
  switchBranch,
  createInterBranchTransfer,
  receiveInterBranchTransfer,
  getInterBranchTransfers
} = require('../controllers/branchController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use('/branches', protect);
router.use('/auth/switch-branch', protect);
router.use('/inter-branch', protect);

// Branch CRUD & Settings
router.route('/branches')
  .post(authorize('superadmin'), createBranch)
  .get(getBranches);

router.route('/branches/:id')
  .get(getBranchById)
  .patch(authorize('superadmin'), updateBranch);

router.route('/branches/:id/settings')
  .get(getBranchSettings)
  .put(authorize('superadmin'), updateBranchSettings);

router.route('/branches/:id/modules')
  .get(getBranchModules)
  .patch(authorize('superadmin'), updateBranchModules);

// Switch Active Branch
router.post('/auth/switch-branch', switchBranch);

// Inter-Branch Operations
router.get('/inter-branch/transfers', getInterBranchTransfers);
router.post('/inter-branch/patient-transfers', createInterBranchTransfer);
router.post('/inter-branch/stock-transfers', createInterBranchTransfer);
router.patch('/inter-branch/transfers/:id/receive', receiveInterBranchTransfer);

module.exports = router;
