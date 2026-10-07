require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const logger = require('./src/utils/logger');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('[Seed] Connected to MongoDB for database seeding...');

    // Delete all existing users to ensure only one superadmin exists in the DB
    await User.deleteMany({});
    logger.info('[Seed] Cleared all existing users from the database.');

    const salt = await bcrypt.genSalt(10);
    const superadminPasswordHash = await bcrypt.hash('SuperAdmin123!', salt);

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

    logger.info(`[Seed Success] Only 1 user exists in database: SuperAdmin (${superAdminUser.email})`);

    process.exit(0);
  } catch (error) {
    logger.error(`[Seed Error] Failed to seed database: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

seedUsers();



