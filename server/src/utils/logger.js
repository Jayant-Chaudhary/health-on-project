/**
 * Minimal leveled logger.
 *
 *   LOG_LEVEL  = debug | info | warn | error | silent
 *                (default: debug in development, silent under jest, else info)
 *   LOG_FORMAT = pretty | json   (default: json in production, else pretty)
 *
 * `logger.child({ ... })` returns a logger that merges that context into every
 * line. Children delegate to the root methods at call time, so tests can spy
 * on `logger.warn` and still see calls made through a child.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const COLORS = { debug: '\x1b[90m', info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' };
const RESET = '\x1b[0m';

// Never let these reach a log line, however deeply nested.
const REDACT = /authorization|password|token|secret|cookie|api[-_]?key|service[-_]?role/i;

function defaultLevel() {
  if (process.env.NODE_ENV === 'test') return 'silent';
  if (process.env.NODE_ENV === 'development') return 'debug';
  return 'info';
}

let threshold = LEVELS[(process.env.LOG_LEVEL || defaultLevel()).toLowerCase()] ?? LEVELS.info;
const format = (process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'json' : 'pretty')).toLowerCase();
const useColor = format === 'pretty' && process.stdout.isTTY;

function serializeError(err) {
  return {
    name: err.name,
    message: err.message,
    ...(err.code && { code: err.code }),
    ...(err.status && { status: err.status }),
    stack: err.stack,
    ...(err.cause instanceof Error && { cause: serializeError(err.cause) }),
  };
}

function sanitize(value, depth = 0) {
  if (value instanceof Error) return serializeError(value);
  if (Buffer.isBuffer(value)) return `<Buffer ${value.length} bytes>`;
  if (value === null || typeof value !== 'object') return value;
  if (depth > 5) return '[Object]';
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));

  const out = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = REDACT.test(key) ? '[REDACTED]' : sanitize(v, depth + 1);
  }
  return out;
}

function formatPretty(level, msg, meta) {
  const time = new Date().toISOString().slice(11, 23);
  const { scope, reqId, err, ...rest } = meta;
  const tag = level.toUpperCase().padEnd(5);
  let line = `${time} ${useColor ? COLORS[level] + tag + RESET : tag}`;
  if (reqId) line += ` [${reqId.slice(0, 8)}]`;
  if (scope) line += ` ${scope}:`;
  line += ` ${msg}`;
  if (Object.keys(rest).length) line += ` ${JSON.stringify(rest)}`;
  if (err) line += `\n${err.stack || `${err.name}: ${err.message}`}`;
  return line;
}

function write(level, msg, meta = {}) {
  if (LEVELS[level] < threshold) return;

  const clean = sanitize(meta);
  const line =
    format === 'json'
      ? JSON.stringify({ time: new Date().toISOString(), level, msg, ...clean })
      : formatPretty(level, msg, clean);

  const stream = LEVELS[level] >= LEVELS.warn ? process.stderr : process.stdout;
  stream.write(line + '\n');
}

function makeChild(parent, context) {
  const child = {};
  for (const level of ['debug', 'info', 'warn', 'error']) {
    child[level] = (msg, meta) => parent[level](msg, { ...context, ...meta });
  }
  child.child = (more) => makeChild(child, more);
  child.isDebugEnabled = () => logger.isDebugEnabled();
  return child;
}

const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
  child: (context) => makeChild(logger, context),
  isDebugEnabled: () => threshold <= LEVELS.debug,
  setLevel(level) {
    if (!(level in LEVELS)) throw new Error(`Unknown log level: ${level}`);
    threshold = LEVELS[level];
  },
};

module.exports = logger;
