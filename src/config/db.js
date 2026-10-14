const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    logger.info('[Database] Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    logger.error(`[Database Error] MongoDB Connection failed: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

module.exports = connectDB;

