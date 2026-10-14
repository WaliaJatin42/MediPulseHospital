const express = require('express');
const {
  createDoctorSchedule,
  getDoctorSlots,
  addScheduleException,
  createAppointment,
  getAppointments,
  checkInAppointment,
  getDoctorQueueToday,
  callNextQueueToken,
  updateQueueTokenStatus,
  getPublicQueueDisplay,
  createVisit,
  getVisitById,
  recordVitals,
  addDiagnoses,
  createClinicalNote,
  signClinicalNote,
  addNoteAddendum,
  createPrescription,
  getPatientEmr
} = require('../controllers/emrController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

// Public Queue Display for Waiting Room TV screen
router.get('/queues/display', getPublicQueueDisplay);

const emrProtectedPaths = [
  '/doctor-schedules', '/appointments', '/queues', '/visits', '/notes'
];
router.use(emrProtectedPaths, protect, branchContext);
router.use('/doctors/:id/slots', protect, branchContext);
router.use('/patients/:id/emr', protect, branchContext);

// Doctor Schedules & Slots
router.post('/doctor-schedules', authorize('superadmin', 'admin'), createDoctorSchedule);
router.get('/doctors/:id/slots', getDoctorSlots);
router.post('/doctor-schedules/:id/exceptions', authorize('superadmin', 'admin', 'doctor'), addScheduleException);

// Appointments
router.route('/appointments')
  .post(createAppointment)
  .get(getAppointments);
router.post('/appointments/:id/check-in', checkInAppointment);

// Queues
router.get('/queues/:doctorId/today', getDoctorQueueToday);
router.post('/queues/:doctorId/call-next', callNextQueueToken);
router.patch('/queues/tokens/:id', updateQueueTokenStatus);

// OPD Visits & EMR
router.route('/visits')
  .post(createVisit);
router.route('/visits/:id')
  .get(getVisitById);
router.post('/visits/:id/vitals', recordVitals);
router.post('/visits/:id/diagnoses', addDiagnoses);
router.post('/visits/:id/notes', createClinicalNote);
router.patch('/notes/:id/sign', signClinicalNote);
router.post('/notes/:id/addendum', addNoteAddendum);
router.post('/visits/:id/prescriptions', createPrescription);

// Comprehensive EMR Summary
router.get('/patients/:id/emr', getPatientEmr);

module.exports = router;
