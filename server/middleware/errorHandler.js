const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden access';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Send error response - NEVER expose stack traces to client
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      // Stack traces are logged server-side only, never sent to client
      ...(process.env.NODE_ENV === 'development' && { 
        debug: 'Check server logs for details'
      })
    }
  });
};

const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
}; 