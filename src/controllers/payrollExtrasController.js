const PayrollPolicy = require('../models/payroll/PayrollPolicy');
const SalaryComponent = require('../models/payroll/SalaryComponent');
const TaxSlab = require('../models/payroll/TaxSlab');
const StatutoryRule = require('../models/payroll/StatutoryRule');
const OvertimeRecord = require('../models/payroll/OvertimeRecord');
const Bonus = require('../models/payroll/Bonus');
const Advance = require('../models/payroll/Advance');
const Reimbursement = require('../models/payroll/Reimbursement');
const Arrear = require('../models/payroll/Arrear');
const PayrollAdjustment = require('../models/payroll/PayrollAdjustment');
const Payroll = require('../models/Payroll');
const PayrollRun = require('../models/PayrollRun');
const User = require('../models/User');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// ----------------- 1.1 PAYROLL POLICY -----------------

const createPayrollPolicy = async (req, res, next) => {
  try {
    const existingCount = await PayrollPolicy.countDocuments();
    const version = existingCount + 1;

    const policy = await PayrollPolicy.create({
      ...req.body,
      version,
      createdBy: req.user._id,
      isActive: req.body.isActive || false
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_PAYROLL_POLICY',
      resource: 'payroll_policies',
      resourceId: policy._id.toString(),
      after: policy.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: `Payroll policy version ${version} created`,
      data: policy
    });
  } catch (error) {
    logger.error(`[Payroll Policy Error] ${error.message}`);
    next(error);
  }
};

const getPayrollPolicies = async (req, res, next) => {
  try {
    const policies = await PayrollPolicy.find().sort({ version: -1 });
    res.status(200).json({ success: true, count: policies.length, data: policies });
  } catch (error) {
    logger.error(`[Payroll Policy Error] ${error.message}`);
    next(error);
  }
};

const getActivePayrollPolicy = async (req, res, next) => {
  try {
    let policy = await PayrollPolicy.findOne({ isActive: true }).sort({ effectiveDate: -1 });
    if (!policy) {
      // Create initial active policy if none exists
      policy = await PayrollPolicy.create({
        version: 1,
        effectiveDate: new Date(),
        isActive: true,
        workingHoursPerDay: 9,
        fullDayMinHours: 8,
        halfDayMinHours: 4,
        graceMinutes: 15,
        lateMarksPerHalfDay: 3,
        weeklyOffDays: ['Sunday'],
        overtime: {
          enabled: true,
          thresholdHours: 9,
          rateMultiplier: 1.5,
          weeklyOffMultiplier: 2.0,
          holidayMultiplier: 2.0,
          maxOvertimeHoursPerMonth: 40,
          requiresApproval: true
        },
        leaveTreatment: {
          casual: 'paid',
          sick: 'paid',
          earned: 'paid',
          unpaid: 'unpaid'
        },
        payableDaysFormula: 'calendarDays',
        rounding: { salaryRounding: 'round', nearestInteger: 1 }
      });
    }

    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    logger.error(`[Payroll Policy Error] ${error.message}`);
    next(error);
  }
};

const getPayrollPolicyById = async (req, res, next) => {
  try {
    const policy = await PayrollPolicy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({ success: false, message: 'Payroll policy not found' });
    }
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    logger.error(`[Payroll Policy Error] ${error.message}`);
    next(error);
  }
};

const activatePayrollPolicy = async (req, res, next) => {
  try {
    const targetPolicy = await PayrollPolicy.findById(req.params.id);
    if (!targetPolicy) {
      return res.status(404).json({ success: false, message: 'Payroll policy not found' });
    }

    // Deactivate previous active policies
    await PayrollPolicy.updateMany({}, { isActive: false });
    targetPolicy.isActive = true;
    await targetPolicy.save();

    await recordAuditLog({
      actor: req.user,
      action: 'ACTIVATE_PAYROLL_POLICY',
      resource: 'payroll_policies',
      resourceId: targetPolicy._id.toString(),
      after: { version: targetPolicy.version, isActive: true },
      req
    });

    res.status(200).json({
      success: true,
      message: `Payroll policy version ${targetPolicy.version} is now active`,
      data: targetPolicy
    });
  } catch (error) {
    logger.error(`[Payroll Policy Error] ${error.message}`);
    next(error);
  }
};

