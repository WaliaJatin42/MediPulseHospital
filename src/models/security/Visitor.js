const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    idType: {
      type: String,
      default: 'Government ID'
    },
    idNumber: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      required: true
    },
    visitingPerson: {
      type: String,
      required: true
    },
    department: {
      type: String,
      required: true
    },
    purpose: {
      type: String,
      required: true
    },
    badgeNumber: {
      type: String,
      required: true
    },
    checkIn: {
      type: Date,
      default: Date.now
    },
    checkOut: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['checked_in', 'checked_out'],
      default: 'checked_in',
      index: true
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

visitorSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Visitor', visitorSchema);
