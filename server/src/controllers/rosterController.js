const Shift = require('../models/roster/Shift');
const Roster = require('../models/roster/Roster');
const RosterSwapRequest = require('../models/roster/RosterSwapRequest');
const User = require('../models/User');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// ----------------- SHIFT CONTROLLERS -----------------

// @desc    Create shift definition
// @route   POST /api/v1/shifts
// @access  Private (Superadmin, HR Admin)
const createShift = async (req, res, next) => {
  try {
    const { name, code, startTime, endTime, crossesMidnight, breakMinutes, nightAllowance } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'name, startTime, and endTime are required' });
    }

    const shift = await Shift.create({
      name,
      code: code || name.slice(0, 3).toUpperCase(),
      startTime,
      endTime,
      crossesMidnight: crossesMidnight || false,
      breakMinutes: breakMinutes !== undefined ? breakMinutes : 60,
      nightAllowance: nightAllowance || 0,
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_SHIFT',
      resource: 'shifts',
      resourceId: shift._id.toString(),
      after: shift.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift
    });
  } catch (error) {
    logger.error(`[Shift Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get all shifts
// @route   GET /api/v1/shifts
// @access  Private
const getShifts = async (req, res, next) => {
  try {
    const shifts = await Shift.find({ isActive: true }).sort({ startTime: 1 });
    res.status(200).json({
      success: true,
      count: shifts.length,
      data: shifts
    });
  } catch (error) {
    logger.error(`[Shift Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update shift
// @route   PATCH /api/v1/shifts/:id
// @access  Private (Superadmin, HR Admin)
const updateShift = async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const before = shift.toObject();
    Object.assign(shift, req.body);
    await shift.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_SHIFT',
      resource: 'shifts',
      resourceId: shift._id.toString(),
      before,
      after: shift.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Shift updated successfully',
      data: shift
    });
  } catch (error) {
    logger.error(`[Shift Error] ${error.message}`);
    next(error);
  }
};

// ----------------- ROSTER CONTROLLERS -----------------

