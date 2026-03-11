const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const geminiService = require('../services/geminiService');
const sm2Service = require('../services/sm2Service');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Medical query endpoint
router.post('/query', [
  body('message').trim().notEmpty().withMessage('Question is required'),
  body('mode').optional().isIn(['exam', 'conceptual']).withMessage('Invalid study mode'),
  body('syllabus').optional().isString(),
  body('history').optional().isArray(),
  body('imageBase64').optional().isString(),
], verifyToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      message,
      mode = 'conceptual',
      syllabus = 'Indian MBBS',
      history = [],
      imageBase64 = null,
    } = req.body;

    const uid = req.user?.uid;

    // Generate AI response
    const aiResponse = await geminiService.generateMedicalResponse(message, {
      syllabus,
      mode,
      history,
      imageBase64,
    });

    // ── Silent Spaced Repetition (Flashcard) Generation ──
    // Only create flashcards for authenticated users with high confidence responses
    if (uid && !aiResponse.is_clarification_required && aiResponse.confidence?.final_confidence >= 0.8) {
      // Use the first high-yield claim as the front/back answer summary
      const summary = aiResponse.high_yield_summary?.[0] || aiResponse.answer?.substring(0, 100) + '...';

      // Pass to SM2 Service asynchronously (don't block the HTTP response)
      sm2Service.createFromPipelineResponse(uid, message, aiResponse, summary)
        .catch(err => console.error('[SM-2 BG Error] Failed to generate card:', err.message));
    }

    // Handle clarification or errors
    if (aiResponse.is_clarification_required) {
      return res.json({
        success: true,
        type: 'CLARIFICATION',
        data: aiResponse
      });
    }

    res.json({
      success: true,
      data: {
        text: aiResponse.answer || aiResponse.short_note,
        textWithReferences: aiResponse.answer || aiResponse.short_note,
        bookReferences: aiResponse.citations || [],
        citations: aiResponse.citations || [],
        keyPoints: aiResponse.high_yield_summary || aiResponse.key_bullets || [],
        clinicalRelevance: aiResponse.clinical_correlation || aiResponse.exam_tips,
        meta: aiResponse.meta,
        topicId: aiResponse.meta?.topic_id || null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Medical query error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process your question. Please try again later.'
    });
  }
});

module.exports = router;