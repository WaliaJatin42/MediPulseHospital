const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    expenseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    department: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ['medical_supplies', 'equipment_maintenance', 'travel', 'utilities', 'staff_welfare', 'office_supplies', 'other'],
      default: 'other'
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    receiptUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'reimbursed'],
      default: 'pending',
      index: true
    },
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decisionNotes: {
      type: String,
      default: ''
    },
    decisionAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Expense', expenseSchema);
