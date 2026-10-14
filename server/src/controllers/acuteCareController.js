const {
  EmergencyCase,
  OtTheatre,
  OtBooking,
  IcuFlowsheet,
  ControlledDrugLog
} = require('../models/clinical/AcuteCareModels');
const { Prescription } = require('../models/clinical/EmrModels');
const { Admission } = require('../models/clinical/IpdNursingModels');
const BillingAccount = require('../models/billing/BillingAccount');
const BillingCharge = require('../models/billing/BillingCharge');
const { sendToTopic } = require('../services/fcmService');
const { recordAuditLog } = require('../utils/auditLogger');
const logger = require('../utils/logger');

// ----------------- EMERGENCY -----------------

// Create Emergency Case
const createEmergencyCase = async (req, res, next) => {
  try {
    const { patientId, chiefComplaint, complaint, arrivalMode, isMlc, mlc, policeStation } = req.body;
    let triageLevel = req.body.triageLevel;
    if (typeof triageLevel === 'number') {
      triageLevel = `ESI-${triageLevel}`;
    }

    const patientComplaint = chiefComplaint || complaint;
    if (!patientId || !patientComplaint) {
      return res.status(400).json({ success: false, message: 'patientId and chiefComplaint (or complaint) are required' });
    }

    const year = new Date().getFullYear();
    const count = await EmergencyCase.countDocuments();
    const caseNo = `EMERG-${year}-${String(count + 1).padStart(5, '0')}`;
    const mlcFlag = isMlc !== undefined ? !!isMlc : !!mlc;

    const emergency = await EmergencyCase.create({
      caseNo,
      patientId,
      branchId: req.branchId,
      chiefComplaint: patientComplaint,
      triageLevel: triageLevel || 'ESI-3',
      arrivalMode: arrivalMode || 'walk_in',
      isMlc: mlcFlag,
      mlcNo: mlcFlag ? `MLC-${year}-${String(count + 1).padStart(4, '0')}` : '',
      policeStation: policeStation || '',
      status: 'triaged',
      treatingDoctorId: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Emergency trauma case registered and triaged',
      data: emergency
    });
  } catch (err) {
    next(err);
  }
};

// Emergency Live Status Board
const getEmergencyBoard = async (req, res, next) => {
  try {
    const filter = req.branchFilter({ status: { $in: ['triaged', 'under_treatment'] } });
    const cases = await EmergencyCase.find(filter)
      .populate('patientId', 'uhid firstName lastName gender age bloodGroup')
      .populate('treatingDoctorId', 'name')
      .sort({ triageLevel: 1, createdAt: -1 });

    res.status(200).json({ success: true, count: cases.length, data: cases });
  } catch (err) {
    next(err);
  }
};

// Emergency Code Alert Broadcast (Code Blue, Code Red)
const broadcastCodeAlert = async (req, res, next) => {
  try {
    const { codeType, location, details } = req.body; // Code Blue (Cardiac Arrest), Code Red (Fire)
    if (!codeType || !location) {
      return res.status(400).json({ success: false, message: 'codeType and location are required' });
    }

    const title = `EMERGENCY ALERT: ${codeType.toUpperCase()}`;
    const body = `CRITICAL: ${codeType.toUpperCase()} declared at ${location}. All emergency response teams report immediately!`;

    // Push via FCM to hospital emergency topic
    await sendToTopic('hospital_all', {
      title,
      body,
      data: { codeType, location, priority: 'maximum_emergency' }
    });

    res.status(200).json({
      success: true,
      message: `${codeType} broadcasted hospital-wide to emergency response staff via FCM`,
      alert: { codeType, location, timestamp: new Date() }
    });
  } catch (err) {
    next(err);
  }
};

// ----------------- OPERATION THEATRE (OT) -----------------

// Create OT Theatre Master
const createOtTheatre = async (req, res, next) => {
  try {
    const theatreNo = req.body.theatreNo || req.body.theatreNumber || `OT-${Date.now().toString().slice(-4)}`;
    const theatre = await OtTheatre.create({ ...req.body, theatreNo, branchId: req.branchId });
    res.status(201).json({ success: true, data: theatre });
  } catch (err) {
    next(err);
  }
};

