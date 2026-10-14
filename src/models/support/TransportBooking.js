const mongoose = require('mongoose');

const transportBookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true
    },
    passengerCount: {
      type: Number,
      default: 1,
      min: 1
    },
    pickupLocation: {
      type: String,
      required: true
    },
    dropLocation: {
      type: String,
      required: true
    },
    pickupTime: {
      type: Date,
      required: true
    },
    purpose: {
      type: String,
      required: true // e.g. "Specimen transit", "Inter-hospital patient transfer assistance", "Staff conference"
    },
    driverName: {
      type: String,
      default: ''
    },
    vehicleNumber: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'in_transit', 'completed', 'cancelled'],
      default: 'requested',
      index: true
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

transportBookingSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('TransportBooking', transportBookingSchema);
