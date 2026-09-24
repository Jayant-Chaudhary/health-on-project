/** Multer signals a rejected upload through these; they are client errors. */
const UPLOAD_ERROR_CODES = {
  LIMIT_FILE_SIZE: 413,
  LIMIT_FILE_COUNT: 400,
  LIMIT_UNEXPECTED_FILE: 400,
};

function errorHandler(err, req, res, next) {
  console.error('[Error Handler]:', err.stack || err.message || err);

  if (err.name === 'MulterError') {
    const code = UPLOAD_ERROR_CODES[err.code] || 400;
    return res.status(code).json({ error: err.message });
  }

  // A rejected file type arrives as a plain Error from multer's fileFilter.
  if (/^Unsupported file type/.test(err.message || '')) {
    return res.status(415).json({ error: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack }),
  });
}

module.exports = errorHandler;
