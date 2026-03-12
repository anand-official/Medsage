require('dotenv').config();
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

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medsage';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('[MongoDB] Connected successfully'))
  .catch(err => console.error('[MongoDB] Connection error:', err.message));

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://medsage.ai'])
    : ['http://localhost:3000', 'http://localhost:3002'],
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

// Stricter rate limiting for AI queries
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI queries per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many AI queries, please slow down' }
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/medical/query', aiLimiter); // Apply stricter rate limit to AI queries
app.use('/api/sm2', sm2Routes);
app.use('/api/library', libraryRoutes);

// Basic route for API verification (could move to /api)
app.get('/api', (req, res) => {
  res.send('Welcome to the MedSage API. All systems operational.');
});

// Serve frontend in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
} else {
  // Dev fallback
  app.get('/', (req, res) => {
    res.send('MedSage backend running in development mode.');
  });
}

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