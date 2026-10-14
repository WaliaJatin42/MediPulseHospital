const Patient = require('../models/patient/Patient');
const Allergy = require('../models/patient/Allergy');
const CareTeam = require('../models/patient/CareTeam');
const BreakGlassGrant = require('../models/patient/BreakGlassGrant');
const Consent = require('../models/patient/Consent');
const Branch = require('../models/branch/Branch');
const { encryptData, maskData } = require('../utils/encryption');
const { recordAuditLog } = require('../utils/auditLogger');
const logger = require('../utils/logger');

/**
 * Generate Sequential UHID for branch
 */
async function generateUhid(branchId) {
  const branch = await Branch.findById(branchId);
  const prefix = branch ? branch.uhidPrefix : 'MPH-CEN';
  const year = new Date().getFullYear();
  const count = await Patient.countDocuments();
  const seq = String(count + 1).padStart(6, '0');
  return `${prefix}-${year}-${seq}`;
}

// @desc    Register new patient with duplicate checking
// @route   POST /api/v1/patients
// @access  Private (Receptionist, Staff)
const createPatient = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      age,
      bloodGroup,
      phone,
      email,
      address,
      emergencyContact,
      nationalId,
      abhaId,
      maritalStatus,
      preferredLanguage,
      accessibilityNeeds,
      forceCreate
    } = req.body;

    let fName = firstName;
    let lName = lastName;
    if (!fName && req.body.name) {
      const parts = req.body.name.trim().split(/\s+/);
      fName = parts[0];
      lName = parts.slice(1).join(' ') || 'Patient';
    }

    if (!fName || !gender || !phone) {
      return res.status(400).json({ success: false, message: 'firstName (or name), gender, and phone are required' });
    }

    const branchId = req.branchId;

    // Duplicate Detection: Check for matching phone or exact name match
    if (!forceCreate) {
      const duplicates = await Patient.find({
        $or: [
          { phone },
          { firstName: new RegExp(`^${fName}$`, 'i'), lastName: new RegExp(`^${lName || ''}$`, 'i') }
        ],
        status: { $ne: 'merged' }
      }).select('uhid firstName lastName phone dateOfBirth gender status');

      if (duplicates.length > 0) {
        return res.status(409).json({
          success: false,
          code: 'POSSIBLE_DUPLICATES_FOUND',
          message: 'Possible duplicate patient records detected. Confirm or link to existing UHID.',
          duplicates
        });
      }
    }

    const uhid = await generateUhid(branchId);

    // Encrypt sensitive nationalId
    let encryptedNationalId = '';
    let maskedNationalId = '';
    if (nationalId) {
      encryptedNationalId = encryptData(nationalId);
      maskedNationalId = maskData(nationalId, 4);
    }

    const patient = await Patient.create({
      uhid,
      firstName: fName,
      lastName: lName || '',
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      age: age || (dateOfBirth ? Math.floor((new Date() - new Date(dateOfBirth)) / (365.25 * 24 * 3600 * 1000)) : null),
      bloodGroup: bloodGroup || 'unknown',
      phone,
      email: email || '',
      address: address || {},
      emergencyContact: emergencyContact || {},
      nationalId: encryptedNationalId,
      nationalIdMasked: maskedNationalId,
      abhaId: abhaId || '',
      maritalStatus: maritalStatus || 'single',
      preferredLanguage: preferredLanguage || 'English',
      accessibilityNeeds: accessibilityNeeds || {},
      branchId,
      createdBy: req.user._id,
      version: 1
    });

    await recordAuditLog({
      actor: req.user,
      action: 'REGISTER_PATIENT',
      resource: 'patients',
      resourceId: patient._id.toString(),
      after: { uhid, fullName: patient.fullName, phone },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: patient
    });
  } catch (error) {
    logger.error(`[Register Patient Error] ${error.message}`);
    next(error);
  }
};

const { paginate } = require('../utils/pagination');

