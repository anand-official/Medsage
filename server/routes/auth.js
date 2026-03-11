const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Define auth routes
// Public route - called by frontend after Firebase Google Sign-In to sync UserProfile
router.post('/user', optionalAuth, authController.syncUser);

// Protected routes - require valid Firebase token
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.delete('/profile', verifyToken, authController.deleteAccount);
router.put('/preferences', verifyToken, authController.updatePreferences);

module.exports = router;
