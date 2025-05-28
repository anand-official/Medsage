const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const openaiService = require('../services/openaiService');
const StudyQuery = require('../models/StudyQuery');

const router = express.Router();

// Get medical answer with AI integration
router.post('/query', auth, [
  body('question').trim().notEmpty().withMessage('Question is required'),
  body('syllabus').optional().isString(),
  body('subject').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question, syllabus = 'Indian MBBS', subject, studyMode = 'conceptual' } = req.body;

    // Check for recent similar queries to avoid redundant API calls
    const recentQuery = await StudyQuery.findOne({
      user: req.user._id,
      question: { $regex: question.slice(0, 50), $options: 'i' },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    let aiResponse;
    
    if (recentQuery) {
      // Return cached response
      aiResponse = {
        answer: recentQuery.answer,
        references: recentQuery.references,
        citations: recentQuery.citations,
        keyPoints: recentQuery.keyPoints || [],
        clinicalRelevance: recentQuery.clinicalRelevance || 'Clinical correlation recommended'
      };
    } else {
      // Generate new AI response
      aiResponse = await openaiService.generateMedicalResponse(question, {
        syllabus,
        subject,
        studyMode
      });
    }

    // Determine subject if not provided
    const detectedSubject = subject || detectSubjectFromQuestion(question);

    // Save query to database
    const queryResult = new StudyQuery({
      user: req.user._id,
      question,
      answer: aiResponse.answer,
      subject: detectedSubject,
      syllabus,
      studyMode,
      references: aiResponse.references || [],
      citations: aiResponse.citations || [],
      keyPoints: aiResponse.keyPoints || [],
      clinicalRelevance: aiResponse.clinicalRelevance,
      difficulty: determineDifficulty(question, aiResponse.answer)
    });

    await queryResult.save();

    res.json({
      success: true,
      data: {
        id: queryResult._id,
        question,
        answer: aiResponse.answer,
        references: aiResponse.references || [],
        citations: aiResponse.citations || [],
        keyPoints: aiResponse.keyPoints || [],
        clinicalRelevance: aiResponse.clinicalRelevance,
        subject: detectedSubject,
        syllabus,
        studyMode,
        timestamp: queryResult.createdAt,
        cached: !!recentQuery
      }
    });

  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({ 
      message: 'Server error processing query',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get query history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, subject, syllabus } = req.query;
    
    const filter = { user: req.user._id };
    if (subject) filter.subject = subject;
    if (syllabus) filter.syllabus = syllabus;

    const queries = await StudyQuery.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('question answer subject syllabus createdAt isBookmarked rating');

    const total = await StudyQuery.countDocuments(filter);

    res.json({
      success: true,
      data: {
        queries,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bookmark/unbookmark query
router.patch('/query/:id/bookmark', auth, async (req, res) => {
  try {
    const query = await StudyQuery.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    query.isBookmarked = !query.isBookmarked;
    await query.save();

    res.json({
      success: true,
      data: { isBookmarked: query.isBookmarked }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Rate query response
router.patch('/query/:id/rate', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, feedback } = req.body;

    const query = await StudyQuery.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    query.rating = rating;
    if (feedback) query.feedback = feedback;
    await query.save();

    res.json({
      success: true,
      message: 'Rating submitted successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions
function detectSubjectFromQuestion(question) {
  const subjectKeywords = {
    'Anatomy': ['anatomy', 'bone', 'muscle', 'nerve', 'artery', 'vein', 'organ', 'structure'],
    'Physiology': ['physiology', 'function', 'mechanism', 'regulation', 'homeostasis', 'reflex'],
    'Pathology': ['pathology', 'disease', 'pathogenesis', 'etiology', 'manifestation', 'diagnosis'],
    'Pharmacology': ['drug', 'medication', 'pharmacology', 'dosage', 'side effect', 'mechanism of action'],
    'Medicine': ['medicine', 'treatment', 'therapy', 'clinical', 'patient', 'symptom'],
    'Surgery': ['surgery', 'surgical', 'operation', 'procedure', 'incision']
  };

  const lowerQuestion = question.toLowerCase();
  
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
      return subject;
    }
  }
  
  return 'General Medicine';
}

function determineDifficulty(question, answer) {
  const questionLength = question.length;
  const answerLength = answer.length;
  const complexWords = ['pathophysiology', 'mechanism', 'differential', 'etiology'].filter(word => 
    question.toLowerCase().includes(word) || answer.toLowerCase().includes(word)
  ).length;

  if (questionLength < 50 && answerLength < 500 && complexWords === 0) {
    return 'basic';
  } else if (complexWords >= 2 || answerLength > 1000) {
    return 'advanced';
  } else {
    return 'intermediate';
  }
}

module.exports = router;