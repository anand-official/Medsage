'use strict';

/**
 * Redis client singleton (ioredis).
 *
 * Behaviour by environment:
 *   - REDIS_URL set   → connects with automatic reconnection, short per-request timeout
 *   - REDIS_URL unset → client is null; all Redis-backed features fail-open (skip, allow)
 *
 * Design goals:
 *   - Never block application startup if Redis is unavailable
 *   - enableOfflineQueue: false  → reject immediately instead of queuing during outages
 *   - maxRetriesPerRequest: 1    → one retry per command, then throw so callers can fail-open
 *   - retryStrategy capped at 5 attempts with exponential back-off (max 5 s)
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL;

let client = null;

if (REDIS_URL) {
  client = new Redis(REDIS_URL, {
    // Fail fast on each command rather than waiting forever
    maxRetriesPerRequest: 1,
    // Don't accumulate a backlog of commands while disconnected —
    // callers should fail-open immediately instead.
    enableOfflineQueue: false,
    // Lazy connect so we don't block module load
    lazyConnect: true,
    // Exponential back-off: 200 ms, 400 ms, 800 ms, 1.6 s, 3.2 s, then give up
    retryStrategy: (times) => {
      if (times > 5) {
        console.error('[Redis] Giving up reconnection after 5 attempts');
        return null; // stop retrying
      }
      return Math.min(times * 200, 5000);
    },
    // TLS is required on most managed Redis services (Upstash, Redis Cloud, Render)
    tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
  });

  client.on('connect', () => {
    console.log('[Redis] Connected');
  });

  client.on('ready', () => {
    console.log('[Redis] Ready');
  });

  client.on('error', (err) => {
    // Demote to warn — a single error log is enough; ioredis will retry
    console.warn('[Redis] Error:', err.message);
  });

  client.on('close', () => {
    console.warn('[Redis] Connection closed');
  });

  // Initiate the connection in the background; don't await here so the
  // server process starts even if Redis is temporarily unreachable.
  client.connect().catch((err) => {
    console.warn('[Redis] Initial connection failed (will retry):', err.message);
  });
} else {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[Redis] WARNING: REDIS_URL is not set in production. ' +
      'Per-user rate limits are NOT enforced across instances or restarts. ' +
      'Rate limiting is disabled. Set REDIS_URL to enable persistent, cross-instance rate limiting.'
    );
  } else {
    console.info('[Redis] REDIS_URL not set — Redis disabled in development mode. Rate limiters will fail-open.');
  }
}

module.exports = client;
