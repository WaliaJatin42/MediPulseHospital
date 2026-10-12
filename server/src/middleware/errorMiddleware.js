const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Internal Server Error';

  // Handle Payload Too Large (CWE-400 DoS protection)
  if (err.type === 'entity.too.large' || statusCode === 413) {
    statusCode = 413;
    message = 'Payload Too Large: Request body exceeds the allowed limit (10KB).';
  }

  // Handle Mongoose duplicate key error (e.g. unique email)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account with that ${field} already exists.`;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found. Invalid ID format.`;
  }

  if (statusCode >= 500) {
    logger.error(`[Server Error 500] ${req.method} ${req.originalUrl}: ${err.message}`, {
      stack: err.stack,
      ip: req.ip,
      body: req.body
    });
  } else {
    logger.warn(`[Client Error ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`, {
      ip: req.ip
    });
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

const notFound = (req, res, next) => {
  logger.warn(`[404 Not Found] ${req.method} ${req.originalUrl} - Requested URL does not exist on this server from IP ${req.ip}`);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };

