const mongoose = require('mongoose');

// IPD Admissions
const admissionSchema = new mongoose.Schema(
  {
    admissionNo: { type: String, unique: true, sparse: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    payerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payer', default: null },
    admissionDate: { type: Date, default: Date.now, index: true },
    expectedStayDays: { type: Number, default: 3 },
    admissionType: {
      type: String,
      enum: ['emergency', 'elective', 'transfer', 'daycare'],
      default: 'elective'
    },
    provisionalDiagnosis: { type: String, required: true },
    status: {
      type: String,
      enum: ['admitted', 'discharge_initiated', 'discharged', 'lama', 'absconded', 'deceased'],
      default: 'admitted',
      index: true
    },
    clearance: {
      doctor: { approved: { type: Boolean, default: false }, approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, approvedAt: Date, remarks: String },
      nursing: { approved: { type: Boolean, default: false }, approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, approvedAt: Date, remarks: String },
      pharmacy: { approved: { type: Boolean, default: false }, approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, approvedAt: Date, remarks: String },
      billing: { approved: { type: Boolean, default: false }, approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, approvedAt: Date, remarks: String }
    },
    dischargeDate: { type: Date, default: null },
    dischargeReason: { type: String, default: '' },
    admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const Admission = mongoose.model('Admission', admissionSchema);

// Bed Transfers (Prise splitting & room-rent allocation)
const bedTransferSchema = new mongoose.Schema(
  {
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    fromBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    toBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    reason: { type: String, required: true },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const BedTransfer = mongoose.model('BedTransfer', bedTransferSchema);

// Doctor Rounds Notes
const doctorRoundSchema = new mongoose.Schema(
  {
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, required: true },
    orders: [{ type: String }],
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const DoctorRound = mongoose.model('DoctorRound', doctorRoundSchema);

// Discharge Summary
const dischargeSummarySchema = new mongoose.Schema(
  {
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, unique: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chiefComplaints: { type: String, default: '' },
    hospitalCourse: { type: String, required: true },
    finalDiagnosis: { type: String, required: true },
    surgicalProcedure: { type: String, default: '' },
    dischargeMedications: [
      { drugName: String, dose: String, frequency: String, durationDays: Number, instructions: String }
    ],
    followUpInstructions: { type: String, default: '' },
    isSigned: { type: Boolean, default: false },
    signedAt: { type: Date }
  },
  { timestamps: true }
);

const DischargeSummary = mongoose.model('DischargeSummary', dischargeSummarySchema);

// Nursing Charts (Vitals & Intake/Output)
const nursingChartSchema = new mongoose.Schema(
  {
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
    nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    vitals: {
      temperatureF: Number,
      pulseRate: Number,
      systolicBp: Number,
      diastolicBp: Number,
      spO2Percent: Number,
      respiratoryRate: Number
    },
    intakeMl: { type: Number, default: 0 },
    intakeType: { type: String, default: 'oral' }, // oral, iv_fluids
    outputMl: { type: Number, default: 0 },
    outputType: { type: String, default: 'urine' }, // urine, drain, vomit
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

const NursingChart = mongoose.model('NursingChart', nursingChartSchema);

// Medication Administration Record (MAR)
const marEntrySchema = new mongoose.Schema(
  {
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
    drugName: { type: String, required: true },
    dose: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
    administeredTime: { type: Date, default: null },
    administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: ['scheduled', 'administered', 'withheld'],
      default: 'scheduled',
      index: true
    },
    withholdReason: { type: String, default: '' },
    barcodeVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const MarEntry = mongoose.model('MarEntry', marEntrySchema);

// Nursing Shift Handover
const nursingHandoverSchema = new mongoose.Schema(
  {
    wardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    shift: { type: String, enum: ['morning', 'evening', 'night'], required: true },
    fromNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patientSummaries: [
      {
        admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
        patientName: String,
        bedNo: String,
        condition: String,
        criticalTasks: String
      }
    ],
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const NursingHandover = mongoose.model('NursingHandover', nursingHandoverSchema);

module.exports = {
  Admission,
  BedTransfer,
  DoctorRound,
  DischargeSummary,
  NursingChart,
  MarEntry,
  NursingHandover
};
