const crypto = require('crypto');
const {
  BloodDonor,
  BloodUnit,
  DietOrder,
  AmbulanceTrip,
  Certificate,
  StoreItem,
  QualityIncident
} = require('../models/clinical/SupportClinicalModels');
const logger = require('../utils/logger');

// ----------------- BLOOD BANK -----------------

const createBloodDonor = async (req, res, next) => {
  try {
    const { name, bloodGroup, phone } = req.body;
    const count = await BloodDonor.countDocuments();
    const donorNo = `DNR-${String(count + 1).padStart(4, '0')}`;

    const donor = await BloodDonor.create({
      donorNo,
      name,
      bloodGroup,
      phone,
      lastDonatedAt: new Date()
    });

    res.status(201).json({ success: true, message: 'Blood donor registered', data: donor });
  } catch (err) {
    next(err);
  }
};

const recordBloodDonation = async (req, res, next) => {
  try {
    const { donorId, bloodGroup, component = 'prbc', screeningResults } = req.body;
    const count = await BloodUnit.countDocuments();
    const bagNo = `BAG-${bloodGroup.replace('+', 'POS').replace('-', 'NEG')}-${Date.now().toString().slice(-5)}`;
    const expiryDate = new Date(Date.now() + 35 * 24 * 3600 * 1000); // 35 days for PRBC

    const unit = await BloodUnit.create({
      bagNo,
      donorId: donorId || null,
      branchId: req.branchId,
      bloodGroup,
      component,
      expiryDate,
      screeningResults: screeningResults || { hiv: 'negative', hcv: 'negative', hbsag: 'negative', syphilis: 'negative', malaria: 'negative' },
      status: 'available'
    });

    res.status(201).json({ success: true, message: 'Blood unit tested, component separated and added to inventory', data: unit });
  } catch (err) {
    next(err);
  }
};

const getBloodInventory = async (req, res, next) => {
  try {
    const filter = req.branchFilter({ status: 'available' });
    if (req.query.group) filter.bloodGroup = req.query.group;
    if (req.query.component) filter.component = req.query.component;

    const units = await BloodUnit.find(filter).sort({ expiryDate: 1 });
    res.status(200).json({ success: true, count: units.length, data: units });
  } catch (err) {
    next(err);
  }
};

// ----------------- DIETARY -----------------

const createDietOrder = async (req, res, next) => {
  try {
    const { admissionId, patientId, wardId, dietType, meal } = req.body;
    const order = await DietOrder.create({
      admissionId,
      patientId,
      wardId: wardId || null,
      dietType: dietType || 'normal',
      meal: meal || 'lunch',
      status: 'ordered'
    });

    res.status(201).json({ success: true, message: 'Diet meal order submitted to hospital kitchen', data: order });
  } catch (err) {
    next(err);
  }
};

const getKitchenList = async (req, res, next) => {
  try {
    const filter = { status: { $ne: 'delivered' } };
    if (req.query.meal) filter.meal = req.query.meal;
    if (req.query.wardId) filter.wardId = req.query.wardId;

    const list = await DietOrder.find(filter)
      .populate('patientId', 'uhid firstName lastName')
      .populate('wardId', 'name');

    res.status(200).json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
};

const deliverDietOrder = async (req, res, next) => {
  try {
    const order = await DietOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'delivered', deliveredAt: new Date() },
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Meal marked delivered', data: order });
  } catch (err) {
    next(err);
  }
};

// ----------------- AMBULANCE -----------------

