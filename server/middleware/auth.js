'use strict';

const logger = require('../utils/logger');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

function getClientId() {
  return process.env.GOOGLE_CLIENT_ID;
}

// Verify a Google ID token using Google's tokeninfo endpoint.
// This keeps dependencies light, but audience / issuer / email checks are mandatory.
async function verifyGoogleToken(token) {
  const clientId = getClientId();
  if (!clientId) {
    logger.error('[Auth] GOOGLE_CLIENT_ID is not configured');
    throw new Error('Authentication service misconfigured');
  }

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
  const payload = await res.json();

  if (!res.ok || payload.error_description) {
    console.error('[Auth] Google tokeninfo rejected token:', payload.error_description);
    throw new UnauthorizedError('Invalid authentication token');
  }

  if (payload.aud !== clientId) {
    logger.warn('[Auth] Token audience mismatch', { expected: clientId, got: payload.aud });
    throw new UnauthorizedError('Authentication token audience mismatch');
  }
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
    throw new UnauthorizedError('Authentication token issuer mismatch');
  }
  if (`${payload.email_verified}` !== 'true') {
    throw new UnauthorizedError('Authentication token email not verified');
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

function attachUser(req, payload) {
  req.user = {
    uid: payload.sub,
    email: payload.email,
    displayName: payload.name || payload.email,
    photoURL: payload.picture || null,
    admin: false,
  };
}

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendAuthError(res, req.id, 401, 'AUTH_MISSING_TOKEN', 'Authentication required');
    }
    const token = authHeader.split(' ')[1];

    const payload = await verifyGoogleToken(token);
    attachUser(req, payload);
    next();
  } catch (error) {
    logger.warn('[Auth] Token verification failed', { err: error.message, path: req.path });
    if (error.message === 'Authentication service misconfigured') {
      return sendAuthError(res, req.id, 500, 'AUTH_MISCONFIGURED', 'Authentication is temporarily unavailable');
    }

    const code = error.message === 'Authentication token expired'
      ? 'AUTH_TOKEN_EXPIRED'
      : error.message === 'Authentication token audience mismatch'
        ? 'AUTH_AUDIENCE_MISMATCH'
        : error.message === 'Authentication token issuer mismatch'
          ? 'AUTH_ISSUER_MISMATCH'
          : error.message === 'Authentication token email not verified'
            ? 'AUTH_EMAIL_NOT_VERIFIED'
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
    attachUser(req, payload);
  } catch {
    // Continue anonymously for optional-auth routes.
  }
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

module.exports = {
  verifyToken,
  optionalAuth,
  isAdmin,
  firebaseEnabled: Boolean(getClientId()),
};
