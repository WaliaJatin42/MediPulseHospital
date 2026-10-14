require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./src/models/User');
const Department = require('./src/models/Department');
const Salary = require('./src/models/Salary');
const Medicine = require('./src/models/pharmacy/Medicine');
const StockBatch = require('./src/models/pharmacy/StockBatch');
const Supplier = require('./src/models/pharmacy/Supplier');
const Budget = require('./src/models/finance/Budget');
const TechnicalAsset = require('./src/models/technical/TechnicalAsset');
const ComplianceLicense = require('./src/models/legal/ComplianceLicense');
const LegalPolicy = require('./src/models/legal/LegalPolicy');
const Holiday = require('./src/models/hr/Holiday');
const SupplyItem = require('./src/models/support/SupplyItem');
const logger = require('./src/utils/logger');

const seedHospitalDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('[Seed] Connected to MongoDB for comprehensive database seeding...');

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Hospital123!', salt);
    const superAdminPasswordHash = await bcrypt.hash('SuperAdmin123!', salt);

    // 1. Seed 7 Hospital Departments
    const standardDepts = [
      { name: 'Human Resources', code: 'hr', description: 'Central hospital hiring, payroll input, leave & staff offboarding' },
      { name: 'Pharmacy', code: 'pharmacy', description: 'Pharmaceutical formulary, batch inventory, dispensing & controlled substances' },
      { name: 'Security', code: 'security', description: 'Hospital perimeter security, visitor/vehicle logging & emergency protocols' },
      { name: 'Finance', code: 'finance', description: 'Departmental budgets, expense audits, vendor accounts & payroll review' },
      { name: 'Support', code: 'support', description: 'Facilities management, housekeeping, supplies & patient transport' },
      { name: 'Legal', code: 'legal', description: 'Regulatory licensing, litigation defense, contract reviews & hospital policies' },
      { name: 'Technical', code: 'technical', description: 'Biomedical devices, IT infrastructure, access provisioning & system health' },
      // Clinical Departments
      { name: 'Doctors', code: 'doctors', description: 'Clinical physicians, specialists, surgeons and resident doctors' },
      { name: 'Nursing', code: 'nursing', description: 'Staff nurses, ward in-charge, and clinical patient care personnel' },
      { name: 'Laboratory', code: 'laboratory', description: 'Pathology, hematology, microbiological testing and diagnostic lab' },
      { name: 'Radiology', code: 'radiology', description: 'X-Ray, CT, MRI imaging and medical diagnostic scanning' }
    ];

    for (const d of standardDepts) {
      await Department.findOneAndUpdate({ code: d.code }, d, { upsert: true, new: true });
    }
    logger.info('[Seed] Verified 7 hospital departments.');

    // 2. Seed Superadmin
    let superAdmin = await User.findOne({ role: 'superadmin' });
    if (!superAdmin) {
      superAdmin = await User.create({
        employeeId: 'EMP-0001',
        name: 'Chief Medical Director',
        email: 'superadmin@hospital.com',
        passwordHash: superAdminPasswordHash,
        role: 'superadmin',
        designation: 'Chief Administrator',
        department: 'hr',
        phone: '+1 (555) 000-0001',
        authProvider: 'local',
        isActive: true,
        status: 'active',
        salary: 250000
      });
      logger.info(`[Seed] Created Superadmin: ${superAdmin.email}`);
    }

    // 3. Seed HR Admin & HR Supervisor
    let hrAdmin = await User.findOne({ email: 'hr.admin@hospital.com' });
    if (!hrAdmin) {
      hrAdmin = await User.create({
        employeeId: 'EMP-1001',
        name: 'Sarah Connor',
        email: 'hr.admin@hospital.com',
        passwordHash: defaultPasswordHash,
        role: 'admin',
        designation: 'Director of Human Resources',
        department: 'hr',
        phone: '+1 (555) 100-0001',
        authProvider: 'local',
        isActive: true,
        status: 'active',
        salary: 120000,
        createdBy: superAdmin._id
      });
      logger.info(`[Seed] Created HR Admin: ${hrAdmin.email}`);
    }

    let hrSupervisor = await User.findOne({ email: 'hr.supervisor@hospital.com' });
    if (!hrSupervisor) {
      hrSupervisor = await User.create({
        employeeId: 'EMP-1002',
        name: 'David Miller',
        email: 'hr.supervisor@hospital.com',
        passwordHash: defaultPasswordHash,
        role: 'supervisor',
        designation: 'Talent Acquisition Lead',
        department: 'hr',
        phone: '+1 (555) 100-0002',
        authProvider: 'local',
        isActive: true,
        status: 'active',
        salary: 85000,
        createdBy: hrAdmin._id
      });
      logger.info(`[Seed] Created HR Supervisor: ${hrSupervisor.email}`);
    }

    // 4. Seed Department Admins and Supervisors
    const deptPersonnel = [
      { dept: 'pharmacy', adminEmail: 'pharmacy.admin@hospital.com', adminName: 'Dr. Marcus Vance', supervisorEmail: 'pharmacy.supervisor@hospital.com', supervisorName: 'Elena Rostova', userEmail: 'pharmacist.staff@hospital.com', userName: 'John Pharmacist' },
      { dept: 'security', adminEmail: 'security.admin@hospital.com', adminName: 'Captain James Kelly', supervisorEmail: 'security.supervisor@hospital.com', supervisorName: 'Sgt. Frank Castle', userEmail: 'security.guard@hospital.com', userName: 'Officer Alex Guard' },
      { dept: 'finance', adminEmail: 'finance.admin@hospital.com', adminName: 'Victoria Sterling', supervisorEmail: 'finance.supervisor@hospital.com', supervisorName: 'Arthur Dent', userEmail: 'finance.staff@hospital.com', userName: 'Jane Accountant' },
      { dept: 'support', adminEmail: 'support.admin@hospital.com', adminName: 'Robert Hayes', supervisorEmail: 'support.supervisor@hospital.com', supervisorName: 'Maria Santos', userEmail: 'support.staff@hospital.com', userName: 'Carlos Housekeeper' },
      { dept: 'legal', adminEmail: 'legal.admin@hospital.com', adminName: 'Adv. Katherine Chase', supervisorEmail: 'legal.supervisor@hospital.com', supervisorName: 'Harvey Specter', userEmail: 'legal.staff@hospital.com', userName: 'Rachel Zane' },
      { dept: 'technical', adminEmail: 'technical.admin@hospital.com', adminName: 'Eng. Thomas Anderson', supervisorEmail: 'technical.supervisor@hospital.com', supervisorName: 'Grace Hopper', userEmail: 'technical.staff@hospital.com', userName: 'Alan Turing' }
    ];

    let empIndex = 2000;
    for (const p of deptPersonnel) {
      // Dept Admin
      let dAdmin = await User.findOne({ email: p.adminEmail });
      if (!dAdmin) {
        empIndex++;
        dAdmin = await User.create({
          employeeId: `EMP-${empIndex}`,
          name: p.adminName,
          email: p.adminEmail,
          passwordHash: defaultPasswordHash,
          role: 'admin',
          designation: `${p.dept.toUpperCase()} Department Head`,
          department: p.dept,
          phone: `+1 (555) ${empIndex}-0001`,
          authProvider: 'local',
          isActive: true,
          status: 'active',
          salary: 110000,
          createdBy: hrAdmin._id
        });
      }

      // Dept Supervisor
      let dSup = await User.findOne({ email: p.supervisorEmail });
      if (!dSup) {
        empIndex++;
        dSup = await User.create({
          employeeId: `EMP-${empIndex}`,
          name: p.supervisorName,
          email: p.supervisorEmail,
          passwordHash: defaultPasswordHash,
          role: 'supervisor',
          designation: `${p.dept.toUpperCase()} Team Lead`,
          department: p.dept,
          phone: `+1 (555) ${empIndex}-0002`,
          authProvider: 'local',
          isActive: true,
          status: 'active',
          salary: 80000,
          createdBy: hrAdmin._id
        });
      }

      // Dept Staff User
      let dUser = await User.findOne({ email: p.userEmail });
      if (!dUser) {
        empIndex++;
        dUser = await User.create({
          employeeId: `EMP-${empIndex}`,
          name: p.userName,
          email: p.userEmail,
          passwordHash: defaultPasswordHash,
          role: 'user',
          designation: `${p.dept.toUpperCase()} Staff Officer`,
          department: p.dept,
          phone: `+1 (555) ${empIndex}-0003`,
          authProvider: 'local',
          isActive: true,
          status: 'active',
          salary: 55000,
          createdBy: hrSupervisor._id
        });
      }

      // Update Department Head reference
      await Department.findOneAndUpdate({ code: p.dept }, { head: dAdmin._id });

      // Seed initial salary structures
      await Salary.findOneAndUpdate(
        { user_id: dAdmin._id },
        {
          user_id: dAdmin._id,
          user_name: dAdmin.name,
          department: p.dept,
          designation: dAdmin.designation,
          basic: 95000,
          allowances: 15000,
          deductions: 0,
          salary: 110000,
          effectiveFrom: new Date('2026-01-01'),
          currentRevision: 1,
          createdBy: hrAdmin._id,
          updatedBy: hrAdmin._id
        },
        { upsert: true }
      );
    }
    logger.info('[Seed] Department Admins, Supervisors, Staff, and Salaries seeded.');

    // 5. Seed Sample Medicines & Supplier
    let supplier = await Supplier.findOne({ name: 'Apex BioPharma Supplies Ltd' });
    if (!supplier) {
      supplier = await Supplier.create({
        name: 'Apex BioPharma Supplies Ltd',
        contactPerson: 'Gregory House',
        email: 'orders@apexbiopharma.com',
        phone: '+1 (800) 555-0199',
        address: '100 Medical Plaza, Pharma District'
      });
    }

    const medData = [
      { name: 'Amoxicillin Trihydrate', genericName: 'Amoxicillin', category: 'Antibiotics', dosageForm: 'Capsule', strength: '500mg', unitPrice: 12.5, currentStock: 450, isControlledSubstance: false },
      { name: 'Morphine Sulfate ER', genericName: 'Morphine', category: 'Analgesics', dosageForm: 'Injection', strength: '10mg/ml', unitPrice: 65.0, currentStock: 80, isControlledSubstance: true },
      { name: 'Paracetamol IV Infusion', genericName: 'Acetaminophen', category: 'Antipyretics', dosageForm: 'Infusion', strength: '1000mg/100ml', unitPrice: 8.0, currentStock: 25, reorderLevel: 50, isControlledSubstance: false }
    ];

    for (const m of medData) {
      const med = await Medicine.findOneAndUpdate({ name: m.name }, m, { upsert: true, new: true });
      await StockBatch.findOneAndUpdate(
        { medicine: med._id, batchNo: `BAT-${med.name.slice(0, 3).toUpperCase()}-01` },
        {
          medicine: med._id,
          batchNo: `BAT-${med.name.slice(0, 3).toUpperCase()}-01`,
          expiryDate: new Date('2027-06-30'),
          quantity: m.currentStock,
          remainingQuantity: m.currentStock,
          cost: m.unitPrice * 0.7,
          supplier: supplier._id,
          receivedBy: superAdmin._id
        },
        { upsert: true }
      );
    }
    logger.info('[Seed] Pharmacy formulary, controlled drugs & batches seeded.');

    // 6. Seed Finance Budgets
    const budgets = [
      { department: 'pharmacy', financialYear: '2026-2027', period: 'Annual', allocatedAmount: 500000, spentAmount: 64500, approvedBy: superAdmin._id },
      { department: 'technical', financialYear: '2026-2027', period: 'Annual', allocatedAmount: 750000, spentAmount: 112000, approvedBy: superAdmin._id },
      { department: 'security', financialYear: '2026-2027', period: 'Annual', allocatedAmount: 300000, spentAmount: 42000, approvedBy: superAdmin._id }
    ];
    for (const b of budgets) {
      await Budget.findOneAndUpdate({ department: b.department, period: b.period }, b, { upsert: true });
    }

    // 7. Seed Technical Assets
    const assets = [
      { assetTag: 'BIO-MRI-001', name: 'Magnetom 3T MRI Scanner', category: 'biomedical_device', serialNumber: 'SN-SIEM-99214', manufacturer: 'Siemens Healthineers', department: 'technical', location: 'Radiology Wing B', status: 'operational' },
      { assetTag: 'SRV-HOSP-001', name: 'Primary EHR Database Cluster Server', category: 'server', serialNumber: 'SN-DELL-88310', manufacturer: 'Dell PowerEdge', department: 'technical', location: 'Server Room Data Center', status: 'operational' }
    ];
    for (const a of assets) {
      await TechnicalAsset.findOneAndUpdate({ assetTag: a.assetTag }, a, { upsert: true });
    }

    // 8. Seed Compliance License & Legal Policy
    await ComplianceLicense.findOneAndUpdate(
      { licenseNumber: 'HOSP-LIC-2026-99' },
      {
        licenseName: 'State Level Comprehensive Clinical Establishment License',
        regulatoryBody: 'State Health & Safety Commission',
        licenseNumber: 'HOSP-LIC-2026-99',
        issueDate: new Date('2025-01-01'),
        expiryDate: new Date('2027-12-31'),
        renewalStatus: 'valid',
        managedBy: superAdmin._id
      },
      { upsert: true }
    );

    await LegalPolicy.findOneAndUpdate(
      { policyNumber: 'POL-HIPAA-001' },
      {
        policyNumber: 'POL-HIPAA-001',
        title: 'Hospital-Wide Patient Data Privacy & HIPAA Compliance Standard',
        category: 'data_privacy',
        version: '2.1',
        summary: 'Strict regulations regarding accessing, handling, and auditing confidential patient and employee data.',
        isPublished: true,
        publishedBy: superAdmin._id
      },
      { upsert: true }
    );

    // 9. Seed Sample Holidays
    const holidays = [
      { name: 'New Year Day', date: '2026-01-01', description: 'Hospital annual holiday', isRecurring: true },
      { name: 'National Health Workers Day', date: '2026-04-07', description: 'Honoring clinical and support teams', isRecurring: true }
    ];
    for (const h of holidays) {
      await Holiday.findOneAndUpdate({ date: h.date }, h, { upsert: true });
    }

    // 10. Seed Support Supplies
    const supplies = [
      { name: 'Hospital Grade Disinfectant (5L)', category: 'sanitation', currentStock: 85, unit: 'liters', reorderLevel: 20 },
      { name: 'N95 Respirator Masks (Box of 50)', category: 'ppe', currentStock: 120, unit: 'boxes', reorderLevel: 30 }
    ];
    for (const s of supplies) {
      await SupplyItem.findOneAndUpdate({ name: s.name }, s, { upsert: true });
    }

    logger.info('[Seed Success] Hospital database comprehensively populated with departments, staff, credentials, and modules!');
    process.exit(0);
  } catch (error) {
    logger.error(`[Seed Error] Failed to seed database: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

seedHospitalDatabase();
