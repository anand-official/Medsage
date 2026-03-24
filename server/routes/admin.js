const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const promptBuilder = require('../services/promptBuilder');

/**
 * @swagger
 * /api/admin/reload-prompts:
 *   post:
 *     summary: Reload prompt templates from disk without restarting the server
 *     description: |
 *       Re-reads `promptRegistry.json` from disk and replaces the in-memory registry.
 *       Useful for hot-patching prompts in production.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Prompts reloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Reloaded 3 prompt(s) from disk.' }
 *                 prompts: { type: object, description: Map of prompt name → version }
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to reload (file not found, parse error, etc.)
 */
/**
 * POST /api/admin/reload-prompts
 *
 * Re-reads promptRegistry.json from disk and replaces the in-memory registry.
 * Allows prompt template edits to take effect without a full server restart.
 *
 * Auth: Firebase token + admin custom claim (or ADMIN_UIDS env var fallback).
 */
router.post('/reload-prompts', verifyToken, isAdmin, (req, res) => {
    try {
        const summary = promptBuilder.reload();
        console.log(`[ADMIN] Prompts reloaded by uid=${req.user.uid}: ${summary.loaded} prompt(s)`);
        res.json({
            success: true,
            message: `Reloaded ${summary.loaded} prompt(s) from disk.`,
            prompts: summary.versions,
        });
    } catch (err) {
        console.error('[ADMIN] reload-prompts failed:', err.message);
        res.status(500).json({
            success: false,
            error: `Failed to reload prompts: ${err.message}`,
        });
    }
});

module.exports = router;
