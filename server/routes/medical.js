const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const openaiService = require('../services/openaiService');

// Medical query endpoint
router.post('/query', [
  body('message').trim().notEmpty().withMessage('Question is required'),
  body('mode').optional().isIn(['exam', 'conceptual']).withMessage('Invalid study mode'),
  body('syllabus').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { message, mode = 'conceptual', syllabus = 'Indian MBBS' } = req.body;

    // Generate AI response
    const aiResponse = await openaiService.generateMedicalResponse(message, {
      syllabus,
      studyMode: mode
    });

    res.json({
      success: true,
      data: {
        text: aiResponse.answer,
        textWithReferences: formatResponseWithReferences(aiResponse),
        bookReferences: aiResponse.references || [],
        citations: aiResponse.citations || [],
        keyPoints: aiResponse.keyPoints || [],
        clinicalRelevance: aiResponse.clinicalRelevance,
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

// Helper function to format response with references
function formatResponseWithReferences(response) {
  let formattedText = response.answer;

  // Add key points if available
  if (response.keyPoints && response.keyPoints.length > 0) {
    formattedText += '\n\nKey Points:\n' + response.keyPoints.map(point => `• ${point}`).join('\n');
  }

  // Add clinical relevance if available
  if (response.clinicalRelevance) {
    formattedText += '\n\nClinical Relevance:\n' + response.clinicalRelevance;
  }

  // Add references if available
  if (response.references && response.references.length > 0) {
    formattedText += '\n\nReferences:\n' + response.references.map(ref => 
      `• ${ref.book}, Chapter ${ref.chapter}, p.${ref.page}`
    ).join('\n');
  }

  return formattedText;
}

module.exports = router; 