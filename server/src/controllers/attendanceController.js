const Attendance = require('../models/Attendance');
const User = require('../models/User');
const logger = require('../utils/logger');

const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

// @desc    Punch-In / Mark Arrival Attendance
// @route   POST /api/v1/attendance/punch-in
// @access  Private (All staff & admins)
const punchIn = async (req, res, next) => {
  try {
    const todayStr = getTodayDateString();
    logger.info(`[Attendance Controller] Punch-in attempt by user ${req.user.email} (${req.user.role}, Dept: ${req.user.department}) for date ${todayStr}`);

    const existingRecord = await Attendance.findOne({ user: req.user._id, date: todayStr });
    if (existingRecord) {
      logger.warn(`[Attendance Controller] Punch-in rejected: User ${req.user.email} already punched in today.`);
      return res.status(400).json({
        success: false,
        message: 'You have already punched in for today.'
      });
    }

    const { workMode, notes } = req.body;
    const now = new Date();

    const record = await Attendance.create({
      user: req.user._id,
      date: todayStr,
      punchIn: now,
      status: 'punched_in',
      shiftRequiredHours: 9, // 9-hour work policy
      workMode: workMode || 'on_site',
      department: (req.user.department || 'general').toLowerCase(),
      notes: notes || ''
    });

    const populatedRecord = await Attendance.findById(record._id).populate('user', 'name email role designation department');

    logger.info(`[Attendance Controller] Punch-in successful for ${req.user.email} at ${now.toISOString()}`);

    res.status(201).json({
      success: true,
      message: 'Punched in successfully. 9-hour shift started.',
      attendance: populatedRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Attendance Controller Error] punchIn failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Punch-Out / Calculate 9-Hour Work Duration & Update Status
// @route   POST /api/v1/attendance/punch-out
// @access  Private (All staff & admins)
const punchOut = async (req, res, next) => {
  try {
    const todayStr = getTodayDateString();
    logger.info(`[Attendance Controller] Punch-out attempt by user ${req.user.email}`);

    const record = await Attendance.findOne({ user: req.user._id, date: todayStr });
    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No punch-in record found for today. Please punch in first.'
      });
    }

    if (record.punchOut) {
      return res.status(400).json({
        success: false,
        message: 'You have already punched out for today.'
      });
    }

    const now = new Date();
    record.punchOut = now;

    // Calculate work duration against 9-Hour Work Policy
    const diffMs = now.getTime() - new Date(record.punchIn).getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    record.totalWorkMinutes = diffMinutes;
    record.totalWorkHours = diffHours;
    record.shiftRequiredHours = 9;
    record.isShiftCompleted = diffHours >= 9;

    // Evaluate 9-hour policy status
    if (diffHours >= 9) {
      record.status = 'present'; // Full 9-hour shift completed
    } else if (diffHours >= 4.5) {
      record.status = 'half_day'; // Worked between 4.5 to 9 hours
    } else {
      record.status = 'short_hours'; // Worked less than 4.5 hours
    }

    await record.save();

    const populatedRecord = await Attendance.findById(record._id).populate('user', 'name email role designation department');

    logger.info(`[Attendance Controller] Punch-out successful for ${req.user.email}. Worked: ${diffHours} hrs (Shift Completed: ${record.isShiftCompleted})`);

    res.status(200).json({
      success: true,
      message: record.isShiftCompleted
        ? `Punched out successfully. 9-hour shift completed (${diffHours} hrs).`
        : `Punched out successfully. Worked ${diffHours} hrs (Shift under 9 hrs: ${record.status.toUpperCase()}).`,
      attendance: populatedRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Attendance Controller Error] punchOut failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Get Personal Attendance Logs
// @route   GET /api/v1/attendance/me
// @access  Private
const getMyAttendance = async (req, res, next) => {
  try {
    const records = await Attendance.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(60);

    const serialized = records.map(r => r.toJSON());

    res.status(200).json({
      success: true,
      count: records.length,
      data: serialized,
      attendance: serialized
    });
  } catch (error) {
    logger.error(`[Attendance Controller Error] getMyAttendance failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    List Attendance Records (Superadmin, HR Admin, & HR Supervisors see ALL; Dept Admins/Supervisors see their department)
// @route   GET /api/v1/attendance
// @access  Private (Superadmin, HR Admin, HR Supervisor, Dept Admin, Dept Supervisor)
const getAllAttendance = async (req, res, next) => {
  try {
    let filter = {};

    const isSuperAdmin = req.user.role === 'superadmin';
    const isHRAdmin = req.user.role === 'admin' && (req.user.department === 'hr' || req.user.designation === 'HR Admin');
    const isHRSupervisor = req.user.role === 'supervisor' && (req.user.department === 'hr' || req.user.designation?.includes('HR'));

    if (isSuperAdmin || isHRAdmin || isHRSupervisor) {
      // Full visibility across ALL departments for Superadmin, HR Admin, and HR Supervisors!
      if (req.query.department) {
        filter.department = req.query.department.toLowerCase();
      }
    } else {
      // Department Admins & Supervisors can only view attendance for THEIR OWN department
      filter.department = req.user.department.toLowerCase();
    }

    if (req.query.date) filter.date = req.query.date;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.user = req.query.userId;

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};
      if (req.query.startDate) filter.date.$gte = req.query.startDate;
      if (req.query.endDate) filter.date.$lte = req.query.endDate;
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    const records = await Attendance.find(filter)
      .populate('user', 'name email role designation department phone avatar')
      .sort({ date: -1, punchIn: -1 })
      .skip(skip)
      .limit(limit);

    logger.info(`[Attendance Controller] Retrieved ${records.length} attendance records for ${req.user.email} (${req.user.role}, Dept: ${req.user.department})`);

    const serializedRecords = records.map(r => r.toJSON());

    res.status(200).json({
      success: true,
      count: records.length,
      data: serializedRecords,
      attendance: serializedRecords
    });
  } catch (error) {
    logger.error(`[Attendance Controller Error] getAllAttendance failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

// @desc    Manually Update or Record Attendance for a Staff Member
// @route   POST /api/v1/attendance/manual
// @access  Private (Superadmin, HR Admin, Dept Admin)
const markManualAttendance = async (req, res, next) => {
  try {
    const { userId, date, status, punchInTime, punchOutTime, notes, workMode } = req.body;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found.'
      });
    }

    const recordDate = date || getTodayDateString();

    let record = await Attendance.findOne({ user: targetUser._id, date: recordDate });

    const pIn = punchInTime ? new Date(punchInTime) : new Date();
    const pOut = punchOutTime ? new Date(punchOutTime) : null;

    if (!record) {
      record = new Attendance({
        user: targetUser._id,
        date: recordDate,
        department: targetUser.department.toLowerCase(),
        punchIn: pIn,
        punchOut: pOut,
        status: status || 'present',
        workMode: workMode || 'on_site',
        notes: notes || 'Manual entry by Admin'
      });
    } else {
      if (status) record.status = status;
      if (workMode) record.workMode = workMode;
      if (punchInTime) record.punchIn = pIn;
      if (punchOutTime) record.punchOut = pOut;
      if (notes) record.notes = notes;
    }

    if (record.punchIn && record.punchOut) {
      const diffMs = record.punchOut.getTime() - record.punchIn.getTime();
      const diffHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      record.totalWorkMinutes = Math.round(diffMs / (1000 * 60));
      record.totalWorkHours = diffHours;
      record.isShiftCompleted = diffHours >= 9;
    }

    await record.save();

    const populatedRecord = await Attendance.findById(record._id).populate('user', 'name email role designation department');

    logger.info(`[Attendance Controller] Manual attendance updated for ${targetUser.email} on ${recordDate} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      attendance: populatedRecord.toJSON()
    });
  } catch (error) {
    logger.error(`[Attendance Controller Error] markManualAttendance failed: ${error.message}`, { stack: error.stack });
    next(error);
  }
};

module.exports = {
  punchIn,
  punchOut,
  getMyAttendance,
  getAllAttendance,
  markManualAttendance
};
