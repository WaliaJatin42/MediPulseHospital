const mongoose = require('mongoose');

const salaryComponentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    type: {
      type: String,
      enum: ['earning', 'deduction'],
      required: true
    },
    calculation: {
      type: String,
      enum: ['fixed', 'percentOfBasic', 'percentOfGross', 'slab'],
      default: 'fixed'
    },
    value: {
      type: Number,
      default: 0
    },
    taxable: {
      type: Boolean,
      default: true
    },
    statutory: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
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

const SalaryComponent = mongoose.model('SalaryComponent', salaryComponentSchema);

module.exports = SalaryComponent;
