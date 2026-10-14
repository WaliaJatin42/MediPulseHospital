const mongoose = require('mongoose');

// 1. Blood Bank
const bloodDonorSchema = new mongoose.Schema(
  {
    donorNo: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    bloodGroup: { type: String, required: true },
    phone: { type: String, required: true },
    lastDonatedAt: { type: Date }
  },
  { timestamps: true }
);

const BloodDonor = mongoose.model('BloodDonor', bloodDonorSchema);

const bloodUnitSchema = new mongoose.Schema(
  {
    bagNo: { type: String, required: true, unique: true, index: true },
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodDonor' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    bloodGroup: { type: String, required: true, index: true },
    component: { type: String, enum: ['whole_blood', 'prbc', 'ffp', 'platelets', 'cryo'], default: 'prbc' },
    collectionDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    screeningResults: {
      hiv: { type: String, default: 'negative' },
      hcv: { type: String, default: 'negative' },
      hbsag: { type: String, default: 'negative' },
      syphilis: { type: String, default: 'negative' },
      malaria: { type: String, default: 'negative' }
    },
    status: {
      type: String,
      enum: ['quarantine', 'available', 'reserved', 'issued', 'discarded'],
      default: 'available',
      index: true
    }
  },
  { timestamps: true }
);

const BloodUnit = mongoose.model('BloodUnit', bloodUnitSchema);

// 2. Dietary Orders
const dietOrderSchema = new mongoose.Schema(
  {
    admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    wardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
    dietType: { type: String, enum: ['normal', 'diabetic', 'renal', 'liquid', 'npo', 'soft'], default: 'normal' },
    meal: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'lunch' },
    status: { type: String, enum: ['ordered', 'prepared', 'delivered'], default: 'ordered' },
    deliveredAt: { type: Date }
  },
  { timestamps: true }
);

const DietOrder = mongoose.model('DietOrder', dietOrderSchema);

// 3. Ambulance & Transport
const ambulanceTripSchema = new mongoose.Schema(
  {
    tripNo: { type: String, required: true, unique: true },
    vehicleNo: { type: String, required: true },
    driverName: { type: String, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },
    status: {
      type: String,
      enum: ['dispatched', 'on_scene', 'en_route', 'arrived', 'completed'],
      default: 'dispatched'
    },
    currentGps: { lat: Number, lng: Number },
    distanceKm: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const AmbulanceTrip = mongoose.model('AmbulanceTrip', ambulanceTripSchema);

// 4. Certificates (Birth, Death, Medical Fitness with public verify code)
const certificateSchema = new mongoose.Schema(
  {
    certificateNo: { type: String, required: true, unique: true },
    type: { type: String, enum: ['birth', 'death', 'medical_fitness', 'sick_leave'], required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    certifyingDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    verificationCode: { type: String, required: true, unique: true }, // Public QR code verify
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    issuedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const Certificate = mongoose.model('Certificate', certificateSchema);

// 5. Stores Items & Procurement
const storeItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, enum: ['consumables', 'implants', 'linen', 'reagents', 'surgical', 'stationery'], default: 'consumables' },
    currentStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 20 },
    unit: { type: String, default: 'pcs' },
    unitPrice: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const StoreItem = mongoose.model('StoreItem', storeItemSchema);

// 6. Quality Incidents & Infection Control
const qualityIncidentSchema = new mongoose.Schema(
  {
    incidentNo: { type: String, required: true, unique: true },
    type: { type: String, enum: ['patient_safety', 'near_miss', 'medication_error', 'fall', 'equipment_failure'], required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    wardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
    description: { type: String, required: true },
    severity: { type: String, enum: ['minor', 'moderate', 'sentinel'], default: 'minor' },
    status: { type: String, enum: ['reported', 'rca_in_progress', 'capa_assigned', 'closed'], default: 'reported' },
    rootCauseAnalysis: { type: String, default: '' },
    capaActions: [{ action: String, owner: String, dueDate: Date, isCompleted: Boolean }],
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

const QualityIncident = mongoose.model('QualityIncident', qualityIncidentSchema);

module.exports = {
  BloodDonor,
  BloodUnit,
  DietOrder,
  AmbulanceTrip,
  Certificate,
  StoreItem,
  QualityIncident
};
