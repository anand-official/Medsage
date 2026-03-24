'use strict';

/**
 * Redis-backed rate limiter middleware factory.
 *
 * Uses a Lua script so the INCR + EXPIRE pair is atomic — no race condition
 * where a key could be incremented but never given a TTL.
 *
 * Failure behaviour:
 *   - Redis not configured (REDIS_URL unset)  → fail-open (next() immediately)
 *   - Redis command throws (connection error) → fail-open + console.warn
 *
 * Usage:
 *   // As express middleware:
 *   router.post('/route', verifyToken, uidQueryLimiter, handler);
 *
 *   // Inline after verifyToken (when uid is needed for keying):
 *   await visionLimiter(req, res, () => {});
 *   if (res.headersSent) return; // 429 already written
 *
 * @param {number}   limit    - Maximum requests allowed in the window
 * @param {number}   windowMs - Window duration in milliseconds
 * @param {string}   scope    - Key namespace prefix (e.g. 'query', 'vision')
 * @param {Function} [keyFn]  - (req) => string; defaults to uid with IP fallback
 */

const redis = require('../config/redis');

// Atomic Lua script — executed on the Redis server in a single round-trip.
// Increments the counter; sets an expiry only on the first hit so that
// subsequent increments within the window don't reset the TTL.
const INCR_SCRIPT = `
  local current = redis.call('incr', KEYS[1])
  if current == 1 then
    redis.call('expire', KEYS[1], ARGV[1])
  end
  return current
`;

const DEFAULT_KEY_FN = (req) => req.user?.uid || req.ip || 'unknown';

function redisRateLimiter(limit, windowMs, scope = 'rl', keyFn = null) {
  const windowSec = Math.ceil(windowMs / 1000);
  const getKey = keyFn || DEFAULT_KEY_FN;

  return async function rateLimiterMiddleware(req, res, next) {
    // No Redis configured — fail open
    if (!redis) {
      return next();
    }

    const identifier = getKey(req);
    const key = `rl:${scope}:${identifier}`;

    let current;
    try {
      current = await redis.eval(
        INCR_SCRIPT,
        1,         // numkeys
        key,       // KEYS[1]
        windowSec  // ARGV[1]
      );
    } catch (err) {
      // Redis unavailable — fail open so users aren't blocked during outages
      console.warn(`[RateLimit:${scope}] Redis error for "${identifier}", allowing request:`, err.message);
      return next();
    }

    // Standard rate-limit response headers (mirrors express-rate-limit)
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));

    if (current > limit) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a moment before trying again.',
      });
    }

    return next();
  };
}

module.exports = redisRateLimiter;
