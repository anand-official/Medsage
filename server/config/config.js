require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/medsage',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
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
    model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
}; 