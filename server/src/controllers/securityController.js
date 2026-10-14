const Visitor = require('../models/security/Visitor');
const Incident = require('../models/security/Incident');
const SecurityRoster = require('../models/security/SecurityRoster');
const PatrolLog = require('../models/security/PatrolLog');
const VehicleLog = require('../models/security/VehicleLog');
const AccessLog = require('../models/security/AccessLog');
const SecurityAlert = require('../models/security/SecurityAlert');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper to check Security department authorization
const isSecurityStaff = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return (user.department || '').toLowerCase() === 'security';
};

const isSecurityAdminOrSupervisor = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return (user.role === 'admin' || user.role === 'supervisor') && (user.department || '').toLowerCase() === 'security';
};

// ==================== VISITOR MANAGEMENT ====================

const checkInVisitor = async (req, res, next) => {
  try {
    if (!isSecurityStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Security staff only.' });
    }

    const { name, idType, idNumber, phone, visitingPerson, department, purpose, badgeNumber } = req.body;

    const visitor = await Visitor.create({
      name: name.trim(),
      idType: idType || 'National ID',
      idNumber: idNumber || '',
      phone: phone.trim(),
      visitingPerson: visitingPerson.trim(),
      department: department.trim(),
      purpose: purpose.trim(),
      badgeNumber: badgeNumber.trim(),
      checkIn: new Date(),
      status: 'checked_in',
      recordedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'VISITOR_CHECK_IN',
      resource: 'security_visitors',
      resourceId: visitor._id.toString(),
      after: visitor.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Visitor ${visitor.name} checked in with badge #${visitor.badgeNumber}`, data: visitor });
  } catch (error) {
    logger.error(`[Security Controller Error] checkInVisitor failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const checkOutVisitor = async (req, res, next) => {
  try {
    if (!isSecurityStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Security staff only.' });
    }

    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor record not found' });

    if (visitor.status === 'checked_out') {
      return res.status(400).json({ success: false, message: 'Visitor is already checked out' });
    }

    visitor.status = 'checked_out';
    visitor.checkOut = new Date();
    await visitor.save();

    await recordAuditLog({
      actor: req.user,
      action: 'VISITOR_CHECK_OUT',
      resource: 'security_visitors',
      resourceId: visitor._id.toString(),
      after: visitor.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: `Visitor ${visitor.name} checked out. Badge surrendered.`, data: visitor });
  } catch (error) {
    logger.error(`[Security Controller Error] checkOutVisitor failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getVisitors = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const reg = { $regex: req.query.search, $options: 'i' };
      filter.$or = [{ name: reg }, { badgeNumber: reg }, { phone: reg }, { visitingPerson: reg }];
    }

    const visitors = await Visitor.find(filter)
      .populate('recordedBy', 'name email employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: visitors.length, data: visitors });
  } catch (error) {
    logger.error(`[Security Controller Error] getVisitors failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== INCIDENTS ====================

const reportIncident = async (req, res, next) => {
  try {
    const { title, description, severity, location, evidence } = req.body;
    const incidentNumber = `INC-${Date.now().toString().slice(-6)}`;

    const incident = await Incident.create({
      incidentNumber,
      title: title.trim(),
      description: description.trim(),
      severity: severity || 'medium',
      location: location.trim(),
      status: 'open',
      evidence: evidence || [],
      reportedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'REPORT_SECURITY_INCIDENT',
      resource: 'security_incidents',
      resourceId: incident._id.toString(),
      after: incident.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Incident ${incidentNumber} reported`, data: incident });
  } catch (error) {
    logger.error(`[Security Controller Error] reportIncident failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getIncidents = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;

    const incidents = await Incident.find(filter)
      .populate('reportedBy', 'name email employeeId department')
      .populate('assignedTo', 'name email employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: incidents.length, data: incidents });
  } catch (error) {
    logger.error(`[Security Controller Error] getIncidents failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const updateIncident = async (req, res, next) => {
  try {
    if (!isSecurityAdminOrSupervisor(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Security Admin or Supervisor only.' });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    if (incident.isClosed) {
      return res.status(400).json({
        success: false,
        message: 'Incident record is closed and legally immutable. It cannot be altered.'
      });
    }

    const beforeState = incident.toJSON();
    const { status, resolutionNotes, assignedTo, evidence } = req.body;

    if (status) {
      incident.status = status;
      if (status === 'closed') {
        incident.isClosed = true;
        incident.closedAt = new Date();
      }
    }
    if (resolutionNotes) incident.resolutionNotes = resolutionNotes;
    if (assignedTo) incident.assignedTo = assignedTo;
    if (evidence && Array.isArray(evidence)) {
      incident.evidence.push(...evidence);
    }

    await incident.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_SECURITY_INCIDENT',
      resource: 'security_incidents',
      resourceId: incident._id.toString(),
      before: beforeState,
      after: incident.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: `Incident ${incident.incidentNumber} updated.`, data: incident });
  } catch (error) {
    logger.error(`[Security Controller Error] updateIncident failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== SHIFT ROSTERS ====================

const createSecurityRoster = async (req, res, next) => {
  try {
    if (!isSecurityAdminOrSupervisor(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Security Admin or Supervisor only.' });
    }

    const { guardId, postLocation, shiftDate, shiftType, startTime, endTime } = req.body;

    const roster = await SecurityRoster.create({
      guard: guardId,
      postLocation,
      shiftDate,
      shiftType: shiftType || 'morning',
      startTime,
      endTime,
      assignedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'ASSIGN_SECURITY_ROSTER',
      resource: 'security_rosters',
      resourceId: roster._id.toString(),
      after: roster.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: 'Guard assigned to security post', data: roster });
  } catch (error) {
    logger.error(`[Security Controller Error] createSecurityRoster failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getMyRoster = async (req, res, next) => {
  try {
    const rosters = await SecurityRoster.find({ guard: req.user._id })
      .populate('assignedBy', 'name email')
      .sort({ shiftDate: -1 });

    res.status(200).json({ success: true, count: rosters.length, data: rosters });
  } catch (error) {
    logger.error(`[Security Controller Error] getMyRoster failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getSecurityRosters = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.shiftDate) filter.shiftDate = req.query.shiftDate;
    if (req.query.shiftType) filter.shiftType = req.query.shiftType;

    const rosters = await SecurityRoster.find(filter)
      .populate('guard', 'name email employeeId phone')
      .populate('assignedBy', 'name email')
      .sort({ shiftDate: -1 });

    res.status(200).json({ success: true, count: rosters.length, data: rosters });
  } catch (error) {
    logger.error(`[Security Controller Error] getSecurityRosters failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== PATROLS ====================

const recordPatrol = async (req, res, next) => {
  try {
    if (!isSecurityStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Security staff only.' });
    }

    const { checkpoint, status, observations } = req.body;

    const patrol = await PatrolLog.create({
      officer: req.user._id,
      officerName: req.user.name,
      checkpoint,
      status: status || 'all_clear',
      observations: observations || '',
      scannedAt: new Date()
    });

    await recordAuditLog({
      actor: req.user,
      action: 'RECORD_PATROL_SCAN',
      resource: 'security_patrols',
      resourceId: patrol._id.toString(),
      after: patrol.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Checkpoint scan verified: ${checkpoint}`, data: patrol });
  } catch (error) {
    logger.error(`[Security Controller Error] recordPatrol failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getPatrolLogs = async (req, res, next) => {
  try {
    const patrols = await PatrolLog.find()
      .populate('officer', 'name email employeeId')
      .sort({ scannedAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, count: patrols.length, data: patrols });
  } catch (error) {
    logger.error(`[Security Controller Error] getPatrolLogs failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== VEHICLE LOG ====================

const logVehicle = async (req, res, next) => {
  try {
    if (!isSecurityStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Security staff only.' });
    }

    const { vehicleNumber, driverName, vehicleType, purpose, gateNumber } = req.body;

    const vehicle = await VehicleLog.create({
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      driverName: driverName.trim(),
      vehicleType: vehicleType || 'visitor',
      purpose: purpose || '',
      gateNumber: gateNumber || 'Gate 1',
      entryTime: new Date(),
      status: 'inside',
      recordedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'LOG_VEHICLE_ENTRY',
      resource: 'security_vehicles',
      resourceId: vehicle._id.toString(),
      after: vehicle.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Vehicle ${vehicle.vehicleNumber} logged entry`, data: vehicle });
  } catch (error) {
    logger.error(`[Security Controller Error] logVehicle failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getVehicles = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.status) filter.status = req.query.status;

    const vehicles = await VehicleLog.find(filter)
      .populate('recordedBy', 'name email')
      .sort({ entryTime: -1 });

    res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    logger.error(`[Security Controller Error] getVehicles failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== ACCESS CONTROL LOGS ====================

const getAccessLogs = async (req, res, next) => {
  try {
    if (!isSecurityAdminOrSupervisor(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Security Admin or Supervisor only.' });
    }

    const logs = await AccessLog.find()
      .populate('user', 'name email employeeId department')
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    logger.error(`[Security Controller Error] getAccessLogs failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== EMERGENCY ALERTS ====================

const broadcastAlert = async (req, res, next) => {
  try {
    if (!isSecurityAdminOrSupervisor(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Security Admin or Supervisor only.' });
    }

    const { title, level, message, location } = req.body;

    const alert = await SecurityAlert.create({
      title: title.trim(),
      level: level || 'high',
      message: message.trim(),
      location: location || 'Hospital-wide',
      active: true,
      broadcastedBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'BROADCAST_SECURITY_ALERT',
      resource: 'security_alerts',
      resourceId: alert._id.toString(),
      after: alert.toJSON(),
      req
    });

    logger.warn(`[Security Alert Broadcast] Level: ${alert.level} - ${alert.title} at ${alert.location}`);

    res.status(201).json({
      success: true,
      message: `Emergency Alert broadcasted across all departments: ${alert.title}`,
      data: alert
    });
  } catch (error) {
    logger.error(`[Security Controller Error] broadcastAlert failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getSecurityAlerts = async (req, res, next) => {
  try {
    const alerts = await SecurityAlert.find({ active: true })
      .populate('broadcastedBy', 'name email designation')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: alerts.length, data: alerts });
  } catch (error) {
    logger.error(`[Security Controller Error] getSecurityAlerts failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  checkInVisitor,
  checkOutVisitor,
  getVisitors,
  reportIncident,
  getIncidents,
  updateIncident,
  createSecurityRoster,
  getMyRoster,
  getSecurityRosters,
  recordPatrol,
  getPatrolLogs,
  logVehicle,
  getVehicles,
  getAccessLogs,
  broadcastAlert,
  getSecurityAlerts
};
