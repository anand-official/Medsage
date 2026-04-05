'use strict';

// ── Bootstrap: load env vars FIRST, before any module reads process.env ───────
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config(); // root .env fallback — won't overwrite already-set vars

// ── Core config + validation ───────────────────────────────────────────────────
const config = require('./config');
config.validateConfig(); // fast-fail on missing critical vars before anything else

// ── Imports ────────────────────────────────────────────────────────────────────
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const helmet     = require('helmet');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const mongoose   = require('mongoose');
const swaggerUi  = require('swagger-ui-express');

const logger      = require('./utils/logger');
const requestId   = require('./middleware/requestId');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestTrackerMiddleware, registerMonitoringRoutes } = require('./middleware/monitoring');
const { verifyToken, isAdmin } = require('./middleware/auth');
const swaggerSpec = require('./config/swagger');
const { scheduleRetentionJob } = require('./services/auditRetention');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const studyRoutes   = require('./routes/study');
const medicalRoutes = require('./routes/medical');
const sm2Routes     = require('./routes/sm2');
const libraryRoutes = require('./routes/library');
const chatRoutes    = require('./routes/chat');
const auditRoutes   = require('./routes/audit');
const adminRoutes   = require('./routes/admin');

// ── MongoDB ────────────────────────────────────────────────────────────────────
mongoose.connect(config.MONGODB_URI, {
  serverSelectionTimeoutMS: config.MONGODB_SERVER_SELECTION_TIMEOUT,
  socketTimeoutMS:          config.MONGODB_SOCKET_TIMEOUT,
  maxPoolSize:              config.MONGODB_MAX_POOL_SIZE,
  retryWrites:              true,
})
  .then(() => {
    logger.info('[MongoDB] Connected successfully');
    scheduleRetentionJob();
  })
  .catch(err => logger.error('[MongoDB] Initial connection failed', { err: err.message }));

mongoose.connection.on('disconnected', () => logger.warn('[MongoDB] Disconnected — will reconnect automatically'));
mongoose.connection.on('reconnected',  () => logger.info('[MongoDB] Reconnected'));
mongoose.connection.on('error',        (err) => logger.error('[MongoDB] Connection error', { err: err.message }));

// ── App ────────────────────────────────────────────────────────────────────────
const app = express();

// Trust first proxy hop so req.ip reflects the real client IP behind nginx / Cloudflare
app.set('trust proxy', 1);

// ── CORS — explicit allowlist, never wildcard subdomains ──────────────────────
const allowedOrigins = config.IS_PROD
  ? config.ALLOWED_ORIGINS
  : [...config.DEVELOPMENT_ORIGINS, ...config.ALLOWED_ORIGINS];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // no-origin: Render health checks, mobile apps
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn('[CORS] Blocked origin', { origin });
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials:     true,
  methods:         ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders:  ['Content-Type', 'Authorization', 'x-request-id'],
  exposedHeaders:  ['x-request-id'],
}));

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(requestId);    // assign x-request-id to every request before any logging
app.use(helmet());
app.use(compression());

// Morgan: log method, path (no query string — avoids leaking any sensitive params),
// status, and response time. Use JSON in production for log-drain compatibility.
const morganFormat = config.IS_PROD
  ? (tokens, req, res) => JSON.stringify({
      ts:     tokens.date(req, res, 'iso'),
      method: tokens.method(req, res),
      path:   req.path,          // path only — intentionally omit query string
      status: parseInt(tokens.status(req, res), 10),
      ms:     parseFloat(tokens['response-time'](req, res)),
      rid:    req.id,
    })
  : ':method :url :status :response-time ms';

app.use(morgan(morganFormat));
app.use(express.json({ limit: '10mb' }));
app.use(requestTrackerMiddleware);

// ── Rate limiting ──────────────────────────────────────────────────────────────
// Layer 1 — global IP-based limiter
app.use(rateLimit({
  windowMs:       config.GLOBAL_RATE_LIMIT_WINDOW_MS,
  max:            config.GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, error: 'Too many requests. Please try again later.' },
}));

// Layer 2 — stricter IP-based limiter for AI endpoints.
// Per-user (UID) limiting is enforced inside the route handlers after verifyToken runs.
const aiLimiter = rateLimit({
  windowMs:       config.AI_RATE_LIMIT_WINDOW_MS,
  max:            config.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, error: 'Too many AI queries. Please slow down.' },
});

// ── Routes (/api/v1/*) ────────────────────────────────────────────────────────
app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/study',        studyRoutes);
app.use('/api/v1/medical/query', aiLimiter); // IP limiter; UID limiter runs inside the route
app.use('/api/v1/medical',      medicalRoutes);
app.use('/api/v1/sm2',          sm2Routes);
app.use('/api/v1/library',      libraryRoutes);
app.use('/api/v1/chat',         chatRoutes);
app.use('/api/v1/audit',        auditRoutes);
app.use('/api/v1/admin',        adminRoutes);

// ── Meta routes ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  name:    'Cortex API',
  status:  'ok',
  version: '3.0.0',
  api:     '/api/v1',
}));

app.get('/api', (req, res) => res.json({
  status:  'ok',
  version: 'v1',
  message: 'Cortex API — all systems operational.',
  prefix:  '/api/v1',
}));

// Public readiness probe — no auth required.
// Returns 200 when all critical dependencies are reachable; 503 when degraded.
// Use this for Render / load-balancer health checks and Docker HEALTHCHECK.
app.get('/healthz', (req, res) => {
  const mongoState = mongoose.connection.readyState; // 1 = connected
  const mongoOk    = mongoState === 1;
  const geminiOk   = Boolean(config.GEMINI_API_KEY);

  const status   = mongoOk && geminiOk ? 'ok' : 'degraded';
  const httpCode = status === 'ok' ? 200 : 503;

  res.status(httpCode).json({
    status,
    service:    'cortex-api',
    uptime_s:   Math.floor(process.uptime()),
    checks: {
      mongodb: mongoOk   ? 'ok' : `degraded (readyState=${mongoState})`,
      gemini:  geminiOk  ? 'ok' : 'missing GEMINI_API_KEY',
    },
  });
});

// ── Monitoring (/health, /metrics) — admin-gated in production ────────────────
registerMonitoringRoutes(app);

// ── API docs — admin-gated in production ──────────────────────────────────────
const swaggerGuard = config.IS_PROD ? [verifyToken, isAdmin] : [];
app.get('/api-docs/swagger.json', ...swaggerGuard, (req, res) => res.json(swaggerSpec));
app.use('/api-docs', ...swaggerGuard, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle:  'Cortex API Docs',
  swaggerOptions:   { persistAuthorization: true },
}));

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Server start ───────────────────────────────────────────────────────────────
const server = app.listen(config.PORT, () => {
  logger.info(`[Server] Listening on port ${config.PORT}`, {
    env:      config.NODE_ENV,
    liveness: `http://localhost:${config.PORT}/healthz`,
    health:   `http://localhost:${config.PORT}/health (admin)`,
    docs:     `http://localhost:${config.PORT}/api-docs`,
  });
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('[Server] SIGTERM received — shutting down gracefully');

  const killTimer = setTimeout(() => {
    logger.error('[Server] Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 25000);
  killTimer.unref?.();

  server.close(() => {
    clearTimeout(killTimer);
    mongoose.connection.close(false).catch(() => {});
    logger.info('[Server] Shutdown complete');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught exception — shutting down', { err: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
  // Don't exit — log and continue; uncaught promise rejections are often in fire-and-forget paths
});
