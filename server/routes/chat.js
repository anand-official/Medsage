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

/**
 * @swagger
 * /api/chat/sessions:
 *   get:
 *     summary: List user's chat sessions
 *     description: Returns up to 50 sessions (metadata only, no messages) sorted by most recently updated.
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of session summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:  { type: boolean, example: true }
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       session_id: { type: string }
 *                       title:      { type: string }
 *                       created_at: { type: string, format: date-time }
 *                       updated_at: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/chat/sessions/{id}:
 *   get:
 *     summary: Get a chat session with paginated messages
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: session_id (client-generated UUID)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *     responses:
 *       200:
 *         description: Session with paginated messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:    { type: boolean }
 *                 session:    { $ref: '#/components/schemas/ChatSession' }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *       404:
 *         description: Session not found
 *   delete:
 *     summary: Delete a chat session
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *       401:
 *         description: Unauthorized
 */
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

        const allMessages = session.messages || [];
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const total = allMessages.length;
        const start = (page - 1) * limit;

        res.json({
            success: true,
            session: {
                ...session,
                messages: allMessages.slice(start, start + limit),
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('[Chat] Get session error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load session' });
    }
});

/**
 * @swagger
 * /api/chat/sessions:
 *   post:
 *     summary: Create or update a chat session (upsert)
 *     description: |
 *       Upserts a session by `session_id`. If the user already has 50 sessions,
 *       the oldest one is automatically removed to make room.
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [session_id, messages]
 *             properties:
 *               session_id: { type: string, maxLength: 100 }
 *               title:      { type: string, maxLength: 120 }
 *               messages:
 *                 type: array
 *                 maxItems: 200
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [user, ai] }
 *                     text: { type: string, maxLength: 10000 }
 *     responses:
 *       200:
 *         description: Session saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:    { type: boolean }
 *                 session_id: { type: string }
 *       400:
 *         description: Validation error
 */
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
        // Note: this cap check has a TOCTOU race under concurrent requests — acceptable for a soft UX limit.
        // Enforce per-user session cap before creating a new one
        const existingCount = await ChatSession.countDocuments({ user_id: uid }, { maxTimeMS: 5000 });
        const isNew = !(await ChatSession.exists({ user_id: uid, session_id }, { maxTimeMS: 5000 }));
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
