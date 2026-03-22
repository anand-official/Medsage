/**
 * Cortex Chat Sessions API
 *
 * Persists conversation sessions to MongoDB.
 * Frontend uses localStorage as offline cache and syncs here on load/save.
 *
 * Routes:
 *   GET  /api/chat/sessions          — list user's sessions (last 50, no messages)
 *   GET  /api/chat/sessions/:id      — get one session with full messages
 *   POST /api/chat/sessions          — upsert a session (create or update)
 *   DELETE /api/chat/sessions/:id    — delete a session
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const ChatSession = require('../models/ChatSession');
const { verifyToken } = require('../middleware/auth');

const MAX_SESSIONS_PER_USER = 50;
const MAX_MESSAGES_PER_SESSION = 200;

// ── GET /api/chat/sessions ────────────────────────────────────────────────────
// Returns session list (no messages) for the sidebar
router.get('/sessions', verifyToken, async (req, res) => {
    try {
        const sessions = await ChatSession.find({ user_id: req.user.uid })
            .select('session_id title created_at updated_at')
            .sort({ updated_at: -1 })
            .limit(MAX_SESSIONS_PER_USER)
            .lean();

        res.json({ success: true, sessions });
    } catch (err) {
        console.error('[Chat] List sessions error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load sessions' });
    }
});

// ── GET /api/chat/sessions/:id ────────────────────────────────────────────────
// Returns full session with messages
router.get('/sessions/:id', [
    param('id').isString().isLength({ min: 1, max: 100 }),
], verifyToken, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const session = await ChatSession.findOne({
            user_id: req.user.uid,
            session_id: req.params.id
        }).lean();

        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        res.json({ success: true, session });
    } catch (err) {
        console.error('[Chat] Get session error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load session' });
    }
});

// ── POST /api/chat/sessions ───────────────────────────────────────────────────
// Upsert a session (create or update messages + title)
router.post('/sessions', [
    body('session_id').isString().notEmpty().isLength({ max: 100 }),
    body('title').optional().isString().isLength({ max: 120 }),
    body('messages').isArray({ max: MAX_MESSAGES_PER_SESSION }),
    body('messages.*.role').isIn(['user', 'ai']),
    body('messages.*.text').isString().isLength({ max: 10000 }),
], verifyToken, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { session_id, title, messages } = req.body;
    const uid = req.user.uid;

    try {
        // Enforce per-user session cap before creating a new one
        const existingCount = await ChatSession.countDocuments({ user_id: uid });
        const isNew = !(await ChatSession.exists({ user_id: uid, session_id }));
        if (isNew && existingCount >= MAX_SESSIONS_PER_USER) {
            // Delete the oldest session to make room
            const oldest = await ChatSession.findOne({ user_id: uid })
                .sort({ updated_at: 1 })
                .select('_id');
            if (oldest) await ChatSession.deleteOne({ _id: oldest._id });
        }

        const session = await ChatSession.findOneAndUpdate(
            { user_id: uid, session_id },
            {
                $set: {
                    title: title || (messages[0]?.text?.substring(0, 60) + '…') || 'Untitled session',
                    messages: messages.slice(0, MAX_MESSAGES_PER_SESSION),
                    updated_at: new Date(),
                },
                $setOnInsert: { user_id: uid, session_id, created_at: new Date() },
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, session_id: session.session_id });
    } catch (err) {
        console.error('[Chat] Upsert session error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to save session' });
    }
});

// ── DELETE /api/chat/sessions/:id ─────────────────────────────────────────────
router.delete('/sessions/:id', [
    param('id').isString().isLength({ min: 1, max: 100 }),
], verifyToken, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        await ChatSession.deleteOne({ user_id: req.user.uid, session_id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        console.error('[Chat] Delete session error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete session' });
    }
});

module.exports = router;
