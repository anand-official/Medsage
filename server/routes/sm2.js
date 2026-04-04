const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const sm2Service = require('../services/sm2Service');
const geminiService = require('../services/geminiService');
const { verifyToken } = require('../middleware/auth');
const redisRateLimiter = require('../middleware/redisRateLimiter');
const uidQueryLimiter = redisRateLimiter(
    60, 60 * 1000, 'query', (req) => req.user?.uid || req.ip
);

/**
 * SM-2 Flashcard API Routes
 *
 * All routes require Firebase authentication via verifyToken middleware
 */

// Helper to get userId from verified token only
function getUserId(req) {
    const userId = req.user?.uid;
    if (!userId) throw new Error('Authentication required');
    return userId;
}

function validationError(req, res) {
    const errors = validationResult(req);
    if (errors.isEmpty()) return null;
    return res.status(400).json({ success: false, errors: errors.array() });
}

// ── POST /api/sm2/flashcard ──────────────────────────────────────────────────
// Runs the full pipeline on a question and conditionally creates a flashcard.
// Body: { question, answer_summary?, user_id, mode? }
router.post('/flashcard', [
    body('question').trim().notEmpty().isLength({ max: 2000 }),
    body('answer_summary').optional().isString().isLength({ max: 1000 }),
    body('mode').optional().isIn(['exam', 'conceptual']),
], verifyToken, uidQueryLimiter, async (req, res) => {
    try {
        const badRequest = validationError(req, res);
        if (badRequest) return;
        const userId = getUserId(req);
        const { question, answer_summary, mode } = req.body;

        // Run pipeline to get a grounded, confidence-scored answer
        const pipelineResponse = await geminiService.generateMedicalResponse(question, { mode: mode || 'exam' });

        if (pipelineResponse.error) {
            return res.status(500).json({ error: 'Pipeline failure', detail: pipelineResponse.answer });
        }

        // Distill the answer if not provided — use first 2 sentences of the LLM answer
        const summary = answer_summary ||
            (pipelineResponse.answer || '').split('. ').slice(0, 2).join('. ').trim() + '.';

        // Attempt flashcard creation (confidence-gated inside sm2Service)
        const card = await sm2Service.createFromPipelineResponse(userId, question, pipelineResponse, summary);

        return res.status(card ? 201 : 200).json({
            created: !!card,
            flashcard: card || null,
            confidence: pipelineResponse.confidence,
            message: card
                ? `Flashcard created (${pipelineResponse.confidence.tier} confidence)`
                : `Flashcard blocked — confidence ${pipelineResponse.confidence?.final_confidence?.toFixed(3)} below gate 0.80`,
            pipeline_meta: pipelineResponse.meta
        });

    } catch (err) {
        console.error('[SM-2 Route] POST /flashcard error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/sm2/due ─────────────────────────────────────────────────────────
// Returns due/overdue flashcards for a user's session.
// Query: ?topic_id=PATH_INF_01&subject=Pathology&limit=20
router.get('/due', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const { topic_id, subject, limit } = req.query;

        const cards = await sm2Service.getDueCards(
            userId,
            { topic_id, subject },
            parseInt(limit) || 20
        );

        res.json({
            due_count: cards.length,
            cards
        });
    } catch (err) {
        console.error('[SM-2 Route] GET /due error:', err.message);
        res.status(err.message.includes('Authentication') ? 401 : 500).json({ error: err.message });
    }
});

// ── POST /api/sm2/review ─────────────────────────────────────────────────────
// Submit a quality rating for a card and apply SM-2 scheduling.
// Body: { card_id, quality (0–5), user_id? }
router.post('/review', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const { card_id, quality } = req.body;

        if (!card_id) return res.status(400).json({ error: 'card_id is required' });
        if (quality === undefined || quality === null) return res.status(400).json({ error: 'quality (0–5) is required' });

        const updated = await sm2Service.submitReview(card_id, userId, parseInt(quality));

        res.json({
            card_id: updated._id,
            next_review: updated.next_review,
            interval_days: updated.interval_days,
            ease_factor: updated.ease_factor,
            repetitions: updated.repetitions,
            total_reviews: updated.total_reviews,
            retention_rate: updated.total_reviews > 0
                ? parseFloat((updated.total_correct / updated.total_reviews * 100).toFixed(1))
                : null
        });
    } catch (err) {
        console.error('[SM-2 Route] POST /review error:', err.message);
        res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
});

// ── GET /api/sm2/stats ───────────────────────────────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const stats = await sm2Service.getStats(userId);
        res.json(stats);
    } catch (err) {
        console.error('[SM-2 Route] GET /stats error:', err.message);
        res.status(err.message.includes('Authentication') ? 401 : 500).json({ error: err.message });
    }
});

// ── PATCH /api/sm2/flashcard/:id/suspend ────────────────────────────────────
router.patch('/flashcard/:id/suspend', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const card = await sm2Service.suspendCard(req.params.id, userId);
        res.json({ success: true, card_id: card._id, is_suspended: card.is_suspended });
    } catch (err) {
        res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
});

// ── PATCH /api/sm2/flashcard/:id/unsuspend ──────────────────────────────────
router.patch('/flashcard/:id/unsuspend', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const card = await sm2Service.unsuspendCard(req.params.id, userId);
        res.json({ success: true, card_id: card._id, is_suspended: card.is_suspended, next_review: card.next_review });
    } catch (err) {
        res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
});

// ── DELETE /api/sm2/flashcard/:id ───────────────────────────────────────────
router.delete('/flashcard/:id', verifyToken, async (req, res) => {
    try {
        const userId = getUserId(req);
        const result = await require('../models/Flashcard').findOneAndDelete({ _id: req.params.id, user_id: userId });
        if (!result) return res.status(404).json({ error: 'Card not found or access denied' });
        res.json({ success: true, deleted_id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
