const mongoose = require('mongoose');

// Lab Sample Collection
const labSampleSchema = new mongoose.Schema(
  {
    barcode: { type: String, required: true, unique: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CpoeOrder', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    sampleType: { type: String, required: true, example: 'EDTA Blood' }, // Serum, Urine, Blood, CSF
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    collectedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['collected', 'received', 'rejected', 'analyzed'],
      default: 'collected',
      index: true
    },
    rejectionReason: { type: String, default: '' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedAt: { type: Date }
  },
  { timestamps: true }
);

const LabSample = mongoose.model('LabSample', labSampleSchema);

// Lab Results
const labResultSchema = new mongoose.Schema(
  {
    sampleId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabSample', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CpoeOrder', required: false, default: null },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    testName: { type: String, default: 'Laboratory Test' },
    testCode: { type: String, default: '' },
    parameterResults: [
      {
        parameter: { type: String, default: '' },
        name: { type: String, default: '' },
        value: { type: mongoose.Schema.Types.Mixed, required: true },
        unit: { type: String, default: '' },
        referenceRange: { type: String, default: '' },
        isAbnormal: { type: Boolean, default: false },
        isCritical: { type: Boolean, default: false }
      }
    ],
    status: {
      type: String,
      enum: ['entered', 'validated', 'amended', 'released'],
      default: 'entered',
      index: true
    },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Pathologist
    validatedAt: { type: Date },
    releasedToPortal: { type: Boolean, default: false },
    isReleased: { type: Boolean, default: false },
    criticalAlertAcknowledged: { type: Boolean, default: false },
    criticalAckBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    criticalAckAt: { type: Date }
  },
  { timestamps: true }
);

const LabResult = mongoose.model('LabResult', labResultSchema);

// Radiology Studies & PACS Link
const radiologyStudySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CpoeOrder', required: false, default: null, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    examName: { type: String, default: 'Radiology Examination' },
    modality: { type: String, enum: ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Mammography'], default: 'X-Ray' },
    pacsStudyUid: { type: String, default: '' },
    viewerUrl: { type: String, default: '' },
    screeningChecklist: {
      pregnancyChecked: { type: Boolean, default: false },
      contrastAllergyChecked: { type: Boolean, default: false },
      renalFunctionChecked: { type: Boolean, default: false }
    },
    radiationDoseMgy: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'reported'],
      default: 'scheduled',
      index: true
    },
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const RadiologyStudy = mongoose.model('RadiologyStudy', radiologyStudySchema);

// Radiology Reports
const radiologyReportSchema = new mongoose.Schema(
  {
    studyId: { type: mongoose.Schema.Types.ObjectId, ref: 'RadiologyStudy', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: false },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    radiologistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    findings: { type: String, required: true },
    impression: { type: String, required: true },
    isCritical: { type: Boolean, default: false },
    isSigned: { type: Boolean, default: false },
    signedAt: { type: Date },
    releasedToPortal: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const RadiologyReport = mongoose.model('RadiologyReport', radiologyReportSchema);

module.exports = {
  LabSample,
  LabResult,
  RadiologyStudy,
  RadiologyReport
};