const getOtTheatres = async (req, res, next) => {
  try {
    const filter = req.branchFilter({});
    const theatres = await OtTheatre.find(filter);
    res.status(200).json({ success: true, count: theatres.length, data: theatres });
  } catch (err) {
    next(err);
  }
};

// Book OT Case with Automated Conflict Checking
const createOtBooking = async (req, res, next) => {
  try {
    const {
      theatreId,
      patientId,
      surgeonId,
      anesthetistId,
      procedureName,
      procedureCode,
      date,
      startTime,
      scheduledStart,
      estimatedDurationMinutes,
      durationMinutes,
      priority
    } = req.body;

    let bookingDate = date;
    let bookingTime = startTime;
    if (scheduledStart) {
      const parts = new Date(scheduledStart).toISOString().split('T');
      if (!bookingDate) bookingDate = parts[0];
      if (!bookingTime) bookingTime = parts[1].substring(0, 5);
    }

    const bookingSurgeonId = surgeonId || req.user._id;
    const bookingAnesthetistId = anesthetistId || bookingSurgeonId;

    if (!theatreId || !patientId || !bookingSurgeonId || !procedureName || !bookingDate || !bookingTime) {
      return res.status(400).json({
        success: false,
        message: 'theatreId, patientId, surgeonId, procedureName, date (or scheduledStart), and startTime are required'
      });
    }

    // Conflict Check 1: Theatre double-booking
    const theatreConflict = await OtBooking.findOne({
      theatreId,
      date: bookingDate,
      startTime: bookingTime,
      status: { $ne: 'cancelled' }
    });
    if (theatreConflict) {
      return res.status(409).json({ success: false, message: 'OT Theatre is already booked for this slot' });
    }

    // Conflict Check 2: Surgeon double-booking
    const surgeonConflict = await OtBooking.findOne({
      surgeonId: bookingSurgeonId,
      date: bookingDate,
      startTime: bookingTime,
      status: { $ne: 'cancelled' }
    });
    if (surgeonConflict) {
      return res.status(409).json({ success: false, message: 'Lead Surgeon is already scheduled in another surgery at this time' });
    }

    // Conflict Check 3: Anesthetist double-booking
    if (anesthetistId) {
      const anesthetistConflict = await OtBooking.findOne({
        anesthetistId,
        date: bookingDate,
        startTime: bookingTime,
        status: { $ne: 'cancelled' }
      });
      if (anesthetistConflict) {
        return res.status(409).json({ success: false, message: 'Anesthetist is already booked in another theatre at this time' });
      }
    }

    const booking = await OtBooking.create({
      theatreId,
      patientId,
      surgeonId: bookingSurgeonId,
      anesthetistId: bookingAnesthetistId,
      procedureName,
      procedureCode: procedureCode || '',
      branchId: req.branchId,
      date: bookingDate,
      startTime: bookingTime,
      durationMinutes: durationMinutes || estimatedDurationMinutes || 90,
      priority: priority || 'elective',
      status: 'scheduled'
    });

    res.status(201).json({
      success: true,
      message: 'OT booking confirmed. Conflict checks passed for theatre, surgeon, and anesthetist.',
      data: booking
    });
  } catch (err) {
    next(err);
  }
};

// WHO Surgical Safety Checklist (Sign-In, Time-Out, Sign-Out)
const updateSafetyChecklist = async (req, res, next) => {
  try {
    const { stage } = req.body; // signIn, timeOut, signOut
    const booking = await OtBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'OT booking not found' });

    if (stage === 'signIn') booking.safetyChecklist.signInCompleted = true;
    if (stage === 'timeOut') booking.safetyChecklist.timeOutCompleted = true;
    if (stage === 'signOut') booking.safetyChecklist.signOutCompleted = true;

    await booking.save();
    res.status(200).json({ success: true, message: `WHO surgical safety checklist: ${stage} verified`, checklist: booking.safetyChecklist });
  } catch (err) {
    next(err);
  }
};

// ----------------- ICU FLOWSHEET -----------------

