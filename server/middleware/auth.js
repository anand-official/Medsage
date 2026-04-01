'use strict';

const logger = require('../utils/logger');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Verify a Google ID token using Google's tokeninfo endpoint.
// No library needed — one HTTPS call, response cached by Google's CDN.
async function verifyGoogleToken(token) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
  const payload = await res.json();

  if (!res.ok || payload.error_description) {
    console.error('[Auth] Google tokeninfo rejected token:', payload.error_description);
    throw new UnauthorizedError('Invalid authentication token');
  }

  if (CLIENT_ID && payload.aud !== CLIENT_ID) {
    logger.warn('[Auth] Token audience mismatch', { expected: CLIENT_ID, got: payload.aud });
    throw new UnauthorizedError('Authentication token audience mismatch');
  }
  if (parseInt(payload.exp, 10) * 1000 < Date.now()) {
    throw new UnauthorizedError('Authentication token expired');
  }

  return payload;
}

function sendAuthError(res, reqId, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(reqId && { requestId: reqId }),
  });
}

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendAuthError(res, req.id, 401, 'AUTH_MISSING_TOKEN', 'Authentication required');
    }
    const token = authHeader.split(' ')[1];

    const payload = await verifyGoogleToken(token);

    req.user = {
      uid: payload.sub,
      email: payload.email,
      displayName: payload.name || payload.email,
      photoURL: payload.picture || null,
      admin: false,
    };
    next();
  } catch (error) {
    logger.warn('[Auth] Token verification failed', { err: error.message, path: req.path });
    const code = error.message === 'Authentication token expired'
      ? 'AUTH_TOKEN_EXPIRED'
      : error.message === 'Authentication token audience mismatch'
        ? 'AUTH_AUDIENCE_MISMATCH'
        : 'AUTH_INVALID_TOKEN';
    return sendAuthError(res, req.id, 401, code, 'Authentication failed');
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const payload = await verifyGoogleToken(token);
    req.user = {
      uid: payload.sub,
      email: payload.email,
      displayName: payload.name || payload.email,
      photoURL: payload.picture || null,
      admin: false,
    };
  } catch { /* continue without user */ }
  next();
};

const isAdmin = (req, res, next) => {
  if (!req.user) {
    return sendAuthError(res, req.id, 401, 'AUTH_MISSING_TOKEN', 'Authentication required');
  }
  const adminUids = (process.env.ADMIN_UIDS || '').split(',').map(u => u.trim()).filter(Boolean);
  if (adminUids.includes(req.user.uid)) return next();
  logger.warn('[Auth] Admin access denied', { uid: req.user.uid, path: req.path });
  const err = new ForbiddenError('Forbidden');
  return res.status(err.statusCode).json({
    success: false,
    error: err.message,
    code: err.code,
    ...(req.id && { requestId: req.id }),
  });
};

module.exports = { verifyToken, optionalAuth, isAdmin, firebaseEnabled: !!CLIENT_ID };
