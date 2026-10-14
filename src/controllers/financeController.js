const Budget = require('../models/finance/Budget');
const Expense = require('../models/finance/Expense');
const VendorInvoice = require('../models/finance/VendorInvoice');
const FinancePayment = require('../models/finance/FinancePayment');
const FinanceLedger = require('../models/finance/FinanceLedger');
const FinanceReconciliation = require('../models/finance/FinanceReconciliation');
const PayrollRun = require('../models/PayrollRun');
const Payroll = require('../models/Payroll');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper to check Finance authorization
const isFinanceStaff = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return (user.department || '').toLowerCase() === 'finance';
};

const isFinanceAdmin = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return user.role === 'admin' && (user.department || '').toLowerCase() === 'finance';
};

// ==================== BUDGETS ====================

const createBudget = async (req, res, next) => {
  try {
    if (!isFinanceAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance Admin only.' });
    }

    const { department, financialYear, period, allocatedAmount, notes } = req.body;

    const budget = await Budget.create({
      department: department.toLowerCase().trim(),
      financialYear,
      period,
      allocatedAmount: Number(allocatedAmount),
      spentAmount: 0,
      approvedBy: req.user._id,
      notes: notes || ''
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_BUDGET',
      resource: 'finance_budgets',
      resourceId: budget._id.toString(),
      after: budget.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: 'Department budget allocated', data: budget });
  } catch (error) {
    logger.error(`[Finance Controller Error] createBudget failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getBudgets = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.department) filter.department = req.query.department.toLowerCase();
    if (req.query.financialYear) filter.financialYear = req.query.financialYear;

    const budgets = await Budget.find(filter)
      .populate('approvedBy', 'name email designation')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: budgets.length, data: budgets });
  } catch (error) {
    logger.error(`[Finance Controller Error] getBudgets failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const updateBudget = async (req, res, next) => {
  try {
    if (!isFinanceAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance Admin only.' });
    }

    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ success: false, message: 'Budget record not found' });

    const beforeState = budget.toJSON();
    const { allocatedAmount, notes, status } = req.body;

    if (allocatedAmount !== undefined) budget.allocatedAmount = Number(allocatedAmount);
    if (notes !== undefined) budget.notes = notes;
    if (status) budget.status = status;

    await budget.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_BUDGET',
      resource: 'finance_budgets',
      resourceId: budget._id.toString(),
      before: beforeState,
      after: budget.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: 'Budget updated successfully', data: budget });
  } catch (error) {
    logger.error(`[Finance Controller Error] updateBudget failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== EXPENSES ====================

const submitExpense = async (req, res, next) => {
  try {
    const { category, amount, description, receiptUrl } = req.body;
    const expenseNumber = `EXP-${Date.now().toString().slice(-6)}`;

    const expense = await Expense.create({
      expenseNumber,
      department: (req.user.department || 'general').toLowerCase(),
      submittedBy: req.user._id,
      category: category || 'other',
      amount: Number(amount),
      description: description.trim(),
      receiptUrl: receiptUrl || '',
      status: 'pending'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'SUBMIT_EXPENSE_CLAIM',
      resource: 'finance_expenses',
      resourceId: expense._id.toString(),
      after: expense.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Expense claim ${expenseNumber} submitted for approval`, data: expense });
  } catch (error) {
    logger.error(`[Finance Controller Error] submitExpense failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'user') {
      filter.submittedBy = req.user._id;
    } else if (!isFinanceStaff(req.user)) {
      filter.department = (req.user.department || '').toLowerCase();
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.department && isFinanceStaff(req.user)) filter.department = req.query.department.toLowerCase();

    const expenses = await Expense.find(filter)
      .populate('submittedBy', 'name email employeeId department')
      .populate('decisionBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: expenses.length, data: expenses });
  } catch (error) {
    logger.error(`[Finance Controller Error] getExpenses failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const decideExpense = async (req, res, next) => {
  try {
    if (!isFinanceAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance Admin only.' });
    }

    const { status, decisionNotes } = req.body;
    if (!['approved', 'rejected', 'reimbursed'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved', 'rejected', or 'reimbursed'" });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense record not found' });

    const beforeState = expense.toJSON();

    expense.status = status;
    expense.decisionBy = req.user._id;
    expense.decisionNotes = decisionNotes || '';
    expense.decisionAt = new Date();
    await expense.save();

    // If approved, update department spent amount on active budget
    if (status === 'approved') {
      await Budget.findOneAndUpdate(
        { department: expense.department, status: 'active' },
        { $inc: { spentAmount: expense.amount } }
      );

      // Record to ledger
      const entryNum = `LED-${Date.now().toString().slice(-6)}`;
      await FinanceLedger.create({
        entryNumber: entryNum,
        account: 'Operational Departmental Expenses',
        type: 'debit',
        amount: expense.amount,
        department: expense.department,
        description: `Approved expense claim ${expense.expenseNumber}: ${expense.description}`,
        referenceModel: 'Expense',
        referenceId: expense._id.toString(),
        recordedBy: req.user._id
      });
    }

    await recordAuditLog({
      actor: req.user,
      action: `EXPENSE_${status.toUpperCase()}`,
      resource: 'finance_expenses',
      resourceId: expense._id.toString(),
      before: beforeState,
      after: expense.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: `Expense claim ${expense.expenseNumber} has been ${status}.`, data: expense });
  } catch (error) {
    logger.error(`[Finance Controller Error] decideExpense failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== VENDOR INVOICES & PAYMENTS ====================

const createInvoice = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const invoice = await VendorInvoice.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Vendor invoice registered', data: invoice });
  } catch (error) {
    logger.error(`[Finance Controller Error] createInvoice failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getInvoices = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const invoices = await VendorInvoice.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (error) {
    logger.error(`[Finance Controller Error] getInvoices failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    if (!isFinanceAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance Admin only.' });
    }

    const { invoiceId, recipient, amount, paymentMethod, transactionRef, notes } = req.body;
    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;

    const payment = await FinancePayment.create({
      paymentNumber,
      invoice: invoiceId || null,
      recipient,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'bank_transfer',
      transactionRef: transactionRef || `REF-${Date.now()}`,
      status: 'completed',
      recordedBy: req.user._id,
      notes: notes || ''
    });

    if (invoiceId) {
      await VendorInvoice.findByIdAndUpdate(invoiceId, {
        $inc: { paidAmount: Number(amount) },
        status: 'paid'
      });
    }

    // Ledger debit entry
    await FinanceLedger.create({
      entryNumber: `LED-${Date.now().toString().slice(-6)}`,
      account: 'Accounts Payable / Vendor Disbursements',
      type: 'debit',
      amount: Number(amount),
      description: `Disbursement to ${recipient} (Ref: ${payment.transactionRef})`,
      referenceModel: 'FinancePayment',
      referenceId: payment._id.toString(),
      recordedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'RECORD_FINANCE_PAYMENT',
      resource: 'finance_payments',
      resourceId: payment._id.toString(),
      after: payment.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Disbursement recorded: ${paymentNumber}`, data: payment });
  } catch (error) {
    logger.error(`[Finance Controller Error] recordPayment failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getPayments = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const payments = await FinancePayment.find()
      .populate('invoice')
      .populate('recordedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    logger.error(`[Finance Controller Error] getPayments failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== PAYROLL REVIEW & DISBURSEMENT CONFIRM ====================

const reviewPayrollRun = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const run = await PayrollRun.findOne({ runId: req.params.runId })
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    const payslips = await Payroll.find({ runId: req.params.runId });

    res.status(200).json({
      success: true,
      message: 'Payroll review ledger summary',
      run: run.toJSON(),
      totalStaff: payslips.length,
      grossTotal: run.totalGross,
      deductionsTotal: run.totalDeductions,
      netDisbursementRequired: run.totalNet,
      items: payslips
    });
  } catch (error) {
    logger.error(`[Finance Controller Error] reviewPayrollRun failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const confirmPayrollDisbursement = async (req, res, next) => {
  try {
    if (!isFinanceAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance Admin only.' });
    }

    const run = await PayrollRun.findOne({ runId: req.params.runId });
    if (!run) return res.status(404).json({ success: false, message: 'Payroll run not found' });

    if (run.status === 'disbursed') {
      return res.status(400).json({ success: false, message: 'Payroll run has already been disbursed.' });
    }

    const beforeState = run.toJSON();

    run.status = 'disbursed';
    run.disbursementConfirmedBy = req.user._id;
    run.disbursedAt = new Date();
    await run.save();

    await Payroll.updateMany({ runId: run.runId }, { status: 'paid', disbursedAt: new Date() });

    // Ledger entry for payroll disbursement
    await FinanceLedger.create({
      entryNumber: `LED-${Date.now().toString().slice(-6)}`,
      account: 'Hospital Staff Payroll & Compensations',
      type: 'debit',
      amount: run.totalNet,
      description: `Monthly salary disbursement executed for run ${run.runId} (${run.month})`,
      referenceModel: 'PayrollRun',
      referenceId: run._id.toString(),
      recordedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CONFIRM_PAYROLL_DISBURSEMENT',
      resource: 'payroll_disbursement',
      resourceId: run.runId,
      before: beforeState,
      after: run.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Payroll run ${run.runId} disbursement confirmed by Finance. Funds released to ${run.totalEmployees} employees.`,
      run: run.toJSON()
    });
  } catch (error) {
    logger.error(`[Finance Controller Error] confirmPayrollDisbursement failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== LEDGER & RECONCILIATIONS ====================

const getLedger = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const ledgerEntries = await FinanceLedger.find()
      .populate('recordedBy', 'name email')
      .sort({ createdAt: -1 });

    const totalDebits = ledgerEntries.filter(e => e.type === 'debit').reduce((a, b) => a + b.amount, 0);
    const totalCredits = ledgerEntries.filter(e => e.type === 'credit').reduce((a, b) => a + b.amount, 0);

    res.status(200).json({
      success: true,
      count: ledgerEntries.length,
      summary: { totalDebits, totalCredits, balance: totalCredits - totalDebits },
      data: ledgerEntries
    });
  } catch (error) {
    logger.error(`[Finance Controller Error] getLedger failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const createReconciliation = async (req, res, next) => {
  try {
    if (!isFinanceAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance Admin only.' });
    }

    const { month, bankStatementBalance, bookBalance, notes } = req.body;
    const bankBal = Number(bankStatementBalance);
    const bookBal = Number(bookBalance);
    const discrepancy = parseFloat((bankBal - bookBal).toFixed(2));

    const recon = await FinanceReconciliation.create({
      month,
      bankStatementBalance: bankBal,
      bookBalance: bookBal,
      discrepancy,
      status: discrepancy === 0 ? 'balanced' : 'discrepancy_detected',
      notes: notes || '',
      reconciledBy: req.user._id,
      reconciledAt: new Date()
    });

    await recordAuditLog({
      actor: req.user,
      action: 'PERFORM_FINANCIAL_RECONCILIATION',
      resource: 'finance_reconciliations',
      resourceId: recon._id.toString(),
      after: recon.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: `Reconciliation completed for ${month}. Status: ${recon.status}`,
      data: recon
    });
  } catch (error) {
    logger.error(`[Finance Controller Error] createReconciliation failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getReconciliations = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const records = await FinanceReconciliation.find()
      .populate('reconciledBy', 'name email designation')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    logger.error(`[Finance Controller Error] getReconciliations failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== FINANCIAL REPORTS ====================

const getExpenseSummaryReport = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const report = await Expense.aggregate([
      { $match: { status: { $in: ['approved', 'reimbursed'] } } },
      {
        $group: {
          _id: { department: '$department', category: '$category' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({ success: true, breakdown: report });
  } catch (error) {
    logger.error(`[Finance Controller Error] getExpenseSummaryReport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getBudgetVsActualReport = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const budgets = await Budget.find({ status: 'active' });
    const comparisons = budgets.map(b => ({
      department: b.department,
      financialYear: b.financialYear,
      period: b.period,
      allocated: b.allocatedAmount,
      spent: b.spentAmount,
      remaining: Math.max(0, b.allocatedAmount - b.spentAmount),
      utilizationRate: b.allocatedAmount > 0 ? `${((b.spentAmount / b.allocatedAmount) * 100).toFixed(1)}%` : '0%'
    }));

    res.status(200).json({ success: true, comparisons });
  } catch (error) {
    logger.error(`[Finance Controller Error] getBudgetVsActualReport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getPayrollCostReport = async (req, res, next) => {
  try {
    if (!isFinanceStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Finance staff only.' });
    }

    const runs = await PayrollRun.find({ status: { $in: ['approved', 'disbursed'] } })
      .sort({ month: -1 })
      .limit(12);

    res.status(200).json({ success: true, count: runs.length, monthlyPayrollCosts: runs });
  } catch (error) {
    logger.error(`[Finance Controller Error] getPayrollCostReport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  submitExpense,
  getExpenses,
  decideExpense,
  createInvoice,
  getInvoices,
  recordPayment,
  getPayments,
  reviewPayrollRun,
  confirmPayrollDisbursement,
  getLedger,
  createReconciliation,
  getReconciliations,
  getExpenseSummaryReport,
  getBudgetVsActualReport,
  getPayrollCostReport
};
