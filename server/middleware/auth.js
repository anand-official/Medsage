'use strict';
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];

    // Dev bypass when no CLIENT_ID configured
    if (!CLIENT_ID) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ success: false, error: 'Auth service not configured' });
      }
      // Dev: decode without verification
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        req.user = {
          uid: payload.sub || 'dev-user-001',
          email: payload.email || 'dev@medsage.pro',
          displayName: payload.name || 'Dev User',
          photoURL: payload.picture || null,
          admin: false,
        };
        return next();
      } catch {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
      }
    }

    const ticket = await client.verifyIdToken({ idToken: token, audience: CLIENT_ID });
    const payload = ticket.getPayload();

    req.user = {
      uid: payload.sub,
      email: payload.email,
      displayName: payload.name || payload.email,
      photoURL: payload.picture || null,
      admin: false, // set via ADMIN_UIDS env var
    };
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    if (!CLIENT_ID) return next();
    const ticket = await client.verifyIdToken({ idToken: token, audience: CLIENT_ID });
    const payload = ticket.getPayload();
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
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const adminUids = (process.env.ADMIN_UIDS || '').split(',').map(u => u.trim()).filter(Boolean);
  if (adminUids.includes(req.user.uid)) return next();
  console.warn(`[Auth] isAdmin denied uid=${req.user.uid}`);
  return res.status(403).json({ success: false, error: 'Forbidden' });
};

module.exports = { verifyToken, optionalAuth, isAdmin, firebaseEnabled: !!CLIENT_ID };
