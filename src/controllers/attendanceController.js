const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Leave = require('../models/hr/Leave');
const WorkLocation = require('../models/attendance/WorkLocation');
const Device = require('../models/Device');
const AttendanceAnomaly = require('../models/attendance/AttendanceAnomaly');
const AttendanceCorrection = require('../models/attendance/AttendanceCorrection');
const PayrollRun = require('../models/PayrollRun');
const PayrollAdjustment = require('../models/payroll/PayrollAdjustment');
const Roster = require('../models/roster/Roster');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');
const { paginate } = require('../utils/pagination');

const getTodayDateString = () => {
  return new Date().toISOString().split('T')[0];
};

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// @desc    Check-In / Punch-In with Geofencing and Anti-Fraud Verification
// @route   POST /api/v1/attendance/check-in
// @access  Private (All staff)
const checkIn = async (req, res, next) => {
  try {
    const { workMode, notes, latitude, longitude, deviceId, photoRef } = req.body;
    const now = new Date();
    const todayStr = getTodayDateString();

    // Cross-midnight shift support: check assigned roster for today
    const roster = await Roster.findOne({ userId: req.user._id, date: todayStr }).populate('shiftId');
    let effectiveDate = todayStr;

    const existing = await Attendance.findOne({ user: req.user._id, date: effectiveDate });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already checked in for today.'
      });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    let validationStatus = 'verified';
    const anomaliesDetected = [];

    // 1. Geofence Check
    if (latitude !== undefined && longitude !== undefined) {
      const activeLocations = await WorkLocation.find({ isActive: true });
      if (activeLocations.length > 0) {
        let insideGeofence = false;
        for (const loc of activeLocations) {
          const dist = calculateDistanceMeters(latitude, longitude, loc.latitude, loc.longitude);
          if (dist <= loc.radiusMeters) {
            insideGeofence = true;
            break;
          }
        }

        if (!insideGeofence) {
          validationStatus = 'pending_review';
          anomaliesDetected.push({
            type: 'outside_geofence',
            details: { latitude, longitude, message: 'Check-in location is outside approved hospital geofence' }
          });
        }
      }
    }

    // 2. Device Binding Check
    if (deviceId) {
      // Check if device is bound to multiple users
      const deviceUsers = await Device.find({ deviceId }).distinct('userId');
      if (deviceUsers.length > 1) {
        validationStatus = 'pending_review';
        anomaliesDetected.push({
          type: 'multiple_users_same_device',
          details: { deviceId, userCount: deviceUsers.length }
        });
      }

      // Check if user has registered this device
      const userDevice = await Device.findOne({ userId: req.user._id, deviceId });
      if (!userDevice || userDevice.status !== 'approved') {
        validationStatus = 'pending_review';
        anomaliesDetected.push({
          type: 'unauthorized_device',
          details: { deviceId, status: userDevice ? userDevice.status : 'unregistered' }
        });
      }
    }

    // Evaluate lateness (Grace 15 mins past 9:00 AM or past roster shift start)
    let isLate = false;
    if (roster && roster.shiftId) {
      const [h, m] = roster.shiftId.startTime.split(':').map(Number);
      const shiftStart = new Date(now);
      shiftStart.setHours(h, m + 15, 0, 0); // 15 mins grace
      isLate = now > shiftStart;
    } else {
      const defaultStart = new Date(now);
      defaultStart.setHours(9, 15, 0, 0);
      isLate = now > defaultStart && workMode !== 'night_shift';
    }

    const record = await Attendance.create({
      user: req.user._id,
      date: effectiveDate,
      punchIn: now,
      status: isLate ? 'late' : 'punched_in',
      isLate,
      shiftRequiredHours: 9,
      workMode: workMode || 'on_site',
      department: (req.user.department || 'general').toLowerCase(),
      notes: notes || '',
      latitude: latitude || null,
      longitude: longitude || null,
      deviceId: deviceId || null,
      photoRef: photoRef || null,
      clientIp,
      validationStatus,
      history: [
        {
          timestamp: now,
          changedBy: req.user._id,
          reason: 'Initial check-in',
          changes: { punchIn: now, validationStatus }
        }
      ]
    });

    // Save any detected anomalies
    for (const anom of anomaliesDetected) {
      await AttendanceAnomaly.create({
        userId: req.user._id,
        attendanceId: record._id,
        type: anom.type,
        details: anom.details,
        status: 'pending'
      });
    }

    await recordAuditLog({
      actor: req.user,
      action: 'ATTENDANCE_CHECK_IN',
      resource: 'attendance',
      resourceId: record._id.toString(),
      after: record.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: validationStatus === 'pending_review'
        ? 'Check-in recorded under pending review due to location or device verification.'
        : `Checked in successfully.${isLate ? ' (Marked Late - Arrival past grace threshold)' : ''}`,
      attendance: record
    });
  } catch (error) {
    logger.error(`[Attendance CheckIn Error] ${error.message}`);
    next(error);
  }
};

