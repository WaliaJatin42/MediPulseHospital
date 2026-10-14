const mongoose = require('mongoose');
const Medicine = require('../models/pharmacy/Medicine');
const StockBatch = require('../models/pharmacy/StockBatch');
const DispenseLog = require('../models/pharmacy/DispenseLog');
const Supplier = require('../models/pharmacy/Supplier');
const PurchaseOrder = require('../models/pharmacy/PurchaseOrder');
const PharmacyWasteReturn = require('../models/pharmacy/PharmacyWasteReturn');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper to check Pharmacy department access
const isPharmacyStaff = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return (user.department || '').toLowerCase() === 'pharmacy';
};

const isPharmacyAdmin = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return user.role === 'admin' && (user.department || '').toLowerCase() === 'pharmacy';
};

// ==================== MEDICINES CATALOG ====================

const createMedicine = async (req, res, next) => {
  try {
    if (!isPharmacyAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy Admin only.' });
    }

    const { name, genericName, category, dosageForm, strength, unitPrice, reorderLevel, isControlledSubstance } = req.body;

    const med = await Medicine.create({
      name: name.trim(),
      genericName: genericName.trim(),
      category: category.trim(),
      dosageForm: dosageForm || 'Tablet',
      strength: strength || '',
      unitPrice: Number(unitPrice),
      reorderLevel: Number(reorderLevel) || 50,
      isControlledSubstance: !!isControlledSubstance,
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_MEDICINE',
      resource: 'pharmacy_medicines',
      resourceId: med._id.toString(),
      after: med.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: 'Medicine added to catalog', data: med });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] createMedicine failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getMedicines = async (req, res, next) => {
  try {
    let filter = { status: 'active' };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isControlledSubstance !== undefined) {
      filter.isControlledSubstance = req.query.isControlledSubstance === 'true';
    }
    if (req.query.search) {
      const reg = { $regex: req.query.search, $options: 'i' };
      filter.$or = [{ name: reg }, { genericName: reg }, { category: reg }];
    }

    const medicines = await Medicine.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: medicines.length, data: medicines });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] getMedicines failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const updateMedicine = async (req, res, next) => {
  try {
    if (!isPharmacyAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy Admin only.' });
    }

    const med = await Medicine.findById(req.params.id);
    if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });

    const beforeState = med.toJSON();
    const { name, genericName, category, dosageForm, strength, unitPrice, reorderLevel, isControlledSubstance, status } = req.body;

    if (name) med.name = name.trim();
    if (genericName) med.genericName = genericName.trim();
    if (category) med.category = category.trim();
    if (dosageForm) med.dosageForm = dosageForm;
    if (strength !== undefined) med.strength = strength;
    if (unitPrice !== undefined) med.unitPrice = Number(unitPrice);
    if (reorderLevel !== undefined) med.reorderLevel = Number(reorderLevel);
    if (isControlledSubstance !== undefined) med.isControlledSubstance = !!isControlledSubstance;
    if (status) med.status = status;

    await med.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_MEDICINE',
      resource: 'pharmacy_medicines',
      resourceId: med._id.toString(),
      before: beforeState,
      after: med.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: 'Medicine updated successfully', data: med });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] updateMedicine failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const deleteMedicine = async (req, res, next) => {
  try {
    if (!isPharmacyAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy Admin only.' });
    }

    const med = await Medicine.findById(req.params.id);
    if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });

    med.status = 'discontinued';
    await med.save();

    await recordAuditLog({
      actor: req.user,
      action: 'DISCONTINUE_MEDICINE',
      resource: 'pharmacy_medicines',
      resourceId: med._id.toString(),
      req
    });

    res.status(200).json({ success: true, message: 'Medicine marked as discontinued.' });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] deleteMedicine failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== STOCK BATCHES ====================