// ----------------- 1.4 OVERTIME -----------------

const getOvertimeRecords = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'user') filter.userId = req.user._id;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.month) filter.month = req.query.month;
    if (req.query.status) filter.status = req.query.status;

    const records = await OvertimeRecord.find(filter)
      .populate('userId', 'name email employeeId department designation')
      .sort({ date: -1 });

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    logger.error(`[Overtime Error] ${error.message}`);
    next(error);
  }
};

const requestOvertime = async (req, res, next) => {
  try {
    const { date, hours, reason, userId } = req.body;
    const targetUserId = userId || req.user._id;

    if (!date || !hours) {
      return res.status(400).json({ success: false, message: 'date and hours are required' });
    }

    const month = date.substring(0, 7);
    const ot = await OvertimeRecord.create({
      userId: targetUserId,
      date,
      month,
      hours: Number(hours),
      reason: reason || 'Shift overtime duty',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Overtime request submitted for supervisor approval',
      data: ot
    });
  } catch (error) {
    logger.error(`[Overtime Error] ${error.message}`);
    next(error);
  }
};

const decideOvertime = async (req, res, next) => {
  try {
    const decision = req.body.decision || req.body.status;
    const { remarks, approvedHours } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be approved or rejected' });
    }

    const ot = await OvertimeRecord.findById(req.params.id);
    if (!ot) {
      return res.status(404).json({ success: false, message: 'Overtime record not found' });
    }

    ot.status = decision;
    if (decision === 'approved') {
      ot.approvedHours = approvedHours !== undefined ? Number(approvedHours) : ot.hours;
    }
    ot.approvals.push({
      level: req.user.role,
      approverId: req.user._id,
      decision,
      remarks: remarks || '',
      decidedAt: new Date()
    });
    await ot.save();

    res.status(200).json({
      success: true,
      message: `Overtime request ${decision}`,
      data: ot
    });
  } catch (error) {
    logger.error(`[Overtime Error] ${error.message}`);
    next(error);
  }
};

const getOvertimeSummary = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7);
    const records = await OvertimeRecord.find({ month, status: 'approved' });

    const totalHours = records.reduce((sum, r) => sum + (r.approvedHours || r.hours || 0), 0);
    const totalStaff = new Set(records.map((r) => r.userId.toString())).size;

    res.status(200).json({
      success: true,
      month,
      summary: {
        totalRecords: records.length,
        totalApprovedHours: totalHours,
        totalStaffCount: totalStaff
      }
    });
  } catch (error) {
    logger.error(`[Overtime Error] ${error.message}`);
    next(error);
  }
};

// ----------------- 1.5 COMPONENTS, SLABS, STATUTORY -----------------

const createSalaryComponent = async (req, res, next) => {
  try {
    const component = await SalaryComponent.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Salary component created', data: component });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Component already exists' });
    logger.error(`[Salary Component Error] ${error.message}`);
    next(error);
  }
};

const getSalaryComponents = async (req, res, next) => {
  try {
    const components = await SalaryComponent.find({ isActive: true });
    res.status(200).json({ success: true, count: components.length, data: components });
  } catch (error) {
    logger.error(`[Salary Component Error] ${error.message}`);
    next(error);
  }
};

const updateSalaryComponent = async (req, res, next) => {
  try {
    const component = await SalaryComponent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!component) return res.status(404).json({ success: false, message: 'Component not found' });
    res.status(200).json({ success: true, message: 'Component updated', data: component });
  } catch (error) {
    logger.error(`[Salary Component Error] ${error.message}`);
    next(error);
  }
};

