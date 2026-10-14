const mongoose = require('mongoose');

const hireSchema = new mongoose.Schema(
  {
    candidateName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    designation: {
      type: String,
      required: true,
      trim: true
    },
    stage: {
      type: String,
      enum: ['screening', 'interview', 'offer', 'accepted', 'joined', 'rejected'],
      default: 'offer',
      index: true
    },
    offeredSalary: {
      type: Number,
      default: 0
    },
    joiningDate: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

hireSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Hire', hireSchema);
