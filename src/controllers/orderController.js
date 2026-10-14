const CpoeOrder = require('../models/clinical/CpoeOrder');
const Allergy = require('../models/patient/Allergy');
const BillingAccount = require('../models/billing/BillingAccount');
const { publishEvent } = require('../services/outboxService');
const logger = require('../utils/logger');

// Generate Sequential Order Number
async function generateOrderNo(type) {
  const count = await CpoeOrder.countDocuments();
  const year = new Date().getFullYear();
  return `ORD-${type.toUpperCase().substring(0, 3)}-${year}-${String(count + 1).padStart(5, '0')}`;
}

// @desc    Place CPOE Order (Lab, Radiology, Procedure, Diet, Consult, Pharmacy)
// @route   POST /api/v1/orders
// @access  Private (Doctor, Resident)
const createOrder = async (req, res, next) => {
  try {
    const { patientId, visitId, admissionId, priority, clinicalNote, clinicalNotes, items } = req.body;
    const orderType = req.body.type || req.body.orderType;

    if (!patientId || !orderType || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'patientId, type (or orderType), and items array are required' });
    }

    const orderNo = await generateOrderNo(orderType);
    const orderItems = items.map((it) => ({
      name: it.name || it.testName || it.serviceName || 'Clinical Service',
      code: it.code || it.testCode || it.serviceCode || '',
      price: it.price || 0,
      quantity: it.quantity || 1,
      specimen: it.specimen || '',
      instructions: it.instructions || ''
    }));

    const order = await CpoeOrder.create({
      orderNo,
      patientId,
      branchId: req.branchId,
      visitId: visitId || null,
      admissionId: admissionId || null,
      type: orderType,
      priority: priority || 'routine',
      clinicalNote: clinicalNote || clinicalNotes || '',
      items: orderItems,
      orderedBy: req.user._id,
      status: 'ordered'
    });

    res.status(201).json({
      success: true,
      message: `${orderType.toUpperCase()} order placed successfully`,
      data: order
    });
  } catch (err) {
    logger.error(`[Create Order Error] ${err.message}`);
    next(err);
  }
};

const { paginate } = require('../utils/pagination');

