const mongoose = require('mongoose');

const reimbursementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    category: {
      type: String, // 'travel', 'medical', 'supplies', 'hospital_duty'
      default: 'travel'
    },
    receiptUrl: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'dept_approved', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true
    },
    deptApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    financeApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Reimbursement = mongoose.model('Reimbursement', reimbursementSchema);

module.exports = Reimbursement;
