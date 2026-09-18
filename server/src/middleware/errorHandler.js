function errorHandler(err, req, res, next) {
  console.error('[Error Handler]:', err.stack || err.message || err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
  });
}

module.exports = errorHandler;
