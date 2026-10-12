const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id is required'],
      index: true
    },
    user_name: {
      type: String,
      required: [true, 'user_name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'department is required'],
      trim: true,
      index: true
    },
    designation: {
      type: String,
      required: [true, 'designation is required'],
      trim: true
    },
    salary: {
      type: Number,
      required: [true, 'salary is required'],
      min: [0, 'salary cannot be negative'],
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

// Virtual aliases for camelCase compatibility
salarySchema.virtual('userId').get(function () {
  return this.user_id;
});
salarySchema.virtual('userName').get(function () {
  return this.user_name;
});
salarySchema.virtual('createdAt').get(function () {
  return this.created_at;
});
salarySchema.virtual('updatedAt').get(function () {
  return this.updated_at;
});

salarySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Salary = mongoose.model('Salary', salarySchema);

module.exports = Salary;
