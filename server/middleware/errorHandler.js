'use strict';

const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Global error handler — last middleware in the Express chain.
 *
 * All responses follow the same envelope:
 *   { success: false, error: <string>, code?: <string>, requestId?: <string> }
 *
 * Rules:
 * - AppError (4xx): operational / expected — message is safe to show the client.
 * - AppError (5xx) or generic Error: unexpected — show a generic message and log
 *   the real error server-side only. Stack traces never reach the client.
 * - Mongoose/validation errors are mapped to 400.
 */
const errorHandler = (err, req, res, next) => {
  // ----- Classify -----
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal server error';
  let code       = err.code       || null;

  // Mongoose document validation
  if (err.name === 'ValidationError' && !err.statusCode) {
    statusCode = 400;
    code       = 'VALIDATION_ERROR';
  }

  // Mongoose bad ObjectId cast
  if (err.name === 'CastError' && !err.statusCode) {
    statusCode = 400;
    message    = 'Invalid ID format';
    code       = 'INVALID_ID';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    message    = 'Duplicate entry';
    code       = 'CONFLICT';
  }

  // ----- Log -----
  const logCtx = {
    requestId: req.id,
    method:    req.method,
    path:      req.path,
    status:    statusCode,
  };

  if (statusCode >= 500) {
    logger.error(message, { ...logCtx, stack: err.stack });
  } else {
    logger.warn(message, logCtx);
  }

  // ----- Respond -----
  // For 5xx: always show a generic message; the real error is in the logs.
  const clientMessage = statusCode < 500
    ? message
    : 'Something went wrong on our end. Please try again.';

  res.status(statusCode).json({
    success: false,
    error:   clientMessage,
    ...(code   && { code }),
    ...(req.id && { requestId: req.id }),
  });
};

/**
 * 404 handler — placed AFTER all routes so it only fires when nothing matched.
 */
const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};

module.exports = { errorHandler, notFoundHandler };
