require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medsage',
  jwtSecret: process.env.JWT_SECRET,
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  },
  data: {
    // Chat history is now stored in MongoDB (ChatSession model) — not file-based
    maxSessionsPerUser: 50,
    maxMessagesPerSession: 200,
  },
  ai: {
    // Model is configured per-prompt in promptRegistry.json; this is informational only.
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-04-17',
    temperature: 0.2,    // default for structured calls; overridden per-prompt
    maxTokens: 2000,     // default; overridden per-prompt
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
}; 