const createTaxSlab = async (req, res, next) => {
  try {
    let { slabs, ...rest } = req.body;
    if (Array.isArray(slabs)) {
      slabs = slabs.map((s) => ({
        from: s.from !== undefined ? s.from : (s.minIncome !== undefined ? s.minIncome : 0),
        to: s.to !== undefined ? s.to : (s.maxIncome !== undefined ? s.maxIncome : null),
        ratePercent: s.ratePercent !== undefined ? s.ratePercent : (s.rate !== undefined ? s.rate : 0)
      }));
    }
    const taxSlab = await TaxSlab.findOneAndUpdate(
      { financialYear: req.body.financialYear, regime: req.body.regime || 'new' },
      { ...rest, slabs, createdBy: req.user._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, message: 'Tax slab created', data: taxSlab });
  } catch (error) {
    logger.error(`[Tax Slab Error] ${error.message}`);
    next(error);
  }
};

const getTaxSlabs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.financialYear) filter.financialYear = req.query.financialYear;
    const slabs = await TaxSlab.find(filter);
    res.status(200).json({ success: true, count: slabs.length, data: slabs });
  } catch (error) {
    logger.error(`[Tax Slab Error] ${error.message}`);
    next(error);
  }
};

const createStatutoryRule = async (req, res, next) => {
  try {
    const rule = await StatutoryRule.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Statutory rule created', data: rule });
  } catch (error) {
    logger.error(`[Statutory Rule Error] ${error.message}`);
    next(error);
  }
};

const getStatutoryRules = async (req, res, next) => {
  try {
    const rules = await StatutoryRule.find({ isActive: true });
    res.status(200).json({ success: true, count: rules.length, data: rules });
  } catch (error) {
    logger.error(`[Statutory Rule Error] ${error.message}`);
    next(error);
  }
};

const getStatutoryReport = async (req, res, next) => {
  try {
    const { runId } = req.params;
    const payslips = await Payroll.find({ runId });

    let totalPfEmployee = 0;
    let totalPfEmployer = 0;
    let totalEsiEmployee = 0;
    let totalEsiEmployer = 0;

    payslips.forEach((p) => {
      totalPfEmployee += p.statutoryBreakdown?.pfEmployee || 0;
      totalPfEmployer += p.statutoryBreakdown?.pfEmployer || 0;
      totalEsiEmployee += p.statutoryBreakdown?.insuranceEmployee || 0;
      totalEsiEmployer += p.statutoryBreakdown?.insuranceEmployer || 0;
    });

    res.status(200).json({
      success: true,
      runId,
      report: {
        totalEmployees: payslips.length,
        providentFund: {
          employeeContribution: totalPfEmployee,
          employerContribution: totalPfEmployer,
          total: totalPfEmployee + totalPfEmployer
        },
        employeeStateInsurance: {
          employeeContribution: totalEsiEmployee,
          employerContribution: totalEsiEmployer,
          total: totalEsiEmployee + totalEsiEmployer
        },
        grandTotalContributions: totalPfEmployee + totalPfEmployer + totalEsiEmployee + totalEsiEmployer
      }
    });
  } catch (error) {
    logger.error(`[Statutory Report Error] ${error.message}`);
    next(error);
  }
};

// ----------------- 1.6 SALARY EXTRAS -----------------

const createBonus = async (req, res, next) => {
  try {
    const { userId, amount, type, payMonth, reason } = req.body;
    if (!userId || !amount || !payMonth || !reason) {
      return res.status(400).json({ success: false, message: 'userId, amount, payMonth, and reason are required' });
    }

    const bonus = await Bonus.create({
      userId,
      amount: Number(amount),
      type: type || 'performance',
      payMonth,
      reason,
      status: 'approved',
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Bonus created', data: bonus });
  } catch (error) {
    logger.error(`[Bonus Error] ${error.message}`);
    next(error);
  }
};

const getBonuses = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'user') filter.userId = req.user._id;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.month) filter.payMonth = req.query.month;

    const bonuses = await Bonus.find(filter).populate('userId', 'name email employeeId department');
    res.status(200).json({ success: true, count: bonuses.length, data: bonuses });
  } catch (error) {
    logger.error(`[Bonus Error] ${error.message}`);
    next(error);
  }
};

