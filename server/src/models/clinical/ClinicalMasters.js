const mongoose = require('mongoose');

// Specialty Master
const specialtySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, uppercase: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const Specialty = mongoose.model('Specialty', specialtySchema);

// Doctor Profile (extends staff user)
const doctorProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    specialtyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Specialty', required: true, index: true },
    qualifications: [{ type: String }],
    registrationNo: { type: String, required: true },
    consultationFee: { type: Number, required: true, default: 500 },
    followUpDays: { type: Number, default: 7 },
    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    payType: {
      type: String,
      enum: ['salaried', 'perVisit', 'revenueShare'],
      default: 'salaried'
    },
    revenueSharePercent: { type: Number, default: 0 },
    privileges: [{
      procedureCode: { type: String },
      procedureName: { type: String },
      isIndependent: { type: Boolean, default: true },
      grantedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);

// ICD-10 Code Master
const icdCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, default: '' },
    isNotifiable: { type: Boolean, default: false }
  },
  { timestamps: true }
);

icdCodeSchema.index({ code: 1, description: 'text' });
const IcdCode = mongoose.model('IcdCode', icdCodeSchema);

// Procedure Code Master (CPT/standard)
const procedureCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    name: { type: String, required: true },
    department: { type: String, default: 'surgery' },
    standardRate: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const ProcedureCode = mongoose.model('ProcedureCode', procedureCodeSchema);

// Clinical Service Item (Catalog)
const serviceItemSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    name: { type: String, required: true },
    department: {
      type: String,
      enum: ['opd', 'ipd', 'lab', 'radiology', 'pharmacy', 'ot', 'icu', 'emergency', 'blood_bank', 'diet', 'ambulance', 'nursing', 'other'],
      required: true
    },
    category: { type: String, default: 'general' },
    basePrice: { type: Number, required: true, default: 0 },
    taxCategory: { type: String, enum: ['exempt', 'standard_5', 'standard_12', 'standard_18'], default: 'exempt' },
    isPackageEligible: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const ServiceItem = mongoose.model('ServiceItem', serviceItemSchema);

// Tariff Revision (Price per Payer / Branch)
const tariffSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem', required: true, index: true },
    payerCategory: {
      type: String,
      enum: ['general_cash', 'insurance', 'corporate', 'government_scheme'],
      default: 'general_cash',
      index: true
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null }, // Null means all branches
    price: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

tariffSchema.index({ serviceId: 1, payerCategory: 1, branchId: 1, effectiveFrom: -1 });
const Tariff = mongoose.model('Tariff', tariffSchema);

// Payer (Insurance, TPA, Corporate, Government)
const payerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['tpa', 'insurance_company', 'corporate', 'government_scheme'],
      required: true
    },
    code: { type: String, required: true, uppercase: true },
    creditPeriodDays: { type: Number, default: 30 },
    discountPercent: { type: Number, default: 0 },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

const Payer = mongoose.model('Payer', payerSchema);

module.exports = {
  Specialty,
  DoctorProfile,
  IcdCode,
  ProcedureCode,
  ServiceItem,
  Tariff,
  Payer
};
