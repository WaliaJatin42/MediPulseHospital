const express = require('express');
const {
  createContract,
  getContracts,
  updateContract,
  submitContractReview,
  getContractReviews,
  respondToReview,
  createCase,
  getCases,
  updateCase,
  createLicense,
  getLicenses,
  getExpiringLicenses,
  createPolicy,
  getPolicies,
  uploadDocument,
  getDocuments,
  getDocumentById
} = require('../controllers/legalController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/v1/legal/contracts:
 *   post:
 *     summary: Draft legal contract (Legal staff only)
 *     tags: [Legal Module]
 *   get:
 *     summary: View legal contracts
 *     tags: [Legal Module]
 */
router.route('/contracts')
  .post(authorize('superadmin', 'admin', 'supervisor'), createContract)
  .get(authorize('superadmin', 'admin', 'supervisor'), getContracts);

router.patch('/contracts/:id', authorize('superadmin', 'admin', 'supervisor'), updateContract);

/**
 * @openapi
 * /api/v1/legal/reviews:
 *   post:
 *     summary: Submit vendor/employment contract for legal review (any department)
 *     tags: [Legal Module]
 *   get:
 *     summary: List contract review requests
 *     tags: [Legal Module]
 */
router.route('/reviews')
  .post(submitContractReview)
  .get(getContractReviews);

router.patch('/reviews/:id', authorize('superadmin', 'admin', 'supervisor'), respondToReview);

/**
 * @openapi
 * /api/v1/legal/cases:
 *   post:
 *     summary: Docket legal case / malpractice / dispute
 *     tags: [Legal Module]
 *   get:
 *     summary: List active litigation and hearings
 *     tags: [Legal Module]
 */
router.route('/cases')
  .post(authorize('superadmin', 'admin', 'supervisor'), createCase)
  .get(authorize('superadmin', 'admin', 'supervisor'), getCases);

router.patch('/cases/:id', authorize('superadmin', 'admin', 'supervisor'), updateCase);

/**
 * @openapi
 * /api/v1/legal/licenses/expiring:
 *   get:
 *     summary: View compliance licenses expiring within 60 days
 *     tags: [Legal Module]
 */
router.get('/licenses/expiring', getExpiringLicenses);

/**
 * @openapi
 * /api/v1/legal/licenses:
 *   post:
 *     summary: Register regulatory or clinical compliance license
 *     tags: [Legal Module]
 *   get:
 *     summary: List hospital compliance licenses
 *     tags: [Legal Module]
 */
router.route('/licenses')
  .post(authorize('superadmin', 'admin', 'supervisor'), createLicense)
  .get(getLicenses);

/**
 * @openapi
 * /api/v1/legal/policies:
 *   post:
 *     summary: Publish new hospital policy (Legal Admin only)
 *     tags: [Legal Module]
 *   get:
 *     summary: List published policies visible to all hospital employees
 *     tags: [Legal Module]
 */
router.route('/policies')
  .post(authorize('superadmin', 'admin'), createPolicy)
  .get(getPolicies);

/**
 * @openapi
 * /api/v1/legal/documents:
 *   post:
 *     summary: Securely archive confidential legal document with ACL
 *     tags: [Legal Module]
 *   get:
 *     summary: List accessible legal documents
 *     tags: [Legal Module]
 */
router.route('/documents')
  .post(authorize('superadmin', 'admin', 'supervisor'), uploadDocument)
  .get(getDocuments);

/**
 * @openapi
 * /api/v1/legal/documents/{id}:
 *   get:
 *     summary: Access confidential legal document (Strict ACL check & audited read log)
 *     tags: [Legal Module]
 */
router.get('/documents/:id', getDocumentById);

module.exports = router;