// @desc    Assign roster to staff
// @route   POST /api/v1/rosters
// @access  Private (Department Admin, Department Supervisor, Superadmin, HR)
const assignRoster = async (req, res, next) => {
  try {
    const { userId, shiftId, date, dates, startDate, endDate, notes } = req.body;
    let targetDates = dates && Array.isArray(dates) ? [...dates] : (date ? [date] : []);

    if (targetDates.length === 0 && startDate && endDate) {
      let curr = new Date(startDate);
      const end = new Date(endDate);
      while (curr <= end) {
        targetDates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }
    }

    if (!userId || !shiftId || targetDates.length === 0) {
      return res.status(400).json({ success: false, message: 'userId, shiftId, and date/dates/period are required' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const shift = await Shift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const createdRosters = [];

    for (const d of targetDates) {
      const roster = await Roster.findOneAndUpdate(
        { userId, date: d },
        {
          userId,
          department: targetUser.department,
          shiftId,
          date: d,
          assignedBy: req.user._id,
          status: 'scheduled',
          notes: notes || ''
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      createdRosters.push(roster);
    }

    await recordAuditLog({
      actor: req.user,
      action: 'ASSIGN_ROSTER',
      resource: 'rosters',
      resourceId: createdRosters[0]?._id?.toString(),
      after: { userId, shiftId, count: createdRosters.length },
      req
    });

    res.status(201).json({
      success: true,
      message: `Assigned shift ${shift.name} to ${targetUser.name} for ${createdRosters.length} day(s)`,
      count: createdRosters.length,
      data: createdRosters
    });
  } catch (error) {
    logger.error(`[Roster Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get rosters (scope-filtered by department)
// @route   GET /api/v1/rosters
// @access  Private
const getRosters = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== 'superadmin' && req.user.department !== 'hr') {
      filter.department = req.user.department.toLowerCase();
    } else if (req.query.department) {
      filter.department = req.query.department.toLowerCase();
    }

    if (req.query.date) filter.date = req.query.date;
    if (req.query.month) filter.date = { $regex: `^${req.query.month}` };
    if (req.query.userId) filter.userId = req.query.userId;

    const rosters = await Roster.find(filter)
      .populate('userId', 'name email employeeId designation department')
      .populate('shiftId', 'name startTime endTime crossesMidnight nightAllowance')
      .populate('assignedBy', 'name role')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: rosters.length,
      data: rosters
    });
  } catch (error) {
    logger.error(`[Roster Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get current user's roster
// @route   GET /api/v1/rosters/me
// @access  Private
const getMyRoster = async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.month) filter.date = { $regex: `^${req.query.month}` };

    const rosters = await Roster.find(filter)
      .populate('shiftId', 'name startTime endTime crossesMidnight nightAllowance')
      .sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: rosters.length,
      data: rosters
    });
  } catch (error) {
    logger.error(`[My Roster Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update roster before period starts
// @route   PATCH /api/v1/rosters/:id
// @access  Private (DA, DS, SA, HR)
const updateRoster = async (req, res, next) => {
  try {
    const roster = await Roster.findById(req.params.id);
    if (!roster) {
      return res.status(404).json({ success: false, message: 'Roster not found' });
    }

    const todayStr = new Date().toISOString().substring(0, 10);
    if (roster.date < todayStr && req.user.role !== 'superadmin') {
      return res.status(400).json({ success: false, message: 'Cannot modify roster for past dates' });
    }

    const before = roster.toObject();
    Object.assign(roster, req.body);
    await roster.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_ROSTER',
      resource: 'rosters',
      resourceId: roster._id.toString(),
      before,
      after: roster.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'Roster updated successfully',
      data: roster
    });
  } catch (error) {
    logger.error(`[Update Roster Error] ${error.message}`);
    next(error);
  }
};

// ----------------- SWAP REQUEST CONTROLLERS -----------------

// @desc    Request a roster shift swap with a colleague
// @route   POST /api/v1/rosters/swap-requests
// @access  Private (Staff)
const createSwapRequest = async (req, res, next) => {
  try {
    const { targetUserId, requesterRosterId, targetRosterId, reason } = req.body;
    if (!targetUserId || !requesterRosterId || !targetRosterId || !reason) {
      return res.status(400).json({ success: false, message: 'targetUserId, requesterRosterId, targetRosterId, and reason are required' });
    }

    const requesterRoster = await Roster.findById(requesterRosterId);
    const targetRoster = await Roster.findById(targetRosterId);

    if (!requesterRoster || !targetRoster) {
      return res.status(404).json({ success: false, message: 'One or both roster assignments not found' });
    }

    if (requesterRoster.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only swap your own assigned roster' });
    }

    const swapRequest = await RosterSwapRequest.create({
      requesterId: req.user._id,
      targetUserId,
      requesterRosterId,
      targetRosterId,
      department: req.user.department,
      reason,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Shift swap request submitted for supervisor approval',
      data: swapRequest
    });
  } catch (error) {
    logger.error(`[Swap Request Error] ${error.message}`);
    next(error);
  }
};

// @desc    Approve or reject shift swap request
// @route   PATCH /api/v1/rosters/swap-requests/:id/decision
// @access  Private (Department Supervisor, Department Admin, Superadmin)
const decideSwapRequest = async (req, res, next) => {
  try {
    const { decision, remarks } = req.body; // 'approved' | 'rejected'
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be approved or rejected' });
    }

    const swapRequest = await RosterSwapRequest.findById(req.params.id);
    if (!swapRequest) {
      return res.status(404).json({ success: false, message: 'Swap request not found' });
    }

    if (swapRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${swapRequest.status}` });
    }

    swapRequest.status = decision;
    swapRequest.decisionBy = req.user._id;
    swapRequest.decisionAt = new Date();
    swapRequest.decisionRemarks = remarks || '';
    await swapRequest.save();

    // If approved, swap the shifts between the two rosters
    if (decision === 'approved') {
      const r1 = await Roster.findById(swapRequest.requesterRosterId);
      const r2 = await Roster.findById(swapRequest.targetRosterId);

      if (r1 && r2) {
        const tempShift = r1.shiftId;
        r1.shiftId = r2.shiftId;
        r2.shiftId = tempShift;
        r1.status = 'swapped';
        r2.status = 'swapped';
        await r1.save();
        await r2.save();
      }
    }

    await recordAuditLog({
      actor: req.user,
      action: `SWAP_REQUEST_${decision.toUpperCase()}`,
      resource: 'roster_swap_requests',
      resourceId: swapRequest._id.toString(),
      after: { decision, remarks },
      req
    });

    res.status(200).json({
      success: true,
      message: `Shift swap request ${decision}`,
      data: swapRequest
    });
  } catch (error) {
    logger.error(`[Decide Swap Request Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  createShift,
  getShifts,
  updateShift,
  assignRoster,
  getRosters,
  getMyRoster,
  updateRoster,
  createSwapRequest,
  decideSwapRequest
};
