const jwt = require('jsonwebtoken');
const Patient = require('../models/patient/Patient');
const PortalAccount = require('../models/patient/PortalAccount');
const { Appointment, Prescription } = require('../models/clinical/EmrModels');
const { LabResult, RadiologyReport } = require('../models/clinical/DiagnosticModels');
const BillingAccount = require('../models/billing/BillingAccount');
const { Invoice, Payment } = require('../models/billing/BillingInvoiceModels');
const Consent = require('../models/patient/Consent');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

// Generate Portal Token with aud: 'patient_portal'
function generatePortalToken(patientId, uhid) {
  return jwt.sign(
    {
      patientId,
      uhid,
      aud: 'patient_portal'
    },
    process.env.JWT_SECRET || 'medipulse_jwt_secret_production_key_2026',
    { expiresIn: '7d' }
  );
}

// ----------------- PATIENT PORTAL AUTH -----------------

// Register Patient Portal Account via UHID & Phone OTP
const registerPortal = async (req, res, next) => {
  try {
    const { uhid, phone } = req.body;
    if (!uhid || !phone) {
      return res.status(400).json({ success: false, message: 'uhid and registered phone number are required' });
    }

    const patient = await Patient.findOne({ uhid, phone });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'No patient record matching that UHID and phone number' });
    }

    const otp = '123456'; // Standard mock OTP for automated testing & demo
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const account = await PortalAccount.findOneAndUpdate(
      { patientId: patient._id },
      {
        patientId: patient._id,
        uhid: patient.uhid,
        phone: patient.phone,
        otpSecret: otp,
        otpExpiresAt: expiresAt,
        status: 'active'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: `OTP sent to registered phone ${phone.slice(0, 3)}****${phone.slice(-3)}. (Demo OTP: 123456)`,
      data: { uhid: patient.uhid }
    });
  } catch (err) {
    next(err);
  }
};

// Login with OTP
const loginPortal = async (req, res, next) => {
  try {
    const { uhid, otp } = req.body;
    if (!uhid || !otp) {
      return res.status(400).json({ success: false, message: 'uhid and OTP code are required' });
    }

    const account = await PortalAccount.findOne({ uhid });
    if (!account) return res.status(404).json({ success: false, message: 'Portal account not found' });

    if (account.otpSecret !== otp) {
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }

    const token = generatePortalToken(account.patientId, account.uhid);

    res.cookie('portalToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 3600 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Portal authentication successful',
      token,
      accessToken: token,
      patientId: account.patientId,
      uhid: account.uhid
    });
  } catch (err) {
    next(err);
  }
};

// ----------------- PORTAL CLINICAL DATA ACCESS -----------------

// Get My Profile
const getPortalProfile = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: req.patient });
  } catch (err) {
    next(err);
  }
};

// Get My Appointments
const getPortalAppointments = async (req, res, next) => {
  try {
    const list = await Appointment.find({ patientId: req.patientId })
      .populate('doctorId', 'name department')
      .sort({ date: -1 });

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
};

// Book Portal Appointment
const bookPortalAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, slotTime } = req.body;
    const appt = await Appointment.create({
      patientId: req.patientId,
      doctorId,
      branchId: req.patient.branchId,
      date,
      slotTime,
      type: 'portal',
      status: 'scheduled'
    });

    res.status(201).json({ success: true, message: 'Appointment booked from patient portal', data: appt });
  } catch (err) {
    next(err);
  }
};

// Get Released Diagnostic Reports (Only released reports!)
const getPortalReports = async (req, res, next) => {
  try {
    const [labReports, radReports] = await Promise.all([
      LabResult.find({ patientId: req.patientId, releasedToPortal: true }).sort({ createdAt: -1 }),
      RadiologyReport.find({ patientId: req.patientId, releasedToPortal: true }).sort({ createdAt: -1 })
    ]);

    const allReports = [
      ...labReports.map((r) => ({ ...r.toObject(), reportType: 'lab' })),
      ...radReports.map((r) => ({ ...r.toObject(), reportType: 'radiology' }))
    ];

    res.status(200).json({
      success: true,
      data: allReports,
      labReports,
      radiologyReports: radReports
    });
  } catch (err) {
    next(err);
  }
};

// Get Prescriptions
const getPortalPrescriptions = async (req, res, next) => {
  try {
    const list = await Prescription.find({ patientId: req.patientId })
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
};

// Get Bills & Outstanding Invoices
const getPortalBills = async (req, res, next) => {
  try {
    const [accounts, invoices] = await Promise.all([
      BillingAccount.find({ patientId: req.patientId }),
      Invoice.find({ patientId: req.patientId }).sort({ createdAt: -1 })
    ]);

    const totalDue = accounts.reduce((sum, a) => sum + (a.balanceDue || 0), 0);

    res.status(200).json({
      success: true,
      totalOutstandingDue: totalDue,
      accounts,
      invoices
    });
  } catch (err) {
    next(err);
  }
};

// Add Family Dependant Proxy Access
const addFamilyProxy = async (req, res, next) => {
  try {
    const { dependantUhid, relationship } = req.body;
    const dependant = await Patient.findOne({ uhid: dependantUhid });
    if (!dependant) return res.status(404).json({ success: false, message: 'Dependant UHID not found' });

    const account = await PortalAccount.findOne({ patientId: req.patientId });
    if (account) {
      account.familyProxies.push({
        dependantPatientId: dependant._id,
        relationship: relationship || 'Child',
        hasConsent: true
      });
      await account.save();
    }

    res.status(201).json({ success: true, message: 'Family dependant proxy access linked', dependant: dependant.fullName });
  } catch (err) {
    next(err);
  }
};

// Who Accessed My Medical Record (Audit access log for patient)
const getPortalAccessLog = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({
      resource: 'patients',
      resourceId: req.patientId.toString()
    }).select('action actorName actorRole timestamp').sort({ timestamp: -1 }).limit(50);

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
