'use strict';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Verify a Google ID token using Google's tokeninfo endpoint.
// No library needed — one HTTPS call, response cached by Google's CDN.
async function verifyGoogleToken(token) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
  const payload = await res.json();

  if (!res.ok || payload.error_description) {
    console.error('[Auth] Google tokeninfo rejected token:', payload.error_description);
    throw new Error(payload.error_description || 'Token verification failed');
  }

  // Log audience for debugging — remove once confirmed working
  console.log(`[Auth] Token verified. aud=${payload.aud} sub=${payload.sub?.slice(0, 8)}...`);

  return payload;
}

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
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
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
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
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const adminUids = (process.env.ADMIN_UIDS || '').split(',').map(u => u.trim()).filter(Boolean);
  if (adminUids.includes(req.user.uid)) return next();
  console.warn(`[Auth] isAdmin denied uid=${req.user.uid}`);
  return res.status(403).json({ success: false, error: 'Forbidden' });
};

module.exports = { verifyToken, optionalAuth, isAdmin, firebaseEnabled: !!CLIENT_ID };
