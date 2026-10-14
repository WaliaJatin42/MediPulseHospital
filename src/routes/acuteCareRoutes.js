const express = require('express');
const {
  createEmergencyCase,
  getEmergencyBoard,
  broadcastCodeAlert,
  createOtTheatre,
  getOtTheatres,
  createOtBooking,
  updateSafetyChecklist,
  recordIcuFlowsheet,
  getIcuFlowsheet,
  getPendingPrescriptions,
  dispensePrescription,
  dispenseControlledDrug
} = require('../controllers/acuteCareController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

router.use(['/emergency', '/ot', '/icu', '/pharmacy'], protect, branchContext);

// Emergency
router.route('/emergency/cases')
  .post(createEmergencyCase);
router.get('/emergency/board', getEmergencyBoard);
router.post('/emergency/code-alerts', broadcastCodeAlert);

// Operation Theatre (OT)
router.route('/ot/theatres')
  .post(authorize('superadmin', 'admin'), createOtTheatre)
  .get(getOtTheatres);
router.post('/ot/bookings', createOtBooking);
router.patch('/ot/cases/:id/safety-checklist', updateSafetyChecklist);

// ICU
router.route('/icu/admissions/:id/flowsheet')
  .post(recordIcuFlowsheet)
  .get(getIcuFlowsheet);

// Pharmacy Clinical Dispensing
router.get('/pharmacy/prescriptions/pending', getPendingPrescriptions);
router.post('/pharmacy/prescriptions/:id/dispense', dispensePrescription);
router.post('/pharmacy/controlled/dispense', dispenseControlledDrug);

module.exports = router;
