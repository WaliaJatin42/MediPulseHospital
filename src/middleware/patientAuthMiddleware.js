const jwt = require('jsonwebtoken');
const Patient = require('../models/patient/Patient');
const PortalAccount = require('../models/patient/PortalAccount');
const logger = require('../utils/logger');

const protectPortal = async (req, res, next) => {
  try {
    let token = req.cookies.portalToken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: Patient portal login required'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'medipulse_jwt_secret_production_key_2026');

      // Enforce portal token audience
      if (decoded.aud !== 'patient_portal') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized: Staff tokens cannot access patient portal endpoints'
        });
      }

      const patient = await Patient.findById(decoded.patientId);
      if (!patient) {
        return res.status(401).json({
          success: false,
          message: 'Patient profile not found'
        });
      }

      req.patient = patient;
      req.patientId = patient._id;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Portal session expired or invalid. Please re-verify OTP.'
      });
    }
  } catch (error) {
    logger.error(`[Portal Auth Error] ${error.message}`);
    next(error);
  }
};

module.exports = {
  protectPortal
};