// @desc    Search patients with projection
// @route   GET /api/v1/patients
// @access  Private
const getPatients = async (req, res, next) => {
  try {
    const filter = { status: { $ne: 'merged' } };
    const result = await paginate(Patient, filter, req.query, {
      searchFields: ['uhid', 'phone', 'firstName', 'lastName'],
      select: 'uhid firstName lastName gender dateOfBirth age bloodGroup phone status restrictions isUnknown version createdAt',
      dateField: 'createdAt'
    });

    res.status(200).json({
      ...result,
      pages: result.totalPages
    });
  } catch (error) {
    logger.error(`[Get Patients Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get patient full profile
// @route   GET /api/v1/patients/:id
// @access  Private
const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Audit patient data read
    await recordAuditLog({
      actor: req.user,
      action: 'READ_PATIENT_RECORD',
      resource: 'patients',
      resourceId: patient._id.toString(),
      req
    });

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    logger.error(`[Get Patient Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update patient demographics with version conflict check
// @route   PATCH /api/v1/patients/:id
// @access  Private
const updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Version conflict check (409 on version conflict)
    if (req.body.version !== undefined && req.body.version !== patient.version) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: Record has been modified by another user. Refresh and retry.',
        currentVersion: patient.version
      });
    }

    const before = patient.toObject();

    // Prevent modifying uhid or branchId directly
    delete req.body.uhid;
    delete req.body.branchId;

    Object.assign(patient, req.body);
    patient.version = (patient.version || 1) + 1;
    await patient.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_PATIENT_DEMOGRAPHICS',
      resource: 'patients',
      resourceId: patient._id.toString(),
      before,
      after: patient.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Patient demographics updated successfully',
      data: patient
    });
  } catch (error) {
    logger.error(`[Update Patient Error] ${error.message}`);
    next(error);
  }
};

// @desc    Register unknown/emergency trauma arrival
// @route   POST /api/v1/patients/unknown
// @access  Private (Emergency, Reception)
const createUnknownPatient = async (req, res, next) => {
  try {
    const { estimatedAge, gender = 'unknown', physicalDescription, arrivalMode } = req.body;
    const branchId = req.branchId;
    const year = new Date().getFullYear();
    const count = await Patient.countDocuments({ isUnknown: true });
    const uhid = `EMERG-TRAUMA-${year}-${String(count + 1).padStart(4, '0')}`;

    const patient = await Patient.create({
      uhid,
      firstName: 'Unknown',
      lastName: `Patient ${uhid.split('-').pop()}`,
      gender: gender || 'other',
      age: estimatedAge || 30,
      phone: '0000000000',
      isUnknown: true,
      restrictions: { isVip: false },
      branchId,
      createdBy: req.user._id,
      version: 1
    });

    res.status(201).json({
      success: true,
      message: 'Unknown emergency patient record created',
      data: patient
    });
  } catch (error) {
    logger.error(`[Create Unknown Patient Error] ${error.message}`);
    next(error);
  }
};

// @desc    Identify unknown emergency patient
// @route   PATCH /api/v1/patients/:id/identify
// @access  Private
const identifyUnknownPatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient || !patient.isUnknown) {
      return res.status(404).json({ success: false, message: 'Unknown patient record not found' });
    }

    const { firstName, lastName, phone, gender, dateOfBirth, nationalId } = req.body;
    if (!firstName || !phone) {
      return res.status(400).json({ success: false, message: 'firstName and phone are required for identification' });
    }

    patient.firstName = firstName;
    patient.lastName = lastName || '';
    patient.phone = phone;
    if (gender) patient.gender = gender;
    if (dateOfBirth) patient.dateOfBirth = new Date(dateOfBirth);
    patient.isUnknown = false;
    patient.version = (patient.version || 1) + 1;
    await patient.save();

    res.status(200).json({ success: true, message: 'Patient identity verified and updated', data: patient });
  } catch (error) {
    logger.error(`[Identify Patient Error] ${error.message}`);
    next(error);
  }
};