const receiveStockBatch = async (req, res, next) => {
  try {
    if (!isPharmacyStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy staff only.' });
    }

    const { medicineId, batchNo, expiryDate, quantity, cost, supplierId } = req.body;

    const med = await Medicine.findById(medicineId);
    if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
    }

    const batch = await StockBatch.create({
      medicine: med._id,
      batchNo: batchNo.trim(),
      expiryDate: new Date(expiryDate),
      quantity: qty,
      remainingQuantity: qty,
      cost: Number(cost) || 0,
      supplier: supplierId || null,
      receivedBy: req.user._id
    });

    // Update medicine current stock
    med.currentStock = (med.currentStock || 0) + qty;
    await med.save();

    await recordAuditLog({
      actor: req.user,
      action: 'RECEIVE_STOCK_BATCH',
      resource: 'pharmacy_stock',
      resourceId: batch._id.toString(),
      after: batch.toJSON(),
      req
    });

    res.status(201).json({
      success: true,
      message: `Batch ${batch.batchNo} received. Total stock updated to ${med.currentStock}.`,
      data: batch
    });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] receiveStockBatch failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getStockBatches = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.medicineId) filter.medicine = req.query.medicineId;
    if (req.query.inStockOnly === 'true') filter.remainingQuantity = { $gt: 0 };

    const batches = await StockBatch.find(filter)
      .populate('medicine', 'name genericName dosageForm isControlledSubstance')
      .populate('supplier', 'name contactPerson phone')
      .sort({ expiryDate: 1 });

    res.status(200).json({ success: true, count: batches.length, data: batches });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] getStockBatches failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== DISPENSING ====================

const dispenseMedicine = async (req, res, next) => {
  try {
    if (!isPharmacyStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy staff only.' });
    }

    const { medicineId, batchId, quantity, dispensedTo, notes } = req.body;
    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive quantity required' });
    }

    const med = await Medicine.findById(medicineId);
    if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });

    // Find stock batch with remaining quantity
    let batch = null;
    if (batchId) {
      batch = await StockBatch.findById(batchId);
    } else {
      // FEFO (First Expired First Out) automatically selects the earliest expiring batch with stock
      batch = await StockBatch.findOne({
        medicine: med._id,
        remainingQuantity: { $gte: qty }
      }).sort({ expiryDate: 1 });
    }

    if (!batch || batch.remainingQuantity < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock in batch. Available: ${batch ? batch.remainingQuantity : 0}, Requested: ${qty}`
      });
    }

    // Deduct stock
    batch.remainingQuantity -= qty;
    await batch.save();

    med.currentStock = Math.max(0, med.currentStock - qty);
    await med.save();

    const dispenseLog = await DispenseLog.create({
      medicine: med._id,
      batch: batch._id,
      batchNo: batch.batchNo,
      quantity: qty,
      dispensedTo: dispensedTo || 'Walk-in prescription',
      isControlledSubstance: med.isControlledSubstance,
      dispensedBy: req.user._id,
      dispenserName: req.user.name,
      notes: notes || ''
    });

    await recordAuditLog({
      actor: req.user,
      action: med.isControlledSubstance ? 'DISPENSE_CONTROLLED_SUBSTANCE' : 'DISPENSE_MEDICINE',
      resource: 'pharmacy_dispense',
      resourceId: dispenseLog._id.toString(),
      after: dispenseLog.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Dispensed ${qty} units of ${med.name}. Remaining stock: ${med.currentStock}`,
      data: dispenseLog
    });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] dispenseMedicine failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== ALERTS ====================

