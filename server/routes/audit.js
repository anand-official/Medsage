/**
 * Audit Routes
 *
 * POST /api/audit/feedback        — submit thumbs up/down for a logged response
 * GET  /api/audit/admin/review    — admin: list low-rated / flagged / low-confidence logs
 * POST /api/audit/admin/flag/:id  — admin: manually flag a log entry
 */

const express = require('express');
const router = express.Router();
const { body, query, param, validationResult } = require('express-validator');
const { verifyToken, isAdmin } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

/**
 * @swagger
 * /api/audit/feedback:
 *   post:
 *     summary: Submit thumbs up/down feedback for a query response
 *     description: |
 *       Records user feedback against an AuditLog entry identified by `log_id`.
 *       A thumbs-down automatically flags the entry for admin review.
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [log_id, rating]
 *             properties:
 *               log_id:  { type: string, description: MongoDB ObjectId from query response }
 *               rating:  { type: string, enum: [up, down] }
 *               comment: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Feedback recorded
 *       400:
 *         description: Validation error
 *       404:
 *         description: Log not found or does not belong to the caller
 *
 * /api/audit/admin/review:
 *   get:
 *     summary: Admin — list flagged / low-rated / low-confidence audit logs
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema: { type: string, enum: [thumbs_down, flagged, low_confidence, all], default: thumbs_down }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 50 }
 *       - in: query
 *         name: skip
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated audit log list
 *       403:
 *         description: Admin access required
 *
 * /api/audit/admin/log/{id}:
 *   get:
 *     summary: Admin — get full audit log entry including the LLM answer
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full log entry
 *       404:
 *         description: Not found
 *
 * /api/audit/admin/flag/{id}:
 *   post:
 *     summary: Admin — manually flag an audit log entry for review
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, maxLength: 200 }
 *     responses:
 *       200:
 *         description: Flagged successfully
 *       404:
 *         description: Not found
 */
// ── POST /api/audit/feedback ─────────────────────────────────────────────────

router.post('/feedback', [
    body('feedback_id').optional().isMongoId().withMessage('Valid feedback_id required'),
    body('log_id').optional().isString().isLength({ min: 8, max: 64 }).withMessage('Valid log_id required'),
    body('rating').isIn(['up', 'down']).withMessage('rating must be "up" or "down"'),
    body('comment').optional().isString().isLength({ max: 500 }),
], verifyToken, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { feedback_id, log_id, rating, comment = '' } = req.body;
    const uid = req.user?.uid;

    if (!feedback_id && !log_id) {
        return res.status(400).json({
            success: false,
            errors: [{ msg: 'feedback_id or log_id is required', path: 'feedback_id' }],
        });
    }

    try {
        const selector = feedback_id
            ? { _id: feedback_id, user_id: uid }
            : { log_id, user_id: uid };

        // Only allow the owner to rate their own query
        const log = await AuditLog.findOneAndUpdate(
            selector,
            {
                $set: {
                    'feedback.rating': rating,
                    'feedback.comment': comment,
                    'feedback.rated_at': new Date(),
                    // Auto-flag thumbs-down for admin review
                    flagged: rating === 'down',
                    flag_reason: rating === 'down' ? 'user_thumbs_down' : '',
                },
            },
            { new: true }
        );

        if (!log) {
            return res.status(404).json({ success: false, error: 'Log entry not found or not yours.' });
        }

        res.json({ success: true, message: 'Feedback recorded. Thank you!' });
    } catch (err) {
        console.error('[Audit] feedback error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to save feedback.' });
    }
});

// ── GET /api/audit/admin/review ───────────────────────────────────────────────

router.get('/admin/review', [
    query('filter').optional().isIn(['thumbs_down', 'flagged', 'low_confidence', 'all']),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
], verifyToken, isAdmin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const filter = req.query.filter || 'thumbs_down';
    const limit = req.query.limit || 50;
    const skip = req.query.skip || 0;

    let mongoFilter = {};
    if (filter === 'thumbs_down')    mongoFilter = { 'feedback.rating': 'down' };
    else if (filter === 'flagged')   mongoFilter = { flagged: true };
    else if (filter === 'low_confidence') mongoFilter = { confidence: { $lt: 0.5, $ne: null } };
    // 'all' → no filter

    try {
        const [logs, total] = await Promise.all([
            AuditLog.find(mongoFilter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .select('-answer')   // omit full answer to keep payload small; fetch individually if needed
                .lean(),
            AuditLog.countDocuments(mongoFilter),
        ]);

        res.json({ success: true, total, skip, limit, logs });
    } catch (err) {
        console.error('[Audit] admin review error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to retrieve logs.' });
    }
});

// ── GET /api/audit/admin/log/:id ──────────────────────────────────────────────

router.get('/admin/log/:id', [
    param('id').isMongoId(),
], verifyToken, isAdmin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const log = await AuditLog.findById(req.params.id).lean();
        if (!log) return res.status(404).json({ success: false, error: 'Not found.' });
        res.json({ success: true, log });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to retrieve log.' });
    }
});

// ── POST /api/audit/admin/flag/:id ────────────────────────────────────────────

router.post('/admin/flag/:id', [
    param('id').isMongoId(),
    body('reason').optional().isString().isLength({ max: 200 }),
], verifyToken, isAdmin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const log = await AuditLog.findByIdAndUpdate(
            req.params.id,
            { $set: { flagged: true, flag_reason: req.body.reason || 'admin_manual' } },
            { new: true }
        );
        if (!log) return res.status(404).json({ success: false, error: 'Not found.' });
        res.json({ success: true, message: 'Log flagged for review.' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to flag log.' });
    }
});

module.exports = router;
