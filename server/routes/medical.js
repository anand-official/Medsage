const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const geminiService = require('../services/geminiService');
const sm2Service = require('../services/sm2Service');
const { buildTrustMetadata } = require('../services/cortexResponsePolicy');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const redisRateLimiter = require('../middleware/redisRateLimiter');
const UserProfile = require('../models/UserProfile');
const StudyPlan = require('../models/StudyPlan');
const AuditLog = require('../models/AuditLog');
const { getCachedLearnerContext, setCachedLearnerContext } = require('../services/learnerContextCache');

// Per-authenticated-user rate limiter — Redis-backed, survives restarts and works
// across multiple server instances. Applied AFTER verifyToken so req.user.uid is available.
// Falls back to fail-open if Redis is unavailable (see server/middleware/redisRateLimiter.js).
const uidQueryLimiter = redisRateLimiter(
  60,           // 60 queries per minute
  60 * 1000,    // 1-minute window
  'query',      // key namespace
  (req) => req.user?.uid || req.ip
);

// Vision-specific limiter — called inline inside the route handler (after verifyToken)
// so req.user.uid is guaranteed to be present.
const visionLimiter = redisRateLimiter(
  2,            // 2 vision queries per minute per user
  60 * 1000,
  'vision',
  (req) => req.user.uid
);

// ── Learner context cache (avoids 2 MongoDB hits per request) ────────────────
function normalizeHistoryItems(history = []) {
  return (history || [])
    .filter((item) => item && (item.role === 'user' || item.role === 'ai'))
    .map((item) => ({
      role: item.role,
      content: String(item.content ?? item.text ?? '').trim().slice(0, 2000),
      ...(item.subject ? { subject: String(item.subject).trim().slice(0, 100) } : {}),
    }))
    .filter((item) => item.content);
}

// ── Image validation ─────────────────────────────────────────────────────────
function isValidImage(base64String) {
  if (!base64String) return false;
  const matches = base64String.match(/^data:image\/(jpeg|png|webp);base64,/);
  if (!matches) return false;
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer.length <= 5 * 1024 * 1024;
  } catch {
    return false;
  }
}

async function buildLearnerContext(uid) {
  if (!uid) return null;

  const cached = getCachedLearnerContext(uid);
  if (cached) return cached;

  const [userProfile, studyPlan] = await Promise.all([
    UserProfile.findOne({ uid }).lean(),
    StudyPlan.findOne({ uid }).lean(),
  ]);

  if (!userProfile && !studyPlan) return null;

  const examDate = studyPlan?.exam_date ? new Date(studyPlan.exam_date) : null;
  const daysUntilExam = examDate
    ? Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  const context = {
    mbbs_year: userProfile?.mbbs_year ?? studyPlan?.mbbs_year ?? null,
    country: userProfile?.country || 'India',
    weak_topics: (studyPlan?.weak_topics || userProfile?.topics_weak || []).slice(0, 5),
    strong_topics: (studyPlan?.strong_topics || userProfile?.topics_strong || []).slice(0, 5),
    subjects_selected: (studyPlan?.subjects_selected || []).slice(0, 6),
    days_until_exam: daysUntilExam,
  };

  setCachedLearnerContext(uid, context);
  return context;
}

