const mongoose = require('mongoose');

const statutoryRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String, // 'provident_fund', 'esi_insurance', 'professional_tax', 'gratuity'
      required: true,
      trim: true
    },
    employeeRate: {
      type: Number, // Percentage, e.g. 12 for PF
      required: true
    },
    employerRate: {
      type: Number, // Percentage, e.g. 12 for PF
      required: true
    },
    wageCeiling: {
      type: Number, // Max salary cap to calculate on, e.g. 15000 or null for uncapped
      default: null
    },
    effectiveFrom: {
      type: Date,
      default: Date.now
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

const StatutoryRule = mongoose.model('StatutoryRule', statutoryRuleSchema);

module.exports = StatutoryRule;
