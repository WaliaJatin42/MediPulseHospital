const BillingAccount = require('../models/billing/BillingAccount');
const BillingCharge = require('../models/billing/BillingCharge');
const { Invoice, Payment, Deposit, PreauthRequest, InsuranceClaim } = require('../models/billing/BillingInvoiceModels');
const Branch = require('../models/branch/Branch');
const logger = require('../utils/logger');

// Generate Sequential Non-Gap Invoice Number
async function generateInvoiceNo(branchId) {
  const branch = await Branch.findById(branchId);
  const prefix = branch ? branch.invoicePrefix : 'INV-CEN';
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({ branchId });
  const seq = String(count + 1).padStart(5, '0');
  return `${prefix}-${year}-${seq}`;
}

// Generate Receipt Number
function generateReceiptNo(branchId) {
  const timestamp = Date.now().toString().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900);
  return `RCP-${timestamp}-${rand}`;
}

// ----------------- BILLING ACCOUNTS & CHARGES -----------------

const createBillingAccount = async (req, res, next) => {
  try {
    const { patientId, admissionId, visitId, accountType } = req.body;
    const count = await BillingAccount.countDocuments();
    const year = new Date().getFullYear();
    const accountNo = `ACT-${year}-${String(count + 1).padStart(5, '0')}`;

    const account = await BillingAccount.create({
      accountNo,
      patientId,
      branchId: req.branchId,
      admissionId: admissionId || null,
      visitId: visitId || null,
      accountType: accountType || 'opd',
      status: 'open'
    });
    res.status(201).json({ success: true, message: 'Billing account opened', data: account });
  } catch (err) {
    next(err);
  }
};

const getBillingAccountById = async (req, res, next) => {
  try {
    const account = await BillingAccount.findById(req.params.id)
      .populate('patientId', 'uhid firstName lastName phone bloodGroup')
      .populate('admissionId');
    if (!account) return res.status(404).json({ success: false, message: 'Billing account not found' });

    const charges = await BillingCharge.find({ billingAccountId: account._id, status: 'posted' });

    res.status(200).json({ success: true, data: account, charges });
  } catch (err) {
    next(err);
  }
};

const addManualCharge = async (req, res, next) => {
  try {
    const { billingAccountId, serviceName, department, rate, quantity = 1 } = req.body;
    const account = await BillingAccount.findById(billingAccountId);
    if (!account || account.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Active open billing account required' });
    }

    const effectiveRate = Number(rate !== undefined ? rate : (req.body.unitPrice || req.body.price || req.body.amount || 0));
    const effectiveQty = Number(quantity || 1);
    const totalAmount = effectiveRate * effectiveQty;

    const charge = await BillingCharge.create({
      billingAccountId,
      patientId: account.patientId,
      branchId: req.branchId,
      serviceName,
      department: department || 'clinical',
      rate: effectiveRate,
      quantity: effectiveQty,
      totalAmount,
      sourceType: 'manual',
      status: 'posted'
    });

    account.totalCharges = (account.totalCharges || 0) + totalAmount;
    account.netAmount = account.totalCharges - (account.totalDiscounts || 0);
    account.balanceDue = account.netAmount - (account.totalPaid || 0);
    await account.save();

    res.status(201).json({ success: true, message: 'Charge posted to billing account', data: charge });
  } catch (err) {
    next(err);
  }
};

