const Branch = require('../models/branch/Branch');
const User = require('../models/User');
const { recordAuditLog } = require('../utils/auditLogger');
const logger = require('../utils/logger');

// @desc    Create new hospital branch (Superadmin only)
// @route   POST /api/v1/branches
// @access  Private (Superadmin)
const createBranch = async (req, res, next) => {
  try {
    const { code, name, address, phone, email, timezone, invoicePrefix, uhidPrefix, isMain, settings, modules } = req.body;

    const existing = await Branch.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: `Branch with code ${code} already exists` });
    }

    if (isMain) {
      await Branch.updateMany({}, { isMain: false });
    }

    const branch = await Branch.create({
      code: code.toUpperCase(),
      name,
      address,
      phone,
      email,
      timezone: timezone || 'Asia/Kolkata',
      invoicePrefix: invoicePrefix ? invoicePrefix.toUpperCase() : `INV-${code.toUpperCase()}`,
      uhidPrefix: uhidPrefix ? uhidPrefix.toUpperCase() : `MPH-${code.toUpperCase()}`,
      isMain: !!isMain,
      settings: settings || {},
      modules: modules || {},
      createdBy: req.user._id
    });

    await recordAuditLog({
      actor: req.user,
      action: 'CREATE_BRANCH',
      resource: 'branches',
      resourceId: branch._id.toString(),
      after: branch.toObject(),
      req
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: branch
    });
  } catch (error) {
    logger.error(`[Create Branch Error] ${error.message}`);
    next(error);
  }
};

