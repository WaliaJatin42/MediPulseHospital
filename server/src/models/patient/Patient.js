const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    uhid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      default: '',
      trim: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    },
    dateOfBirth: {
      type: Date
    },
    age: {
      type: Number
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
      default: 'unknown'
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: 'India' }
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' }
    },
    nationalId: {
      type: String,
      default: '' // stored encrypted
    },
    nationalIdMasked: {
      type: String,
      default: ''
    },
    abhaId: {
      type: String,
      default: ''
    },
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed', 'other'],
      default: 'single'
    },
    preferredLanguage: {
      type: String,
      default: 'English'
    },
    accessibilityNeeds: {
      wheelchair: { type: Boolean, default: false },
      hearing: { type: Boolean, default: false },
      vision: { type: Boolean, default: false },
      mobility: { type: Boolean, default: false }
    },
    isUnknown: {
      type: Boolean,
      default: false,
      index: true
    },
    realPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null
    },
    restrictions: {
      isVip: { type: Boolean, default: false },
      sensitiveFlags: {
        psychiatric: { type: Boolean, default: false },
        hiv: { type: Boolean, default: false },
        reproductive: { type: Boolean, default: false }
      }
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'deceased', 'merged'],
      default: 'active',
      index: true
    },
    mergedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

patientSchema.index({ phone: 1, firstName: 1 });
patientSchema.index({ uhid: 1 }, { unique: true });

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