// Advance Deposits
const createDeposit = async (req, res, next) => {
  try {
    const { patientId, billingAccountId, amount, method } = req.body;
    let targetPatientId = patientId;
    if (!targetPatientId && billingAccountId) {
      const acct = await BillingAccount.findById(billingAccountId);
      targetPatientId = acct?.patientId;
    }
    const effectiveMethod = method || req.body.paymentMode || 'cash';

    const count = await Deposit.countDocuments();
    const depositNo = `DEP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const deposit = await Deposit.create({
      depositNo,
      patientId: targetPatientId,
      billingAccountId: billingAccountId || null,
      branchId: req.branchId,
      amount,
      balance: amount,
      method: effectiveMethod,
      receivedBy: req.user._id
    });

    if (billingAccountId) {
      await BillingAccount.findByIdAndUpdate(billingAccountId, { $inc: { totalDeposits: amount } });
    }

    res.status(201).json({ success: true, message: 'Advance deposit received', data: deposit });
  } catch (err) {
    next(err);
  }
};

// ----------------- INVOICES & PAYMENTS -----------------

// Generate Invoice
const createInvoice = async (req, res, next) => {
  try {
    const { billingAccountId, discountAmount = 0, type = 'final' } = req.body;
    const account = await BillingAccount.findById(billingAccountId);
    if (!account) return res.status(404).json({ success: false, message: 'Billing account not found' });

    const charges = await BillingCharge.find({ billingAccountId: account._id, status: 'posted' });
    const grossAmount = charges.reduce((sum, c) => sum + c.totalAmount, 0);
    const netAmount = Math.max(0, grossAmount - discountAmount);
    const balanceDue = Math.max(0, netAmount - (account.totalPaid || 0));

    const invoiceNo = await generateInvoiceNo(req.branchId);
    const financialYear = '2026-2027';

    const invoice = await Invoice.create({
      invoiceNo,
      billingAccountId: account._id,
      patientId: account.patientId,
      branchId: req.branchId,
      financialYear,
      type,
      grossAmount,
      discountAmount,
      netAmount,
      paidAmount: account.totalPaid || 0,
      balanceDue,
      status: 'draft'
    });

    const invoiceObj = invoice.toObject();
    invoiceObj.invoiceNumber = invoice.invoiceNo;

    res.status(201).json({ success: true, message: 'Invoice drafted', data: invoiceObj });
  } catch (err) {
    next(err);
  }
};

// Finalize Invoice (Non-gap finalized invoice locking)
const finalizeInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.status = invoice.balanceDue <= 0 ? 'paid' : 'finalized';
    invoice.finalizedAt = new Date();
    invoice.finalizedBy = req.user._id;
    await invoice.save();

    await BillingAccount.findByIdAndUpdate(invoice.billingAccountId, { status: 'invoiced' });

    const invoiceObj = invoice.toObject();
    invoiceObj.invoiceNumber = invoice.invoiceNo;

    res.status(200).json({ success: true, message: 'Invoice finalized and locked', data: invoiceObj });
  } catch (err) {
    next(err);
  }
};

// Record Payment
const recordPayment = async (req, res, next) => {
  try {
    const { billingAccountId, invoiceId, amount, method, transactionRef } = req.body;
    const account = await BillingAccount.findById(billingAccountId);
    if (!account) return res.status(404).json({ success: false, message: 'Billing account not found' });

    const receiptNo = generateReceiptNo(req.branchId);
    const effectiveMethod = method || req.body.paymentMode || 'cash';

    const payment = await Payment.create({
      receiptNo,
      billingAccountId: account._id,
      invoiceId: invoiceId || null,
      patientId: account.patientId,
      branchId: req.branchId,
      amount,
      method: effectiveMethod,
      transactionRef: transactionRef || '',
      collectedBy: req.user._id
    });

    account.totalPaid = (account.totalPaid || 0) + amount;
    account.balanceDue = Math.max(0, account.netAmount - account.totalPaid);
    if (account.balanceDue === 0) account.status = 'closed';
    await account.save();

    if (invoiceId) {
      await Invoice.findByIdAndUpdate(invoiceId, {
        $inc: { paidAmount: amount },
        balanceDue: Math.max(0, account.balanceDue)
      });
    }

    const paymentObj = payment.toObject();
    paymentObj.receiptNumber = receiptNo;

    res.status(201).json({
      success: true,
      message: `Payment of ${amount} recorded. Receipt #${receiptNo} generated.`,
      payment: paymentObj,
      data: paymentObj,
      receiptNumber: receiptNo,
      accountBalanceDue: account.balanceDue
    });
  } catch (err) {
    next(err);
  }
};

