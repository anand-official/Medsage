const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
}

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
router.put('/profile', [
  body('displayName').optional().isString().isLength({ min: 1, max: 80 }),
  body('mbbs_year').optional().isInt({ min: 1, max: 5 }),
  body('college').optional().isString().isLength({ max: 120 }),
  body('country').optional().isString().isLength({ max: 80 }),
  body('onboarded').optional().isBoolean(),
], verifyToken, validate, authController.updateProfile);
router.delete('/profile', verifyToken, authController.deleteAccount);
router.put('/preferences', [
  body('subjects_weak').optional().isArray({ max: 20 }),
  body('subjects_strong').optional().isArray({ max: 20 }),
  body('topics_weak').optional().isArray({ max: 30 }),
  body('topics_strong').optional().isArray({ max: 30 }),
], verifyToken, validate, authController.updatePreferences);

module.exports = router;
