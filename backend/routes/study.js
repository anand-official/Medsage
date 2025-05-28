const express = require('express');
const router = express.Router();
const Study = require('../models/Study');
const User = require('../models/User');

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get study plan
router.get('/plan', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let studyPlan = await Study.findOne({ userId: user._id });
    
    if (!studyPlan) {
      return res.status(404).json({ message: 'No study plan found' });
    }

    res.json(studyPlan);
  } catch (error) {
    console.error('Error in /plan route:', error);
    res.status(500).json({ message: 'Error fetching study plan' });
  }
});

// Create or update study plan
router.post('/plan', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { dailyPlan } = req.body;
    
    let studyPlan = await Study.findOne({ userId: user._id });
    
    if (studyPlan) {
      studyPlan.dailyPlan = dailyPlan;
      studyPlan.updatedAt = Date.now();
    } else {
      studyPlan = new Study({
        userId: user._id,
        dailyPlan
      });
    }

    await studyPlan.save();
    res.json(studyPlan);
  } catch (error) {
    console.error('Error in /plan route:', error);
    res.status(500).json({ message: 'Error creating/updating study plan' });
  }
});

// Update topic completion status
router.put('/topic/:topicId', verifyToken, async (req, res) => {
  try {
    const { completed } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const studyPlan = await Study.findOne({ userId: user._id });
    if (!studyPlan) {
      return res.status(404).json({ message: 'No study plan found' });
    }

    // Find and update the topic
    let topicFound = false;
    studyPlan.dailyPlan.forEach(day => {
      day.subjects.forEach(subject => {
        subject.topics.forEach(topic => {
          if (topic._id.toString() === req.params.topicId) {
            topic.completed = completed;
            topicFound = true;
          }
        });
      });
    });

    if (!topicFound) {
      return res.status(404).json({ message: 'Topic not found' });
    }

    await studyPlan.save();
    res.json(studyPlan);
  } catch (error) {
    console.error('Error in /topic route:', error);
    res.status(500).json({ message: 'Error updating topic status' });
  }
});

module.exports = router; 