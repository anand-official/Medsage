const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
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

// Get user's questions
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const questions = await Question.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(questions);
  } catch (error) {
    console.error('Error in GET /questions route:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
});

// Create new question
router.post('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { question, answer, subject, references } = req.body;

    const newQuestion = new Question({
      userId: user._id,
      question,
      answer,
      subject,
      references
    });

    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    console.error('Error in POST /questions route:', error);
    res.status(500).json({ message: 'Error creating question' });
  }
});

// Get question by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const question = await Question.findOne({
      _id: req.params.id,
      userId: user._id
    });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    console.error('Error in GET /questions/:id route:', error);
    res.status(500).json({ message: 'Error fetching question' });
  }
});

module.exports = router; 