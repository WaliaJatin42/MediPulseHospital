const mongoose = require('mongoose');

// Doctor Weekly Schedules
const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    dayOfWeek: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    startTime: { type: String, required: true, example: '09:00' },
    endTime: { type: String, required: true, example: '13:00' },
    slotDurationMinutes: { type: Number, default: 15 },
    maxPatients: { type: Number, default: 16 }
  },
  { timestamps: true }
);

const DoctorSchedule = mongoose.model('DoctorSchedule', doctorScheduleSchema);

// Doctor Schedule Exceptions (Leaves, blockouts, extra sessions)
const scheduleExceptionSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, example: '2026-11-20' },
    type: { type: String, enum: ['leave', 'block', 'extra_session'], default: 'leave' },
    reason: { type: String, default: '' }
  },
  { timestamps: true }
);

const ScheduleException = mongoose.model('ScheduleException', scheduleExceptionSchema);

// Appointments
const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    slotTime: { type: String, required: true }, // HH:mm
    type: {
      type: String,
      enum: ['routine', 'walk_in', 'teleconsult', 'portal', 'follow_up', 'consultation', 'emergency'],
      default: 'routine'
    },
    status: {
      type: String,
      enum: ['scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
      index: true
    },
    cancellationReason: { type: String, default: '' },
    teleconsultLink: { type: String, default: '' },
    queueTokenNo: { type: Number, default: null },
    consultationChargePosted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

// OPD Queue Tokens
const queueTokenSchema = new mongoose.Schema(
  {
    tokenNo: { type: Number, required: true },
    date: { type: String, required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    status: {
      type: String,
      enum: ['waiting', 'in_progress', 'skipped', 'done'],
      default: 'waiting',
      index: true
    },
    calledAt: { type: Date }
  },
  { timestamps: true }
);

const QueueToken = mongoose.model('QueueToken', queueTokenSchema);

// OPD Visits (Encounters)
const visitSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    visitType: { type: String, enum: ['opd', 'emergency', 'follow_up'], default: 'opd' },
    date: { type: Date, default: Date.now },
    vitals: {
      heightCm: { type: Number },
      weightKg: { type: Number },
      bmi: { type: Number },
      systolicBp: { type: Number },
      diastolicBp: { type: Number },
      pulseRate: { type: Number },
      temperatureF: { type: Number },
      spO2Percent: { type: Number },
      recordedAt: { type: Date, default: Date.now }
    },
    chiefComplaints: [{ complaint: String, duration: String }],
    diagnoses: [{ icdCode: String, description: String, type: { type: String, enum: ['provisional', 'final'], default: 'provisional' } }],
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    closedAt: { type: Date }
  },
  { timestamps: true }
);

const Visit = mongoose.model('Visit', visitSchema);

// Clinical SOAP Notes (with digital signing lock and addendums)
const clinicalNoteSchema = new mongoose.Schema(
  {
    visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    type: { type: String, enum: ['soap', 'progress', 'consultation', 'discharge_summary'], default: 'soap' },
    subjective: { type: String, default: '' },
    objective: { type: String, default: '' },
    assessment: { type: String, default: '' },
    plan: { type: String, default: '' },
    isSigned: { type: Boolean, default: false },
    signedAt: { type: Date },
    signatureHash: { type: String, default: '' },
    addendums: [
      {
        text: { type: String, required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

const ClinicalNote = mongoose.model('ClinicalNote', clinicalNoteSchema);

// Prescriptions
const prescriptionSchema = new mongoose.Schema(
  {
    visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    items: [
      {
        drugName: { type: String, required: true },
        dose: { type: String, default: '1 dose' },
        dosage: { type: String, default: '' },
        route: { type: String, default: 'oral' },
        frequency: { type: String, default: 'OD' }, // 1-0-1, TID, etc.
        durationDays: { type: Number, default: 5 },
        instructions: { type: String, default: 'After food' },
        isDispensed: { type: Boolean, default: false }
      }
    ],
    isSigned: { type: Boolean, default: true },
    status: { type: String, enum: ['pending', 'partially_dispensed', 'dispensed', 'cancelled'], default: 'pending' }
  },
  { timestamps: true }
);

const Prescription = mongoose.model('Prescription', prescriptionSchema);

module.exports = {
  DoctorSchedule,
  ScheduleException,
  Appointment,
  QueueToken,
  Visit,
  ClinicalNote,
  Prescription
};
