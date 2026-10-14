const express = require('express');
const {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  createUnknownPatient,
  identifyUnknownPatient,
  mergePatients,
  getPatientTimeline,
  getWristbandData,
  updateRestrictions,
  assignCareTeam,
  getCareTeam,
  removeCareTeam,
  requestBreakGlass,
  getBreakGlassGrants,
  reviewBreakGlass,
  addConsent,
  getConsents,
  revokeConsent,
  addAllergy,
  getAllergies
} = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

router.use(['/patients', '/care-teams', '/break-glass', '/consents'], protect, branchContext);

// Patient Registration & List
router.route('/patients')
  .get(getPatients)
  .post(createPatient);

// Unknown Emergency Arrivals
router.post('/patients/unknown', createUnknownPatient);
router.patch('/patients/:id/identify', identifyUnknownPatient);

// Duplicate Merging
router.post('/patients/merge', authorize('superadmin', 'admin'), mergePatients);

// Patient Profile & Timeline
router.route('/patients/:id')
  .get(getPatientById)
  .patch(updatePatient);

router.get('/patients/:id/timeline', getPatientTimeline);
router.get('/patients/:id/wristband', getWristbandData);
router.patch('/patients/:id/restrictions', authorize('superadmin', 'admin'), updateRestrictions);

// Care Teams
router.post('/care-teams', assignCareTeam);
router.get('/patients/:id/care-team', getCareTeam);
router.delete('/care-teams/:id', removeCareTeam);

// Break-Glass Emergency Overrides
router.post('/break-glass', requestBreakGlass);
router.get('/break-glass', authorize('superadmin', 'admin'), getBreakGlassGrants);
router.get('/break-glass/grants', authorize('superadmin', 'admin'), getBreakGlassGrants);
router.patch('/break-glass/:id/review', authorize('superadmin', 'admin'), reviewBreakGlass);

// Consents
router.route('/patients/:id/consents')
  .post(addConsent)
  .get(getConsents);
router.patch('/consents/:id/revoke', revokeConsent);

// Allergies
router.route('/patients/:id/allergies')
  .post(addAllergy)
  .get(getAllergies);

module.exports = router;
