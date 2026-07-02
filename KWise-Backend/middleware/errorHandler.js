const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Default error status and message
let statusCode = err.statusCode || 500;
let message = err.message || 'Something went wrong on the server';
let errorType = err.name || 'Error';
  // Log error
    logger.error(`${errorType}: ${message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
    requestId: req.id
});

  // Handle specific error types

  // Invalid MongoDB ObjectID
if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
}
  // Mongoose validation error
if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
}
  // Mongoose duplicate key
if (err.code === 11000) {
    statusCode = 409;
    message = `Duplicate field value: ${Object.keys(err.keyValue).join(', ')}. Please use another value.`;
}

  // JWT errors
if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
}
if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
}
  // PostgreSQL errors
  if (err.code === '23505') { // Unique violation
    statusCode = 409;
    message = 'Duplicate entry. This record already exists.';
}

  if (err.code === '23503') { // Foreign key violation
    statusCode = 400;
    message = 'This operation violates database constraints.';
}
  // Send appropriate response
const response = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
};
  // Add stack trace in development mode only (double-gated for safety)
if (config.server.env === 'development' && process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack.split('\n');
}
    res.status(statusCode).json(response);
};

module.exports = errorHandler;