// @desc    List hospital branches
// @route   GET /api/v1/branches
// @access  Private
const getBranches = async (req, res, next) => {
  try {
    const filter = req.user.role === 'superadmin' ? {} : { status: 'active' };
    const branches = await Branch.find(filter).sort({ isMain: -1, code: 1 });

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    logger.error(`[Get Branches Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get branch details by ID
// @route   GET /api/v1/branches/:id
// @access  Private
const getBranchById = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    res.status(200).json({ success: true, data: branch });
  } catch (error) {
    logger.error(`[Get Branch Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update branch details (Superadmin)
// @route   PATCH /api/v1/branches/:id
// @access  Private (Superadmin)
const updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const before = branch.toObject();

    if (req.body.isMain) {
      await Branch.updateMany({ _id: { $ne: branch._id } }, { isMain: false });
    }

    Object.assign(branch, req.body);
    await branch.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE_BRANCH',
      resource: 'branches',
      resourceId: branch._id.toString(),
      before,
      after: branch.toObject(),
      req
    });

    res.status(200).json({ success: true, message: 'Branch updated', data: branch });
  } catch (error) {
    logger.error(`[Update Branch Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get branch settings
// @route   GET /api/v1/branches/:id/settings
// @access  Private
const getBranchSettings = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id).select('settings timezone invoicePrefix uhidPrefix code name');
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.status(200).json({ success: true, data: branch });
  } catch (error) {
    logger.error(`[Get Branch Settings Error] ${error.message}`);
    next(error);
  }
};

// @desc    Update branch settings
// @route   PUT /api/v1/branches/:id/settings
// @access  Private (Superadmin)
const updateBranchSettings = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    branch.settings = { ...branch.settings, ...(req.body.settings || req.body) };
    if (req.body.timezone) branch.timezone = req.body.timezone;
    if (req.body.invoicePrefix) branch.invoicePrefix = req.body.invoicePrefix;
    await branch.save();

    res.status(200).json({ success: true, message: 'Branch settings updated', data: branch.settings });
  } catch (error) {
    logger.error(`[Update Branch Settings Error] ${error.message}`);
    next(error);
  }
};

// @desc    Get branch module flags
// @route   GET /api/v1/branches/:id/modules
// @access  Private
const getBranchModules = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id).select('modules code name');
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.status(200).json({ success: true, data: branch.modules });
  } catch (error) {
    logger.error(`[Get Branch Modules Error] ${error.message}`);
    next(error);
  }
};

// @desc    Toggle/update branch module flags
// @route   PATCH /api/v1/branches/:id/modules
// @access  Private (Superadmin)
const updateBranchModules = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    branch.modules = { ...branch.modules, ...req.body };
    await branch.save();

    res.status(200).json({ success: true, message: 'Branch modules updated', data: branch.modules });
  } catch (error) {
    logger.error(`[Update Branch Modules Error] ${error.message}`);
    next(error);
  }
};

// @desc    Switch active working branch for user session
// @route   POST /api/v1/auth/switch-branch
// @access  Private
const switchBranch = async (req, res, next) => {
  try {
    const { branchId } = req.body;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'branchId is required' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch || branch.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Target branch is not active or does not exist' });
    }

    const user = await User.findById(req.user._id);

    // Permission check: Superadmin can access any branch; regular staff must have branchId in branchIds[]
    if (user.role !== 'superadmin' && user.branchIds && user.branchIds.length > 0) {
      const hasAccess = user.branchIds.some((b) => b.toString() === branchId.toString());
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'User is not assigned to this branch' });
      }
    }

    user.activeBranchId = branch._id;
    await user.save();

    // Generate fresh JWT token carrying activeBranchId
    const jwt = require('jsonwebtoken');
    const newToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        department: user.department,
        activeBranchId: branch._id.toString()
      },
      process.env.JWT_SECRET || 'medipulse_jwt_secret_production_key_2026',
      { expiresIn: '15m' }
    );

    res.status(200).json({
      success: true,
      message: `Active branch switched to ${branch.name} (${branch.code})`,
      data: {
        activeBranch: {
          _id: branch._id,
          code: branch.code,
          name: branch.name,
          timezone: branch.timezone
        },
        accessToken: newToken
      }
    });
  } catch (error) {
    logger.error(`[Switch Branch Error] ${error.message}`);
    next(error);
  }
};

// Inter-Branch In-Memory Store / Model for transfers
const InterBranchTransfer = require('../models/branch/InterBranchTransfer');

// @desc    Initiate Inter-Branch Transfer (Patient or Stock)
// @route   POST /api/v1/inter-branch/:type
// @access  Private (DA, DS, SA)
const createInterBranchTransfer = async (req, res, next) => {
  try {
    const { fromBranchId, toBranchId, type, details, items, patientId } = req.body;

    if (!toBranchId) {
      return res.status(400).json({ success: false, message: 'toBranchId is required' });
    }

    const transfer = await InterBranchTransfer.create({
      fromBranchId: fromBranchId || req.branchId,
      toBranchId,
      transferType: req.params.type || type || 'stock',
      patientId: patientId || null,
      items: items || [],
      details: details || {},
      status: 'in_transit',
      initiatedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Inter-branch transfer initiated',
      data: transfer
    });
  } catch (error) {
    logger.error(`[Inter Branch Error] ${error.message}`);
    next(error);
  }
};

// @desc    Receive Inter-Branch Transfer
// @route   PATCH /api/v1/inter-branch/transfers/:id/receive
// @access  Private
const receiveInterBranchTransfer = async (req, res, next) => {
  try {
    const transfer = await InterBranchTransfer.findById(req.params.id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transfer record not found' });
    }

    if (transfer.status === 'received') {
      return res.status(409).json({ success: false, message: 'Transfer has already been received' });
    }

    transfer.status = 'received';
    transfer.receivedBy = req.user._id;
    transfer.receivedAt = new Date();
    await transfer.save();

    res.status(200).json({
      success: true,
      message: 'Inter-branch transfer marked as received',
      data: transfer
    });
  } catch (error) {
    logger.error(`[Receive Transfer Error] ${error.message}`);
    next(error);
  }
};

// @desc    List Inter-Branch Transfers
// @route   GET /api/v1/inter-branch/transfers
// @access  Private
const getInterBranchTransfers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role !== 'superadmin' && req.branchId) {
      filter.$or = [{ fromBranchId: req.branchId }, { toBranchId: req.branchId }];
    }
    const transfers = await InterBranchTransfer.find(filter)
      .populate('fromBranchId', 'name code')
      .populate('toBranchId', 'name code')
      .populate('initiatedBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: transfers.length, data: transfers });
  } catch (error) {
    logger.error(`[List Transfers Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  getBranchSettings,
  updateBranchSettings,
  getBranchModules,
  updateBranchModules,
  switchBranch,
  createInterBranchTransfer,
  receiveInterBranchTransfer,
  getInterBranchTransfers
};
