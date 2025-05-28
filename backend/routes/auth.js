const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify the token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create or update user after Firebase authentication
router.post('/user', verifyToken, async (req, res) => {
  try {
    const { email, displayName, photoURL, uid } = req.user;

    let user = await User.findOne({ firebaseUid: uid });
    
    if (user) {
      // Update existing user
      user.lastLogin = Date.now();
      user.displayName = displayName;
      user.photoURL = photoURL;
      await user.save();
    } else {
      // Create new user
      user = new User({
        email,
        displayName,
        photoURL,
        firebaseUid: uid
      });
      await user.save();
    }

    res.json(user);
  } catch (error) {
    console.error('Error in /user route:', error);
    res.status(500).json({ message: 'Error creating/updating user' });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error in /profile route:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
});

// Update study preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const { examDate, selectedSubjects, weakSubjects } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.studyPreferences = {
      examDate,
      selectedSubjects,
      weakSubjects
    };
    
    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error in /preferences route:', error);
    res.status(500).json({ message: 'Error updating preferences' });
  }
});

module.exports = router; 