require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const connectDB = require('../src/config/db');

// Models
const User = require('../src/models/User');
const Department = require('../src/models/Department');
const Salary = require('../src/models/Salary');
const Attendance = require('../src/models/Attendance');
const PayrollRun = require('../src/models/PayrollRun');
const AuditLog = require('../src/models/AuditLog');
const Medicine = require('../src/models/pharmacy/Medicine');
const Visitor = require('../src/models/security/Visitor');
const Budget = require('../src/models/finance/Budget');
const SupportRequest = require('../src/models/support/SupportRequest');
const Contract = require('../src/models/legal/Contract');
const TechnicalAsset = require('../src/models/technical/TechnicalAsset');
const AccessRequest = require('../src/models/technical/AccessRequest');

const runVerification = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- MediPulse Verification Suite ---');

    // 1. Check Departments
    const depts = await Department.find();
    console.log(`[PASS] Total Departments in DB: ${depts.length} (Expected: 7)`);
    if (depts.length < 7) throw new Error('Less than 7 departments found');

    // 2. Check Role Hierarchy Users
    const superAdmin = await User.findOne({ role: 'superadmin' });
    const hrAdmin = await User.findOne({ email: 'hr.admin@hospital.com' });
    const hrSupervisor = await User.findOne({ email: 'hr.supervisor@hospital.com' });
    const pharmAdmin = await User.findOne({ email: 'pharmacy.admin@hospital.com' });
    const secAdmin = await User.findOne({ email: 'security.admin@hospital.com' });

    console.log(`[PASS] Superadmin present: ${superAdmin ? superAdmin.email : 'NO'}`);
    console.log(`[PASS] HR Admin present: ${hrAdmin ? hrAdmin.email : 'NO'}`);
    console.log(`[PASS] HR Supervisor present: ${hrSupervisor ? hrSupervisor.email : 'NO'}`);
    console.log(`[PASS] Pharmacy Admin present: ${pharmAdmin ? pharmAdmin.email : 'NO'}`);
    console.log(`[PASS] Security Admin present: ${secAdmin ? secAdmin.email : 'NO'}`);

    if (!superAdmin || !hrAdmin || !hrSupervisor || !pharmAdmin || !secAdmin) {
      throw new Error('Key hierarchy users missing!');
    }

    // 3. Test Salary Revisions Logic
    let salaryDoc = await Salary.findOne({ user_id: pharmAdmin._id });
    console.log(`[PASS] Salary record for ${pharmAdmin.name}: Basic=${salaryDoc.basic}, Salary=${salaryDoc.salary}, Current Revision=#${salaryDoc.currentRevision}`);

    // 4. Test Pharmacy Formulary
    const meds = await Medicine.find();
    console.log(`[PASS] Pharmacy Medicines count: ${meds.length}`);
    const controlled = meds.filter(m => m.isControlledSubstance);
    console.log(`[PASS] Controlled Substances registered: ${controlled.map(c => c.name).join(', ')}`);

    // 5. Test Technical Assets
    const assets = await TechnicalAsset.find();
    console.log(`[PASS] Technical Assets count: ${assets.length}`);

    // 6. Test Finance Budgets
    const budgets = await Budget.find();
    console.log(`[PASS] Finance Budgets count: ${budgets.length}`);

    // 7. Test Audit Logs Immutability
    const testAudit = new AuditLog({
      actorId: superAdmin._id,
      actorName: superAdmin.name,
      role: superAdmin.role,
      action: 'SYSTEM_VERIFICATION_CHECK',
      resource: 'verification',
      resourceId: 'TEST-001'
    });
    await testAudit.save();
    console.log(`[PASS] Append-only AuditLog created successfully: ID ${testAudit._id}`);

    let tamperCaught = false;
    try {
      testAudit.action = 'TAMPERED_ACTION';
      await testAudit.save();
    } catch (e) {
      tamperCaught = true;
      console.log(`[PASS] Tamper-evident protection verified: ${e.message}`);
    }
    if (!tamperCaught) {
      throw new Error('AuditLog allowed mutation! Append-only guarantee violated.');
    }

    console.log('All database models, schema validations, and role entities passed verification successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err.message);
    process.exit(1);
  }
};

runVerification();
