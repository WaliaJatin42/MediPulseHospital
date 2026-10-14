const crypto = require('crypto');
const {
  DoctorSchedule,
  ScheduleException,
  Appointment,
  QueueToken,
  Visit,
  ClinicalNote,
  Prescription
} = require('../models/clinical/EmrModels');
const Patient = require('../models/patient/Patient');
const Allergy = require('../models/patient/Allergy');
const { DoctorProfile } = require('../models/clinical/ClinicalMasters');
const BillingAccount = require('../models/billing/BillingAccount');
const BillingCharge = require('../models/billing/BillingCharge');
const logger = require('../utils/logger');
const { paginate } = require('../utils/pagination');

// ----------------- DOCTOR SCHEDULES & SLOTS -----------------

const createDoctorSchedule = async (req, res, next) => {
  try {
    const { doctorId, dayOfWeek, startTime, endTime, slotDurationMinutes, maxPatients } = req.body;
    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    let dow = dayOfWeek;
    if (typeof dayOfWeek === 'string') {
      dow = dayMap[dayOfWeek.toLowerCase()] !== undefined ? dayMap[dayOfWeek.toLowerCase()] : Number(dayOfWeek);
    }
    const schedule = await DoctorSchedule.create({
      doctorId,
      branchId: req.branchId,
      dayOfWeek: dow,
      startTime,
      endTime,
      slotDurationMinutes: slotDurationMinutes || 15,
      maxPatients: maxPatients || 16
    });

    res.status(201).json({ success: true, message: 'Doctor schedule slot created', data: schedule });
  } catch (err) {
    next(err);
  }
};

const getDoctorSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dateStr = req.query.date || new Date().toISOString().substring(0, 10);
    const dayOfWeek = new Date(dateStr).getDay();

    // Check doctor exceptions for that date
    const exception = await ScheduleException.findOne({ doctorId: id, date: dateStr, type: 'leave' });
    if (exception) {
      return res.status(200).json({
        success: true,
        date: dateStr,
        available: false,
        reason: exception.reason || 'Doctor on leave',
        slots: []
      });
    }

    const schedule = await DoctorSchedule.findOne({ doctorId: id, dayOfWeek });
    if (!schedule) {
      return res.status(200).json({ success: true, date: dateStr, available: false, slots: [] });
    }

    // Generate slots
    const slots = [];
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    // Check booked appointments
    const booked = await Appointment.find({ doctorId: id, date: dateStr, status: { $ne: 'cancelled' } }).select('slotTime');
    const bookedTimes = new Set(booked.map((b) => b.slotTime));

    for (let m = startMins; m < endMins; m += schedule.slotDurationMinutes) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;
      slots.push({
        time: timeStr,
        isBooked: bookedTimes.has(timeStr)
      });
    }

    res.status(200).json({
      success: true,
      doctorId: id,
      date: dateStr,
      totalSlots: slots.length,
      availableSlots: slots.filter((s) => !s.isBooked).length,
      slots
    });
  } catch (err) {
    next(err);
  }
};

const addScheduleException = async (req, res, next) => {
  try {
    const { date, type, reason } = req.body;
    const doc = await ScheduleException.create({
      doctorId: req.params.id,
      date,
      type: type || 'leave',
      reason: reason || ''
    });
    res.status(201).json({ success: true, message: 'Schedule exception documented', data: doc });
  } catch (err) {
    next(err);
  }
};

// ----------------- APPOINTMENTS & QUEUE -----------------

