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
    console.warn('[Auth] Firebase credentials missing - running in DEV BYPASS MODE (INSECURE)');
    console.warn('[Auth] DO NOT USE IN PRODUCTION');
  }
} catch (err) {
  console.error('[Auth] Firebase Admin init failed:', err.message);
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

    // If Firebase is not configured, use DEV BYPASS MODE
    if (!firebaseEnabled) {
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
      // DEV BYPASS MODE
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

module.exports = {
  verifyToken,
  optionalAuth,
  firebaseEnabled,
};