const getLowStockAlerts = async (req, res, next) => {
  try {
    const medicines = await Medicine.find({ status: 'active' });
    const lowStock = medicines.filter(m => m.currentStock <= m.reorderLevel);

    res.status(200).json({
      success: true,
      count: lowStock.length,
      data: lowStock
    });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] getLowStockAlerts failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getExpiringAlerts = async (req, res, next) => {
  try {
    // Expiring within 90 days
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const expiringBatches = await StockBatch.find({
      remainingQuantity: { $gt: 0 },
      expiryDate: { $lte: ninetyDaysFromNow }
    }).populate('medicine', 'name genericName category isControlledSubstance').sort({ expiryDate: 1 });

    res.status(200).json({
      success: true,
      count: expiringBatches.length,
      data: expiringBatches
    });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] getExpiringAlerts failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== SUPPLIERS & PURCHASE ORDERS ====================

const createSupplier = async (req, res, next) => {
  try {
    if (!isPharmacyAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy Admin only.' });
    }
    const supplier = await Supplier.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Supplier added', data: supplier });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] createSupplier failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] getSuppliers failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const createPurchaseOrder = async (req, res, next) => {
  try {
    if (!isPharmacyStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy staff only.' });
    }

    const { supplierId, items, notes } = req.body;
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const med = await Medicine.findById(item.medicineId);
      const totalCost = Number(item.quantity) * Number(item.unitCost);
      totalAmount += totalCost;
      processedItems.push({
        medicine: item.medicineId,
        medicineName: med ? med.name : 'Unknown',
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost
      });
    }

    const po = await PurchaseOrder.create({
      poNumber,
      supplier: supplierId,
      items: processedItems,
      totalAmount,
      status: 'pending_approval',
      createdBy: req.user._id,
      notes: notes || ''
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_PURCHASE_ORDER',
      resource: 'pharmacy_po',
      resourceId: po._id.toString(),
      after: po.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: 'Purchase Order created and submitted for Admin approval', data: po });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] createPurchaseOrder failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getPurchaseOrders = async (req, res, next) => {
  try {
    const pos = await PurchaseOrder.find()
      .populate('supplier', 'name contactPerson email phone')
      .populate('approvedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: pos.length, data: pos });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] getPurchaseOrders failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const approvePurchaseOrder = async (req, res, next) => {
  try {
    if (!isPharmacyAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy Admin only.' });
    }

    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    po.status = 'approved';
    po.approvedBy = req.user._id;
    po.approvedAt = new Date();
    await po.save();

    await recordAuditLog({
      actor: req.user,
      action: 'APPROVE_PURCHASE_ORDER',
      resource: 'pharmacy_po',
      resourceId: po._id.toString(),
      after: po.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: 'Purchase Order approved successfully', data: po });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] approvePurchaseOrder failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== RETURNS & WASTAGE ====================

const recordReturn = async (req, res, next) => {
  try {
    if (!isPharmacyStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy staff only.' });
    }

    const { medicineId, batchNo, quantity, reason, supplierId } = req.body;
    const qty = Number(quantity);

    const record = await PharmacyWasteReturn.create({
      type: 'return',
      medicine: medicineId,
      batchNo,
      quantity: qty,
      reason,
      supplier: supplierId || null,
      recordedBy: req.user._id
    });

    // Deduct from batch and catalog stock
    await StockBatch.findOneAndUpdate({ medicine: medicineId, batchNo }, { $inc: { remainingQuantity: -qty } });
    await Medicine.findByIdAndUpdate(medicineId, { $inc: { currentStock: -qty } });

    await recordAuditLog({
      actor: req.user,
      action: 'RECORD_PHARMACY_RETURN',
      resource: 'pharmacy_returns',
      resourceId: record._id.toString(),
      after: record.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: 'Supplier return recorded', data: record });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] recordReturn failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const recordWastage = async (req, res, next) => {
  try {
    if (!isPharmacyStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy staff only.' });
    }

    const { medicineId, batchNo, quantity, reason } = req.body;
    const qty = Number(quantity);

    const record = await PharmacyWasteReturn.create({
      type: 'wastage',
      medicine: medicineId,
      batchNo,
      quantity: qty,
      reason,
      recordedBy: req.user._id
    });

    await StockBatch.findOneAndUpdate({ medicine: medicineId, batchNo }, { $inc: { remainingQuantity: -qty } });
    await Medicine.findByIdAndUpdate(medicineId, { $inc: { currentStock: -qty } });

    await recordAuditLog({
      actor: req.user,
      action: 'RECORD_PHARMACY_WASTAGE',
      resource: 'pharmacy_wastage',
      resourceId: record._id.toString(),
      after: record.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: 'Damaged/Expired medication recorded as wastage', data: record });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] recordWastage failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== CONTROLLED SUBSTANCES AUDIT LOG ====================

const getControlledSubstancesLog = async (req, res, next) => {
  try {
    if (!isPharmacyAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Pharmacy Admin only.' });
    }

    const logs = await DispenseLog.find({ isControlledSubstance: true })
      .populate('medicine', 'name genericName category')
      .populate('dispensedBy', 'name email designation employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      description: 'Controlled Substances Vault Register (Append-only regulatory log)',
      count: logs.length,
      data: logs
    });
  } catch (error) {
    logger.error(`[Pharmacy Controller Error] getControlledSubstancesLog failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  createMedicine,
  getMedicines,
  updateMedicine,
  deleteMedicine,
  receiveStockBatch,
  getStockBatches,
  dispenseMedicine,
  getLowStockAlerts,
  getExpiringAlerts,
  createSupplier,
  getSuppliers,
  createPurchaseOrder,
  getPurchaseOrders,
  approvePurchaseOrder,
  recordReturn,
  recordWastage,
  getControlledSubstancesLog
};
