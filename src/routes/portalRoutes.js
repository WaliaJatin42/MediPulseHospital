const express = require('express');
const {
  registerPortal,
  loginPortal,
  getPortalProfile,
  getPortalAppointments,
  bookPortalAppointment,
  getPortalReports,
  getPortalPrescriptions,
  getPortalBills,
  addFamilyProxy,
  getPortalAccessLog
} = require('../controllers/portalController');
const { protectPortal } = require('../middleware/patientAuthMiddleware');

const router = express.Router();

// Public Patient Portal Auth
router.post('/patient-auth/register', registerPortal);
router.post('/patient-auth/login', loginPortal);

// Protected Patient Portal Endpoints (Requires aud: patient_portal)
router.get('/portal/me', protectPortal, getPortalProfile);
router.get('/portal/appointments', protectPortal, getPortalAppointments);
router.post('/portal/appointments', protectPortal, bookPortalAppointment);
router.get('/portal/reports', protectPortal, getPortalReports);
router.get('/portal/prescriptions', protectPortal, getPortalPrescriptions);
router.get('/portal/bills', protectPortal, getPortalBills);
router.post('/portal/family', protectPortal, addFamilyProxy);
router.get('/portal/access-log', protectPortal, getPortalAccessLog);

module.exports = router;
