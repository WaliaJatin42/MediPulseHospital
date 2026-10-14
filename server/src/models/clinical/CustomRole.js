const mongoose = require('mongoose');

const customRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String, // e.g. "Consultant", "Resident", "Staff Nurse", "Lab Technician"
      required: true,
      unique: true,
      trim: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['admin', 'supervisor', 'user'],
      default: 'user'
    },
    description: {
      type: String,
      default: ''
    },
    isClinical: {
      type: Boolean,
      default: true
    },
    requiresLicense: {
      type: Boolean,
      default: false
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

const CustomRole = mongoose.model('CustomRole', customRoleSchema);

module.exports = CustomRole;
