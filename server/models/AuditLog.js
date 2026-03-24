const mongoose = require('mongoose');

/**
 * AuditLog — records every Cortex query and its response.
 *
 * Purposes:
 *   1. Safety monitoring — flag hallucinations, harmful responses
 *   2. Quality review — identify low-confidence or negatively-rated answers
 *   3. Usage analytics — understand what MBBS students ask most
 *
 * TTL: auto-deleted after 180 days.
 */
const AuditLogSchema = new mongoose.Schema({
    // ── Identity ────────────────────────────────────────────────────
    user_id:       { type: String, required: true, index: true },
    session_id:    { type: String, default: null },          // optional; client may send

    // ── Request ─────────────────────────────────────────────────────
    question:      { type: String, required: true, maxlength: 2000 },
    mode:          { type: String, enum: ['exam', 'conceptual', 'unknown'], default: 'unknown' },
    subject:       { type: String, default: null },
    has_image:     { type: Boolean, default: false },

    // ── Response ─────────────────────────────────────────────────────
    answer:        { type: String, maxlength: 10000, default: '' },
    pipeline:      { type: String, default: null },          // e.g. 'rag_full', 'direct_no_chunks', 'greeting'
    confidence:    { type: Number, default: null },          // 0–1 float
    prompt_id:     { type: String, default: null },
    prompt_version:{ type: String, default: null },
    model_version: { type: String, default: null },
    is_clarification: { type: Boolean, default: false },

    // ── Feedback (populated later via POST /api/audit/feedback) ─────
    feedback: {
        rating:     { type: String, enum: ['up', 'down', null], default: null },
        comment:    { type: String, maxlength: 500, default: '' },
        rated_at:   { type: Date, default: null },
    },

    // ── Flags ───────────────────────────────────────────────────────
    flagged:       { type: Boolean, default: false },        // manually or auto flagged
    flag_reason:   { type: String, default: '' },

    created_at:    { type: Date, default: Date.now, index: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

// TTL — purge logs older than 180 days
AuditLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

// Index for admin review queries
AuditLogSchema.index({ 'feedback.rating': 1, created_at: -1 });
AuditLogSchema.index({ flagged: 1, created_at: -1 });
AuditLogSchema.index({ confidence: 1, created_at: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