/**
 * @swagger
 * /api/medical/query:
 *   post:
 *     summary: Full RAG medical query
 *     description: |
 *       Runs the complete Cortex pipeline — topic classification, Qdrant retrieval,
 *       query expansion, LLM generation, citation verification, and confidence scoring.
 *       Returns a citation-verified answer with trust metadata.
 *     tags: [Medical]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MedicalQueryRequest'
 *     responses:
 *       200:
 *         description: AI response (ANSWER or CLARIFICATION)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MedicalQueryResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       401:
 *         description: Missing or invalid Firebase token
 *       429:
 *         description: Rate limit exceeded (60 queries/min per user)
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Medical query endpoint
router.post('/query', [
  body('message').trim().notEmpty().isLength({ max: 2000 }).withMessage('Question is required and must be under 2000 characters'),
  body('mode').optional().isIn(['exam', 'conceptual']).withMessage('Invalid study mode'),
  body('syllabus').optional().isString().isLength({ max: 100 }),
  body('history').optional().isArray({ max: 20 }).withMessage('History must be an array of at most 20 items'),
  body('history.*.role').optional().isIn(['user', 'ai']).withMessage('History item role must be "user" or "ai"'),
  body('history.*.content').optional().isString().isLength({ max: 2000 }).withMessage('Each history item content must be under 2000 characters'),
  body('history.*.text').optional().isString().isLength({ max: 2000 }).withMessage('Each history item content must be under 2000 characters'),
  body('history.*.subject').optional().isString().isLength({ max: 100 }).withMessage('Each history item subject must be under 100 characters'),
  // imageBase64 string-length guard (actual byte size validated below after decode)
  body('imageBase64').optional().isString().isLength({ max: 8 * 1024 * 1024 }).withMessage('Image payload too large'),
  body('subject').optional().isString().isLength({ max: 100 }),
], verifyToken, uidQueryLimiter, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      message,
      mode = 'conceptual',
      syllabus = 'Indian MBBS',
      history: rawHistory = [],
      imageBase64 = null,
      subject = null,
    } = req.body;
    const history = normalizeHistoryItems(rawHistory);

    // Apply vision rate limit inside the handler (after verifyToken) so req.user.uid is available.
    // We call the middleware manually and check res.headersSent: if the limiter wrote a 429
    // it returns without calling next(), so headersSent will be true after the await.
    if (imageBase64) {
      await visionLimiter(req, res, () => {});
      if (res.headersSent) return; // 429 already written by the limiter
    }

    // Validate image before any expensive processing
    if (imageBase64 && !isValidImage(imageBase64)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image. Accepted formats: JPEG, PNG, WebP. Maximum size: 5 MB.',
      });
    }

    const uid = req.user?.uid;
    const learnerContext = await buildLearnerContext(uid);

    // Generate AI response
    const aiResponse = await geminiService.generateMedicalResponse(message, {
      syllabus,
      mode,
      history,
      imageBase64,
      subject,
      learnerContext,
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

    // Normalise structured claims into { text, sourceId, is_sourced } for the client.
    // Only present when the full RAG pipeline ran; otherwise falls back to keyPoints display.
    const normalisedClaims = Array.isArray(aiResponse.claims) && aiResponse.claims.length > 0
      ? aiResponse.claims.map(c => ({
          text: c.statement,
          sourceId: c.citations?.[0]?.chunk_id || null,
          is_sourced: Boolean(c.is_sourced),
        }))
      : null;

    const basePayload = {
      text: aiResponse.answer || aiResponse.short_note || '',
      keyPoints: aiResponse.high_yield_summary || aiResponse.key_bullets || [],
      claims: normalisedClaims,
      claim_validation: aiResponse.claim_validation || null,
      allClaimsSourced: aiResponse.allClaimsSourced ?? null,
      clinicalRelevance: aiResponse.clinical_correlation || aiResponse.exam_tips || '',
      bookReferences: aiResponse.citations || [],
      citations: aiResponse.citations || [],
      confidence: aiResponse.confidence || null,
      trust: aiResponse.trust || null,
      flags: aiResponse.trust?.flags || aiResponse.confidence?.flags || [],
      verified: Boolean(aiResponse.trust?.verified),
      verificationLevel: aiResponse.trust?.verification_level || null,
      pipeline: aiResponse.trust?.pipeline || aiResponse.meta?.pipeline || null,
      meta: aiResponse.meta || {},
      topicId: aiResponse.meta?.topic_id || null,
      subject: aiResponse.meta?.subject || null,
      answerMode: aiResponse.meta?.answer_mode || null,
      threadMode: aiResponse.meta?.thread_mode || null,
      disclaimer: 'Cortex responses are for educational purposes only and do not constitute medical advice. Always verify with authoritative textbooks and clinical guidelines.',
      timestamp: new Date().toISOString()
    };

    // ── Audit log ─────────────────────────────────────────────────────────
    let logId = null;
    let feedbackId = null;
    try {
      const auditEntry = new AuditLog({
        user_id:        uid || 'anonymous',
        question:       message,
        mode:           mode || 'unknown',
        subject:        aiResponse.meta?.subject || subject || null,
        has_image:      Boolean(imageBase64),
        answer:         (aiResponse.answer || '').substring(0, 10000),
        pipeline:       aiResponse.trust?.pipeline || aiResponse.meta?.pipeline || null,
        confidence:     aiResponse.confidence?.final_confidence ?? null,
        prompt_id:      aiResponse.meta?.prompt_id || null,
        prompt_version: aiResponse.meta?.prompt_version || null,
        model_version:  aiResponse.meta?.model_version || process.env.GEMINI_MODEL || null,
        is_clarification: Boolean(aiResponse.is_clarification_required),
      });
      await auditEntry.save();
      logId = auditEntry.log_id;
      feedbackId = auditEntry._id.toString();
    } catch (err) {
      console.error('[Audit] write failed:', err.message);
      // logId stays null — feedback submission will not be available for this response
    }

    // Handle clarification or errors
    if (aiResponse.is_clarification_required) {
      const clarificationPipeline = aiResponse.meta?.pipeline || '';
      const isGreeting = clarificationPipeline === 'greeting';
      return res.json({
        success: true,
        type: 'CLARIFICATION',
        data: {
          ...basePayload,
          feedback_id: feedbackId,
          public_log_id: logId,
          type: 'CLARIFICATION',
          pipeline: clarificationPipeline,
          text: aiResponse.answer || 'I need one more detail to give a precise answer.',
          // partial_answer is set when the full RAG pipeline produced a real answer but
          // confidence/sourcing was too low to serve it as a final response. The UI can
          // display it above the clarification prompt rather than discarding it.
          partial_answer: aiResponse.partial_answer || null,
          followUpOptions: isGreeting ? [] : [
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
        feedback_id: feedbackId,
        public_log_id: logId,
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

/**
 * @swagger
 * /api/medical/query/stream:
 *   post:
 *     summary: Streaming medical query (Fast Draft / SSE)
 *     description: |
 *       Streams Cortex tokens in real time over Server-Sent Events.
 *       This is the **Fast Draft** path — lower latency but **no citation verification**.
 *       Use `/api/medical/query` for grounded, verified answers.
 *
 *       SSE event types: `start` (trust metadata), `data` (token chunks), `done`, `error`.
 *     tags: [Medical]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, maxLength: 2000 }
 *               mode:    { type: string, enum: [exam, conceptual] }
 *               subject: { type: string }
 *               history:
 *                 type: array
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:    { type: string, enum: [user, ai] }
 *                     content: { type: string, maxLength: 2000 }
 *     responses:
 *       200:
 *         description: SSE stream of token events
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid Firebase token
 *       429:
 *         description: Rate limit exceeded
 */
