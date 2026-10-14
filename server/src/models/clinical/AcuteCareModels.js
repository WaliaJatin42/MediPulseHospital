const mongoose = require('mongoose');

// Emergency Cases
const emergencyCaseSchema = new mongoose.Schema(
  {
    caseNo: { type: String, required: true, unique: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    triageLevel: {
      type: String,
      enum: ['ESI-1', 'ESI-2', 'ESI-3', 'ESI-4', 'ESI-5'], // 1 = Immediate Resuscitation, 5 = Non-urgent
      default: 'ESI-3'
    },
    arrivalMode: { type: String, enum: ['ambulance', 'walk_in', 'police', 'transfer'], default: 'walk_in' },
    chiefComplaint: { type: String, required: true },
    isMlc: { type: Boolean, default: false },
    mlcNo: { type: String, default: '' },
    policeStation: { type: String, default: '' },
    status: {
      type: String,
      enum: ['triaged', 'under_treatment', 'admitted', 'discharged', 'transferred', 'deceased'],
      default: 'triaged',
      index: true
    },
    admittedToAdmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', default: null },
    treatingDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    triageNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const EmergencyCase = mongoose.model('EmergencyCase', emergencyCaseSchema);

// Operation Theatres
const otTheatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    theatreNo: { type: String, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    type: { type: String, enum: ['general', 'ortho', 'cardiac', 'neuro', 'ophthalmic', 'emergency', 'major', 'minor'], default: 'general' },
    status: { type: String, enum: ['available', 'occupied', 'cleaning', 'maintenance'], default: 'available' }
  },
  { timestamps: true }
);

const OtTheatre = mongoose.model('OtTheatre', otTheatreSchema);

// OT Bookings & Cases
const otBookingSchema = new mongoose.Schema(
  {
    theatreId: { type: mongoose.Schema.Types.ObjectId, ref: 'OtTheatre', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    surgeonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    anesthetistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null, index: true },
    procedureName: { type: String, required: true },
    procedureCode: { type: String },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:mm
    durationMinutes: { type: Number, default: 90 },
    priority: { type: String, enum: ['elective', 'urgent', 'emergency'], default: 'elective' },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    safetyChecklist: {
      signInCompleted: { type: Boolean, default: false },
      timeOutCompleted: { type: Boolean, default: false },
      signOutCompleted: { type: Boolean, default: false }
    },
    operativeNotes: { type: String, default: '' },
    anesthesiaNotes: { type: String, default: '' },
    implantsUsed: [
      { implantName: String, serialNo: String, batchNo: String, manufacturer: String }
    ]
  },
  { timestamps: true }
);

const OtBooking = mongoose.model('OtBooking', otBookingSchema);

// ICU Flowsheet (Hourly parameters & life support tracking)
const icuFlowsheetSchema = new mongoose.Schema(
  {
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    timestamp: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vitals: {
      heartRate: Number,
      systolicBp: Number,
      diastolicBp: Number,
      meanArterialPressure: Number,
      spO2Percent: Number,
      temperatureC: Number
    },
    ventilatorSettings: {
      mode: String, // AC, SIMV, CPAP
      fio2Percent: Number,
      peepCmH2O: Number,
      tidalVolumeMl: Number
    },
    severityScores: {
      gcsScore: Number, // 3 - 15 Glasgow Coma Scale
      sofaScore: Number, // Sequential Organ Failure Assessment
      apacheScore: Number
    },
    invasiveLines: [
      { lineType: String, insertionSite: String, insertedDate: Date, hasInfectionSign: Boolean }
    ]
  },
  { timestamps: true }
);

const IcuFlowsheet = mongoose.model('IcuFlowsheet', icuFlowsheetSchema);

// Controlled Substances Witness Log
const controlledDrugLogSchema = new mongoose.Schema(
  {
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    drugName: { type: String, required: true },
    batchNo: { type: String, required: true },
    quantity: { type: Number, required: true },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    witnessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Dual witness requirement
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

const ControlledDrugLog = mongoose.model('ControlledDrugLog', controlledDrugLogSchema);

module.exports = {
  EmergencyCase,
  OtTheatre,
  OtBooking,
  IcuFlowsheet,
  ControlledDrugLog
};