const requestAdvance = async (req, res, next) => {
  try {
    const { amount, installments = 1, startMonth } = req.body;
    if (!amount || !startMonth) {
      return res.status(400).json({ success: false, message: 'amount and startMonth (YYYY-MM) are required' });
    }

    const numAmount = Number(amount);
    const numInstallments = Math.max(1, Number(installments));
    const monthlyDeduction = Math.round(numAmount / numInstallments);

    const [sYear, sMonth] = startMonth.split('-').map(Number);
    const schedule = [];
    for (let i = 0; i < numInstallments; i++) {
      const d = new Date(sYear, sMonth - 1 + i, 1);
      const mStr = d.toISOString().substring(0, 7);
      schedule.push({ month: mStr, amount: monthlyDeduction, isDeducted: false });
    }

    const advance = await Advance.create({
      userId: req.user._id,
      amount: numAmount,
      installments: numInstallments,
      monthlyDeduction,
      startMonth,
      remainingBalance: numAmount,
      schedule,
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Advance requested successfully', data: advance });
  } catch (error) {
    logger.error(`[Advance Error] ${error.message}`);
    next(error);
  }
};

const getAdvances = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    const advances = await Advance.find(filter).populate('userId', 'name email employeeId department');
    res.status(200).json({ success: true, count: advances.length, data: advances });
  } catch (error) {
    logger.error(`[Advance Error] ${error.message}`);
    next(error);
  }
};

const getMyAdvances = async (req, res, next) => {
  try {
    const advances = await Advance.find({ userId: req.user._id });
    res.status(200).json({ success: true, count: advances.length, data: advances });
  } catch (error) {
    logger.error(`[My Advances Error] ${error.message}`);
    next(error);
  }
};

const decideAdvance = async (req, res, next) => {
  try {
    const { disburse } = req.body;
    const advance = await Advance.findById(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });

    const decision = req.body.decision || req.body.status;
    if (disburse) {
      advance.status = 'disbursed';
      advance.disbursedBy = req.user._id;
      advance.disbursedAt = new Date();
    } else if (decision) {
      advance.status = decision;
      advance.approvedBy = req.user._id;
    }
    await advance.save();

    res.status(200).json({ success: true, message: `Advance status updated to ${advance.status}`, data: advance });
  } catch (error) {
    logger.error(`[Advance Error] ${error.message}`);
    next(error);
  }
};

const getAdvanceSchedule = async (req, res, next) => {
  try {
    const advance = await Advance.findById(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });

    res.status(200).json({
      success: true,
      amount: advance.amount,
      remainingBalance: advance.remainingBalance,
      schedule: advance.schedule,
      data: advance.schedule
    });
  } catch (error) {
    logger.error(`[Advance Schedule Error] ${error.message}`);
    next(error);
  }
};

const submitReimbursement = async (req, res, next) => {
  try {
    const { amount, category, description, receiptUrl } = req.body;
    if (!amount || !description) {
      return res.status(400).json({ success: false, message: 'amount and description are required' });
    }

    const reimbursement = await Reimbursement.create({
      userId: req.user._id,
      amount: Number(amount),
      category: category || 'duty',
      description,
      receiptUrl: receiptUrl || '',
      status: 'pending'
    });

    res.status(201).json({ success: true, message: 'Reimbursement submitted', data: reimbursement });
  } catch (error) {
    logger.error(`[Reimbursement Error] ${error.message}`);
    next(error);
  }
};

const getReimbursements = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'user') filter.userId = req.user._id;
    if (req.query.userId) filter.userId = req.query.userId;
    const items = await Reimbursement.find(filter).populate('userId', 'name email employeeId department');
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    logger.error(`[Reimbursement Error] ${error.message}`);
    next(error);
  }
};

const decideReimbursement = async (req, res, next) => {
  try {
    const { decision, remarks } = req.body;
    const item = await Reimbursement.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Reimbursement not found' });

    item.status = decision;
    item.remarks = remarks || '';
    if (req.user.department === 'finance') item.financeApproverId = req.user._id;
    else item.deptApproverId = req.user._id;
    await item.save();

    res.status(200).json({ success: true, message: `Reimbursement marked as ${decision}`, data: item });
  } catch (error) {
    logger.error(`[Reimbursement Error] ${error.message}`);
    next(error);
  }
};