// ── Streaming endpoint — SSE (Server-Sent Events) ────────────────────────────
// POST /api/medical/query/stream
// Streams Cortex tokens in real-time. This is the explicit Fast Draft path:
// low latency, but not citation-verified. Use /query for grounded answers.
router.post('/query/stream', [
  body('message').trim().notEmpty().isLength({ max: 2000 }).withMessage('Question is required'),
  body('mode').optional().isIn(['exam', 'conceptual']),
  body('history').optional().isArray({ max: 20 }),
  body('history.*.role').optional().isIn(['user', 'ai']),
  body('history.*.content').optional().isString().isLength({ max: 2000 }),
  body('history.*.text').optional().isString().isLength({ max: 2000 }),
  body('subject').optional().isString().isLength({ max: 100 }),
], verifyToken, uidQueryLimiter, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { message, mode = 'conceptual', history: rawHistory = [], subject = null } = req.body;
  const history = normalizeHistoryItems(rawHistory);
  const uid = req.user?.uid;

  // Set SSE headers FIRST — before any async work so that any downstream error
  // can be delivered as an SSE event rather than an unhandled HTTP 500.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  // Send heartbeat so the client knows the connection is open
  const fastDraftTrust = buildTrustMetadata({
    pipeline: 'fast_draft',
    flags: ['FAST_DRAFT_MODE']
  });
  res.write(`event: start\ndata: ${JSON.stringify({ trust: fastDraftTrust, mode })}\n\n`);

  try {
    // buildLearnerContext is inside the try block so a MongoDB failure is caught
    // and delivered as an SSE error rather than crashing the response mid-stream.
    // Fail-open: null learnerContext degrades gracefully (no personalisation).
    const learnerContext = await buildLearnerContext(uid).catch((err) => {
      console.warn('[CORTEX Stream] buildLearnerContext failed, continuing without personalisation:', err.message);
      return null;
    });

    const stream = geminiService.streamMedicalResponse(message, {
      mode,
      history,
      subject,
      learnerContext,
    });

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
