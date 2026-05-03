'use strict';

const { OAuth2Client } = require('google-auth-library');

const logger = require('../utils/logger');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const config = require('../config');

const GOOGLE_VERIFY_TIMEOUT_MS = 8000;
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let googleAuthClient = null;

function getGoogleAuthClient() {
  if (!config.GOOGLE_CLIENT_ID) {
    logger.error('[Auth] GOOGLE_CLIENT_ID is not configured');
    throw new Error('Authentication service misconfigured');
  }

  if (!googleAuthClient) {
    googleAuthClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);
  }

  return googleAuthClient;
}

function mapGoogleVerificationError(error) {
  if (error instanceof UnauthorizedError) return error;

  const message = String(error?.message || '');

  if (message === 'Authentication verification unavailable') {
    return new Error('Authentication verification unavailable');
  }

  if (
    /timeout|network|fetch|certificate|socket|ECONNRESET|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN/i.test(message)
  ) {
    return new Error('Authentication verification unavailable');
  }

  if (/wrong recipient|audience|requiredaudience/i.test(message)) {
    return new UnauthorizedError('Authentication token audience mismatch');
  }

  if (/expired|used too late|max expiry/i.test(message)) {
    return new UnauthorizedError('Authentication token expired');
  }

  return new UnauthorizedError('Invalid authentication token');
}

// Verify a Google ID token using Google's official auth library.
async function verifyGoogleToken(token) {
  const client = getGoogleAuthClient();

  let timeoutHandle = null;
  try {
    const ticket = await Promise.race([
      client.verifyIdToken({
        idToken: token,
        audience: config.GOOGLE_CLIENT_ID,
      }),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error('Authentication verification unavailable')),
          GOOGLE_VERIFY_TIMEOUT_MS
        );
      }),
    ]);

    const payload = ticket?.getPayload?.();
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedError('Invalid authentication token');
    }
    if (payload.aud !== config.GOOGLE_CLIENT_ID) {
      logger.warn('[Auth] Token audience mismatch', { expected: config.GOOGLE_CLIENT_ID, got: payload.aud });
      throw new UnauthorizedError('Authentication token audience mismatch');
    }
    if (!GOOGLE_ISSUERS.has(payload.iss)) {
      throw new UnauthorizedError('Authentication token issuer mismatch');
    }
    if (`${payload.email_verified}` !== 'true') {
      throw new UnauthorizedError('Authentication token email not verified');
    }
    if (parseInt(payload.exp, 10) * 1000 < Date.now()) {
      throw new UnauthorizedError('Authentication token expired');
    }

    return payload;
  } catch (error) {
    const normalizedError = mapGoogleVerificationError(error);
    if (normalizedError.message === 'Authentication verification unavailable') {
      logger.warn('[Auth] Google token verification unavailable', { err: error.message });
    }
    throw normalizedError;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
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
    if (error.message === 'Authentication verification unavailable') {
      return sendAuthError(res, req.id, 503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable');
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
  const adminUids = config.ADMIN_UIDS;
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
  googleAuthEnabled: Boolean(config.GOOGLE_CLIENT_ID),
};
