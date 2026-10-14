require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Branch = require('../src/models/branch/Branch');
const User = require('../src/models/User');
const {
  Building,
  Floor,
  Ward,
  RoomType,
  Room,
  Bed
} = require('../src/models/facility/Facility');
const {
  Specialty,
  DoctorProfile,
  IcdCode,
  ProcedureCode,
  ServiceItem,
  Tariff,
  Payer
} = require('../src/models/clinical/ClinicalMasters');
const {
  BloodUnit,
  StoreItem
} = require('../src/models/clinical/SupportClinicalModels');
const logger = require('../src/utils/logger');

const seedClinicalData = async () => {
  try {
    await connectDB();
    console.log('[+] Connected to MongoDB for Clinical Data Seeding...');

    const superAdmin = await User.findOne({ role: 'superadmin' });
    const saId = superAdmin ? superAdmin._id : new mongoose.Types.ObjectId();

    // 1. Seed Two Branches
    console.log('[+] Seeding 2 Hospital Branches...');
    const branch1 = await Branch.findOneAndUpdate(
      { code: 'MPH-CEN' },
      {
        code: 'MPH-CEN',
        name: 'MediPulse Central Hospital',
        address: '100 Healthcare Boulevard, Central Medical City',
        phone: '+91-11-23456789',
        email: 'central@medipulse.org',
        timezone: 'Asia/Kolkata',
        invoicePrefix: 'INV-CEN',
        uhidPrefix: 'MPH-CEN',
        isMain: true,
        status: 'active',
        settings: {
          taxRegistrationNo: '07AAAAA0000A1Z5',
          licenseNumbers: ['DL-1002-CEN', 'CL-504-CEN'],
          workingHours: { start: '08:00', end: '20:00' },
          currency: 'INR'
        },
        modules: {
          bloodBank: true,
          radiology: true,
          laboratory: true,
          icu: true,
          operationTheatre: true,
          emergency: true,
          ambulance: true
        },
        createdBy: saId
      },
      { upsert: true, new: true }
    );

    const branch2 = await Branch.findOneAndUpdate(
      { code: 'MPH-SOU' },
      {
        code: 'MPH-SOU',
        name: 'MediPulse South Campus',
        address: '45 Knowledge Park, South Extension',
        phone: '+91-11-98765432',
        email: 'south@medipulse.org',
        timezone: 'Asia/Kolkata',
        invoicePrefix: 'INV-SOU',
        uhidPrefix: 'MPH-SOU',
        isMain: false,
        status: 'active',
        settings: {
          taxRegistrationNo: '07AAAAA0000A1Z6',
          licenseNumbers: ['DL-1003-SOU', 'CL-505-SOU'],
          workingHours: { start: '08:00', end: '20:00' },
          currency: 'INR'
        },
        modules: {
          bloodBank: false, // Blood bank central only
          radiology: true,
          laboratory: true,
          icu: true,
          operationTheatre: true,
          emergency: true,
          ambulance: true
        },
        createdBy: saId
      },
      { upsert: true, new: true }
    );

    // Update superAdmin and staff branch assignments
    if (superAdmin) {
      superAdmin.branchIds = [branch1._id, branch2._id];
      superAdmin.activeBranchId = branch1._id;
      await superAdmin.save();
    }

    console.log(`[✔] Branches Seeded: ${branch1.code} (Main), ${branch2.code}`);

    // 2. Seed Facility Hierarchy for Branch 1
    console.log('[+] Seeding Facility Hierarchy for Central Branch...');
    const bldgA = await Building.findOneAndUpdate(
      { code: 'BLD-A', branchId: branch1._id },
      { code: 'BLD-A', name: 'Clinical Sciences Tower', branchId: branch1._id, createdBy: saId },
      { upsert: true, new: true }
    );

    const floor1 = await Floor.findOneAndUpdate(
      { floorNumber: 1, buildingId: bldgA._id },
      { floorNumber: 1, name: 'First Floor - OPD & Diagnostics', buildingId: bldgA._id, branchId: branch1._id, createdBy: saId },
      { upsert: true, new: true }
    );

    const floor2 = await Floor.findOneAndUpdate(
      { floorNumber: 2, buildingId: bldgA._id },
      { floorNumber: 2, name: 'Second Floor - Inpatient & ICU', buildingId: bldgA._id, branchId: branch1._id, createdBy: saId },
      { upsert: true, new: true }
    );

    // Room Types
    const rtGeneral = await RoomType.findOneAndUpdate(
      { code: 'GEN' },
      { code: 'GEN', name: 'General Ward', baseRate: 1500, createdBy: saId },
      { upsert: true, new: true }
    );
    const rtSemiPrivate = await RoomType.findOneAndUpdate(
      { code: 'SEMI' },
      { code: 'SEMI', name: 'Semi-Private Room', baseRate: 3000, createdBy: saId },
      { upsert: true, new: true }
    );
    const rtPrivate = await RoomType.findOneAndUpdate(
      { code: 'PVT' },
      { code: 'PVT', name: 'Private Deluxe Room', baseRate: 6000, createdBy: saId },
      { upsert: true, new: true }
    );
    const rtIcu = await RoomType.findOneAndUpdate(
      { code: 'ICU' },
      { code: 'ICU', name: 'Intensive Care Unit', baseRate: 12000, isIcu: true, createdBy: saId },
      { upsert: true, new: true }
    );

    // Wards
    const wardGeneral = await Ward.findOneAndUpdate(
      { code: 'WARD-GEN-M', branchId: branch1._id },
      {
        code: 'WARD-GEN-M',
        name: 'General Male Ward',
        floorId: floor2._id,
        branchId: branch1._id,
        gender: 'male',
        totalBeds: 10,
        createdBy: saId
      },
      { upsert: true, new: true }
    );

    const wardIcu = await Ward.findOneAndUpdate(
      { code: 'WARD-ICU-01', branchId: branch1._id },
      {
        code: 'WARD-ICU-01',
        name: 'Cardiac Critical Care ICU',
        floorId: floor2._id,
        branchId: branch1._id,
        isIcu: true,
        totalBeds: 6,
        createdBy: saId
      },
      { upsert: true, new: true }
    );

    // Rooms
    const room101 = await Room.findOneAndUpdate(
      { roomNumber: 'R-201', branchId: branch1._id },
      {
        roomNumber: 'R-201',
        wardId: wardGeneral._id,
        roomTypeId: rtGeneral._id,
        branchId: branch1._id,
        status: 'active'
      },
      { upsert: true, new: true }
    );

    const roomIcu1 = await Room.findOneAndUpdate(
      { roomNumber: 'ICU-101', branchId: branch1._id },
      {
        roomNumber: 'ICU-101',
        wardId: wardIcu._id,
        roomTypeId: rtIcu._id,
        branchId: branch1._id,
        status: 'active'
      },
      { upsert: true, new: true }
    );

    // Beds
    const bedA1 = await Bed.findOneAndUpdate(
      { bedNo: 'BED-201-A', branchId: branch1._id },
      {
        bedNo: 'BED-201-A',
        wardId: wardGeneral._id,
        roomId: room101._id,
        branchId: branch1._id,
        status: 'available',
        type: 'general'
      },
      { upsert: true, new: true }
    );

    const bedA2 = await Bed.findOneAndUpdate(
      { bedNo: 'BED-201-B', branchId: branch1._id },
      {
        bedNo: 'BED-201-B',
        wardId: wardGeneral._id,
        roomId: room101._id,
        branchId: branch1._id,
        status: 'available',
        type: 'general'
      },
      { upsert: true, new: true }
    );

    const bedIcuA = await Bed.findOneAndUpdate(
      { bedNo: 'BED-ICU-1', branchId: branch1._id },
      {
        bedNo: 'BED-ICU-1',
        wardId: wardIcu._id,
        roomId: roomIcu1._id,
        branchId: branch1._id,
        status: 'available',
        type: 'icu',
        equipment: ['Ventilator-Drager-V500', 'Multipara-Monitor-Mindray-iM12', 'Infusion-Pump-Bbraun']
      },
      { upsert: true, new: true }
    );

    console.log(`[✔] Facility Tree Seeded: Beds ${bedA1.bedNo}, ${bedA2.bedNo}, ${bedIcuA.bedNo}`);

    // 3. Seed Specialties & Clinical Masters
    console.log('[+] Seeding Clinical Specialties, ICD Codes & Procedures...');
    const specCardio = await Specialty.findOneAndUpdate(
      { code: 'SPEC-CARD' },
      { code: 'SPEC-CARD', name: 'Cardiology', description: 'Cardiovascular and Heart Diseases', createdBy: saId },
      { upsert: true, new: true }
    );

    const specNeuro = await Specialty.findOneAndUpdate(
      { code: 'SPEC-NEUR' },
      { code: 'SPEC-NEUR', name: 'Neurology', description: 'Brain, Spine & Nervous System', createdBy: saId },
      { upsert: true, new: true }
    );

    const specGenMed = await Specialty.findOneAndUpdate(
      { code: 'SPEC-GMED' },
      { code: 'SPEC-GMED', name: 'General Medicine', description: 'Internal Medicine and Primary Care', createdBy: saId },
      { upsert: true, new: true }
    );

    // ICD-10 Codes
    const icds = [
      { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular' },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
      { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
      { code: 'I21.9', description: 'Acute myocardial infarction, unspecified', category: 'Cardiovascular' },
      { code: 'K29.7', description: 'Gastritis, unspecified', category: 'Gastroenterology' }
    ];
    for (const item of icds) {
      await IcdCode.findOneAndUpdate({ code: item.code }, { ...item, createdBy: saId }, { upsert: true });
    }

    // Procedure Codes
    const procs = [
      { code: '99213', name: 'Office or other outpatient visit, 20-29 mins', category: 'Consultation' },
      { code: '99214', name: 'Office or other outpatient visit, 30-39 mins', category: 'Consultation' },
      { code: '33533', name: 'Coronary artery bypass single arterial graft', category: 'Surgery' },
      { code: '85025', name: 'Complete blood count (CBC) with automated differential', category: 'Laboratory' },
      { code: '71046', name: 'Radiologic examination, chest; 2 views', category: 'Radiology' }
    ];
    for (const item of procs) {
      await ProcedureCode.findOneAndUpdate({ code: item.code }, { ...item, createdBy: saId }, { upsert: true });
    }

    // 4. Seed Doctors
    console.log('[+] Seeding Doctors Profiles & Users...');
    const bcrypt = require('bcryptjs');
    const doctorPasswordHash = await bcrypt.hash('Hospital123!', 10);

    const docUser1 = await User.findOneAndUpdate(
      { email: 'dr.sharma@hospital.com' },
      {
        employeeId: 'EMP-DOC-001',
        name: 'Dr. Rajesh Sharma, MD, DM',
        email: 'dr.sharma@hospital.com',
        passwordHash: doctorPasswordHash,
        role: 'doctor',
        department: 'doctors',
        designation: 'Senior Consultant Cardiologist',
        phone: '+91-9811122233',
        status: 'active',
        isActive: true,
        branchIds: [branch1._id, branch2._id],
        activeBranchId: branch1._id
      },
      { upsert: true, new: true }
    );

    const docProfile1 = await DoctorProfile.findOneAndUpdate(
      { userId: docUser1._id },
      {
        userId: docUser1._id,
        specialtyId: specCardio._id,
        registrationNo: 'MCI-DEL-2012-58472',
        qualifications: ['MBBS', 'MD (Gen Med)', 'DM (Cardiology)'],
        consultationFee: 1200,
        followUpDays: 7,
        privileges: [
          { procedureCode: '33533', procedureName: 'Coronary Artery Bypass', isIndependent: true },
          { procedureCode: 'ECHO-01', procedureName: 'Echocardiography 2D Doppler', isIndependent: true },
          { procedureCode: 'ICU-ADM', procedureName: 'ICU Critical Care Admissions', isIndependent: true }
        ]
      },
      { upsert: true, new: true }
    );

    const docUser2 = await User.findOneAndUpdate(
      { email: 'dr.patel@hospital.com' },
      {
        employeeId: 'EMP-DOC-002',
        name: 'Dr. Priya Patel, MD',
        email: 'dr.patel@hospital.com',
        passwordHash: doctorPasswordHash,
        role: 'doctor',
        department: 'doctors',
        designation: 'Consultant Physician & Internist',
        phone: '+91-9822233344',
        status: 'active',
        isActive: true,
        branchIds: [branch1._id],
        activeBranchId: branch1._id
      },
      { upsert: true, new: true }
    );

    const docProfile2 = await DoctorProfile.findOneAndUpdate(
      { userId: docUser2._id },
      {
        userId: docUser2._id,
        specialtyId: specGenMed._id,
        registrationNo: 'MCI-DEL-2015-89321',
        qualifications: ['MBBS', 'MD (Internal Medicine)'],
        consultationFee: 800,
        followUpDays: 5,
        branchIds: [branch1._id],
        privileges: [
          { procedureCode: 'GEN-ADM', procedureName: 'General Ward Admissions', isIndependent: true },
          { procedureCode: 'OPD-CONS', procedureName: 'Outpatient Consultations', isIndependent: true }
        ]
      },
      { upsert: true, new: true }
    );

    // 5. Seed Services, Tariffs & Payers
    console.log('[+] Seeding Clinical Services & Tariffs...');
    const srvConsult = await ServiceItem.findOneAndUpdate(
      { code: 'SRV-CONS-CARD' },
      {
        code: 'SRV-CONS-CARD',
        name: 'Cardiology Specialist Consultation',
        department: 'opd',
        category: 'consultation',
        basePrice: 1200,
        taxPercent: 0,
        createdBy: saId
      },
      { upsert: true, new: true }
    );

    const srvCbc = await ServiceItem.findOneAndUpdate(
      { code: 'SRV-LAB-CBC' },
      {
        code: 'SRV-LAB-CBC',
        name: 'Complete Blood Count (CBC) with ESR',
        department: 'lab',
        category: 'laboratory',
        basePrice: 450,
        taxPercent: 0,
        createdBy: saId
      },
      { upsert: true, new: true }
    );

    const srvXray = await ServiceItem.findOneAndUpdate(
      { code: 'SRV-RAD-XRAY' },
      {
        code: 'SRV-RAD-XRAY',
        name: 'Chest X-Ray Digital PA View',
        department: 'radiology',
        category: 'radiology',
        basePrice: 750,
        taxPercent: 0,
        createdBy: saId
      },
      { upsert: true, new: true }
    );

    const srvIcuRent = await ServiceItem.findOneAndUpdate(
      { code: 'SRV-BED-ICU' },
      {
        code: 'SRV-BED-ICU',
        name: 'ICU Critical Care Bed Charges (Per Day)',
        department: 'ipd',
        category: 'room_rent',
        basePrice: 12000,
        taxPercent: 5,
        createdBy: saId
      },
      { upsert: true, new: true }
    );

    // Payers
    const payerStar = await Payer.findOneAndUpdate(
      { code: 'STAR-HEALTH' },
      {
        code: 'STAR-HEALTH',
        name: 'Star Health and Allied Insurance',
        type: 'insurance_company',
        creditPeriodDays: 30,
        discountPercent: 10
      },
      { upsert: true, new: true }
    );

    // Tariffs
    await Tariff.findOneAndUpdate(
      { serviceId: srvConsult._id, payerCategory: 'general_cash', branchId: null },
      { serviceId: srvConsult._id, payerCategory: 'general_cash', branchId: null, price: 1200, effectiveFrom: new Date('2026-01-01') },
      { upsert: true }
    );

    await Tariff.findOneAndUpdate(
      { serviceId: srvCbc._id, payerCategory: 'general_cash', branchId: null },
      { serviceId: srvCbc._id, payerCategory: 'general_cash', branchId: null, price: 450, effectiveFrom: new Date('2026-01-01') },
      { upsert: true }
    );

    await Tariff.findOneAndUpdate(
      { serviceId: srvXray._id, payerCategory: 'general_cash', branchId: null },
      { serviceId: srvXray._id, payerCategory: 'general_cash', branchId: null, price: 750, effectiveFrom: new Date('2026-01-01') },
      { upsert: true }
    );

    await Tariff.findOneAndUpdate(
      { serviceId: srvIcuRent._id, payerCategory: 'general_cash', branchId: null },
      { serviceId: srvIcuRent._id, payerCategory: 'general_cash', branchId: null, price: 12000, effectiveFrom: new Date('2026-01-01') },
      { upsert: true }
    );

    // Insurance Category Tariff (discounted)
    await Tariff.findOneAndUpdate(
      { serviceId: srvConsult._id, payerCategory: 'insurance', branchId: null },
      { serviceId: srvConsult._id, payerCategory: 'insurance', branchId: null, price: 1000, effectiveFrom: new Date('2026-01-01') },
      { upsert: true }
    );

    await Tariff.findOneAndUpdate(
      { serviceId: srvCbc._id, payerCategory: 'insurance', branchId: null },
      { serviceId: srvCbc._id, payerCategory: 'insurance', branchId: null, price: 380, effectiveFrom: new Date('2026-01-01') },
      { upsert: true }
    );

    // 6. Seed Blood Bank Units & Store Items
    console.log('[+] Seeding Blood Bank Units & Store Items...');
    const bloodUnits = [
      { bagNo: 'BLD-2026-O-POS-01', bloodGroup: 'O+', component: 'prbc', expiryDate: new Date(Date.now() + 30 * 86400000), status: 'available', branchId: branch1._id },
      { bagNo: 'BLD-2026-A-POS-01', bloodGroup: 'A+', component: 'prbc', expiryDate: new Date(Date.now() + 25 * 86400000), status: 'available', branchId: branch1._id },
      { bagNo: 'BLD-2026-B-POS-01', bloodGroup: 'B+', component: 'platelets', expiryDate: new Date(Date.now() + 5 * 86400000), status: 'available', branchId: branch1._id }
    ];
    for (const b of bloodUnits) {
      await BloodUnit.findOneAndUpdate({ bagNo: b.bagNo }, b, { upsert: true });
    }

    const storeItems = [
      { itemCode: 'MED-GLV-01', name: 'Nitrile Examination Gloves (Medium)', category: 'consumables', unit: 'box_100', currentStock: 250, reorderLevel: 50, unitPrice: 350 },
      { itemCode: 'MED-SYR-05', name: 'Disposable Sterile Syringes 5ml', category: 'consumables', unit: 'pack_50', currentStock: 400, reorderLevel: 80, unitPrice: 180 },
      { itemCode: 'MED-CAN-20', name: 'IV Cannula 20G (Pink) with Port', category: 'surgical', unit: 'pcs', currentStock: 120, reorderLevel: 30, unitPrice: 45 }
    ];
    for (const s of storeItems) {
      await StoreItem.findOneAndUpdate({ itemCode: s.itemCode }, s, { upsert: true });
    }

    console.log('\n========================================================');
    console.log('  Clinical Masters Seeding Completed Successfully!      ');
    console.log(`  Branches: ${branch1.code} (${branch1._id}), ${branch2.code} (${branch2._id})`);
    console.log(`  Lead Cardiologist: Dr. Rajesh Sharma (${docUser1.email})`);
    console.log(`  Lead Internist: Dr. Priya Patel (${docUser2.email})`);
    console.log(`  Beds Configured: ${bedA1.bedNo}, ${bedA2.bedNo}, ${bedIcuA.bedNo}`);
    console.log('========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[-] Seeding error:', error.message, error.stack);
    process.exit(1);
  }
};

seedClinicalData();
