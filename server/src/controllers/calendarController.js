const CalendarHoliday = require('../models/calendar/CalendarHoliday');
const WeeklyOff = require('../models/calendar/WeeklyOff');
const PayrollRun = require('../models/PayrollRun');
const Leave = require('../models/hr/Leave');
const Roster = require('../models/roster/Roster');
const User = require('../models/User');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Create holiday
// @route   POST /api/v1/calendar/holidays
// @access  Private (Superadmin, HR Admin)
const createHoliday = async (req, res, next) => {
  try {
    const { date, name, type, departments } = req.body;
    if (!date || !name) {
      return res.status(400).json({ success: false, message: 'date (YYYY-MM-DD) and name are required' });
    }

    const year = parseInt(date.substring(0, 4), 10);
    const holiday = await CalendarHoliday.create({
      date,
      name,
      year,
      type: type || 'public',
      departments: Array.isArray(departments) ? departments : [],
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_HOLIDAY',
      resource: 'calendar_holidays',
      resourceId: holiday._id.toString(),
      after: holiday.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A holiday with this date and name already exists' });
    }
    logger.error(`[Calendar Error] ${error.message}`);
    next(error);
  }
};

// @desc    List holidays by year
// @route   GET /api/v1/calendar/holidays
// @access  Private
const getHolidays = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.year) {
      filter.year = parseInt(req.query.year, 10);
    }
    if (req.query.department) {
      filter.$or = [
        { departments: { $size: 0 } },
        { departments: req.query.department.toLowerCase() }
      ];
    }

    const holidays = await CalendarHoliday.find(filter).sort({ date: 1 });
    res.status(200).json({
      success: true,
      count: holidays.length,
      data: holidays
    });
  } catch (error) {
    logger.error(`[Calendar Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update holiday (blocked if payroll is locked for that month)
// @route   PATCH /api/v1/calendar/holidays/:id
// @access  Private (Superadmin, HR Admin)
const updateHoliday = async (req, res, next) => {
  try {
    const holiday = await CalendarHoliday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    const monthStr = holiday.date.substring(0, 7); // 'YYYY-MM'
    const lockedRun = await PayrollRun.findOne({ month: monthStr, isLocked: true });
    if (lockedRun) {
      return res.status(423).json({
        success: false,
        message: `Modification blocked: Payroll for ${monthStr} is finalized and locked.`
      });
    }

    const before = holiday.toObject();
    Object.assign(holiday, req.body);
    if (req.body.date) {
      holiday.year = parseInt(req.body.date.substring(0, 4), 10);
    }
    await holiday.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_HOLIDAY',
      resource: 'calendar_holidays',
      resourceId: holiday._id.toString(),
      before,
      after: holiday.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday
    });
  } catch (error) {
    logger.error(`[Calendar Error] ${error.message}`);
    next(error);
  }
};

// @desc    Delete holiday (blocked if payroll is locked)
// @route   DELETE /api/v1/calendar/holidays/:id
// @access  Private (Superadmin, HR Admin)
const deleteHoliday = async (req, res, next) => {
  try {
    const holiday = await CalendarHoliday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found' });
    }

    const monthStr = holiday.date.substring(0, 7);
    const lockedRun = await PayrollRun.findOne({ month: monthStr, isLocked: true });
    if (lockedRun) {
      return res.status(423).json({
        success: false,
        message: `Deletion blocked: Payroll for ${monthStr} is finalized and locked.`
      });
    }

    await holiday.deleteOne();

    await recordAuditLog({
      actor: req.user,
      action: 'DELETE_HOLIDAY',
      resource: 'calendar_holidays',
      resourceId: req.params.id,
      before: holiday.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    logger.error(`[Calendar Error] ${error.message}`);
    next(error);
  }
};

// @desc    Set weekly offs for department
// @route   POST /api/v1/calendar/weekly-offs
// @access  Private (Superadmin, HR Admin)
const setWeeklyOffs = async (req, res, next) => {
  try {
    const { department, days } = req.body;
    if (!department || !days || !Array.isArray(days)) {
      return res.status(400).json({ success: false, message: 'department and days array (e.g. ["Sunday"]) required' });
    }

    const weeklyOff = await WeeklyOff.findOneAndUpdate(
      { department: department.toLowerCase() },
      {
        department: department.toLowerCase(),
        days,
        effectiveFrom: new Date(),
        createdBy: req.user._id
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await recordAuditLog({
      actor: req.user,
      action: 'SET_WEEKLY_OFFS',
      resource: 'weekly_offs',
      resourceId: weeklyOff._id.toString(),
      after: weeklyOff.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: `Weekly offs for department ${department} updated successfully`,
      data: weeklyOff
    });
  } catch (error) {
    logger.error(`[Calendar Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get user's calculated working days for a month
// @route   GET /api/v1/calendar/working-days
// @access  Private
const getWorkingDays = async (req, res, next) => {
  try {
    const { month, userId } = req.query;
    if (!month) {
      return res.status(400).json({ success: false, message: 'month parameter (YYYY-MM) is required' });
    }

    const targetUserId = userId || req.user._id;
    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [yearStr, monthNumStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthNumStr, 10); // 1-indexed (1..12)

    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    // 1. Fetch holidays
    const holidays = await CalendarHoliday.find({
      date: { $regex: `^${month}` },
      $or: [
        { departments: { $size: 0 } },
        { departments: user.department.toLowerCase() }
      ]
    });
    const holidayDates = new Set(holidays.map((h) => h.date));

    // 2. Fetch weekly off definition for department
    const weeklyOffConfig = await WeeklyOff.findOne({ department: user.department.toLowerCase() });
    const offDayNames = weeklyOffConfig && weeklyOffConfig.days.length > 0
      ? weeklyOffConfig.days.map((d) => d.toLowerCase())
      : ['sunday'];

    // 3. Fetch approved leaves for user in this month
    const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);
    const leaves = await Leave.find({
      userId: user._id,
      status: 'approved',
      startDate: { $lte: endOfMonth },
      endDate: { $gte: startOfMonth }
    });

    const leaveDates = new Set();
    leaves.forEach((l) => {
      const cur = new Date(Math.max(l.startDate.getTime(), startOfMonth.getTime()));
      const stop = new Date(Math.min(l.endDate.getTime(), endOfMonth.getTime()));
      while (cur <= stop) {
        leaveDates.add(cur.toISOString().substring(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
    });

    // 4. Fetch assigned rosters if any
    const rosters = await Roster.find({
      userId: user._id,
      date: { $regex: `^${month}` },
      status: { $in: ['scheduled', 'completed'] }
    });
    const rosterMap = new Map();
    rosters.forEach((r) => rosterMap.set(r.date, r));

    const dayNameFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
    const workingDaysList = [];
    let workingDaysCount = 0;
    let holidaysCount = 0;
    let weeklyOffsCount = 0;
    let leavesCount = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');
      const dateStr = `${month}-${dayStr}`;
      const dateObj = new Date(year, monthNum - 1, day);
      const dayOfWeek = dayNameFormatter.format(dateObj).toLowerCase();

      const isHoliday = holidayDates.has(dateStr);
      const isWeeklyOff = offDayNames.includes(dayOfWeek);
      const isOnLeave = leaveDates.has(dateStr);
      const hasRoster = rosterMap.has(dateStr);

      let status = 'working_day';
      if (isOnLeave) {
        status = 'leave';
        leavesCount++;
      } else if (isHoliday) {
        status = 'holiday';
        holidaysCount++;
      } else if (isWeeklyOff && !hasRoster) {
        status = 'weekly_off';
        weeklyOffsCount++;
      } else {
        workingDaysCount++;
      }

      workingDaysList.push({
        date: dateStr,
        dayOfWeek,
        status,
        rosterAssigned: hasRoster
      });
    }

    const summaryData = {
      totalCalendarDays: totalDaysInMonth,
      totalWorkingDays: workingDaysCount,
      workingDays: workingDaysCount,
      weeklyOffs: weeklyOffsCount,
      holidays: holidaysCount,
      approvedLeaves: leavesCount
    };

    res.status(200).json({
      success: true,
      month,
      user: {
        id: user._id,
        name: user.name,
        department: user.department
      },
      summary: summaryData,
      days: workingDaysList,
      data: {
        ...summaryData,
        days: workingDaysList
      }
    });
  } catch (error) {
    logger.error(`[Calendar Working Days Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  createHoliday,
  getHolidays,
  updateHoliday,
  deleteHoliday,
  setWeeklyOffs,
  getWorkingDays
};
