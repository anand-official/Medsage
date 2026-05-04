'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config();

const config = require('./config');
config.validateConfig();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const logger = require('./utils/logger');
const { getSupabaseAdmin, isSupabaseConfigured } = require('./lib/supabaseAdmin');
const requestId = require('./middleware/requestId');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestTrackerMiddleware, registerMonitoringRoutes, localhostOnly } = require('./middleware/monitoring');
const { verifyToken, isAdmin } = require('./middleware/auth');
const swaggerSpec = require('./config/swagger');
const { scheduleRetentionJob } = require('./services/auditRetention');

const authRoutes = require('./routes/auth');
const studyRoutes = require('./routes/study');
const medicalRoutes = require('./routes/medical');
const sm2Routes = require('./routes/sm2');
const libraryRoutes = require('./routes/library');
const chatRoutes = require('./routes/chat');
const auditRoutes = require('./routes/audit');
const adminRoutes = require('./routes/admin');

let retentionJob = null;
let dataLayerReady = false;

async function bootstrapDataLayer() {
  if (!isSupabaseConfigured()) {
    logger.error('[Supabase] Missing configuration. Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
    return false;
  }

  try {
    getSupabaseAdmin();
    retentionJob = scheduleRetentionJob();
    logger.info('[Supabase] Admin client ready');
    return true;
  } catch (err) {
    logger.error('[Supabase] Bootstrap failed', { err: err.message });
    return false;
  }
}

bootstrapDataLayer()
  .then((ready) => {
    dataLayerReady = ready;
  })
  .catch((err) => {
    logger.error('[Supabase] Unexpected bootstrap failure', { err: err.message });
  });

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = config.IS_PROD
  ? config.ALLOWED_ORIGINS
  : [...config.DEVELOPMENT_ORIGINS, ...config.ALLOWED_ORIGINS];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn('[CORS] Blocked origin', { origin });
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  exposedHeaders: ['x-request-id'],
}));

app.use(requestId);
app.use(helmet());
app.use(compression());

const morganFormat = config.IS_PROD
  ? (tokens, req, res) => JSON.stringify({
      ts: tokens.date(req, res, 'iso'),
      method: tokens.method(req, res),
      path: req.path,
      status: parseInt(tokens.status(req, res), 10),
      ms: parseFloat(tokens['response-time'](req, res)),
      rid: req.id,
    })
  : ':method :url :status :response-time ms';

app.use(morgan(morganFormat));
app.use(express.json({ limit: '10mb' }));
app.use(requestTrackerMiddleware);

app.use(rateLimit({
  windowMs: config.GLOBAL_RATE_LIMIT_WINDOW_MS,
  max: config.GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
}));

const aiLimiter = rateLimit({
  windowMs: config.AI_RATE_LIMIT_WINDOW_MS,
  max: config.AI_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many AI queries. Please slow down.' },
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/study', studyRoutes);
app.use('/api/v1/medical/query', aiLimiter);
app.use('/api/v1/medical', medicalRoutes);
app.use('/api/v1/sm2', sm2Routes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/admin', adminRoutes);

app.get('/', (req, res) => res.json({
  name: 'Cortex API',
  status: 'ok',
  version: '3.0.0',
  api: '/api/v1',
}));

app.get('/api', (req, res) => res.json({
  status: 'ok',
  version: 'v1',
  message: 'Cortex API - all systems operational.',
  prefix: '/api/v1',
}));

// infraGuard is intentionally NOT applied to /healthz — Render health checks
// are unauthenticated. Keep this endpoint minimal: no provider names, no error
// messages, no internal state. Sensitive diagnostics live on /health (admin-only).
const infraGuard = config.IS_PROD ? [verifyToken, isAdmin] : [localhostOnly];

app.get('/healthz', async (req, res) => {
  const llmOk = Boolean(config.GEMINI_API_KEY);
  let dbOk = false;

  if (isSupabaseConfigured()) {
    try {
      const db = getSupabaseAdmin();
      const result = await db
        .from('user_profiles')
        .select('uid', { head: true, count: 'exact' })
        .limit(1);
      dbOk = !result.error;
    } catch (_) {
      // dbOk stays false
    }
  }

  const status = dbOk && llmOk ? 'ok' : 'degraded';
  const httpCode = status === 'ok' ? 200 : 503;

  res.status(httpCode).json({
    status,
    service: 'cortex-api',
    uptime_s: Math.floor(process.uptime()),
    checks: {
      database: dbOk ? 'ok' : 'degraded',
      llm: llmOk ? 'ok' : 'degraded',
    },
  });
});

registerMonitoringRoutes(app);

const swaggerGuard = config.IS_PROD ? [verifyToken, isAdmin] : [];
app.get('/api-docs/swagger.json', ...swaggerGuard, (req, res) => res.json(swaggerSpec));
app.use('/api-docs', ...swaggerGuard, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Cortex API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.PORT, () => {
  logger.info(`[Server] Listening on port ${config.PORT}`, {
    env: config.NODE_ENV,
    liveness: `http://localhost:${config.PORT}/healthz`,
    health: `http://localhost:${config.PORT}/health (admin)`,
    docs: `http://localhost:${config.PORT}/api-docs`,
  });
});

process.on('SIGTERM', () => {
  logger.info('[Server] SIGTERM received - shutting down gracefully');

  const killTimer = setTimeout(() => {
    logger.error('[Server] Graceful shutdown timed out - forcing exit');
    process.exit(1);
  }, 25000);
  killTimer.unref?.();

  server.close(() => {
    clearTimeout(killTimer);
    retentionJob?.stop?.();
    logger.info('[Server] Shutdown complete');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught exception - shutting down', { err: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});
