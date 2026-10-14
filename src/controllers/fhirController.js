const Patient = require('../models/patient/Patient');
const { Visit } = require('../models/clinical/EmrModels');
const { LabResult } = require('../models/clinical/DiagnosticModels');
const logger = require('../utils/logger');

// Convert MediPulse Patient to FHIR R4 Resource
function toFhirPatient(p) {
  return {
    resourceType: 'Patient',
    id: p._id.toString(),
    identifier: [
      {
        system: 'https://medipulse.hospital/uhid',
        value: p.uhid
      }
    ],
    active: p.status === 'active',
    name: [
      {
        use: 'official',
        family: p.lastName || '',
        given: [p.firstName]
      }
    ],
    telecom: [
      { system: 'phone', value: p.phone, use: 'mobile' },
      ...(p.email ? [{ system: 'email', value: p.email }] : [])
    ],
    gender: p.gender === 'male' ? 'male' : p.gender === 'female' ? 'female' : 'other',
    birthDate: p.dateOfBirth ? p.dateOfBirth.toISOString().substring(0, 10) : undefined,
    address: [
      {
        use: 'home',
        city: p.address?.city,
        state: p.address?.state,
        postalCode: p.address?.postalCode,
        country: p.address?.country
      }
    ]
  };
}

// @desc    FHIR R4 Patient search / bundle
// @route   GET /api/v1/fhir/Patient
// @access  Private
const getFhirPatients = async (req, res, next) => {
  try {
    const filter = req.branchFilter({ status: { $ne: 'merged' } });
    if (req.query.identifier) {
      filter.uhid = req.query.identifier;
    }
    const patients = await Patient.find(filter).limit(50);

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: patients.length,
      entry: patients.map((p) => ({
        fullUrl: `https://api.medipulse.hospital/api/v1/fhir/Patient/${p._id}`,
        resource: toFhirPatient(p)
      }))
    };

    res.setHeader('Content-Type', 'application/fhir+json; charset=utf-8');
    res.status(200).json(bundle);
  } catch (err) {
    next(err);
  }
};

// @desc    FHIR R4 Single Patient
// @route   GET /api/v1/fhir/Patient/:id
// @access  Private
const getFhirPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });

    res.setHeader('Content-Type', 'application/fhir+json; charset=utf-8');
    res.status(200).json(toFhirPatient(patient));
  } catch (err) {
    next(err);
  }
};

// @desc    FHIR R4 Encounter bundle
// @route   GET /api/v1/fhir/Encounter
// @access  Private
const getFhirEncounters = async (req, res, next) => {
  try {
    const filter = req.branchFilter({});
    if (req.query.patient) filter.patientId = req.query.patient;

    const visits = await Visit.find(filter).populate('patientId', 'uhid firstName lastName').limit(50);

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: visits.length,
      entry: visits.map((v) => ({
        resourceType: 'Encounter',
        id: v._id.toString(),
        status: v.status === 'open' ? 'in-progress' : 'finished',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'ambulatory'
        },
        subject: {
          reference: `Patient/${v.patientId?._id}`,
          display: `${v.patientId?.firstName} ${v.patientId?.lastName}`
        },
        period: {
          start: v.date.toISOString(),
          end: v.closedAt ? v.closedAt.toISOString() : undefined
        }
      }))
    };

    res.setHeader('Content-Type', 'application/fhir+json; charset=utf-8');
    res.status(200).json(bundle);
  } catch (err) {
    next(err);
  }
};

// @desc    FHIR R4 Observation bundle (Vitals and Lab Results)
// @route   GET /api/v1/fhir/Observation
// @access  Private
const getFhirObservations = async (req, res, next) => {
  try {
    const filter = req.branchFilter({ status: 'released' });
    if (req.query.patient) filter.patientId = req.query.patient;

    const results = await LabResult.find(filter).limit(50);

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: results.length,
      entry: results.map((r) => ({
        resourceType: 'Observation',
        id: r._id.toString(),
        status: 'final',
        category: [
          {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }]
          }
        ],
        code: {
          coding: [{ code: r.testCode || 'LAB-TEST', display: r.testName }]
        },
        subject: { reference: `Patient/${r.patientId}` },
        effectiveDateTime: r.createdAt.toISOString()
      }))
    };

    res.setHeader('Content-Type', 'application/fhir+json; charset=utf-8');
    res.status(200).json(bundle);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFhirPatients,
  getFhirPatientById,
  getFhirEncounters,
  getFhirObservations
};
