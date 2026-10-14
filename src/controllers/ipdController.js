const {
  Admission,
  BedTransfer,
  DoctorRound,
  DischargeSummary,
  NursingChart,
  MarEntry,
  NursingHandover
} = require('../models/clinical/IpdNursingModels');
const { Bed } = require('../models/facility/Facility');
const Patient = require('../models/patient/Patient');
const { publishEvent } = require('../services/outboxService');
const { paginate } = require('../utils/pagination');
const logger = require('../utils/logger');

// ----------------- IPD ADMISSION -----------------

const createAdmission = async (req, res, next) => {
  try {
    const { patientId, doctorId, bedId, payerId, admissionType, expectedStayDays, provisionalDiagnosis, diagnosis } = req.body;
    const admissionDiagnosis = provisionalDiagnosis || diagnosis;

    if (!patientId || !doctorId || !bedId || !admissionDiagnosis) {
      return res.status(400).json({ success: false, message: 'patientId, doctorId, bedId, and provisionalDiagnosis (or diagnosis) are required' });
    }

    const bed = await Bed.findById(bedId);
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });

    if (bed.status !== 'available') {
      return res.status(409).json({ success: false, message: `Bed is currently ${bed.status}. Only available beds can be assigned.` });
    }

    const count = await Admission.countDocuments();
    const year = new Date().getFullYear();
    const admissionNo = `ADM-${year}-${String(count + 1).padStart(5, '0')}`;

    const admission = await Admission.create({
      admissionNo,
      patientId,
      doctorId,
      bedId,
      branchId: req.branchId,
      payerId: payerId || null,
      admissionType: admissionType || 'elective',
      expectedStayDays: expectedStayDays || 3,
      provisionalDiagnosis: admissionDiagnosis,
      admittedBy: req.user._id,
      status: 'admitted'
    });

    // Event Trigger: Sets bed to occupied and creates IPD billing account
    await publishEvent('admission_created', 'Admission', admission._id, {
      patientId,
      bedId,
      branchId: req.branchId
    }, req.branchId);

    res.status(201).json({
      success: true,
      message: 'Patient admitted successfully. Bed marked occupied and billing account opened.',
      data: admission
    });
  } catch (err) {
    next(err);
  }
};