const createArrear = async (req, res, next) => {
  try {
    const { userId, fromMonth, toMonth, amount, reason } = req.body;
    if (!userId || !fromMonth || !toMonth || !amount || !reason) {
      return res.status(400).json({ success: false, message: 'userId, fromMonth, toMonth, amount, and reason are required' });
    }

    const arrear = await Arrear.create({
      userId,
      fromMonth,
      toMonth,
      amount: Number(amount),
      reason,
      status: 'pending',
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Arrear created for next payroll cycle', data: arrear });
  } catch (error) {
    logger.error(`[Arrear Error] ${error.message}`);
    next(error);
  }
};

const createPayrollAdjustment = async (req, res, next) => {
  try {
    const { userId, month, type, amount, reason } = req.body;
    if (!userId || !month || !type || !amount || !reason) {
      return res.status(400).json({ success: false, message: 'userId, month, type, amount, and reason are required' });
    }

    const adjustment = await PayrollAdjustment.create({
      userId,
      month,
      type,
      amount: Number(amount),
      reason,
      status: 'pending',
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'One-off adjustment created', data: adjustment });
  } catch (error) {
    logger.error(`[Adjustment Error] ${error.message}`);
    next(error);
  }
};

const getPendingAdjustments = async (req, res, next) => {
  try {
    const adjustments = await PayrollAdjustment.find({ status: 'pending' })
      .populate('userId', 'name email employeeId department');
    res.status(200).json({ success: true, count: adjustments.length, data: adjustments });
  } catch (error) {
    logger.error(`[Adjustment Error] ${error.message}`);
    next(error);
  }
};

// ----------------- 1.8 RUN LOCK / UNLOCK -----------------

const lockPayrollRun = async (req, res, next) => {
  try {
    const run = await PayrollRun.findOne({ runId: req.params.runId });
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    run.isLocked = true;
    run.lockedBy = req.user._id;
    run.lockedAt = new Date();
    await run.save();

    await recordAuditLog({
      actor: req.user,
      action: 'LOCK_PAYROLL_RUN',
      resource: 'payroll_runs',
      resourceId: run.runId,
      after: { isLocked: true },
      req
    });

    res.status(200).json({ success: true, message: `Payroll run ${run.runId} is now locked.`, data: run });
  } catch (error) {
    logger.error(`[Lock Payroll Error] ${error.message}`);
    next(error);
  }
};

const unlockPayrollRun = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Mandatory unlock reason is required to unlock a finalized payroll run.' });
    }

    const run = await PayrollRun.findOne({ runId: req.params.runId });
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    run.isLocked = false;
    run.unlockReason = reason;
    await run.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UNLOCK_PAYROLL_RUN',
      resource: 'payroll_runs',
      resourceId: run.runId,
      after: { isLocked: false, unlockReason: reason },
      req
    });

    res.status(200).json({ success: true, message: `Payroll run ${run.runId} unlocked with reason: ${reason}`, data: run });
  } catch (error) {
    logger.error(`[Unlock Payroll Error] ${error.message}`);
    next(error);
  }
};

// ----------------- 4.4 REPORTS & PAYSLIPS -----------------

const publishPayslips = async (req, res, next) => {
  try {
    const run = await PayrollRun.findOne({ runId: req.params.runId });
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    run.payslipsPublished = true;
    run.publishedAt = new Date();
    await run.save();

    await Payroll.updateMany({ runId: run.runId }, { isPayslipVisible: true });

    await recordAuditLog({
      actor: req.user,
      action: 'PUBLISH_PAYSLIPS',
      resource: 'payroll_runs',
      resourceId: run.runId,
      req
    });

    res.status(200).json({
      success: true,
      message: `Payslips for payroll run ${run.runId} published and visible to staff.`
    });
  } catch (error) {
    logger.error(`[Publish Payslips Error] ${error.message}`);
    next(error);
  }
};

const exportPayrollRun = async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;
    const payslips = await Payroll.find({ runId: req.params.runId });

    if (format === 'csv') {
      const header = 'Employee ID,Name,Department,Designation,Month,Gross Salary,Deductions,Net Salary\n';
      const rows = payslips
        .map((p) => `"${p.employeeId}","${p.user_name}","${p.department}","${p.designation}","${p.month}",${p.grossSalary},${p.deductions},${p.netSalary}`)
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payroll-${req.params.runId}.csv"`);
      return res.status(200).send(header + rows);
    }

    res.status(200).json({ success: true, format, data: payslips });
  } catch (error) {
    logger.error(`[Export Payroll Error] ${error.message}`);
    next(error);
  }
};