// @desc    List orders with filters
// @route   GET /api/v1/orders
// @access  Private
const getOrders = async (req, res, next) => {
  try {
    const filter = req.branchFilter ? req.branchFilter({}) : {};
    const result = await paginate(CpoeOrder, filter, req.query, {
      populate: [
        { path: 'patientId', select: 'uhid firstName lastName gender age bloodGroup' },
        { path: 'orderedBy', select: 'name department' }
      ],
      searchFields: ['orderNo'],
      dateField: 'createdAt'
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

// @desc    Get order details by ID
// @route   GET /api/v1/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await CpoeOrder.findById(req.params.id)
      .populate('patientId', 'uhid firstName lastName gender age bloodGroup')
      .populate('orderedBy', 'name department')
      .populate('acknowledgedBy', 'name')
      .populate('completedBy', 'name');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// @desc    Acknowledge order by target department (Lab, Radiology, Pharmacy)
// @route   PATCH /api/v1/orders/:id/acknowledge
// @access  Private
const acknowledgeOrder = async (req, res, next) => {
  try {
    const order = await CpoeOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = 'acknowledged';
    order.acknowledgedBy = req.user._id;
    order.acknowledgedAt = new Date();
    await order.save();

    res.status(200).json({ success: true, message: 'Order acknowledged', data: order });
  } catch (err) {
    next(err);
  }
};

// @desc    Complete order and dispatch billing charge event via Outbox
// @route   PATCH /api/v1/orders/:id/complete
// @access  Private
const completeOrder = async (req, res, next) => {
  try {
    const order = await CpoeOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = 'completed';
    order.completedBy = req.user._id;
    order.completedAt = new Date();
    await order.save();

    // Find active billing account for this patient
    const billingAccount = await BillingAccount.findOne({
      patientId: order.patientId,
      status: 'open'
    }).sort({ createdAt: -1 });

    // Calculate total billable amount from items
    const totalCharge = order.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

    if (billingAccount && totalCharge > 0) {
      // Publish event to Outbox for reliable billing charge generation
      await publishEvent('order_completed', 'CpoeOrder', order._id, {
        billingAccountId: billingAccount._id,
        patientId: order.patientId,
        serviceName: `${order.type.toUpperCase()}: ${order.items.map((i) => i.name).join(', ')}`,
        department: order.type,
        amount: totalCharge,
        quantity: 1
      }, order.branchId);
    }

    res.status(200).json({
      success: true,
      message: 'Order marked completed and charge posted to billing',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel order with reason
// @route   PATCH /api/v1/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: 'Cancellation reason is mandatory' });

    const order = await CpoeOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.status === 'completed') {
      return res.status(409).json({ success: false, message: 'Completed orders cannot be cancelled' });
    }

    order.status = 'cancelled';
    order.cancelledBy = req.user._id;
    order.cancelReason = reason;
    await order.save();

    res.status(200).json({ success: true, message: 'Order cancelled', data: order });
  } catch (err) {
    next(err);
  }
};

// ----------------- CLINICAL DECISION SUPPORT (CDS) CHECKS -----------------

// Drug Interactions Check
const checkDrugInteractions = async (req, res, next) => {
  try {
    const { drugs } = req.body; // Array of drug names
    if (!drugs || !Array.isArray(drugs) || drugs.length < 2) {
      return res.status(200).json({ success: true, hasInteractions: false, warnings: [] });
    }

    // High-risk known clinical interactions database rules
    const knownInteractions = [
      { pair: ['warfarin', 'aspirin'], severity: 'severe', warning: 'High risk of severe hemorrhage/bleeding.' },
      { pair: ['heparin', 'aspirin'], severity: 'severe', warning: 'Synergistic bleeding risk.' },
      { pair: ['ciprofloxacin', 'theophylline'], severity: 'moderate', warning: 'Elevated theophylline toxicity risk.' },
      { pair: ['ace_inhibitor', 'potassium'], severity: 'moderate', warning: 'Risk of fatal hyperkalemia.' },
      { pair: ['sildenafil', 'nitroglycerin'], severity: 'severe', warning: 'Severe life-threatening hypotension.' }
    ];

    const lowerDrugs = drugs.map((d) => d.toLowerCase());
    const warnings = [];

    knownInteractions.forEach((rule) => {
      const match0 = lowerDrugs.some((d) => d.includes(rule.pair[0]));
      const match1 = lowerDrugs.some((d) => d.includes(rule.pair[1]));
      if (match0 && match1) {
        warnings.push({
          drugs: rule.pair,
          severity: rule.severity,
          warning: rule.warning,
          actionRequired: rule.severity === 'severe' ? 'Block or senior doctor override required' : 'Caution advised'
        });
      }
    });

    res.status(200).json({
      success: true,
      hasInteractions: warnings.length > 0,
      requiresSeniorOverride: warnings.some((w) => w.severity === 'severe'),
      warnings
    });
  } catch (err) {
    next(err);
  }
};

// Patient Allergy Safety Check
const checkAllergyWarning = async (req, res, next) => {
  try {
    const { patientId, drugName } = req.body;
    if (!patientId || !drugName) {
      return res.status(400).json({ success: false, message: 'patientId and drugName are required' });
    }

    const allergies = await Allergy.find({ patientId });
    const matchedAllergies = allergies.filter((a) =>
      drugName.toLowerCase().includes(a.allergen.toLowerCase()) ||
      a.allergen.toLowerCase().includes(drugName.toLowerCase())
    );

    res.status(200).json({
      success: true,
      hasAllergyWarning: matchedAllergies.length > 0,
      matchedAllergies: matchedAllergies.map((a) => ({
        allergen: a.allergen,
        severity: a.severity,
        reaction: a.reaction
      }))
    });
  } catch (err) {
    next(err);
  }
};

// Duplicate Order Check (detects if same test/drug ordered within past 24 hours)
const checkDuplicateOrder = async (req, res, next) => {
  try {
    const { patientId, serviceName } = req.body;
    if (!patientId || !serviceName) {
      return res.status(400).json({ success: false, message: 'patientId and serviceName are required' });
    }

    const past24h = new Date(Date.now() - 24 * 3600 * 1000);
    const existing = await CpoeOrder.findOne({
      patientId,
      'items.name': new RegExp(`^${serviceName}$`, 'i'),
      createdAt: { $gte: past24h },
      status: { $ne: 'cancelled' }
    });

    res.status(200).json({
      success: true,
      isDuplicate: !!existing,
      message: existing
        ? `Duplicate Warning: ${serviceName} was already ordered on ${existing.createdAt.toISOString()} (Order #${existing.orderNo})`
        : 'No duplicate orders found in the last 24 hours'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  acknowledgeOrder,
  completeOrder,
  cancelOrder,
  checkDrugInteractions,
  checkAllergyWarning,
  checkDuplicateOrder
};
