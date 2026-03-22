// Load server/.env first (has all keys), then root .env as fallback
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
require('dotenv').config(); // root .env fallback (won't overwrite already-set vars)
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorHandler');
const { requestTrackerMiddleware, registerMonitoringRoutes } = require('./middleware/monitoring');

const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./routes/auth');
const studyRoutes = require('./routes/study');
const medicalRoutes = require('./routes/medical');
const sm2Routes = require('./routes/sm2');
const libraryRoutes = require('./routes/library');
const chatRoutes = require('./routes/chat');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cortex';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('[MongoDB] Connected successfully'))
  .catch(err => console.error('[MongoDB] Connection error:', err.message));

const app = express();

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['https://medsage.ai'])
  : ['http://localhost:3000', 'http://localhost:3002'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, Render health checks)
    if (!origin) return callback(null, true);
    // Allow any Vercel preview deployment URL
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
};
app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());
// Use combined format in production, dev format in development
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' })); // Limit body size
app.use(requestTrackerMiddleware); // Auto-track all request latencies

// Rate limiting - Global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Stricter rate limiting for AI queries — per-user (uid preferred, falls back to IP for unauthenticated)
// Note: req.user is populated by verifyToken which runs inside the route, so the uid is available
// because express-rate-limit runs BEFORE the route handler but AFTER body parsing and our verifyToken
// interceptor. For the uid to be available here, verifyToken must be run first on the same path.
// Since verifyToken is inside the router, we use a two-layer approach: IP-based here, uid enforced inside routes.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI queries per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many AI queries, please slow down' }
});

// Vision-specific limiter — image queries are more expensive
const visionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2, // 2 vision queries per minute per user
  keyGenerator: (req) => `vision:${req.user?.uid || req.ip}`,
  skip: (req) => !req.body?.imageBase64, // only apply when image is present
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Vision query limit reached. Please wait before sending another image.' }
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/medical/query', aiLimiter, visionLimiter); // Apply rate limits to AI query endpoint (includes /stream)
app.use('/api/medical', medicalRoutes);
app.use('/api/sm2', sm2Routes);
app.use('/api/library', libraryRoutes);
app.use('/api/chat', chatRoutes);

// Basic route for API verification (could move to /api)
app.get('/api', (req, res) => {
  res.send('Welcome to the Cortex API. All systems operational.');
});

// Root route
app.get('/', (req, res) => {
  res.json({ name: 'Cortex API', status: 'ok', version: '2.0.0' });
});

// Health check + Prometheus metrics
registerMonitoringRoutes(app);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
}); 