'use strict';

/**
 * Central configuration for Cortex API.
 *
 * All process.env reads live here. dotenv must be loaded in server/index.js
 * BEFORE this module is required. Never call dotenv.config() here — that
 * belongs at the process entry point so env is populated before any module loads.
 *
 * Call validateConfig() once at startup to catch missing required vars early.
 */

function readEnv(name) {
  const raw = String(process.env[name] || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  if (
    normalized === 'fill_in'
    || normalized === 'your_google_oauth_client_id_here'
    || normalized === 'your_google_client_id_here'
    || normalized === 'your_google_oauth_client_id'
  ) {
    return '';
  }
  return raw;
}

const config = {
  // Runtime
  NODE_ENV:    process.env.NODE_ENV    || 'development',
  PORT:        parseInt(process.env.PORT, 10) || 3001,
  IS_PROD:     process.env.NODE_ENV === 'production',
  DATABASE_PROVIDER: process.env.DATABASE_PROVIDER || 'supabase',

  // Supabase
  SUPABASE_URL: readEnv('SUPABASE_URL'),
  SUPABASE_PUBLISHABLE_KEY: readEnv('SUPABASE_PUBLISHABLE_KEY'),
  SUPABASE_SECRET_KEY: readEnv('SUPABASE_SECRET_KEY'),

  // AI / LLM
  GEMINI_API_KEY: readEnv('GEMINI_API_KEY'),
  GEMINI_MODEL:   process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-04-17',
  PLANNER_GEMINI_API_KEY: readEnv('PLANNER_GEMINI_API_KEY'),
  PLANNER_GEMINI_MODEL: process.env.PLANNER_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-04-17',

  // Fallback LLM
  FALLBACK_LLM_PROVIDER: process.env.FALLBACK_LLM_PROVIDER || 'claude',
  FALLBACK_LLM_API_KEY:  readEnv('FALLBACK_LLM_API_KEY'),

  // Google OAuth
  GOOGLE_CLIENT_ID: readEnv('GOOGLE_CLIENT_ID'),

  // Admin
  ADMIN_UIDS: (process.env.ADMIN_UIDS || '')
    .split(',')
    .map(u => u.trim())
    .filter(Boolean),

  // CORS — explicit allowlist only, never wildcard subdomains
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['https://medsage.pro', 'https://www.medsage.pro', 'https://medsage-ai.vercel.app'],
  DEVELOPMENT_ORIGINS: ['http://localhost:3000', 'http://localhost:3002'],

  // Rate limits
  GLOBAL_RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  GLOBAL_RATE_LIMIT_MAX:       100,
  AI_RATE_LIMIT_WINDOW_MS:     60 * 1000,
  AI_RATE_LIMIT_MAX:           10,

  // Query / learner cache
  CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS, 10) || 3600,
  CACHE_MAX_ENTRIES: parseInt(process.env.CACHE_MAX_ENTRIES, 10) || 500,

  // Confidence score weights
  CONF_WEIGHT_TOPIC:      parseFloat(process.env.CONF_WEIGHT_TOPIC)      || 0.4,
  CONF_WEIGHT_RETRIEVAL:  parseFloat(process.env.CONF_WEIGHT_RETRIEVAL)  || 0.4,
  CONF_WEIGHT_CITATION:   parseFloat(process.env.CONF_WEIGHT_CITATION)   || 0.2,

  // Chat session limits
  MAX_SESSIONS_PER_USER:    50,
  MAX_MESSAGES_PER_SESSION: 200,

  // Monitoring / alerting
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL,
};

/**
 * Validates required environment variables at startup.
 * In production: exits the process on any missing critical variable.
 * In development: logs warnings and continues.
 */
function validateConfig() {
  const errors   = [];
  const warnings = [];

  // Critical — service cannot function without these
  if (!config.GEMINI_API_KEY) errors.push('GEMINI_API_KEY');
  if (config.IS_PROD || config.DATABASE_PROVIDER === 'supabase') {
    if (!config.SUPABASE_URL) errors.push('SUPABASE_URL');
    if (!config.SUPABASE_SECRET_KEY) errors.push('SUPABASE_SECRET_KEY');
  }
  if (!config.GOOGLE_CLIENT_ID) errors.push('GOOGLE_CLIENT_ID');

  // Important — degraded behaviour without these
  if (config.IS_PROD && !process.env.REDIS_URL) {
    warnings.push('REDIS_URL not set — per-user rate limits are NOT enforced across restarts or instances');
  }
  if (config.IS_PROD && !process.env.ALERT_WEBHOOK_URL) {
    warnings.push('ALERT_WEBHOOK_URL not set — error-rate alerts will only appear in server logs');
  }
  if (config.DATABASE_PROVIDER === 'supabase' && !config.SUPABASE_URL) {
    warnings.push('SUPABASE_URL not set — Supabase data layer cannot connect yet');
  }
  if (config.DATABASE_PROVIDER === 'supabase' && !config.SUPABASE_SECRET_KEY) {
    warnings.push('SUPABASE_SECRET_KEY not set — backend cannot use the Supabase service role yet');
  }
  if (!process.env.HF_API_TOKEN) {
    warnings.push('HF_API_TOKEN not set — embedding service will fail, causing silent RAG degradation to ungrounded answers');
  }
  if (!process.env.QDRANT_URL) {
    warnings.push('QDRANT_URL not set — RAG retrieval will fail, all responses will be ungrounded (direct_no_chunks path)');
  }

  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`[Config] WARNING: ${w}`));
  }

  if (errors.length > 0) {
    console.error(`[Config] FATAL: Missing required environment variables: ${errors.join(', ')}`);
    if (config.IS_PROD) {
      process.exit(1);
    } else {
      console.warn('[Config] Development mode — proceeding despite missing vars (set them before deploying)');
    }
  }
}

module.exports = { ...config, validateConfig };
