const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      example: 'MPH-CEN'
    },
    name: {
      type: String,
      required: true,
      trim: true,
      example: 'MediPulse Central Hospital'
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    taxRegistrationNo: {
      type: String,
      default: ''
    },
    licenseNumbers: {
      establishment: { type: String, default: '' },
      pharmacy: { type: String, default: '' },
      radiation: { type: String, default: '' },
      bloodBank: { type: String, default: '' }
    },
    invoicePrefix: {
      type: String,
      required: true,
      default: 'INV-CEN',
      uppercase: true
    },
    uhidPrefix: {
      type: String,
      required: true,
      default: 'MPH-CEN',
      uppercase: true
    },
    isMain: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active'
    },
    settings: {
      workingHoursPerDay: { type: Number, default: 9 },
      cashLimitWithoutPan: { type: Number, default: 199999 },
      autoRoomRentPostingHour: { type: Number, default: 0 }, // Midnight
      allowEmergencyWithoutDeposit: { type: Boolean, default: true }
    },
    modules: {
      bloodBank: { type: Boolean, default: true },
      emergency: { type: Boolean, default: true },
      icu: { type: Boolean, default: true },
      operationTheatre: { type: Boolean, default: true },
      mortuary: { type: Boolean, default: true },
      maternity: { type: Boolean, default: true },
      dialysis: { type: Boolean, default: true },
      radiology: { type: Boolean, default: true }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

branchSchema.index({ code: 1 }, { unique: true });
branchSchema.index({ isMain: 1 });

const Branch = mongoose.model('Branch', branchSchema);

module.exports = Branch;
