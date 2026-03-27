let admin = null;
let firebaseEnabled = false;

try {
  admin = require('firebase-admin');

  // Initialize Firebase Admin only if credentials are available
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    firebaseEnabled = true;
    console.log('[Auth] Firebase Admin initialized successfully');
  } else {
    console.warn('[Auth] Firebase credentials missing — all protected routes will return 503 until credentials are set.');
    console.warn('[Auth] Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in your environment.');
  }
} catch (err) {
  console.error('[Auth] Firebase Admin init failed:', err.message);
  console.error('[Auth] All protected routes will return 503 until Firebase is fixed.');
}

/**
 * Verify Firebase ID Token from Authorization header
 * Expects: Authorization: Bearer <token>
 * 
 * In production: Verifies with Firebase
 * In development without Firebase: Allows token to pass with dummy user (INSECURE)
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Invalid token format' 
      });
    }

    // If Firebase is not configured, use DEV BYPASS MODE (development only)
    if (!firebaseEnabled) {
      if (process.env.NODE_ENV === 'production') {
        // Should never reach here due to startup guard, but fail-safe
        return res.status(503).json({ success: false, error: 'Authentication service unavailable' });
      }
      console.warn('[Auth] DEV BYPASS MODE - extracting UID from token locally (INSECURE)');
      // Extract a mock UID from the token for development purposes
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

        req.user = {
          uid: payload.user_id || payload.uid || 'dev-user-001',
          email: payload.email || 'dev@medsage.ai',
          displayName: payload.name || 'Dev User',
          photoURL: payload.picture || null,
        };
        return next();
      } catch (parseErr) {
        console.error('[Auth] Token parse failed:', parseErr.message);
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid token format'
        });
      }
    }

    // Verify the token with Firebase (PRODUCTION MODE)
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      // Custom claim set via Firebase Admin SDK: admin.auth().setCustomUserClaims(uid, { admin: true })
      admin: decodedToken.admin === true,
    };

    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Token expired' 
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Token revoked' 
      });
    }

    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Invalid token' 
    });
  }
};

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without auth
    }

    const token = authHeader.split(' ')[1];
    
    if (!firebaseEnabled) {
      // DEV BYPASS MODE (development only)
      if (process.env.NODE_ENV !== 'production') {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString());

          req.user = {
            uid: payload.user_id || payload.uid || 'dev-user-001',
            email: payload.email || 'dev@medsage.ai',
            displayName: payload.name || 'Dev User',
            photoURL: payload.picture || null,
          };
        } catch (e) {
          // Continue without user on parse error
        }
      }
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
    };

    next();
  } catch (error) {
    // Continue without auth on error
    next();
  }
};

/**
 * Admin guard — must be used after verifyToken (requires req.user to be set).
 *
 * Primary check: Firebase custom claim `admin: true`
 *   Set via: admin.auth().setCustomUserClaims(uid, { admin: true })
 *   Token must be refreshed by the client before the claim takes effect.
 *
 * Fallback: ADMIN_UIDS env var (comma-separated UIDs) for environments
 *   where custom claims haven't been configured yet.
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // Preferred: Firebase custom claim (hot-revocable via token refresh)
  if (req.user.admin === true) {
    return next();
  }

  // Fallback: env-var allowlist (no hot revocation — remove once custom claims are in place)
  const adminUids = (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  if (adminUids.length > 0 && adminUids.includes(req.user.uid)) {
    return next();
  }

  console.warn(`[Auth] isAdmin denied uid=${req.user.uid}`);
  return res.status(403).json({ success: false, error: 'Forbidden' });
};

module.exports = {
  verifyToken,
  optionalAuth,
  isAdmin,
  firebaseEnabled,
};