const requestAmbulance = async (req, res, next) => {
  try {
    const { vehicleNo, driverName, patientId, pickupLocation, dropLocation } = req.body;
    const count = await AmbulanceTrip.countDocuments();
    const tripNo = `AMB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const trip = await AmbulanceTrip.create({
      tripNo,
      vehicleNo: vehicleNo || 'KA-01-AMB-108',
      driverName: driverName || 'Emergency Driver',
      patientId: patientId || null,
      pickupLocation,
      dropLocation,
      status: 'dispatched'
    });

    res.status(201).json({ success: true, message: 'Ambulance dispatched', data: trip });
  } catch (err) {
    next(err);
  }
};

const updateAmbulanceStatus = async (req, res, next) => {
  try {
    const { status, distanceKm } = req.body;
    const trip = await AmbulanceTrip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Ambulance trip not found' });

    trip.status = status;
    if (distanceKm !== undefined) trip.distanceKm = distanceKm;
    await trip.save();

    res.status(200).json({ success: true, message: `Ambulance trip status: ${status}`, data: trip });
  } catch (err) {
    next(err);
  }
};

const updateAmbulanceLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const trip = await AmbulanceTrip.findByIdAndUpdate(
      req.params.id,
      { currentGps: { lat, lng } },
      { new: true }
    );
    res.status(200).json({ success: true, currentGps: trip.currentGps });
  } catch (err) {
    next(err);
  }
};

// ----------------- CERTIFICATES -----------------

const issueCertificate = async (req, res, next) => {
  try {
    const { type, patientId, details } = req.body;
    const count = await Certificate.countDocuments();
    const certificateNo = `CERT-${type.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const verificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();

    const cert = await Certificate.create({
      certificateNo,
      type,
      patientId,
      certifyingDoctorId: req.user._id,
      branchId: req.branchId,
      verificationCode,
      details: details || {}
    });

    res.status(201).json({
      success: true,
      message: `${type.toUpperCase()} certificate issued with tamper-proof verification code`,
      data: cert
    });
  } catch (err) {
    next(err);
  }
};

// Public Verification Endpoint (No auth required)
const verifyCertificate = async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({ verificationCode: req.params.code.toUpperCase() })
      .populate('patientId', 'uhid firstName lastName gender dateOfBirth')
      .populate('certifyingDoctorId', 'name designation department');

    if (!cert) {
      return res.status(404).json({ success: false, isValid: false, message: 'Invalid or fraudulent certificate verification code' });
    }

    res.status(200).json({
      success: true,
      isValid: true,
      message: 'Certificate authenticity verified by MediPulse Hospital System',
      certificate: {
        certificateNo: cert.certificateNo,
        type: cert.type,
        patientName: cert.patientId?.fullName,
        uhid: cert.patientId?.uhid,
        issuedBy: cert.certifyingDoctorId?.name,
        issuedAt: cert.issuedAt,
        details: cert.details
      }
    });
  } catch (err) {
    next(err);
  }
};

// ----------------- STORES & QUALITY -----------------

const createStoreItem = async (req, res, next) => {
  try {
    const item = await StoreItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const getStoreItems = async (req, res, next) => {
  try {
    const items = await StoreItem.find();
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
};

const getReorderAlerts = async (req, res, next) => {
  try {
    const lowStock = await StoreItem.find({ $expr: { $lte: ['$currentStock', '$reorderLevel'] } });
    res.status(200).json({ success: true, count: lowStock.length, data: lowStock });
  } catch (err) {
    next(err);
  }
};

const reportQualityIncident = async (req, res, next) => {
  try {
    const { type, patientId, description, severity } = req.body;
    const count = await QualityIncident.countDocuments();
    const incidentNo = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const incident = await QualityIncident.create({
      incidentNo,
      type,
      patientId: patientId || null,
      description,
      severity: severity || 'minor',
      reportedBy: req.user._id,
      status: 'reported'
    });

    res.status(201).json({ success: true, message: 'Quality & safety incident documented', data: incident });
  } catch (err) {
    next(err);
  }
};

const addCapaAction = async (req, res, next) => {
  try {
    const { action, owner, dueDate } = req.body;
    const incident = await QualityIncident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    incident.capaActions.push({ action, owner, dueDate: new Date(dueDate), isCompleted: false });
    incident.status = 'capa_assigned';
    await incident.save();

    res.status(200).json({ success: true, message: 'CAPA action assigned to incident', incident });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBloodDonor,
  recordBloodDonation,
  getBloodInventory,
  createDietOrder,
  getKitchenList,
  deliverDietOrder,
  requestAmbulance,
  updateAmbulanceStatus,
  updateAmbulanceLocation,
  issueCertificate,
  verifyCertificate,
  createStoreItem,
  getStoreItems,
  getReorderAlerts,
  reportQualityIncident,
  addCapaAction
};