// Apply Discount (Enforces role-tiered discount limit)
const applyDiscount = async (req, res, next) => {
  try {
    const { billingAccountId, discountPercent, reason } = req.body;
    const account = await BillingAccount.findById(billingAccountId);
    if (!account) return res.status(404).json({ success: false, message: 'Billing account not found' });

    // Role-tiered discount approval limit check
    // Billing Clerk: up to 5%, Billing Admin: up to 15%, Superadmin: >15%
    const userRole = req.user.role;
    if (userRole === 'user' && discountPercent > 5) {
      return res.status(403).json({ success: false, message: 'Billing Clerk discount limit exceeded (Max 5%). Senior approval required.' });
    }
    if (userRole === 'admin' && discountPercent > 15) {
      return res.status(403).json({ success: false, message: 'Billing Admin discount limit exceeded (Max 15%). Superadmin approval required.' });
    }

    const discountAmount = Math.round((account.totalCharges * discountPercent) / 100);
    account.totalDiscounts = discountAmount;
    account.netAmount = Math.max(0, account.totalCharges - discountAmount);
    account.balanceDue = Math.max(0, account.netAmount - (account.totalPaid || 0));
    await account.save();

    res.status(200).json({
      success: true,
      message: `${discountPercent}% discount applied (${discountAmount}) with reason: ${reason}`,
      account
    });
  } catch (err) {
    next(err);
  }
};

// ----------------- INSURANCE & TPA -----------------

const submitPreauth = async (req, res, next) => {
  try {
    const { patientId, admissionId, payerId, policyNumber, requestedAmount } = req.body;
    const preauth = await PreauthRequest.create({
      patientId,
      admissionId: admissionId || null,
      payerId,
      policyNumber,
      requestedAmount,
      status: 'submitted'
    });

    res.status(201).json({ success: true, message: 'Insurance cashless pre-authorization submitted', data: preauth });
  } catch (err) {
    next(err);
  }
};

const updatePreauthStatus = async (req, res, next) => {
  try {
    const { status, approvedAmount, queryReason, rejectionReason } = req.body;
    const preauth = await PreauthRequest.findById(req.params.id);
    if (!preauth) return res.status(404).json({ success: false, message: 'Preauth request not found' });

    preauth.status = status;
    if (approvedAmount !== undefined) preauth.approvedAmount = approvedAmount;
    if (queryReason) preauth.queryReason = queryReason;
    if (rejectionReason) preauth.rejectionReason = rejectionReason;
    await preauth.save();

    // If approved, update BillingAccount payer coverage
    if (status === 'approved' && preauth.admissionId) {
      await BillingAccount.findOneAndUpdate(
        { admissionId: preauth.admissionId },
        {
          'payerCoverage.payerId': preauth.payerId,
          'payerCoverage.approvedAmount': preauth.approvedAmount
        }
      );
    }

    res.status(200).json({ success: true, message: `Preauth status updated to ${status}`, data: preauth });
  } catch (err) {
    next(err);
  }
};

const submitClaim = async (req, res, next) => {
  try {
    const { patientId, invoiceId, payerId, claimAmount } = req.body;
    const count = await InsuranceClaim.countDocuments();
    const claimNo = `CLM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const claim = await InsuranceClaim.create({
      claimNo,
      patientId,
      invoiceId,
      payerId,
      claimAmount,
      status: 'submitted'
    });

    res.status(201).json({ success: true, message: 'TPA claim docket generated', data: claim });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBillingAccount,
  getBillingAccountById,
  addManualCharge,
  createDeposit,
  createInvoice,
  finalizeInvoice,
  recordPayment,
  applyDiscount,
  submitPreauth,
  updatePreauthStatus,
  submitClaim
};
