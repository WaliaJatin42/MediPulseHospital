const express = require('express');
const {
  createAdmission,
  getAdmissions,
  getAdmissionById,
  transferBed,
  addDoctorRound,
  getDoctorRounds,
  initiateDischarge,
  approveClearance,
  finalizeDischarge,
  createDischargeSummary,
  getDischargeSummary,
  getIpdDashboard,
  recordNursingChart,
  getNursingCharts,
  getMarEntries,
  administerMarMedication,
  withholdMarMedication,
  createNursingHandover,
  getNursingHandovers
} = require('../controllers/ipdController');
const { protect } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

router.use(['/ipd', '/admissions', '/mar', '/nursing'], protect, branchContext);

// IPD Dashboard
router.get('/ipd/dashboard', getIpdDashboard);

// Admissions
router.route('/admissions')
  .post(createAdmission)
  .get(getAdmissions);

router.route('/admissions/:id')
  .get(getAdmissionById);

router.post('/admissions/:id/bed-transfer', transferBed);

// Rounds
router.route('/admissions/:id/rounds')
  .post(addDoctorRound)
  .get(getDoctorRounds);

// Discharge Workflow
router.post('/admissions/:id/discharge/initiate', initiateDischarge);
router.patch('/admissions/:id/discharge/clearance/:dept', approveClearance);
router.post('/admissions/:id/discharge', finalizeDischarge);
router.route('/admissions/:id/discharge-summary')
  .post(createDischargeSummary)
  .get(getDischargeSummary);

// Nursing Operations
router.route('/admissions/:id/vitals-chart')
  .post(recordNursingChart)
  .get(getNursingCharts);

router.get('/admissions/:id/mar', getMarEntries);
router.post('/mar/:id/administer', administerMarMedication);
router.post('/mar/:id/withhold', withholdMarMedication);

router.route('/nursing/handover')
  .post(createNursingHandover)
  .get(getNursingHandovers);

module.exports = router;
