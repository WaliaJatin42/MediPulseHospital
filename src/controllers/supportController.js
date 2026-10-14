const SupportRequest = require('../models/support/SupportRequest');
const HousekeepingSchedule = require('../models/support/HousekeepingSchedule');
const SupplyItem = require('../models/support/SupplyItem');
const SupplyIssue = require('../models/support/SupplyIssue');
const TransportBooking = require('../models/support/TransportBooking');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// Helper for Support department access
const isSupportStaff = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return (user.department || '').toLowerCase() === 'support';
};

const isSupportSupervisorOrAdmin = (user) => {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return (user.role === 'admin' || user.role === 'supervisor') && (user.department || '').toLowerCase() === 'support';
};

// ==================== SERVICE REQUESTS (TICKETS) ====================

const createRequest = async (req, res, next) => {
  try {
    const { category, priority, subject, description, location } = req.body;
    const ticketNumber = `SUP-${Date.now().toString().slice(-6)}`;

    const request = await SupportRequest.create({
      ticketNumber,
      requester: req.user._id,
      department: (req.user.department || 'general').toLowerCase(),
      category: category || 'general',
      priority: priority || 'medium',
      subject: subject.trim(),
      description: description.trim(),
      location: location.trim(),
      status: 'open'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_SUPPORT_REQUEST',
      resource: 'support_requests',
      resourceId: request._id.toString(),
      after: request.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Support ticket #${ticketNumber} created`, data: request });
  } catch (error) {
    logger.error(`[Support Controller Error] createRequest failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getRequests = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'user' && !isSupportStaff(req.user)) {
      filter.requester = req.user._id;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

    const requests = await SupportRequest.find(filter)
      .populate('requester', 'name email employeeId department phone')
      .populate('assignedTo', 'name email employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    logger.error(`[Support Controller Error] getRequests failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const updateRequest = async (req, res, next) => {
  try {
    if (!isSupportStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Support staff only.' });
    }

    const request = await SupportRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Support ticket not found' });

    const beforeState = request.toJSON();
    const { status, resolutionNotes, assignedTo } = req.body;

    if (status) {
      request.status = status;
      if (status === 'resolved' || status === 'closed') {
        request.resolvedAt = new Date();
      }
    }
    if (resolutionNotes) request.resolutionNotes = resolutionNotes;
    if (assignedTo) request.assignedTo = assignedTo;

    await request.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_SUPPORT_REQUEST',
      resource: 'support_requests',
      resourceId: request._id.toString(),
      before: beforeState,
      after: request.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: `Ticket ${request.ticketNumber} updated`, data: request });
  } catch (error) {
    logger.error(`[Support Controller Error] updateRequest failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const assignRequest = async (req, res, next) => {
  try {
    if (!isSupportSupervisorOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Support Supervisor or Admin only.' });
    }

    const { staffId } = req.body;
    const request = await SupportRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Support ticket not found' });

    request.assignedTo = staffId;
    request.assignedBy = req.user._id;
    request.status = 'assigned';
    await request.save();

    await recordAuditLog({
      actor: req.user,
      action: 'ASSIGN_SUPPORT_REQUEST',
      resource: 'support_requests',
      resourceId: request._id.toString(),
      after: request.toJSON(),
      req
    });

    res.status(200).json({ success: true, message: `Ticket ${request.ticketNumber} assigned to staff member`, data: request });
  } catch (error) {
    logger.error(`[Support Controller Error] assignRequest failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const submitFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const request = await SupportRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Ticket not found' });

    if (request.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Permission denied: Only the ticket requester can submit service feedback.' });
    }

    request.feedback = {
      rating: Number(rating),
      comment: comment || '',
      submittedAt: new Date()
    };
    await request.save();

    res.status(200).json({ success: true, message: 'Thank you for your service feedback', data: request });
  } catch (error) {
    logger.error(`[Support Controller Error] submitFeedback failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== HOUSEKEEPING SCHEDULES ====================

const createHousekeepingSchedule = async (req, res, next) => {
  try {
    if (!isSupportSupervisorOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Support Supervisor or Admin only.' });
    }

    const { areaLocation, assignedStaff, scheduleDate, shift, tasks, notes } = req.body;

    const schedule = await HousekeepingSchedule.create({
      areaLocation,
      assignedStaff,
      scheduleDate,
      shift,
      tasks: (tasks || []).map(t => ({ taskName: t, isCompleted: false })),
      notes: notes || '',
      status: 'pending'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_HOUSEKEEPING_SCHEDULE',
      resource: 'support_schedules',
      resourceId: schedule._id.toString(),
      after: schedule.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: 'Housekeeping task assigned', data: schedule });
  } catch (error) {
    logger.error(`[Support Controller Error] createHousekeepingSchedule failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getHousekeepingSchedules = async (req, res, next) => {
  try {
    let filter = {};
    if (req.query.scheduleDate) filter.scheduleDate = req.query.scheduleDate;
    if (req.query.shift) filter.shift = req.query.shift;

    const schedules = await HousekeepingSchedule.find(filter)
      .populate('assignedStaff', 'name email employeeId phone')
      .populate('inspectedBy', 'name email')
      .sort({ scheduleDate: -1 });

    res.status(200).json({ success: true, count: schedules.length, data: schedules });
  } catch (error) {
    logger.error(`[Support Controller Error] getHousekeepingSchedules failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getMyHousekeepingSchedules = async (req, res, next) => {
  try {
    const schedules = await HousekeepingSchedule.find({ assignedStaff: req.user._id })
      .sort({ scheduleDate: -1 });

    res.status(200).json({ success: true, count: schedules.length, data: schedules });
  } catch (error) {
    logger.error(`[Support Controller Error] getMyHousekeepingSchedules failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== SUPPLIES INVENTORY & ISSUE ====================

const createSupplyItem = async (req, res, next) => {
  try {
    if (!isSupportSupervisorOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Support Admin or Supervisor only.' });
    }

    const item = await SupplyItem.create(req.body);
    res.status(201).json({ success: true, message: 'Supply item added to inventory', data: item });
  } catch (error) {
    logger.error(`[Support Controller Error] createSupplyItem failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getSupplyItems = async (req, res, next) => {
  try {
    const items = await SupplyItem.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    logger.error(`[Support Controller Error] getSupplyItems failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const issueSupplyItem = async (req, res, next) => {
  try {
    if (!isSupportStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Support staff only.' });
    }

    const { quantity, issuedTo, department, purpose } = req.body;
    const qty = Number(quantity);

    const item = await SupplyItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Supply item not found' });

    if (item.currentStock < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient inventory. Available: ${item.currentStock}, Requested: ${qty}`
      });
    }

    item.currentStock -= qty;
    await item.save();

    const issueRecord = await SupplyIssue.create({
      supplyItem: item._id,
      supplyName: item.name,
      quantity: qty,
      issuedTo,
      department: department.toLowerCase(),
      purpose,
      issuedBy: req.user._id,
      issuedAt: new Date()
    });

    await recordAuditLog({
      actor: req.user,
      action: 'ISSUE_SUPPORT_SUPPLIES',
      resource: 'support_supplies',
      resourceId: issueRecord._id.toString(),
      after: issueRecord.toJSON(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Issued ${qty} ${item.unit} of ${item.name}. Remaining stock: ${item.currentStock}`,
      data: issueRecord
    });
  } catch (error) {
    logger.error(`[Support Controller Error] issueSupplyItem failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== TRANSPORT BOOKINGS ====================

const bookTransport = async (req, res, next) => {
  try {
    const { passengerCount, pickupLocation, dropLocation, pickupTime, purpose } = req.body;
    const bookingNumber = `TRN-${Date.now().toString().slice(-6)}`;

    const booking = await TransportBooking.create({
      bookingNumber,
      requester: req.user._id,
      department: (req.user.department || 'general').toLowerCase(),
      passengerCount: Number(passengerCount) || 1,
      pickupLocation,
      dropLocation,
      pickupTime: new Date(pickupTime),
      purpose,
      status: 'requested'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'BOOK_HOSPITAL_TRANSPORT',
      resource: 'support_transport',
      resourceId: booking._id.toString(),
      after: booking.toJSON(),
      req
    });

    res.status(201).json({ success: true, message: `Transport booking ${bookingNumber} received`, data: booking });
  } catch (error) {
    logger.error(`[Support Controller Error] bookTransport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getTransportBookings = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === 'user' && !isSupportStaff(req.user)) {
      filter.requester = req.user._id;
    }

    const bookings = await TransportBooking.find(filter)
      .populate('requester', 'name email employeeId phone')
      .sort({ pickupTime: -1 });

    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    logger.error(`[Support Controller Error] getTransportBookings failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const updateTransportBooking = async (req, res, next) => {
  try {
    if (!isSupportStaff(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Support staff only.' });
    }

    const booking = await TransportBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const { status, driverName, vehicleNumber, notes } = req.body;
    if (status) booking.status = status;
    if (driverName) booking.driverName = driverName;
    if (vehicleNumber) booking.vehicleNumber = vehicleNumber;
    if (notes) booking.notes = notes;

    await booking.save();
    res.status(200).json({ success: true, message: `Booking ${booking.bookingNumber} updated`, data: booking });
  } catch (error) {
    logger.error(`[Support Controller Error] updateTransportBooking failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// ==================== SUPPORT REPORTS ====================

const getSLAReport = async (req, res, next) => {
  try {
    if (!isSupportSupervisorOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Support Admin or Supervisor only.' });
    }

    const allResolved = await SupportRequest.find({ status: { $in: ['resolved', 'closed'] } });
    const count = allResolved.length;

    let totalResolutionHours = 0;
    allResolved.forEach(r => {
      if (r.resolvedAt && r.createdAt) {
        const hours = (new Date(r.resolvedAt) - new Date(r.createdAt)) / (1000 * 60 * 60);
        totalResolutionHours += hours;
      }
    });

    const averageResolutionHours = count > 0 ? parseFloat((totalResolutionHours / count).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      resolvedTicketsCount: count,
      averageResolutionHours,
      slaTargetHours: 24,
      complianceRate: count > 0 ? `${(((count - allResolved.filter(r => (new Date(r.resolvedAt) - new Date(r.createdAt)) > 24 * 3600 * 1000).length) / count) * 100).toFixed(1)}%` : '100%'
    });
  } catch (error) {
    logger.error(`[Support Controller Error] getSLAReport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

const getWorkloadReport = async (req, res, next) => {
  try {
    if (!isSupportSupervisorOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Permission denied: Support Admin or Supervisor only.' });
    }

    const workload = await SupportRequest.aggregate([
      {
        $group: {
          _id: { assignedTo: '$assignedTo', category: '$category' },
          totalTickets: { $sum: 1 },
          openTickets: { $sum: { $cond: [{ $in: ['$status', ['open', 'assigned', 'in_progress']] }, 1, 0] } }
        }
      }
    ]);

    res.status(200).json({ success: true, workload });
  } catch (error) {
    logger.error(`[Support Controller Error] getWorkloadReport failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  createRequest,
  getRequests,
  updateRequest,
  assignRequest,
  submitFeedback,
  createHousekeepingSchedule,
  getHousekeepingSchedules,
  getMyHousekeepingSchedules,
  createSupplyItem,
  getSupplyItems,
  issueSupplyItem,
  bookTransport,
  getTransportBookings,
  updateTransportBooking,
  getSLAReport,
  getWorkloadReport
};
