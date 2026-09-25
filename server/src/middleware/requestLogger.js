const crypto = require('crypto');
const logger = require('../utils/logger');

// Accept a caller's correlation ID only if it looks like one.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Tags each request with an ID (echoed as X-Request-Id), attaches `req.log`
 * scoped to it, and logs one line per request when the response finishes.
 */
function requestLogger(req, res, next) {
  const incoming = req.get('X-Request-Id');
  const reqId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  const start = process.hrtime.bigint();

  req.id = reqId;
  req.log = logger.child({ reqId });
  res.setHeader('X-Request-Id', reqId);

  req.log.debug('request started', {
    method: req.method,
    url: req.originalUrl,
    // Field names only: bodies carry patient health data.
    ...(req.body && Object.keys(req.body).length && { bodyKeys: Object.keys(req.body) }),
  });

  let logged = false;
  const done = (event) => {
    if (logged) return;
    logged = true;

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status,
      durationMs: Math.round(durationMs * 10) / 10,
      ...(req.user && { userId: req.user.id, role: req.user.role }),
      ...(event === 'close' && { aborted: true }),
    };

    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    // Health probes are noisy; keep them at debug unless they fail.
    const quiet = level === 'info' && req.path === '/health';
    req.log[quiet ? 'debug' : level](`${req.method} ${req.originalUrl} ${status}`, meta);
  };

  res.on('finish', () => done('finish'));
  res.on('close', () => done('close'));
  next();
}

module.exports = requestLogger;
