const express = require('express');
const {
  getFhirPatients,
  getFhirPatientById,
  getFhirEncounters,
  getFhirObservations
} = require('../controllers/fhirController');
const { protect } = require('../middleware/authMiddleware');
const { branchContext } = require('../middleware/branchMiddleware');

const router = express.Router();

router.use('/fhir', protect, branchContext);

// FHIR R4 Interoperability Facade
router.get('/fhir/Patient', getFhirPatients);
router.get('/fhir/Patient/:id', getFhirPatientById);
router.get('/fhir/Encounter', getFhirEncounters);
router.get('/fhir/Observation', getFhirObservations);

module.exports = router;
