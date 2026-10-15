const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please enter a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: function () {
        return this.authProvider === 'local' && !this.googleId;
      },
      select: false
    },
    googleId: {
      type: String,
      default: null,
      index: true
    },
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    role: {
      type: String,
      enum: [
        'superadmin', 'admin', 'supervisor', 'user',
        'doctor', 'nurse', 'receptionist', 'lab_technician',
        'pathologist', 'radiologist', 'pharmacist', 'billing_clerk',
        'tpa_executive', 'records_officer'
      ],
      default: 'user',
      index: true
    },
    clinicalRole: {
      type: String,
      default: null
    },
    customRoles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
      }
    ],
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
      }
    ],
    designation: {
      type: String,
      trim: true,
      default: 'Staff'
    },
    department: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: 'general',
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    shiftPolicy: {
      type: String,
      enum: ['standard_9h', 'night_roster', 'rotating', 'flexible'],
      default: 'standard_9h'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'terminated'],
      default: 'active',
      index: true
    },
    joiningDate: {
      type: Date,
      default: Date.now
    },
    branchIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
      }
    ],
    activeBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null
    },
    salary: {
      type: Number,
      default: 0,
      min: [0, 'Salary cannot be negative']
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLogin: {
      type: Date,
      default: null
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false
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
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    refreshToken: {
      type: String,
      default: null,
      select: false
    },
    // Security & MFA
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecret: {
      type: String,
      default: null,
      select: false
    },
    recoveryCodes: [
      {
        code: { type: String, required: true },
        used: { type: Boolean, default: false }
      }
    ],
    forcePasswordChange: {
      type: Boolean,
      default: false
    },
    forceMfaSetup: {
      type: Boolean,
      default: false
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    passwordHistory: [
      {
        hash: { type: String, required: true },
        changedAt: { type: Date, default: Date.now }
      }
    ],
    passwordLastChangedAt: {
      type: Date,
      default: Date.now
    },
    // Sensitive personal and financial data
    bankAccount: {
      type: String,
      default: '' // stored encrypted or masked in responses
    },
    bankIfsc: {
      type: String,
      default: ''
    },
    taxId: {
      type: String,
      default: '' // stored encrypted
    },
    nationalId: {
      type: String,
      default: '' // stored encrypted
    },
    // Clinical staff fields
    licenseNumber: {
      type: String,
      default: ''
    },
    licenseExpiry: {
      type: Date,
      default: null
    },
    specialization: {
      type: String,
      default: ''
    },
    registrationBody: {
      type: String,
      default: ''
    },
    payType: {
      type: String,
      enum: ['monthly', 'hourly', 'perVisit'],
      default: 'monthly'
    },
    // Historical tracking
    assignments: [
      {
        department: { type: String, required: true },
        role: { type: String, required: true },
        designation: { type: String, default: '' },
        from: { type: Date, default: Date.now },
        to: { type: Date, default: null },
        reason: { type: String, default: '' },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],
    ownershipHistory: [
      {
        fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reassignedAt: { type: Date, default: Date.now },
        reassignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, default: '' }
      }
    ],
    // FCM Push Notification Tokens
    fcmTokens: [
      {
        token: { type: String, required: true },
        deviceId: { type: String, default: '' },
        platform: { type: String, enum: ['web', 'android', 'ios'], default: 'web' },
        updatedAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Method to compare candidate password with passwordHash
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Compute and return effective permissions for this user solely from assigned roles
userSchema.methods.getEffectivePermissions = async function () {
  if (this.role === 'superadmin') {
    return ['*'];
  }

  const permissionsSet = new Set();
  const roleIds = [
    ...(this.roles || []),
    ...(this.customRoles || [])
  ];

  if (roleIds.length > 0) {
    let roles = roleIds;
    if (roles[0] && !roles[0].permissions) {
      const Role = mongoose.model('Role');
      roles = await Role.find({ _id: { $in: roleIds }, isActive: true });
    }
    roles.forEach((r) => {
      if (r && r.permissions && Array.isArray(r.permissions)) {
        r.permissions.forEach((p) => permissionsSet.add(p));
      }
    });
  }

  return Array.from(permissionsSet).sort();
};

// Sync isActive with status
userSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.isActive = this.status === 'active';
  }
  next();
});

// Transform output to remove sensitive fields when converting to JSON
userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.passwordHash;
    delete ret.refreshToken;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.mfaSecret;
    delete ret.recoveryCodes;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
