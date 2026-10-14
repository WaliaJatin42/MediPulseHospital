const cron = require('node-cron');
const Payroll = require('../models/Payroll');
const PayrollRun = require('../models/PayrollRun');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Salary = require('../models/Salary');
const Leave = require('../models/hr/Leave');
const PayrollPolicy = require('../models/payroll/PayrollPolicy');
const OvertimeRecord = require('../models/payroll/OvertimeRecord');
const Bonus = require('../models/payroll/Bonus');
const Advance = require('../models/payroll/Advance');
const Arrear = require('../models/payroll/Arrear');
const PayrollAdjustment = require('../models/payroll/PayrollAdjustment');
const StatutoryRule = require('../models/payroll/StatutoryRule');
const JobLock = require('../models/system/JobLock');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

/**
 * Run monthly payroll calculation with non-hardcoded policies, idempotency, and component breakdown
 */
const runMonthlyPayroll = async ({ month, isDryRun = false, caller = null, req = null }) => {
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  const [tYear, tMonth] = targetMonth.split('-').map(Number);
  const totalDaysInMonth = new Date(tYear, tMonth, 0).getDate();

  logger.info(`[Payroll Service] Initiating payroll run for month: ${targetMonth} (DryRun: ${isDryRun})`);

  // Idempotency: return existing run if one already exists
  if (!isDryRun) {
    const existingRun = await PayrollRun.findOne({
      month: targetMonth,
      status: { $in: ['approved', 'disbursed', 'calculated'] }
    });
    if (existingRun) {
      logger.info(`[Payroll Service] Idempotent hit: Returning existing payroll run ${existingRun.runId} for month ${targetMonth}`);
      return existingRun;
    }
  }

  // Distributed lock to prevent concurrent runs across cluster instances
  const lockKey = `payroll:${targetMonth}`;
  const lock = await JobLock.acquire(lockKey, 120000);
  if (!lock && !isDryRun) {
    throw new Error(`Concurrent payroll run in progress for ${targetMonth}. Lock acquisition failed.`);
  }

  try {
    // 1. Fetch effective Payroll Policy
    const targetDate = new Date(`${targetMonth}-01T00:00:00.000Z`);
    let policy = await PayrollPolicy.findOne({
      isActive: true,
      effectiveDate: { $lte: targetDate }
    }).sort({ effectiveDate: -1 });

    if (!policy) {
      // Default fallback policy
      policy = {
        workingHoursPerDay: 9,
        fullDayMinHours: 8,
        halfDayMinHours: 4,
        overtime: {
          enabled: true,
          rateMultiplier: 1.5,
          maxOvertimeHoursPerMonth: 40,
          requiresApproval: true
        },
        payableDaysFormula: 'calendarDays',
        rounding: { salaryRounding: 'round', nearestInteger: 1 }
      };
    }

    // 2. Fetch statutory rules
    const statutoryRules = await StatutoryRule.find({ isActive: true, effectiveFrom: { $lte: targetDate } });
    const pfRule = statutoryRules.find((r) => r.name.toLowerCase().includes('provident') || r.name.toLowerCase().includes('pf'));
    const esiRule = statutoryRules.find((r) => r.name.toLowerCase().includes('insurance') || r.name.toLowerCase().includes('esi'));

    const runId = `RUN-${targetMonth.replace('-', '')}-${Date.now().toString().slice(-6)}`;
    const users = await User.find({ isDeleted: { $ne: true }, status: { $ne: 'terminated' } });

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    const payslips = [];

    for (const user of users) {
      // Base salary & effective revision lookup
      let salaryDoc = await Salary.findOne({ user_id: user._id });
      let basicSalary = user.salary || 0;
      let allowances = 0;
      let regularDeductions = 0;

      if (salaryDoc) {
        if (salaryDoc.revisions && salaryDoc.revisions.length > 0) {
          const monthStart = new Date(`${targetMonth}-01T00:00:00Z`);
          const matchingRev = salaryDoc.revisions
            .slice()
            .reverse()
            .find((r) => r.effectiveFrom <= monthStart && (!r.effectiveUntil || r.effectiveUntil >= monthStart));

          if (matchingRev) {
            basicSalary = matchingRev.newSalary || matchingRev.basic;
            allowances = matchingRev.allowances || 0;
            regularDeductions = matchingRev.deductions || 0;
          } else {
            basicSalary = salaryDoc.basic || salaryDoc.salary;
            allowances = salaryDoc.allowances || 0;
            regularDeductions = salaryDoc.deductions || 0;
          }
        } else {
          basicSalary = salaryDoc.basic || salaryDoc.salary;
          allowances = salaryDoc.allowances || 0;
          regularDeductions = salaryDoc.deductions || 0;
        }
      }

      // Attendance evaluation
      const attendanceRecords = await Attendance.find({
        user: user._id,
        date: { $regex: `^${targetMonth}` }
      });

      let presentDays = 0;
      let halfDays = 0;
      let shortHoursDays = 0;

      for (const att of attendanceRecords) {
        if (att.status === 'present' || att.status === 'late') presentDays++;
        else if (att.status === 'half_day') halfDays++;
        else if (att.status === 'short_hours') shortHoursDays++;
      }

      // Approved leaves only (unapproved count as absent)
      const approvedLeaves = await Leave.find({
        $or: [{ user: user._id }, { userId: user._id }],
        status: 'approved',
        startDate: { $regex: `^${targetMonth}` }
      });
      const paidLeaveDays = approvedLeaves.reduce((acc, l) => acc + (l.totalDays || 0), 0);

      // Payable days formula
      const payableDays = Math.min(
        totalDaysInMonth,
        presentDays + halfDays * 0.5 + shortHoursDays * 0.5 + paidLeaveDays
      );
      const absentDays = Math.max(0, totalDaysInMonth - payableDays);

      const dailyGross = (basicSalary + allowances) / totalDaysInMonth;
      let proratedGross = Math.round(dailyGross * payableDays);

      // Overtime calculation
      let overtimeHours = 0;
      let overtimePay = 0;
      if (policy.overtime.enabled) {
        const otFilter = { userId: user._id, month: targetMonth };
        if (policy.overtime.requiresApproval) otFilter.status = 'approved';
        const otRecords = await OvertimeRecord.find(otFilter);

        const totalOtHrs = otRecords.reduce((sum, r) => sum + (r.approvedHours || r.hours || 0), 0);
        overtimeHours = Math.min(totalOtHrs, policy.overtime.maxOvertimeHoursPerMonth);

        const hourlyRate = (basicSalary / (totalDaysInMonth * (policy.workingHoursPerDay || 9)));
        overtimePay = Math.round(overtimeHours * hourlyRate * (policy.overtime.rateMultiplier || 1.5));
      }

      // Bonuses
      const bonuses = await Bonus.find({ userId: user._id, payMonth: targetMonth, status: { $in: ['approved', 'paid'] } });
      const bonusTotal = bonuses.reduce((sum, b) => sum + b.amount, 0);

      // Advances (auto-deducted)
      let advanceDeduction = 0;
      const activeAdvances = await Advance.find({
        userId: user._id,
        status: { $in: ['approved', 'disbursed'] },
        'schedule.month': targetMonth
      });

      for (const adv of activeAdvances) {
        const item = adv.schedule.find((s) => s.month === targetMonth && !s.isDeducted);
        if (item) {
          advanceDeduction += item.amount;
          if (!isDryRun) {
            item.isDeducted = true;
            item.deductedInRunId = runId;
            item.deductedAt = new Date();
            adv.remainingBalance = Math.max(0, adv.remainingBalance - item.amount);
            if (adv.remainingBalance === 0) adv.status = 'completed';
            await adv.save();
          }
        }
      }

      // Arrears
      const pendingArrears = await Arrear.find({ userId: user._id, status: 'pending' });
      const arrearTotal = pendingArrears.reduce((sum, a) => sum + a.amount, 0);
      if (!isDryRun && pendingArrears.length > 0) {
        await Arrear.updateMany({ userId: user._id, status: 'pending' }, { status: 'applied', appliedInRunId: runId });
      }

      // Adjustments (from locked month corrections or manual SA adjustments)
      const pendingAdjustments = await PayrollAdjustment.find({ userId: user._id, status: 'pending' });
      let adjustmentEarnings = 0;
      let adjustmentDeductions = 0;

      for (const adj of pendingAdjustments) {
        if (adj.type === 'earning' || adj.type === 'arrear') {
          adjustmentEarnings += adj.amount;
        } else if (adj.type === 'deduction') {
          adjustmentDeductions += adj.amount;
        }
      }
      if (!isDryRun && pendingAdjustments.length > 0) {
        await PayrollAdjustment.updateMany(
          { userId: user._id, status: 'pending' },
          { status: 'applied', appliedInRunId: runId, appliedAt: new Date() }
        );
      }

      // Statutory deductions (PF & ESI)
      let pfEmployee = 0;
      let pfEmployer = 0;
      if (pfRule) {
        const eligibleWage = pfRule.wageCeiling ? Math.min(basicSalary, pfRule.wageCeiling) : basicSalary;
        pfEmployee = Math.round((eligibleWage * pfRule.employeeRate) / 100);
        pfEmployer = Math.round((eligibleWage * pfRule.employerRate) / 100);
      }

      let esiEmployee = 0;
      let esiEmployer = 0;
      if (esiRule) {
        const eligibleWage = esiRule.wageCeiling ? Math.min(proratedGross, esiRule.wageCeiling) : proratedGross;
        esiEmployee = Math.round((eligibleWage * esiRule.employeeRate) / 100);
        esiEmployer = Math.round((eligibleWage * esiRule.employerRate) / 100);
      }

      const totalItemizedDeductions = regularDeductions + advanceDeduction + adjustmentDeductions + pfEmployee + esiEmployee;
      const totalItemizedEarnings = proratedGross + overtimePay + bonusTotal + arrearTotal + adjustmentEarnings;

      let netSalary = Math.max(0, totalItemizedEarnings - totalItemizedDeductions);

      // Rounding
      if (policy.rounding.salaryRounding === 'ceil') netSalary = Math.ceil(netSalary);
      else if (policy.rounding.salaryRounding === 'floor') netSalary = Math.floor(netSalary);
      else netSalary = Math.round(netSalary);

      totalGross += totalItemizedEarnings;
      totalDeductions += totalItemizedDeductions;
      totalNet += netSalary;

      const txnRef = `TXN-PAY-${targetMonth.replace('-', '')}-${user._id.toString().slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      payslips.push({
        runId,
        user_id: user._id,
        employeeId: user.employeeId || '',
        user_name: user.name,
        department: user.department,
        designation: user.designation,
        month: targetMonth,
        baseSalary: basicSalary,
        allowances,
        totalDaysInMonth,
        presentDays,
        halfDays,
        shortHoursDays,
        paidLeaveDays,
        absentDays,
        payableDays,
        grossSalary: totalItemizedEarnings,
        deductions: totalItemizedDeductions,
        calculatedSalary: netSalary,
        netSalary,
        overtimeHours,
        overtimePay,
        bonuses: bonusTotal,
        advancesDeducted: advanceDeduction,
        arrears: arrearTotal,
        adjustments: adjustmentEarnings - adjustmentDeductions,
        statutoryBreakdown: {
          pfEmployee,
          pfEmployer,
          insuranceEmployee: esiEmployee,
          insuranceEmployer: esiEmployer,
          tax: 0
        },
        status: isDryRun ? 'pending' : 'approved',
        disbursedAt: isDryRun ? null : new Date(),
        transactionReference: txnRef,
        processedAutomatically: !caller,
        isPayslipVisible: false,
        remarks: `Attendance: ${payableDays}/${totalDaysInMonth} days. OT: ${overtimeHours} hrs. Bonus: ${bonusTotal}. Advances: -${advanceDeduction}.`
      });
    }

    let savedRun = null;
    if (!isDryRun) {
      await Payroll.insertMany(payslips);

      savedRun = await PayrollRun.create({
        runId,
        month: targetMonth,
        status: 'approved',
        isDryRun: false,
        isLocked: false,
        totalEmployees: users.length,
        totalGross,
        totalDeductions,
        totalNet,
        createdBy: caller?._id || null,
        approvedBy: caller?._id || null,
        approvedAt: new Date(),
        disbursedAt: new Date()
      });

      if (caller) {
        await recordAuditLog({
          actor: caller,
          action: 'PAYROLL_RUN_EXECUTED',
          resource: 'payroll',
          resourceId: runId,
          after: savedRun.toJSON(),
          req
        });
      }
    }

    return {
      runId,
      month: targetMonth,
      totalEmployees: users.length,
      totalGross,
      totalDeductions,
      totalNet,
      payslipsCount: payslips.length,
      isDryRun,
      data: isDryRun ? payslips : savedRun
    };
  } finally {
    await JobLock.release(lockKey);
  }
};

/**
 * Scheduled cron job: Runs automatically at midnight on the 1st of every month
 */
const initPayrollScheduler = () => {
  cron.schedule('0 0 1 * *', async () => {
    logger.info('[Scheduler] Automatic monthly payroll cron triggered');
    try {
      const prevDate = new Date();
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevMonth = prevDate.toISOString().slice(0, 7);

      await runMonthlyPayroll({ month: prevMonth, isDryRun: false });
      logger.info(`[Scheduler] Automatic payroll for ${prevMonth} successfully processed.`);
    } catch (err) {
      logger.error(`[Scheduler Error] Automatic payroll failed: ${err.message}`);
    }
  });
};

module.exports = {
  runMonthlyPayroll,
  initPayrollScheduler
};
