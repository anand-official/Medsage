const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

/**
 * @swagger
 * /auth/user:
 *   post:
 *     summary: Sync user profile after Firebase sign-in
 *     description: Called by the frontend after Google/Firebase sign-in to create or update the UserProfile in MongoDB. Requires a valid Firebase ID token.
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile synced
 *       401:
 *         description: Missing or invalid Firebase token
 *
 * /auth/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile object
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update current user's profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Updated profile
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Delete account and all associated data
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *       401:
 *         description: Unauthorized
 *
 * /auth/preferences:
 *   put:
 *     summary: Update user preferences (study mode, theme, etc.)
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences updated
 *       401:
 *         description: Unauthorized
 */
// Define auth routes
// Called by frontend after Firebase Google Sign-In to sync UserProfile.
// Requires a valid token — anonymous callers cannot trigger user creation.
router.post('/user', verifyToken, authController.syncUser);

// Protected routes - require valid Firebase token
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.delete('/profile', verifyToken, authController.deleteAccount);
router.put('/preferences', verifyToken, authController.updatePreferences);

module.exports = router;
