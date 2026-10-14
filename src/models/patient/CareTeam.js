const mongoose = require('mongoose');

const careTeamSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['primary_doctor', 'consultant', 'primary_nurse', 'resident', 'therapist'],
      required: true
    },
    from: {
      type: Date,
      default: Date.now
    },
    to: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

careTeamSchema.index({ patientId: 1, staffId: 1, status: 1 });

const CareTeam = mongoose.model('CareTeam', careTeamSchema);

module.exports = CareTeam;