// @desc    Check-Out / Punch-Out
// @route   POST /api/v1/attendance/check-out
// @access  Private (All staff)
const checkOut = async (req, res, next) => {
  try {
    const todayStr = getTodayDateString();
    const record = await Attendance.findOne({ user: req.user._id, date: todayStr });

    if (!record) {
      return res.status(400).json({ success: false, message: 'No check-in record found for today. Please check in first.' });
    }

    if (record.punchOut) {
      return res.status(400).json({ success: false, message: 'You have already checked out for today.' });
    }

    const now = new Date();
    record.punchOut = now;

    const diffMs = now.getTime() - new Date(record.punchIn).getTime();
    const diffHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    record.totalWorkMinutes = diffMinutes;
    record.totalWorkHours = diffHours;
    record.isShiftCompleted = diffHours >= record.shiftRequiredHours;

    if (diffHours >= 8) {
      record.status = record.isLate ? 'late' : 'present';
    } else if (diffHours >= 4) {
      record.status = 'half_day';
    } else {
      record.status = 'short_hours';
    }

    record.history.push({
      timestamp: now,
      changedBy: req.user._id,
      reason: 'Check-out punch',
      changes: { punchOut: now, totalWorkHours: diffHours, status: record.status }
    });

    await record.save();

    await recordAuditLog({
      actor: req.user,
      action: 'ATTENDANCE_CHECK_OUT',
      resource: 'attendance',
      resourceId: record._id.toString(),
      after: record.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Checked out successfully. Logged ${diffHours} work hours (${record.status}).`,
      attendance: record
    });
  } catch (error) {
    logger.error(`[Attendance CheckOut Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get attendance records (scope filtered)
// @route   GET /api/v1/attendance
// @access  Private
const getAttendance = async (req, res, next) => {
  try {
    const caller = req.user;
    let filter = {};

    if (caller.role === 'user') {
      filter.user = caller._id;
    } else if (['admin', 'supervisor'].includes(caller.role) && caller.department !== 'hr') {
      filter.department = caller.department.toLowerCase();
    }

    const result = await paginate(Attendance, filter, req.query, {
      populate: { path: 'user', select: 'name email employeeId designation department' },
      sort: { date: -1 },
      dateField: 'date',
      customFilters: (f, q) => {
        if (q.date) f.date = q.date;
        if (q.month) f.date = { $regex: `^${q.month}` };
        if (q.userId) f.user = q.userId;
      }
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Get Attendance Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get full audit and edit history for an attendance record
// @route   GET /api/v1/attendance/:id/history
// @access  Private
const getAttendanceHistory = async (req, res, next) => {
  try {
    const record = await Attendance.findById(req.params.id)
      .populate('user', 'name email employeeId department')
      .populate('history.changedBy', 'name role email');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    res.status(200).json({
      success: true,
      attendanceId: record._id,
      user: record.user,
      date: record.date,
      currentStatus: record.status,
      history: record.history || []
    });
  } catch (error) {
    logger.error(`[Attendance History Error] ${error.message}`);
    next(error);
  }
};

// ----------------- ATTENDANCE CORRECTIONS -----------------

// @desc    Request attendance correction
// @route   POST /api/v1/attendance/corrections
// @access  Private (Employee or Department Supervisor)
const requestCorrection = async (req, res, next) => {
  try {
    let { attendanceId, date, correctedIn, correctedOut, reason, evidenceRef, userId } = req.body;
    const targetUserId = userId || req.user._id;

    if (!date || !correctedIn || !correctedOut || !reason) {
      return res.status(400).json({
        success: false,
        message: 'date, correctedIn, correctedOut, and reason are required'
      });
    }

    let attendance = attendanceId
      ? await Attendance.findById(attendanceId)
      : await Attendance.findOne({ $or: [{ user: targetUserId }, { userId: targetUserId }], date });

    if (!attendance) {
      attendance = await Attendance.create({
        user: targetUserId,
        userId: targetUserId,
        department: (req.user.department || 'general').toLowerCase(),
        date,
        punchIn: new Date(correctedIn),
        punchOut: new Date(correctedOut),
        status: 'absent'
      });
      attendanceId = attendance._id;
    } else {
      attendanceId = attendance._id;
    }

    // Time window check: Only SA can correct older than current and previous month
    const currentDate = new Date();
    const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const prevMonthStr = prevMonthDate.toISOString().substring(0, 7);

    const recordMonthStr = date.substring(0, 7);
    if (recordMonthStr < prevMonthStr && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only Superadmin can request or apply corrections older than the current and previous month.'
      });
    }

    const correction = await AttendanceCorrection.create({
      userId: targetUserId,
      attendanceId,
      date,
      originalIn: attendance.punchIn,
      originalOut: attendance.punchOut,
      correctedIn: new Date(correctedIn),
      correctedOut: new Date(correctedOut),
      reason,
      evidenceRef: evidenceRef || null,
      status: 'pending'
    });

    await recordAuditLog({
      actor: req.user,
      action: 'REQUEST_ATTENDANCE_CORRECTION',
      resource: 'attendance_corrections',
      resourceId: correction._id.toString(),
      after: correction.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Attendance correction request submitted for supervisor & HR approval',
      data: correction
    });
  } catch (error) {
    logger.error(`[Request Correction Error] ${error.message}`);
    next(error);
  }
};

// @desc    List attendance corrections (scope filtered)
// @route   GET /api/v1/attendance/corrections
// @access  Private
const getCorrections = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'user') {
      filter.userId = req.user._id;
    } else if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    const result = await paginate(AttendanceCorrection, filter, req.query, {
      populate: [
        { path: 'userId', select: 'name email employeeId department' },
        { path: 'attendanceId' },
        { path: 'level1Decision.approverId', select: 'name role' },
        { path: 'level2Decision.approverId', select: 'name role' }
      ],
      sort: { createdAt: -1 },
      dateField: 'createdAt'
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Get Corrections Error] ${error.message}`);
    next(error);
  }
};

// @desc    Decide attendance correction (DS/DA level 1, HRA level 2, SA can override)
// @route   PATCH /api/v1/attendance/corrections/:id/decision
// @access  Private (DS, DA, HRA, SA)
const decideCorrection = async (req, res, next) => {
  try {
    const decision = req.body.decision || req.body.status;
    const { remarks } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
    }

    const correction = await AttendanceCorrection.findById(req.params.id);
    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found' });
    }

    const caller = req.user;
    const isSA = caller.role === 'superadmin';
    const isHRA = caller.department === 'hr' && caller.role === 'admin';
    const isDeptApprover = ['admin', 'supervisor'].includes(caller.role);

    if (decision === 'rejected') {
      correction.status = 'rejected';
      if (isDeptApprover && !isHRA && !isSA) {
        correction.level1Decision = { approverId: caller._id, decision: 'rejected', remarks, decidedAt: new Date() };
      } else {
        correction.level2Decision = { approverId: caller._id, decision: 'rejected', remarks, decidedAt: new Date() };
      }
      await correction.save();

      return res.status(200).json({
        success: true,
        message: 'Correction request rejected',
        data: correction
      });
    }

    // Two-level approval logic:
    // If Dept approver -> sets status to 'dept_approved'
    // If HRA or SA -> sets status to 'approved' and updates attendance record
    if (isDeptApprover && !isHRA && !isSA) {
      correction.status = 'dept_approved';
      correction.level1Decision = { approverId: caller._id, decision: 'approved', remarks, decidedAt: new Date() };
      await correction.save();

      return res.status(200).json({
        success: true,
        message: 'Department level approval granted. Forwarded to HR Admin for final confirmation.',
        data: correction
      });
    }

    // Final approval (HRA or SA)
    correction.status = 'approved';
    correction.level2Decision = { approverId: caller._id, decision: 'approved', remarks, decidedAt: new Date() };

    // Update Attendance record
    const attendance = await Attendance.findById(correction.attendanceId);
    if (attendance) {
      const oldHours = attendance.totalWorkHours || 0;
      attendance.punchIn = correction.correctedIn;
      attendance.punchOut = correction.correctedOut;

      const diffMs = new Date(correction.correctedOut).getTime() - new Date(correction.correctedIn).getTime();
      const diffHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      attendance.totalWorkHours = diffHours;
      attendance.totalWorkMinutes = Math.round(diffMs / (1000 * 60));
      attendance.status = diffHours >= 8 ? 'present' : diffHours >= 4 ? 'half_day' : 'short_hours';

      attendance.history.push({
        timestamp: new Date(),
        changedBy: caller._id,
        reason: `Correction approved: ${remarks || correction.reason}`,
        changes: {
          punchIn: correction.correctedIn,
          punchOut: correction.correctedOut,
          totalWorkHours: diffHours
        }
      });
      await attendance.save();

      // Check if this month's payroll is locked
      const monthStr = correction.date.substring(0, 7);
      const lockedRun = await PayrollRun.findOne({ month: monthStr, isLocked: true });

      if (lockedRun) {
        // Locked month: Create a PayrollAdjustment carry-forward item!
        const targetUser = await User.findById(correction.userId);
        const hourlyRate = (targetUser?.salary || 30000) / (30 * 8);
        const hourDiff = diffHours - oldHours;
        const diffAmount = Math.round(hourDiff * hourlyRate);

        const adjustment = await PayrollAdjustment.create({
          userId: correction.userId,
          sourceRunId: lockedRun.runId,
          attendanceCorrectionId: correction._id,
          month: monthStr,
          type: diffAmount >= 0 ? 'arrear' : 'deduction',
          amount: Math.abs(diffAmount),
          reason: `Locked month (${monthStr}) attendance correction: delta ${hourDiff} hrs`,
          status: 'pending',
          createdBy: caller._id
        });

        correction.isPayrollAdjustmentCreated = true;
        correction.payrollAdjustmentId = adjustment._id;
      }
    }

    await correction.save();

    await recordAuditLog({
      actor: caller,
      action: 'APPROVE_ATTENDANCE_CORRECTION',
      resource: 'attendance_corrections',
      resourceId: correction._id.toString(),
      after: correction.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Attendance correction approved and applied successfully.',
      payrollAdjustmentCreated: correction.isPayrollAdjustmentCreated,
      data: correction
    });
  } catch (error) {
    logger.error(`[Decide Correction Error] ${error.message}`);
    next(error);
  }
};

// ----------------- WORK LOCATIONS -----------------

// @desc    Create work location with geofence
// @route   POST /api/v1/work-locations
// @access  Private (Superadmin, HR Admin)
const createWorkLocation = async (req, res, next) => {
  try {
    const { name, latitude, longitude, radiusMeters, allowedIpRanges } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'name, latitude, and longitude are required' });
    }

    const location = await WorkLocation.create({
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radiusMeters: radiusMeters ? Number(radiusMeters) : 200,
      allowedIpRanges: Array.isArray(allowedIpRanges) ? allowedIpRanges : [],
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_WORK_LOCATION',
      resource: 'work_locations',
      resourceId: location._id.toString(),
      after: location.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Work location created successfully',
      data: location
    });
  } catch (error) {
    logger.error(`[Create Work Location Error] ${error.message}`);
    next(error);
  }
};

// @desc    List work locations
// @route   GET /api/v1/work-locations
// @access  Private
const getWorkLocations = async (req, res, next) => {
  try {
    const result = await paginate(WorkLocation, { isActive: true }, req.query, {
      searchFields: ['name'],
      dateField: 'createdAt'
    });
    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Get Work Locations Error] ${error.message}`);
    next(error);
  }
};

// ----------------- DEVICE BINDING -----------------

// @desc    Register a trusted device
// @route   POST /api/v1/devices/register
// @access  Private (Staff)
const registerDevice = async (req, res, next) => {
  try {
    const { deviceId, deviceName, deviceType, fcmToken } = req.body;
    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId is required' });
    }

    const existingDevice = await Device.findOne({ userId: req.user._id, deviceId });
    if (!existingDevice) {
      const existingCount = await Device.countDocuments({ userId: req.user._id, status: { $ne: 'revoked' } });
      if (existingCount >= 2) {
        const oldest = await Device.findOne({ userId: req.user._id, status: { $ne: 'revoked' } }).sort({ createdAt: 1 });
        if (oldest) {
          oldest.status = 'revoked';
          await oldest.save();
        }
      }
    }

    const updateFields = {
      userId: req.user._id,
      deviceId,
      deviceName: deviceName || 'Mobile Device',
      deviceType: deviceType || 'mobile',
      status: 'pending',
      lastUsedAt: new Date()
    };
    if (fcmToken) {
      updateFields.fcmToken = fcmToken;
      // Also register on User
      await User.updateOne(
        { _id: req.user._id, 'fcmTokens.token': { $ne: fcmToken } },
        { $push: { fcmTokens: { token: fcmToken, deviceId, platform: deviceType || 'web', updatedAt: new Date() } } }
      );
    }

    const device = await Device.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      updateFields,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'Device registered. Waiting for HR Admin approval.',
      data: device
    });
  } catch (error) {
    logger.error(`[Register Device Error] ${error.message}`);
    next(error);
  }
};

// @desc    Approve or reject registered device
// @route   PATCH /api/v1/devices/:id/approve
// @access  Private (HR Admin, Superadmin)
const approveDevice = async (req, res, next) => {
  try {
    const { status = 'approved' } = req.body;
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    device.status = status;
    device.approvedBy = req.user._id;
    device.approvedAt = new Date();
    await device.save();

    await recordAuditLog({
      actor: req.user,
      action: 'APPROVE_DEVICE',
      resource: 'devices',
      resourceId: device._id.toString(),
      after: device.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Device status updated to ${status}`,
      data: device
    });
  } catch (error) {
    logger.error(`[Approve Device Error] ${error.message}`);
    next(error);
  }
};

// ----------------- ATTENDANCE ANOMALIES -----------------

// @desc    List attendance anomalies
// @route   GET /api/v1/attendance/anomalies
// @access  Private (HRA, SA, DS for own department)
const getAnomalies = async (req, res, next) => {
  try {
    const filter = {};
    const result = await paginate(AttendanceAnomaly, filter, req.query, {
      populate: [
        { path: 'userId', select: 'name email employeeId department' },
        { path: 'attendanceId' }
      ],
      sort: { createdAt: -1 },
      dateField: 'createdAt'
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error(`[Get Anomalies Error] ${error.message}`);
    next(error);
  }
};

// @desc    Review anomaly (confirm or dismiss)
// @route   PATCH /api/v1/attendance/anomalies/:id
// @access  Private (HRA, SA)
const reviewAnomaly = async (req, res, next) => {
  try {
    const { status, reviewNotes } = req.body; // 'confirmed' | 'dismissed'
    if (!['confirmed', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be confirmed or dismissed' });
    }

    const anomaly = await AttendanceAnomaly.findById(req.params.id);
    if (!anomaly) {
      return res.status(404).json({ success: false, message: 'Anomaly record not found' });
    }

    anomaly.status = status;
    anomaly.reviewedBy = req.user._id;
    anomaly.reviewedAt = new Date();
    anomaly.reviewNotes = reviewNotes || '';
    await anomaly.save();

    res.status(200).json({
      success: true,
      message: `Anomaly marked as ${status}`,
      data: anomaly
    });
  } catch (error) {
    logger.error(`[Review Anomaly Error] ${error.message}`);
    next(error);
  }
};

// Backward-compatibility aliases
const getMyAttendance = async (req, res, next) => {
  req.query.userId = req.user._id;
  return getAttendance(req, res, next);
};

const getAllAttendance = getAttendance;

const manualCorrection = async (req, res, next) => {
  const { punchIn, punchOut, reason, status } = req.body;
  const attendance = await Attendance.findById(req.params.id);
  if (!attendance) {
    return res.status(404).json({ success: false, message: 'Attendance record not found' });
  }

  if (punchIn) attendance.punchIn = new Date(punchIn);
  if (punchOut) attendance.punchOut = new Date(punchOut);
  if (status) attendance.status = status;
  attendance.manualCorrection = {
    isCorrected: true,
    reason: reason || 'Superadmin manual adjustment',
    correctedBy: req.user._id,
    correctedAt: new Date()
  };
  attendance.history.push({
    timestamp: new Date(),
    changedBy: req.user._id,
    reason: reason || 'Superadmin override',
    changes: req.body
  });
  await attendance.save();

  res.status(200).json({ success: true, message: 'Attendance corrected successfully', attendance });
};

const getAttendanceSummary = async (req, res, next) => {
  const month = req.query.month || new Date().toISOString().substring(0, 7);
  const filter = { date: { $regex: `^${month}` } };
  if (req.user.role === 'user') filter.user = req.user._id;

  const records = await Attendance.find(filter);
  const summary = {
    totalDaysPunched: records.length,
    present: records.filter((r) => r.status === 'present').length,
    late: records.filter((r) => r.status === 'late' || r.isLate).length,
    halfDay: records.filter((r) => r.status === 'half_day').length,
    shortHours: records.filter((r) => r.status === 'short_hours').length
  };
  res.status(200).json({ success: true, month, summary });
};

module.exports = {
  checkIn,
  checkOut,
  getAttendance,
  getAttendanceHistory,
  requestCorrection,
  getCorrections,
  decideCorrection,
  createWorkLocation,
  getWorkLocations,
  registerDevice,
  approveDevice,
  getAnomalies,
  reviewAnomaly,
  getMyAttendance,
  getAllAttendance,
  manualCorrection,
  getAttendanceSummary
};

