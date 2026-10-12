require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const logger = require('./src/utils/logger');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('[Seed] Connected to MongoDB for database seeding check...');

    // Preserve existing users created by the user, only seed superadmin if missing
    const superadminExists = await User.findOne({ role: 'superadmin' });
    if (!superadminExists) {
      logger.info('[Seed] Superadmin user missing. Seeding initial superadmin account...');
      const salt = await bcrypt.genSalt(10);
      const superadminPasswordHash = await bcrypt.hash('SuperAdmin123!', salt);

      const superAdminUser = await User.create({
        name: 'Chief Medical Director',
        email: 'superadmin@hospital.com',
        passwordHash: superadminPasswordHash,
        role: 'superadmin',
        designation: 'Administrator',
        department: 'executive',
        phone: '+1 (555) 000-0001',
        authProvider: 'local',
        isActive: true,
        avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80'
      });

      logger.info(`[Seed Success] Created SuperAdmin account: ${superAdminUser.email}`);
    } else {
      logger.info('[Seed] Superadmin user already exists. Existing user accounts preserved.');
    }

    process.exit(0);
  } catch (error) {
    logger.error(`[Seed Error] Failed to seed database: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

seedUsers();
