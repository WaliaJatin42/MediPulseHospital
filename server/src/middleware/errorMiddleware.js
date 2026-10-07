const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

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
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

const notFound = (req, res, next) => {
  logger.warn(`[404 Not Found] ${req.method} ${req.originalUrl} - Requested URL does not exist on this server from IP ${req.ip}`);
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = { errorHandler, notFound };