const createAppointment = async (req, res, next) => {
  try {
    const { patientId, doctorId, date, appointmentDate, slotTime, type = 'routine' } = req.body;
    const apptDate = date || appointmentDate;
    if (!patientId || !doctorId || !apptDate || !slotTime) {
      return res.status(400).json({ success: false, message: 'patientId, doctorId, date (or appointmentDate), and slotTime are required' });
    }

    // Check double-booking
    const existing = await Appointment.findOne({ doctorId, date: apptDate, slotTime, status: { $ne: 'cancelled' } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Slot is already booked for this doctor' });
    }

    const appt = await Appointment.create({
      patientId,
      doctorId,
      branchId: req.branchId,
      date: apptDate,
      slotTime,
      type,
      status: 'scheduled'
    });

    res.status(201).json({ success: true, message: 'Appointment scheduled', data: appt });
  } catch (err) {
    next(err);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const filter = req.branchFilter ? req.branchFilter({}) : {};
    const result = await paginate(Appointment, filter, req.query, {
      populate: [
        { path: 'patientId', select: 'uhid firstName lastName phone bloodGroup' },
        { path: 'doctorId', select: 'name department' }
      ],
      sort: { date: 1, slotTime: 1 },
      dateField: 'date',
      customFilters: (f, q) => {
        if (q.date) f.date = q.date;
      }
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// Check-in appointment: generates queue token and posts consultation fee charge
const checkInAppointment = async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    if (appt.status === 'checked_in') {
      return res.status(409).json({ success: false, message: 'Appointment already checked in' });
    }

    // Generate daily queue token number for this doctor
    const count = await QueueToken.countDocuments({ doctorId: appt.doctorId, date: appt.date });
    const tokenNo = count + 1;

    const token = await QueueToken.create({
      tokenNo,
      date: appt.date,
      doctorId: appt.doctorId,
      branchId: appt.branchId,
      appointmentId: appt._id,
      patientId: appt.patientId,
      status: 'waiting'
    });

    appt.status = 'checked_in';
    appt.queueTokenNo = tokenNo;

    // Post consultation charge if not already posted
    if (!appt.consultationChargePosted) {
      const doctorProfile = await DoctorProfile.findOne({ userId: appt.doctorId });
      const fee = doctorProfile?.consultationFee || 500;

      // Find or open billing account for patient
      let billingAccount = await BillingAccount.findOne({ patientId: appt.patientId, status: 'open', accountType: 'opd' });
      if (!billingAccount) {
        billingAccount = await BillingAccount.create({
          patientId: appt.patientId,
          branchId: appt.branchId,
          accountType: 'opd',
          status: 'open'
        });
      }

      await BillingCharge.create({
        billingAccountId: billingAccount._id,
        patientId: appt.patientId,
        branchId: appt.branchId,
        serviceName: 'OPD Doctor Consultation Fee',
        department: 'opd',
        rate: fee,
        quantity: 1,
        totalAmount: fee,
        sourceType: 'appointment',
        sourceId: appt._id.toString(),
        status: 'posted'
      });

      billingAccount.totalCharges = (billingAccount.totalCharges || 0) + fee;
      billingAccount.netAmount = billingAccount.totalCharges - (billingAccount.totalDiscounts || 0);
      billingAccount.balanceDue = billingAccount.netAmount - (billingAccount.totalPaid || 0);
      await billingAccount.save();

      appt.consultationChargePosted = true;
    }

    await appt.save();

    res.status(200).json({
      success: true,
      message: `Checked in. Queue Token #${tokenNo} issued.`,
      queueToken: token
    });
  } catch (err) {
    next(err);
  }
};

// Queue Management
const getDoctorQueueToday = async (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const result = await paginate(QueueToken, { doctorId: req.params.doctorId, date: today }, req.query, {
      populate: { path: 'patientId', select: 'uhid firstName lastName gender age phone' },
      sort: { tokenNo: 1 }
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

const callNextQueueToken = async (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const token = await QueueToken.findOne({ doctorId: req.params.doctorId, date: today, status: 'waiting' }).sort({ tokenNo: 1 });
    if (!token) {
      return res.status(200).json({ success: true, message: 'No more waiting patients in queue' });
    }

    token.status = 'in_progress';
    token.calledAt = new Date();
    await token.save();

    res.status(200).json({ success: true, message: `Calling Token #${token.tokenNo}`, token });
  } catch (err) {
    next(err);
  }
};

const updateQueueTokenStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const token = await QueueToken.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.status(200).json({ success: true, data: token });
  } catch (err) {
    next(err);
  }
};

// Public Safe Queue Display (Waiting Area screen - Token numbers only, no patient identifiers)
const getPublicQueueDisplay = async (req, res, next) => {
  try {
    const today = new Date().toISOString().substring(0, 10);
    const filter = { date: today };
    if (req.query.branchId) filter.branchId = req.query.branchId;

    const activeTokens = await QueueToken.find(filter)
      .populate('doctorId', 'name')
      .select('tokenNo status doctorId calledAt')
      .sort({ calledAt: -1 });

    res.status(200).json({
      success: true,
      timestamp: new Date(),
      nowCalling: activeTokens.filter((t) => t.status === 'in_progress').map((t) => ({ tokenNo: t.tokenNo, doctor: t.doctorId?.name })),
      waitingCount: activeTokens.filter((t) => t.status === 'waiting').length,
      data: activeTokens
    });
  } catch (err) {
    next(err);
  }
};

// ----------------- OPD VISITS & CLINICAL EMR -----------------

const createVisit = async (req, res, next) => {
  try {
    const { patientId, doctorId, appointmentId, visitType } = req.body;
    const visit = await Visit.create({
      patientId,
      doctorId: doctorId || req.user._id,
      appointmentId: appointmentId || null,
      branchId: req.branchId,
      visitType: visitType || 'opd'
    });

    res.status(201).json({ success: true, message: 'OPD visit encounter opened', data: visit });
  } catch (err) {
    next(err);
  }
};

const getVisitById = async (req, res, next) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('patientId', 'uhid firstName lastName gender age bloodGroup')
      .populate('doctorId', 'name department');
    if (!visit) return res.status(404).json({ success: false, message: 'Visit encounter not found' });
    res.status(200).json({ success: true, data: visit });
  } catch (err) {
    next(err);
  }
};

const recordVitals = async (req, res, next) => {
  try {
    const {
      heightCm,
      weightKg,
      systolicBp,
      diastolicBp,
      bpSystolic,
      bpDiastolic,
      pulseRate,
      pulse,
      temperatureF,
      spO2Percent,
      spo2
    } = req.body;
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

    let bmi = null;
    if (heightCm && weightKg) {
      const heightM = heightCm / 100;
      bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
    }

    visit.vitals = {
      heightCm,
      weightKg,
      bmi,
      systolicBp: systolicBp || bpSystolic,
      diastolicBp: diastolicBp || bpDiastolic,
      pulseRate: pulseRate || pulse,
      temperatureF,
      spO2Percent: spO2Percent || spo2,
      recordedAt: new Date()
    };
    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Vitals recorded with computed BMI',
      vitals: visit.vitals,
      data: visit.vitals
    });
  } catch (err) {
    next(err);
  }
};

const addDiagnoses = async (req, res, next) => {
  try {
    const { diagnoses } = req.body;
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

    if (Array.isArray(diagnoses)) {
      visit.diagnoses.push(...diagnoses);
      await visit.save();
    }
    res.status(200).json({ success: true, diagnoses: visit.diagnoses });
  } catch (err) {
    next(err);
  }
};

// Clinical SOAP Notes
const createClinicalNote = async (req, res, next) => {
  try {
    const { visitId, patientId, subjective, objective, assessment, plan, type } = req.body;
    let targetPatientId = patientId;
    const targetVisitId = visitId || req.params.id;
    if (!targetPatientId && targetVisitId) {
      const v = await Visit.findById(targetVisitId);
      if (v) targetPatientId = v.patientId;
    }

    const note = await ClinicalNote.create({
      visitId: targetVisitId,
      patientId: targetPatientId,
      authorId: req.user._id,
      branchId: req.branchId,
      type: type || 'soap',
      subjective,
      objective,
      assessment,
      plan
    });

    res.status(201).json({ success: true, message: 'SOAP note drafted', data: note });
  } catch (err) {
    next(err);
  }
};

// Sign Note: Locks the note permanently with SHA-256 digital signature hash
const signClinicalNote = async (req, res, next) => {
  try {
    const note = await ClinicalNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Clinical note not found' });

    if (note.authorId.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Doctors can sign only their own notes' });
    }

    if (note.isSigned) {
      return res.status(409).json({ success: false, message: 'Note is already signed and locked' });
    }

    const contentString = `${note._id}|${note.patientId}|${note.subjective}|${note.objective}|${note.assessment}|${note.plan}|${Date.now()}`;
    const hash = crypto.createHash('sha256').update(contentString).digest('hex');

    note.isSigned = true;
    note.signedAt = new Date();
    note.signatureHash = hash;
    await note.save();

    res.status(200).json({
      success: true,
      message: 'Note digitally signed and locked against editing',
      signatureHash: hash,
      data: {
        _id: note._id,
        isSigned: true,
        signatureHash: hash,
        signedAt: note.signedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

// Addendum to signed note
const addNoteAddendum = async (req, res, next) => {
  try {
    const { text, content } = req.body;
    const addendumText = text || content;
    if (!addendumText) return res.status(400).json({ success: false, message: 'Addendum text or content is required' });

    const note = await ClinicalNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Clinical note not found' });

    note.addendums.push({ text: addendumText, addedBy: req.user._id, addedAt: new Date() });
    await note.save();

    res.status(200).json({
      success: true,
      message: 'Addendum added to locked clinical note',
      note,
      data: {
        ...note.toObject(),
        addenda: note.addendums
      }
    });
  } catch (err) {
    next(err);
  }
};

// Prescriptions
const createPrescription = async (req, res, next) => {
  try {
    const { visitId, patientId, items, medications } = req.body;
    const rawItems = items || medications;
    let targetPatientId = patientId;
    const targetVisitId = visitId || req.params.id;
    if (!targetPatientId && targetVisitId) {
      const v = await Visit.findById(targetVisitId);
      if (v) targetPatientId = v.patientId;
    }

    if (!targetPatientId || !rawItems || rawItems.length === 0) {
      return res.status(400).json({ success: false, message: 'patientId (or valid visitId) and items/medications are required' });
    }

    const rxItems = rawItems.map((item) => ({
      drugName: item.drugName || item.name,
      dose: item.dose || item.dosage || '1 dose',
      dosage: item.dosage || item.dose || '1 dose',
      route: item.route || 'oral',
      frequency: item.frequency || 'OD',
      durationDays: Number(item.durationDays || item.duration || 5),
      instructions: item.instructions || 'After food'
    }));

    const prescription = await Prescription.create({
      visitId: targetVisitId,
      patientId: targetPatientId,
      doctorId: req.user._id,
      branchId: req.branchId,
      items: rxItems,
      isSigned: true,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Prescription signed and queued for pharmacy dispensing', data: prescription });
  } catch (err) {
    next(err);
  }
};

// Comprehensive EMR Summary
const getPatientEmr = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const [patient, allergies, visits, notes, prescriptions] = await Promise.all([
      Patient.findById(patientId),
      Allergy.find({ patientId }),
      Visit.find({ patientId }).sort({ date: -1 }).limit(10),
      ClinicalNote.find({ patientId }).populate('authorId', 'name').sort({ createdAt: -1 }).limit(10),
      Prescription.find({ patientId }).populate('doctorId', 'name').sort({ createdAt: -1 }).limit(10)
    ]);

    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const emrSummary = {
      patient: {
        uhid: patient.uhid,
        name: patient.fullName,
        age: patient.age,
        gender: patient.gender,
        bloodGroup: patient.bloodGroup
      },
      allergies,
      visits,
      recentVisits: visits,
      clinicalNotes: notes,
      prescriptions,
      recentPrescriptions: prescriptions
    };

    res.status(200).json({
      success: true,
      ...emrSummary,
      data: emrSummary
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
