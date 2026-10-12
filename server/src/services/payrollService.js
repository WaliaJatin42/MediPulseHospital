const cron = require('node-cron');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const logger = require('../utils/logger');

/**
 * Calculate and disburse monthly salary based on employee attendance records.
 * @param {string} targetMonth - Format 'YYYY-MM' (e.g. '2026-09'). Defaults to previous month if not provided.
 * @param {object} options - Execution options (forceRecalculate, processedAutomatically, grantFullIfNoRecords)
 */
const calculateAndDisburseMonthlyPayroll = async (targetMonth = null, options = {}) => {
  try {
    const now = new Date();

    // If targetMonth is not specified, default to previous month
    if (!targetMonth) {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevDate.getFullYear();
      const monthNum = String(prevDate.getMonth() + 1).padStart(2, '0');
      targetMonth = `${year}-${monthNum}`;
    }

    const [tYear, tMonth] = targetMonth.split('-').map(Number);
    const totalDaysInMonth = new Date(tYear, tMonth, 0).getDate();

    logger.info(`[Payroll Service] Starting monthly payroll execution for month: ${targetMonth} (Days in month: ${totalDaysInMonth})`);

    // Fetch all active users
    const users = await User.find({ isDeleted: { $ne: true } });
    if (!users || users.length === 0) {
      logger.warn('[Payroll Service] No active users found in the system to process payroll.');
      return { success: true, message: 'No active users found', month: targetMonth, processed: 0 };
    }

    let processedCount = 0;
    let skippedCount = 0;
    let totalDisbursed = 0;
    const records = [];

    for (const user of users) {
      // Check if already processed for this user and month
      const existing = await Payroll.findOne({ user_id: user._id, month: targetMonth });
      if (existing && !options.forceRecalculate) {
        skippedCount++;
        continue;
      }

      // Fetch base salary from user or salary collection
      let baseSalary = Number(user.salary) || 0;
      if (baseSalary === 0) {
        const salaryDoc = await Salary.findOne({ user_id: user._id });
        if (salaryDoc && salaryDoc.salary > 0) {
          baseSalary = salaryDoc.salary;
        }
      }

      // Query attendance records for this user for target month (matching date prefix 'YYYY-MM')
      const attendanceRecords = await Attendance.find({
        user: user._id,
        date: { $regex: `^${targetMonth}` }
      });

      let presentDays = 0;
      let halfDays = 0;
      let shortHoursDays = 0;

      for (const att of attendanceRecords) {
        if (att.status === 'present') {
          presentDays++;
        } else if (att.status === 'half_day') {
          halfDays++;
        } else if (att.status === 'short_hours') {
          shortHoursDays++;
        } else if (att.status === 'punched_in') {
          halfDays++; // partial credit if never punched out
        }
      }

      // Payable days formula: present + (half_day * 0.5) + (short_hours * 0.5)
      let payableDays = presentDays + (halfDays * 0.5) + (shortHoursDays * 0.5);
      let absentDays = Math.max(0, totalDaysInMonth - attendanceRecords.length);

      // If user had zero attendance recorded and option grantFullIfNoRecords is enabled
      if (attendanceRecords.length === 0 && options.grantFullIfNoRecords) {
        payableDays = totalDaysInMonth;
        absentDays = 0;
      }

      // Calculate attendance-based salary: (baseSalary / totalDaysInMonth) * payableDays
      const dailyRate = baseSalary > 0 ? baseSalary / totalDaysInMonth : 0;
      const calculatedSalary = Math.round(dailyRate * payableDays);
      const deductions = Math.max(0, baseSalary - calculatedSalary);

      const txnRef = `TXN-PAY-${targetMonth.replace('-', '')}-${user._id.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      const payrollRecord = await Payroll.findOneAndUpdate(
        { user_id: user._id, month: targetMonth },
        {
          user_name: user.name,
          department: user.department,
          designation: user.designation,
          month: targetMonth,
          baseSalary,
          totalDaysInMonth,
          presentDays,
          halfDays,
          shortHoursDays,
          absentDays,
          payableDays,
          calculatedSalary,
          deductions,
          status: 'paid',
          disbursedAt: new Date(),
          transactionReference: existing?.transactionReference || txnRef,
          processedAutomatically: options.processedAutomatically !== undefined ? options.processedAutomatically : true,
          remarks: `Calculated on attendance: ${payableDays} payable days (${presentDays} present, ${halfDays} half-day, ${shortHoursDays} short-hours). Disbursed to account.`
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      processedCount++;
      totalDisbursed += calculatedSalary;
      records.push(payrollRecord);

      logger.info(`[Payroll Service] Processed for ${user.email} (${user.name}): Base ${baseSalary}, Payable ${payableDays}/${totalDaysInMonth} days, Net Disbursed: ${calculatedSalary} (Ref: ${payrollRecord.transactionReference})`);
    }

    logger.info(`[Payroll Service] Execution finished for ${targetMonth}: Processed ${processedCount}, Skipped ${skippedCount}, Total Amount Disbursed: ${totalDisbursed}`);

    return {
      success: true,
      month: targetMonth,
      totalUsers: users.length,
      processedCount,
      skippedCount,
      totalDisbursed,
      records
    };
  } catch (error) {
    logger.error(`[Payroll Service Error] calculateAndDisburseMonthlyPayroll failed: ${error.message}`, { stack: error.stack });
    throw error;
  }
};

/**
 * Initialize automatic cron scheduler and check date 1 on server startup
 */
const initPayrollScheduler = () => {
  logger.info('[Payroll Scheduler] Initializing Payroll Scheduler...');

  // 1. Immediate startup check: Check if today is the 1st of the month
  const today = new Date();
  const dayOfMonth = today.getDate();
  logger.info(`[Payroll Scheduler] Current server date: ${today.toISOString().split('T')[0]} (Day of month: ${dayOfMonth})`);

  if (dayOfMonth === 1) {
    logger.info('[Payroll Scheduler] Today is the 1st of the month! Triggering automatic monthly payroll calculation...');
    calculateAndDisburseMonthlyPayroll(null, { processedAutomatically: true })
      .then(res => {
        logger.info(`[Payroll Scheduler] Startup 1st-of-month payroll execution completed: ${res.processedCount} records processed.`);
      })
      .catch(err => {
        logger.error(`[Payroll Scheduler Error] Startup 1st-of-month payroll execution failed: ${err.message}`);
      });
  } else {
    logger.info(`[Payroll Scheduler] Today is day ${dayOfMonth} of the month. Next automatic execution scheduled for date 01 at 00:00.`);
  }

  // 2. Cron Job: Runs at 00:00 on day 1 of every month (0 0 1 * *)
  cron.schedule('0 0 1 * *', async () => {
    try {
      logger.info('[Payroll Cron] Triggered monthly scheduled payroll on date 01 at 00:00...');
      const result = await calculateAndDisburseMonthlyPayroll(null, { processedAutomatically: true });
      logger.info(`[Payroll Cron] Monthly payroll completed successfully: ${result.processedCount} employees paid for month ${result.month}. Total Disbursed: ${result.totalDisbursed}`);
    } catch (err) {
      logger.error(`[Payroll Cron Error] Scheduled payroll failed on date 01: ${err.message}`);
    }
  });

  logger.info('[Payroll Scheduler] Monthly Cron job active: Configured to fire on date 01 of every month at 00:00.');
};

module.exports = {
  calculateAndDisburseMonthlyPayroll,
  initPayrollScheduler
};