const getBankFile = async (req, res, next) => {
  try {
    const payslips = await Payroll.find({ runId: req.params.runId }).populate('user_id', 'bankAccount bankIfsc');
    const records = payslips.map((p) => ({
      beneficiaryName: p.user_name,
      accountNumber: p.user_id?.bankAccount || '9876543210',
      ifscCode: p.user_id?.bankIfsc || 'HOSP0001234',
      amount: p.netSalary,
      paymentReference: p.transactionReference
    }));

    res.status(200).json({
      success: true,
      bankFileFormat: 'NEFT_RTGS_STANDARD',
      totalAmount: records.reduce((s, r) => s + r.amount, 0),
      count: records.length,
      records
    });
  } catch (error) {
    logger.error(`[Bank File Error] ${error.message}`);
    next(error);
  }
};

const getMyPayslipPdf = async (req, res, next) => {
  try {
    const month = req.params.month;
    const payslip = await Payroll.findOne({ user_id: req.user._id, month });

    if (!payslip) {
      return res.status(404).json({ success: false, message: `Payslip not found for month ${month}` });
    }

    res.status(200).json({
      success: true,
      payslipType: 'digital_payslip',
      employee: {
        id: payslip.user_id,
        name: payslip.user_name,
        department: payslip.department,
        designation: payslip.designation
      },
      month: payslip.month,
      earnings: {
        baseSalary: payslip.baseSalary,
        allowances: payslip.allowances,
        overtimePay: payslip.overtimePay,
        bonuses: payslip.bonuses,
        grossSalary: payslip.grossSalary
      },
      deductions: {
        advances: payslip.advancesDeducted,
        providentFund: payslip.statutoryBreakdown?.pfEmployee || 0,
        insurance: payslip.statutoryBreakdown?.insuranceEmployee || 0,
        totalDeductions: payslip.deductions
      },
      netSalary: payslip.netSalary,
      transactionReference: payslip.transactionReference
    });
  } catch (error) {
    logger.error(`[Payslip Error] ${error.message}`);
    next(error);
  }
};

// ----------------- 4.1 CLINICAL VARIABLE EARNINGS -----------------

const addVariableEarnings = async (req, res, next) => {
  try {
    const { userId, visits, procedureFee, totalAmount, reason, month } = req.body;
    if (!userId || !totalAmount) {
      return res.status(400).json({ success: false, message: 'userId and totalAmount are required' });
    }

    const payMonth = month || new Date().toISOString().substring(0, 7);
    const bonusRecord = await Bonus.create({
      userId,
      amount: Number(totalAmount),
      type: 'per_visit_procedure',
      payMonth,
      reason: reason || `Clinical earnings for ${visits || 1} visit(s)/procedure(s)`,
      status: 'approved',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Clinical variable earnings recorded for next payroll cycle',
      data: bonusRecord
    });
  } catch (error) {
    logger.error(`[Variable Earnings Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  createPayrollPolicy,
  getPayrollPolicies,
  getActivePayrollPolicy,
  getPayrollPolicyById,
  activatePayrollPolicy,
  getOvertimeRecords,
  requestOvertime,
  decideOvertime,
  getOvertimeSummary,
  createSalaryComponent,
  getSalaryComponents,
  updateSalaryComponent,
  createTaxSlab,
  getTaxSlabs,
  createStatutoryRule,
  getStatutoryRules,
  getStatutoryReport,
  createBonus,
  getBonuses,
  requestAdvance,
  getAdvances,
  getMyAdvances,
  decideAdvance,
  getAdvanceSchedule,
  submitReimbursement,
  getReimbursements,
  decideReimbursement,
  createArrear,
  createPayrollAdjustment,
  getPendingAdjustments,
  lockPayrollRun,
  unlockPayrollRun,
  publishPayslips,
  exportPayrollRun,
  getBankFile,
  getMyPayslipPdf,
  addVariableEarnings
};
