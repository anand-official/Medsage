'use strict';

const { randomUUID } = require('crypto');

/**
 * Request ID middleware.
 *
 * Assigns a unique UUID to every request and echoes it back via the
 * `x-request-id` response header. This enables end-to-end tracing across:
 *   - Server logs (attach req.id to every log entry for the request)
 *   - Client-side error reporting (read x-request-id from the response)
 *   - External APM tools (Render log drain, Datadog, etc.)
 *
 * If the caller provides a valid `x-request-id` header (e.g. from a gateway
 * or load-balancer), that value is reused so the trace ID propagates upstream.
 * Invalid values are replaced with a fresh UUID.
 *
 * Safe ID pattern: alphanumeric + hyphens + underscores, 8–64 chars.
 * This prevents log injection via crafted request IDs.
 */
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  req.id = incomingId && SAFE_ID_RE.test(incomingId)
    ? incomingId
    : randomUUID();

  res.setHeader('x-request-id', req.id);
  next();
}

module.exports = requestIdMiddleware;
