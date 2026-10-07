require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const logger = require('./src/utils/logger');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('[Seed] Connected to MongoDB for database seeding...');

    // Clear existing users if requested or check if superadmin exists
    const superadminExists = await User.findOne({ role: 'superadmin' });
    if (superadminExists) {
      logger.info('[Seed] Superadmin user already exists. Clearing existing users to re-seed demo data...');
      await User.deleteMany({});
    } else {
      await User.deleteMany({});
    }

    const salt = await bcrypt.genSalt(10);
    const superadminPasswordHash = await bcrypt.hash('SuperAdmin123!', salt);
    const adminPasswordHash = await bcrypt.hash('Admin123!', salt);
    const doctorPasswordHash = await bcrypt.hash('Doctor123!', salt);
    const pharmacistPasswordHash = await bcrypt.hash('Pharmacist123!', salt);
    const compounderPasswordHash = await bcrypt.hash('Compounder123!', salt);

    const superAdminUser = await User.create({
      name: 'Chief Medical Director',
      email: 'superadmin@hospital.com',
      passwordHash: superadminPasswordHash,
      role: 'superadmin',
      designation: 'Administrator',
      department: 'Executive Board',
      phone: '+1 (555) 000-0001',
      authProvider: 'local',
      isActive: true,
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80'
    });

    const adminUser = await User.create({
      name: 'Hospital HR Manager',
      email: 'admin@hospital.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      designation: 'Administrator',
      department: 'Human Resources',
      phone: '+1 (555) 000-0002',
      authProvider: 'local',
      createdBy: superAdminUser._id,
      isActive: true,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    });

    const doctorUser = await User.create({
      name: 'Dr. Sarah Jenkins',
      email: 'doctor@hospital.com',
      passwordHash: doctorPasswordHash,
      role: 'user',
      designation: 'Doctor',
      department: 'Cardiology',
      phone: '+1 (555) 000-0003',
      authProvider: 'local',
      createdBy: superAdminUser._id,
      isActive: true,
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
    });

    const pharmacistUser = await User.create({
      name: 'Michael Chang',
      email: 'pharmacist@hospital.com',
      passwordHash: pharmacistPasswordHash,
      role: 'user',
      designation: 'Pharmacist',
      department: 'Pharmacy',
      phone: '+1 (555) 000-0004',
      authProvider: 'local',
      createdBy: adminUser._id,
      isActive: true,
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80'
    });

    const compounderUser = await User.create({
      name: 'Robert Vance',
      email: 'compounder@hospital.com',
      passwordHash: compounderPasswordHash,
      role: 'user',
      designation: 'Compounder',
      department: 'Emergency & OPD',
      phone: '+1 (555) 000-0005',
      authProvider: 'local',
      createdBy: adminUser._id,
      isActive: true,
      avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80'
    });

    logger.info(`[Seed Success] Created 5 initial hospital accounts with creator relationships:`);
    logger.info(`  1. SuperAdmin: superadmin@hospital.com (SuperAdmin)`);
    logger.info(`  2. Admin:      admin@hospital.com (Created by SuperAdmin)`);
    logger.info(`  3. Doctor:     doctor@hospital.com (Created by SuperAdmin)`);
    logger.info(`  4. Pharmacist: pharmacist@hospital.com (Created by Admin)`);
    logger.info(`  5. Compounder: compounder@hospital.com (Created by Admin)`);

    process.exit(0);
  } catch (error) {
    logger.error(`[Seed Error] Failed to seed database: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

seedUsers();