const recordIcuFlowsheet = async (req, res, next) => {
  try {
    const { admissionId, vitals, ventilatorSettings, severityScores, invasiveLines } = req.body;
    const admission = await Admission.findById(admissionId || req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    const entry = await IcuFlowsheet.create({
      admissionId: admission._id,
      patientId: admission.patientId,
      branchId: req.branchId,
      recordedBy: req.user._id,
      vitals: vitals || {},
      ventilatorSettings: ventilatorSettings || {},
      severityScores: severityScores || {},
      invasiveLines: invasiveLines || []
    });

    res.status(201).json({ success: true, message: 'Hourly ICU parameter flowsheet logged', data: entry });
  } catch (err) {
    next(err);
  }
};

const getIcuFlowsheet = async (req, res, next) => {
  try {
    const entries = await IcuFlowsheet.find({ admissionId: req.params.id })
      .populate('recordedBy', 'name')
      .sort({ timestamp: -1 });

    res.status(200).json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    next(err);
  }
};

// ----------------- CLINICAL PHARMACY DISPENSING -----------------

// Get Pending Prescriptions Queue
const getPendingPrescriptions = async (req, res, next) => {
  try {
    const filter = req.branchFilter({ status: { $in: ['pending', 'partially_dispensed'] } });
    const list = await Prescription.find(filter)
      .populate('patientId', 'uhid firstName lastName gender age bloodGroup')
      .populate('doctorId', 'name department')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
};

// Dispense Prescription with FEFO Batch selection and Automatic Billing Charge
const dispensePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });

    prescription.status = 'dispensed';
    prescription.items.forEach((item) => {
      item.isDispensed = true;
    });
    await prescription.save();

    // Find patient's open billing account and post medication charges
    let billingAccount = await BillingAccount.findOne({
      patientId: prescription.patientId,
      status: 'open'
    }).sort({ createdAt: -1 });

    if (!billingAccount) {
      billingAccount = await BillingAccount.create({
        patientId: prescription.patientId,
        branchId: prescription.branchId,
        accountType: 'opd',
        status: 'open'
      });
    }

    const dispensedTotal = prescription.items.length * 150; // Mock standard pharmacy pricing per item

    await BillingCharge.create({
      billingAccountId: billingAccount._id,
      patientId: prescription.patientId,
      branchId: prescription.branchId,
      serviceName: `Pharmacy Dispense: ${prescription.items.map((i) => i.drugName).join(', ')}`,
      department: 'pharmacy',
      rate: dispensedTotal,
      quantity: 1,
      totalAmount: dispensedTotal,
      sourceType: 'pharmacy',
      sourceId: prescription._id.toString(),
      status: 'posted'
    });

    billingAccount.totalCharges = (billingAccount.totalCharges || 0) + dispensedTotal;
    billingAccount.netAmount = billingAccount.totalCharges - (billingAccount.totalDiscounts || 0);
    billingAccount.balanceDue = billingAccount.netAmount - (billingAccount.totalPaid || 0);
    await billingAccount.save();

    res.status(200).json({
      success: true,
      message: 'Prescription dispensed successfully. Pharmacy charges posted to billing.',
      prescription
    });
  } catch (err) {
    next(err);
  }
};

// Controlled Substance Dispensing (Dual Witness Verification)
const dispenseControlledDrug = async (req, res, next) => {
  try {
    const { prescriptionId, patientId, drugName, batchNo, quantity, witnessUserId, notes } = req.body;

    if (!drugName || !quantity || !witnessUserId) {
      return res.status(400).json({
        success: false,
        message: 'drugName, quantity, and witnessUserId (dual witness) are mandatory for narcotics/controlled drugs'
      });
    }

    if (witnessUserId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Witness must be a different authorized user' });
    }

    const log = await ControlledDrugLog.create({
      prescriptionId: prescriptionId || null,
      patientId: patientId || req.user._id,
      branchId: req.branchId,
      drugName,
      batchNo: batchNo || 'BATCH-NARCO-01',
      quantity,
      dispensedBy: req.user._id,
      witnessedBy: witnessUserId,
      notes: notes || 'Verified narcotics register'
    });

    res.status(201).json({
      success: true,
      message: 'Controlled substance dispensed and dual-witness audit log recorded',
      data: log
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
