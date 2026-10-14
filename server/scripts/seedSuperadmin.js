require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Department = require('../src/models/Department');
const connectDB = require('../src/config/db');
const logger = require('../src/utils/logger');
const { recordAuditLog } = require('../src/utils/auditLogger');

const seedSuperadmin = async () => {
  try {
    await connectDB();

    const existingSuperadmin = await User.findOne({ role: 'superadmin', isDeleted: false });
    if (existingSuperadmin) {
      console.error('[-] Refusing to seed Superadmin: An active Superadmin already exists in the system (' + existingSuperadmin.email + ').');
      process.exit(1);
    }

    const email = process.env.SUPERADMIN_EMAIL || 'superadmin@hospital.com';
    const rawPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@Secure2026!';
    const name = process.env.SUPERADMIN_NAME || 'Chief Superadministrator';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    const superadmin = await User.create({
      employeeId: 'EMP-SA-001',
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'superadmin',
      designation: 'Chief Technology & Administrative Officer',
      department: 'general',
      phone: '+1-555-0100',
      status: 'active',
      isActive: true,
      authProvider: 'local',
      forcePasswordChange: true, // First login forces a password change
      forceMfaSetup: true,       // First login forces MFA setup
      passwordHistory: [{ hash: passwordHash, changedAt: new Date() }],
      assignments: [
        {
          department: 'general',
          role: 'superadmin',
          designation: 'Chief Technology & Administrative Officer',
          from: new Date(),
          reason: 'Initial Superadmin Bootstrap'
        }
      ]
    });

    console.log(`[+] Bootstrap Superadmin created successfully:`);
    console.log(`    Email: ${superadmin.email}`);
    console.log(`    Role: ${superadmin.role}`);
    console.log(`    First login requires: Password Change & MFA Setup`);

    process.exit(0);
  } catch (error) {
    console.error('[-] Error seeding Superadmin:', error.message);
    process.exit(1);
  }
};

seedSuperadmin();