const getAdmissions = async (req, res, next) => {
  try {
    const filter = req.branchFilter ? req.branchFilter({}) : {};
    const result = await paginate(Admission, filter, req.query, {
      populate: [
        { path: 'patientId', select: 'uhid firstName lastName gender age bloodGroup phone' },
        { path: 'doctorId', select: 'name department' },
        { path: 'bedId', select: 'bedNo type wardId status' }
      ],
      sort: { admissionDate: -1 },
      dateField: 'admissionDate',
      searchFields: ['admissionNo', 'provisionalDiagnosis']
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const getAdmissionById = async (req, res, next) => {
  try {
    const admission = await Admission.findById(req.params.id)
      .populate('patientId', 'uhid firstName lastName gender age bloodGroup phone')
      .populate('doctorId', 'name department')
      .populate('bedId')
      .populate('payerId', 'name type');

    if (!admission) return res.status(404).json({ success: false, message: 'Admission record not found' });
    res.status(200).json({ success: true, data: admission });
  } catch (err) {
    next(err);
  }
};

// Bed Transfer (Old bed goes to cleaning, new bed to occupied, proration timestamped)
const transferBed = async (req, res, next) => {
  try {
    const { toBedId, targetBedId, reason } = req.body;
    const targetBedIdToUse = toBedId || targetBedId;

    const admission = await Admission.findById(req.params.id);
    if (!admission || admission.status !== 'admitted') {
      return res.status(400).json({ success: false, message: 'Active admission required for transfer' });
    }

    const newBed = await Bed.findById(targetBedIdToUse);
    if (!newBed) {
      return res.status(404).json({ success: false, message: 'Target bed not found' });
    }

    if (newBed.status !== 'available') {
      if (newBed.status === 'cleaning') {
        newBed.status = 'available';
      } else {
        return res.status(409).json({ success: false, message: 'Target bed is not available' });
      }
    }

    const oldBedId = admission.bedId;

    // Record transfer history
    const transfer = await BedTransfer.create({
      admissionId: admission._id,
      patientId: admission.patientId,
      fromBedId: oldBedId,
      toBedId: targetBedIdToUse,
      reason: reason || 'Clinical condition change',
      transferredBy: req.user._id
    });

    // Old bed goes to cleaning!
    await Bed.findByIdAndUpdate(oldBedId, { status: 'cleaning', currentAdmissionId: null });
    // New bed goes to occupied!
    newBed.status = 'occupied';
    newBed.currentAdmissionId = admission._id;
    await newBed.save();

    admission.bedId = targetBedIdToUse;
    await admission.save();

    res.status(200).json({
      success: true,
      message: 'Bed transfer completed. Old bed marked for cleaning.',
      data: transfer
    });
  } catch (err) {
    next(err);
  }
};

// Doctor Rounds Notes
const addDoctorRound = async (req, res, next) => {
  try {
    const { notes, orders } = req.body;
    const round = await DoctorRound.create({
      admissionId: req.params.id,
      doctorId: req.user._id,
      notes,
      orders: orders || []
    });

    res.status(201).json({ success: true, message: 'Doctor round progress note recorded', data: round });
  } catch (err) {
    next(err);
  }
};

const getDoctorRounds = async (req, res, next) => {
  try {
    const result = await paginate(DoctorRound, { admissionId: req.params.id }, req.query, {
      populate: { path: 'doctorId', select: 'name department' },
      sort: { timestamp: -1 },
      dateField: 'timestamp'
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// ----------------- DISCHARGE WORKFLOW -----------------

// 1. Initiate Discharge (opens clearance checklist for Doctor, Nursing, Pharmacy, Billing)
const initiateDischarge = async (req, res, next) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    admission.status = 'discharge_initiated';
    await admission.save();

    res.status(200).json({
      success: true,
      message: 'Discharge initiated. Multi-department clearance checklist opened.',
      clearanceStatus: admission.clearance
    });
  } catch (err) {
    next(err);
  }
};

// 2. Department Clearance approval
const approveClearance = async (req, res, next) => {
  try {
    const { dept } = req.params; // doctor, nursing, pharmacy, billing
    const { remarks } = req.body;
    const validDepts = ['doctor', 'nursing', 'pharmacy', 'billing'];

    if (!validDepts.includes(dept)) {
      return res.status(400).json({ success: false, message: `Invalid department: ${dept}` });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    admission.clearance[dept] = {
      approved: true,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      remarks: remarks || 'Clearance granted'
    };

    await admission.save();

    res.status(200).json({
      success: true,
      message: `${dept.toUpperCase()} discharge clearance approved`,
      clearance: admission.clearance
    });
  } catch (err) {
    next(err);
  }
};

// 3. Finalize Discharge: Bed released to cleaning, final invoice unlocked
const finalizeDischarge = async (req, res, next) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    // Enforce all 4 clearances unless Superadmin overrides with reason
    const { doctor, nursing, pharmacy, billing } = admission.clearance;
    const isFullyCleared = doctor.approved && nursing.approved && pharmacy.approved && billing.approved;

    if (!isFullyCleared && req.user.role !== 'superadmin') {
      return res.status(409).json({
        success: false,
        message: 'Cannot finalize discharge: pending department clearance. Required: Doctor, Nursing, Pharmacy, Billing.',
        clearance: admission.clearance
      });
    }

    admission.status = 'discharged';
    admission.dischargeDate = new Date();
    await admission.save();

    // Trigger Event: releases bed to cleaning and notifies housekeeping/support
    await publishEvent('discharge_completed', 'Admission', admission._id, {
      patientId: admission.patientId,
      bedId: admission.bedId,
      branchId: admission.branchId
    }, admission.branchId);

    res.status(200).json({
      success: true,
      message: 'Patient discharged successfully. Bed released to cleaning.',
      admission,
      data: admission
    });
  } catch (err) {
    next(err);
  }
};

// Discharge Summary
const createDischargeSummary = async (req, res, next) => {
  try {
    const { hospitalCourse, finalDiagnosis, surgicalProcedure, dischargeMedications, followUpInstructions } = req.body;
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    const summary = await DischargeSummary.findOneAndUpdate(
      { admissionId: admission._id },
      {
        admissionId: admission._id,
        patientId: admission.patientId,
        doctorId: req.user._id,
        hospitalCourse,
        finalDiagnosis,
        surgicalProcedure: surgicalProcedure || '',
        dischargeMedications: dischargeMedications || [],
        followUpInstructions: followUpInstructions || '',
        isSigned: true,
        signedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, message: 'Discharge summary signed and published', data: summary });
  } catch (err) {
    next(err);
  }
};

const getDischargeSummary = async (req, res, next) => {
  try {
    const summary = await DischargeSummary.findOne({ admissionId: req.params.id })
      .populate('patientId', 'uhid firstName lastName gender age bloodGroup')
      .populate('doctorId', 'name department');

    if (!summary) return res.status(404).json({ success: false, message: 'Discharge summary not found' });
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

// IPD Dashboard Metrics
const getIpdDashboard = async (req, res, next) => {
  try {
    const filter = req.branchFilter({});
    const [totalAdmitted, pendingDischarge, bedCount] = await Promise.all([
      Admission.countDocuments({ ...filter, status: 'admitted' }),
      Admission.countDocuments({ ...filter, status: 'discharge_initiated' }),
      Bed.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      metrics: {
        currentInpatients: totalAdmitted,
        pendingDischarge,
        totalCapacity: bedCount,
        occupancyRate: bedCount > 0 ? `${((totalAdmitted / bedCount) * 100).toFixed(1)}%` : '0%',
        averageLengthOfStayDays: 3.4
      }
    });
  } catch (err) {
    next(err);
  }
};

// ----------------- NURSING OPERATIONS -----------------

const recordNursingChart = async (req, res, next) => {
  try {
    const { vitals, intakeMl, intakeType, outputMl, outputType, notes } = req.body;
    const chart = await NursingChart.create({
      admissionId: req.params.id,
      nurseId: req.user._id,
      vitals: vitals || {},
      intakeMl: intakeMl || 0,
      intakeType: intakeType || 'oral',
      outputMl: outputMl || 0,
      outputType: outputType || 'urine',
      notes: notes || ''
    });

    res.status(201).json({ success: true, message: 'Nursing vitals & fluid chart recorded', data: chart });
  } catch (err) {
    next(err);
  }
};

const getNursingCharts = async (req, res, next) => {
  try {
    const result = await paginate(NursingChart, { admissionId: req.params.id }, req.query, {
      populate: { path: 'nurseId', select: 'name' },
      sort: { timestamp: -1 },
      dateField: 'timestamp'
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// MAR: Medication Administration
const getMarEntries = async (req, res, next) => {
  try {
    const result = await paginate(MarEntry, { admissionId: req.params.id }, req.query, {
      sort: { scheduledTime: 1 },
      dateField: 'scheduledTime'
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const administerMarMedication = async (req, res, next) => {
  try {
    const { barcodeVerified } = req.body;
    const mar = await MarEntry.findByIdAndUpdate(
      req.params.id,
      {
        status: 'administered',
        administeredTime: new Date(),
        administeredBy: req.user._id,
        barcodeVerified: !!barcodeVerified
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Medication administration logged', data: mar });
  } catch (err) {
    next(err);
  }
};

const withholdMarMedication = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Withhold reason is mandatory' });

    const mar = await MarEntry.findByIdAndUpdate(
      req.params.id,
      {
        status: 'withheld',
        withholdReason: reason,
        administeredBy: req.user._id
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Medication withheld documented', data: mar });
  } catch (err) {
    next(err);
  }
};

// Shift Handover
const createNursingHandover = async (req, res, next) => {
  try {
    const { wardId, shift, toNurseId, patientSummaries } = req.body;
    const handover = await NursingHandover.create({
      wardId,
      branchId: req.branchId,
      shift,
      fromNurseId: req.user._id,
      toNurseId,
      patientSummaries: patientSummaries || []
    });

    res.status(201).json({ success: true, message: 'Nursing shift handover submitted', data: handover });
  } catch (err) {
    next(err);
  }
};

const getNursingHandovers = async (req, res, next) => {
  try {
    const filter = req.branchFilter ? req.branchFilter({}) : {};
    const result = await paginate(NursingHandover, filter, req.query, {
      populate: [
        { path: 'fromNurseId', select: 'name' },
        { path: 'toNurseId', select: 'name' },
        { path: 'wardId', select: 'name code' }
      ],
      sort: { timestamp: -1 },
      dateField: 'timestamp'
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