// @desc    Merge duplicate patient records (two-step with preview)
// @route   POST /api/v1/patients/merge
// @access  Private (Records Officer, Superadmin)
const mergePatients = async (req, res, next) => {
  try {
    const { sourcePatientId, targetPatientId, execute = false, reason } = req.body;

    if (!sourcePatientId || !targetPatientId) {
      return res.status(400).json({ success: false, message: 'sourcePatientId and targetPatientId are required' });
    }

    const source = await Patient.findById(sourcePatientId);
    const target = await Patient.findById(targetPatientId);

    if (!source || !target) {
      return res.status(404).json({ success: false, message: 'One or both patient records not found' });
    }

    if (!execute) {
      // Preview mode
      return res.status(200).json({
        success: true,
        preview: true,
        message: 'Review duplicate merge details. Pass execute: true to finalize.',
        source: { id: source._id, uhid: source.uhid, name: source.fullName, phone: source.phone },
        target: { id: target._id, uhid: target.uhid, name: target.fullName, phone: target.phone }
      });
    }

    source.status = 'merged';
    source.mergedTo = target._id;
    await source.save();

    await recordAuditLog({
      actor: req.user,
      action: 'MERGE_PATIENTS',
      resource: 'patients',
      resourceId: target._id.toString(),
      after: { sourceUhid: source.uhid, targetUhid: target.uhid, reason: reason || 'Duplicate resolution' },
      req
    });

    res.status(200).json({
      success: true,
      message: `Patient ${source.uhid} successfully merged into ${target.uhid}`,
      activePatient: target
    });
  } catch (error) {
    logger.error(`[Merge Patients Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get patient comprehensive timeline
// @route   GET /api/v1/patients/:id/timeline
// @access  Private
const getPatientTimeline = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Aggregated timeline
    const timeline = [];

    // Registration event
    timeline.push({
      type: 'registration',
      title: 'Patient Registered',
      timestamp: patient.createdAt,
      details: { uhid: patient.uhid }
    });

    res.status(200).json({
      success: true,
      uhid: patient.uhid,
      patientName: patient.fullName,
      timeline: timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
  } catch (error) {
    logger.error(`[Timeline Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get printable wristband QR / barcode data
// @route   GET /api/v1/patients/:id/wristband
// @access  Private
const getWristbandData = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const allergies = await Allergy.find({ patientId: patient._id });

    res.status(200).json({
      success: true,
      data: {
        uhid: patient.uhid,
        name: patient.fullName,
        gender: patient.gender,
        age: patient.age,
        bloodGroup: patient.bloodGroup,
        barcodeValue: patient.uhid,
        barcodePayload: patient.uhid,
        qrPayload: JSON.stringify({
          uhid: patient.uhid,
          name: patient.fullName,
          dob: patient.dateOfBirth,
          blood: patient.bloodGroup,
          allergies: allergies.map((a) => a.allergen)
        }),
        allergies: allergies.map((a) => `${a.allergen} (${a.severity})`)
      }
    });
  } catch (error) {
    logger.error(`[Wristband Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update VIP and sensitive record restrictions
// @route   PATCH /api/v1/patients/:id/restrictions
// @access  Private (SA, Medical Director, Quality)
const updateRestrictions = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    patient.restrictions = { ...patient.restrictions, ...req.body };
    await patient.save();

    res.status(200).json({ success: true, message: 'Restrictions updated', data: patient.restrictions });
  } catch (error) {
    logger.error(`[Update Restrictions Error] ${error.message}`);
    next(error);
  }
};

// ----------------- CARE TEAMS -----------------

const assignCareTeam = async (req, res, next) => {
  try {
    const { patientId, staffId, role } = req.body;
    if (!patientId || !staffId || !role) {
      return res.status(400).json({ success: false, message: 'patientId, staffId, and role are required' });
    }

    const careTeam = await CareTeam.create({
      patientId,
      staffId,
      role,
      assignedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Staff assigned to patient care team', data: careTeam });
  } catch (error) {
    logger.error(`[Care Team Assign Error] ${error.message}`);
    next(error);
  }
};

const getCareTeam = async (req, res, next) => {
  try {
    const team = await CareTeam.find({ patientId: req.params.id, status: 'active' })
      .populate('staffId', 'name designation department email phone')
      .populate('assignedBy', 'name');

    res.status(200).json({ success: true, count: team.length, data: team });
  } catch (error) {
    logger.error(`[Get Care Team Error] ${error.message}`);
    next(error);
  }
};

const removeCareTeam = async (req, res, next) => {
  try {
    const entry = await CareTeam.findByIdAndUpdate(req.params.id, { status: 'inactive', to: new Date() }, { new: true });
    res.status(200).json({ success: true, message: 'Staff removed from care team', data: entry });
  } catch (error) {
    logger.error(`[Remove Care Team Error] ${error.message}`);
    next(error);
  }
};

// ----------------- BREAK-GLASS ACCESS -----------------

const requestBreakGlass = async (req, res, next) => {
  try {
    const { patientId, reason, durationHours = 2 } = req.body;
    if (!patientId || !reason) {
      return res.status(400).json({ success: false, message: 'patientId and mandatory reason are required' });
    }

    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000);

    const grant = await BreakGlassGrant.create({
      patientId,
      userId: req.user._id,
      reason,
      expiresAt
    });

    await recordAuditLog({
      actor: req.user,
      action: 'BREAK_GLASS_ACCESS_INVOKED',
      resource: 'patients',
      resourceId: patientId,
      after: { reason, durationHours, expiresAt },
      req
    });

    res.status(201).json({
      success: true,
      message: `Emergency break-glass access granted until ${expiresAt.toISOString()}`,
      data: grant
    });
  } catch (error) {
    logger.error(`[Break Glass Error] ${error.message}`);
    next(error);
  }
};

const getBreakGlassGrants = async (req, res, next) => {
  try {
    const grants = await BreakGlassGrant.find()
      .populate('patientId', 'uhid firstName lastName')
      .populate('userId', 'name role department')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: grants.length, data: grants });
  } catch (error) {
    logger.error(`[List Break Glass Error] ${error.message}`);
    next(error);
  }
};

const reviewBreakGlass = async (req, res, next) => {
  try {
    const { reviewStatus, reviewRemarks } = req.body;
    const grant = await BreakGlassGrant.findByIdAndUpdate(
      req.params.id,
      {
        reviewStatus: reviewStatus || 'justified',
        reviewRemarks: reviewRemarks || '',
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Break-glass review recorded', data: grant });
  } catch (error) {
    logger.error(`[Review Break Glass Error] ${error.message}`);
    next(error);
  }
};

// ----------------- CONSENTS -----------------

const addConsent = async (req, res, next) => {
  try {
    const { consentType, witnessName, signatureRef, proxyUserId } = req.body;
    const consent = await Consent.create({
      patientId: req.params.id,
      consentType: consentType || 'treatment',
      witnessName: witnessName || '',
      signatureRef: signatureRef || '',
      proxyUserId: proxyUserId || null,
      recordedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Consent recorded', data: consent });
  } catch (error) {
    logger.error(`[Add Consent Error] ${error.message}`);
    next(error);
  }
};

const getConsents = async (req, res, next) => {
  try {
    const consents = await Consent.find({ patientId: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: consents.length, data: consents });
  } catch (error) {
    logger.error(`[Get Consents Error] ${error.message}`);
    next(error);
  }
};

const revokeConsent = async (req, res, next) => {
  try {
    const consent = await Consent.findByIdAndUpdate(
      req.params.id,
      { status: 'revoked', revokedAt: new Date(), revokeReason: req.body.reason || 'Patient request' },
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Consent revoked', data: consent });
  } catch (error) {
    logger.error(`[Revoke Consent Error] ${error.message}`);
    next(error);
  }
};

// ----------------- ALLERGIES -----------------

const addAllergy = async (req, res, next) => {
  try {
    const { allergen, type, severity, reaction } = req.body;
    if (!allergen) return res.status(400).json({ success: false, message: 'allergen is required' });

    const allergy = await Allergy.create({
      patientId: req.params.id,
      allergen,
      type: type || 'drug',
      severity: severity || 'moderate',
      reaction: reaction || '',
      reportedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Allergy documented', data: allergy });
  } catch (error) {
    logger.error(`[Add Allergy Error] ${error.message}`);
    next(error);
  }
};

const getAllergies = async (req, res, next) => {
  try {
    const allergies = await Allergy.find({ patientId: req.params.id }).sort({ severity: -1 });
    res.status(200).json({ success: true, count: allergies.length, data: allergies });
  } catch (error) {
    logger.error(`[Get Allergies Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
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
};
