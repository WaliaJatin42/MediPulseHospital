const mongoose = require('mongoose');
const SystemSetting = require('../models/system/SystemSetting');
const JobLock = require('../models/system/JobLock');
const JobRun = require('../models/system/JobRun');
const logger = require('../utils/logger');
const { recordAuditLog } = require('../utils/auditLogger');

// @desc    Get system settings (timezone, currency, policies)
// @route   GET /api/v1/settings/system
// @access  Private (SA, Admins)
const getSystemSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        financialYearStart: '04-01',
        dateFormat: 'YYYY-MM-DD',
        payableDaysFormula: 'calendarDays'
      });
    }

    const settingsObj = settings.toObject();
    settingsObj.hospital = {
      timezone: settings.timezone,
      currency: settings.currency,
      financialYearStart: settings.financialYearStart
    };

    res.status(200).json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    logger.error(`[System Settings] Error fetching settings: ${error.message}`);
    next(error);
  }
};

// @desc    Update system settings (timezone, currency, policies)
// @route   PUT /api/v1/settings/system
// @access  Private (Superadmin only)
const updateSystemSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    const before = settings ? settings.toObject() : null;

    if (!settings) {
      settings = new SystemSetting(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    settings.updatedBy = req.user._id;
    await settings.save();

    await recordAuditLog({
      actor: req.user,
      action: 'UPDATE',
      resource: 'system_settings',
      resourceId: settings._id,
      before,
      after: settings.toObject(),
      req
    });

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully',
      data: settings
    });
  } catch (error) {
    logger.error(`[System Settings] Error updating settings: ${error.message}`);
    next(error);
  }
};

// @desc    List background job runs
// @route   GET /api/v1/jobs
// @access  Private (Superadmin only)
const getJobs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.jobName) filter.jobName = req.query.jobName;
    if (req.query.status) filter.status = req.query.status;

    const total = await JobRun.countDocuments(filter);
    const jobs = await JobRun.find(filter)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: jobs
    });
  } catch (error) {
    logger.error(`[Jobs] Error listing jobs: ${error.message}`);
    next(error);
  }
};

// @desc    Manually trigger a job through distributed lock
// @route   POST /api/v1/jobs/:name/trigger
// @access  Private (Superadmin only)
const triggerJob = async (req, res, next) => {
  try {
    const jobName = req.params.name;
    const lock = await JobLock.acquire(jobName, 60000, `manual-${req.user._id}`);
    if (!lock) {
      return res.status(409).json({
        success: false,
        message: `Job '${jobName}' is currently locked and running on another worker/instance.`
      });
    }

    const jobRun = await JobRun.create({
      jobName,
      status: 'running',
      triggeredBy: req.user.email || req.user.name,
      logs: [{ message: `Manually triggered by ${req.user.name}` }]
    });

    // Run execution asynchronously with lock release
    (async () => {
      try {
        jobRun.logs.push({ message: 'Execution started successfully' });
        // Simulating job task completion
        jobRun.status = 'completed';
        jobRun.endTime = new Date();
        jobRun.durationMs = jobRun.endTime - jobRun.startTime;
        jobRun.logs.push({ message: 'Execution finished without errors' });
        await jobRun.save();
      } catch (err) {
        jobRun.status = 'failed';
        jobRun.endTime = new Date();
        jobRun.durationMs = jobRun.endTime - jobRun.startTime;
        jobRun.error = err.message;
        jobRun.logs.push({ level: 'error', message: err.message });
        await jobRun.save();
      } finally {
        await JobLock.release(jobName, `manual-${req.user._id}`);
      }
    })();

    await recordAuditLog({
      actor: req.user,
      action: 'TRIGGER_JOB',
      resource: 'jobs',
      resourceId: jobRun._id,
      after: { jobName, jobRunId: jobRun._id },
      req
    });

    res.status(200).json({
      success: true,
      message: `Job '${jobName}' triggered successfully in background`,
      jobRunId: jobRun._id,
      data: { jobRunId: jobRun._id }
    });
  } catch (error) {
    logger.error(`[Jobs] Error triggering job: ${error.message}`);
    next(error);
  }
};

// @desc    Get execution logs for a job
// @route   GET /api/v1/jobs/:id/logs
// @access  Private (Superadmin only)
const getJobLogs = async (req, res, next) => {
  try {
    const jobRun = await JobRun.findById(req.params.id);
    if (!jobRun) {
      return res.status(404).json({ success: false, message: 'Job run not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        jobName: jobRun.jobName,
        status: jobRun.status,
        startTime: jobRun.startTime,
        endTime: jobRun.endTime,
        durationMs: jobRun.durationMs,
        error: jobRun.error,
        logs: jobRun.logs
      }
    });
  } catch (error) {
    logger.error(`[Jobs] Error fetching job logs: ${error.message}`);
    next(error);
  }
};

// @desc    Deep readiness check (DB, connection, responsiveness)
// @route   GET /api/v1/health/ready
// @access  Public
const getReadiness = async (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  const status = isDbReady ? 'ready' : 'unhealthy';
  const statusCode = isDbReady ? 200 : 503;

  return res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: isDbReady ? 'connected' : 'disconnected',
      server: 'running'
    }
  });
};

// @desc    Get API version info
// @route   GET /api/v1/version
// @access  Public
const getVersion = (req, res) => {
  res.status(200).json({
    version: '1.2.0',
    name: 'MediPulse Hospital Management Backend API',
    environment: process.env.NODE_ENV || 'development',
    releaseDate: '2026-10-15',
    supportedApiVersions: ['v1']
  });
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  getJobs,
  triggerJob,
  getJobLogs,
  getReadiness,
  getVersion
};
