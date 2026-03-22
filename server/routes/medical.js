const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const geminiService = require('../services/geminiService');
const sm2Service = require('../services/sm2Service');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Medical query endpoint
router.post('/query', [
  body('message').trim().notEmpty().isLength({ max: 2000 }).withMessage('Question is required and must be under 2000 characters'),
  body('mode').optional().isIn(['exam', 'conceptual']).withMessage('Invalid study mode'),
  body('syllabus').optional().isString().isLength({ max: 100 }),
  body('history').optional().isArray({ max: 20 }).withMessage('History must be an array of at most 20 items'),
  body('history.*.role').optional().isIn(['user', 'ai']).withMessage('History item role must be "user" or "ai"'),
  body('history.*.content').optional().isString().isLength({ max: 500 }).withMessage('Each history item content must be under 500 characters'),
  body('imageBase64').optional().isString().isLength({ max: 5 * 1024 * 1024 }).withMessage('Image too large'), // ~3.75MB decoded
  body('subject').optional().isString().isLength({ max: 100 }),
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
      subject = null,
    } = req.body;

    const uid = req.user?.uid;

    // Generate AI response
    const aiResponse = await geminiService.generateMedicalResponse(message, {
      syllabus,
      mode,
      history,
      imageBase64,
      subject,
    });

    // ── Silent Spaced Repetition (Flashcard) Generation ──
    // Only create flashcards for authenticated users with high confidence responses
    if (uid && !aiResponse.is_clarification_required && aiResponse.confidence?.final_confidence >= 0.8) {
      // Use all high-yield claims joined as the flashcard back (richer than just first item)
      const summary = (aiResponse.high_yield_summary || []).join(' | ') ||
        (aiResponse.answer || '').substring(0, 200);

      // Pass to SM2 Service asynchronously (don't block the HTTP response)
      // Retry wrapper: up to 3 attempts on transient failures
      const withRetry = async (fn, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try { return await fn(); } catch (e) { if (i === retries - 1) throw e; }
        }
      };
      withRetry(() => sm2Service.createFromPipelineResponse(uid, message, aiResponse, summary))
        .catch(err => console.error('[SM-2 BG Error] Failed to generate card after retries:', err.message));
    }

    const basePayload = {
      text: aiResponse.answer || aiResponse.short_note || '',
      keyPoints: aiResponse.high_yield_summary || aiResponse.key_bullets || [],
      clinicalRelevance: aiResponse.clinical_correlation || aiResponse.exam_tips || '',
      bookReferences: aiResponse.citations || [],
      citations: aiResponse.citations || [],
      meta: aiResponse.meta || {},
      topicId: aiResponse.meta?.topic_id || null,
      subject: aiResponse.meta?.subject || null,
      disclaimer: 'Cortex responses are for educational purposes only and do not constitute medical advice. Always verify with authoritative textbooks and clinical guidelines.',
      timestamp: new Date().toISOString()
    };

    // Handle clarification or errors
    if (aiResponse.is_clarification_required) {
      return res.json({
        success: true,
        type: 'CLARIFICATION',
        data: {
          ...basePayload,
          type: 'CLARIFICATION',
          text: aiResponse.answer || 'I need one more detail to give a precise answer.',
          followUpOptions: [
            'Share the exact organ/system involved',
            'Mention key symptoms or findings',
            'Tell me if you want conceptual or exam-focused depth'
          ]
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...basePayload,
        type: 'ANSWER',
        textWithReferences: aiResponse.answer || aiResponse.short_note
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

// ── Streaming endpoint — SSE (Server-Sent Events) ────────────────────────────
// POST /api/medical/query/stream
// Streams Cortex tokens in real-time. Bypasses structured JSON pipeline —
// use for fast conversational responses. Citations available via /query.
router.post('/query/stream', [
  body('message').trim().notEmpty().isLength({ max: 2000 }).withMessage('Question is required'),
  body('mode').optional().isIn(['exam', 'conceptual']),
  body('history').optional().isArray({ max: 20 }),
  body('history.*.role').optional().isIn(['user', 'ai']),
  body('history.*.content').optional().isString().isLength({ max: 500 }),
  body('subject').optional().isString().isLength({ max: 100 }),
], verifyToken, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { message, mode = 'conceptual', history = [], subject = null } = req.body;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Send a heartbeat immediately so the client knows the connection is open
  res.write('event: start\ndata: {}\n\n');

  try {
    const stream = geminiService.streamMedicalResponse(message, { mode, history, subject });

    for await (const chunk of stream) {
      // Each chunk is a plain text token — send as SSE data event
      res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
    }

    // Signal stream completion
    res.write('event: done\ndata: {}\n\n');
  } catch (error) {
    console.error('[CORTEX Stream] Error:', error.message);
    res.write(`event: error\ndata: ${JSON.stringify({ message: 'Stream error. Please try again.' })}\n\n`);
  } finally {
    res.end();
  }
});

module.exports = router;