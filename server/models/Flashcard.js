const mongoose = require('mongoose');

/**
 * Flashcard Schema — SM-2 Intelligence Layer
 *
 * Each flashcard is:
 *   - Anchored to a `chunk_id` from the vector store (for citation patching later)
 *   - Anchored to a `topic_id` from the curriculum mapper
 *   - Controlled by SM-2 scheduling fields (ease_factor, interval, repetitions)
 *   - Gated at creation by `source_confidence` (only ≥ 0.80 allowed)
 *
 * SM-2 Algorithm (Leitner/SuperMemo-2):
 *   if quality ≥ 3 (recalled):
 *     if repetitions = 0: interval = 1
 *     if repetitions = 1: interval = 6
 *     else:               interval = round(prev_interval × ease_factor)
 *     repetitions++
 *     ease_factor = ease_factor + (0.1 - (5 - quality) × (0.08 + (5 - quality) × 0.02))
 *   else (failed):
 *     repetitions = 0
 *     interval = 1
 *
 *   ease_factor = max(1.3, ease_factor)
 *   next_review  = today + interval (days)
 */

const FlashcardSchema = new mongoose.Schema({

    // ── Identity ────────────────────────────────────────────────────────────

    user_id: {
        type: String,
        required: true,
        index: true
    },

    topic_id: {
        type: String,
        required: true,
        index: true
    },

    subject: {
        type: String,
        required: true,
        default: 'Pathology'
    },

    chapter: {
        type: String,
        required: true
    },

    // ── Content ─────────────────────────────────────────────────────────────

    question: {
        type: String,
        required: true
    },

    answer_summary: {
        type: String,
        required: true   // The key fact(s) to retain — distilled from the LLM answer
    },

    // ── Citation Anchor (links back to Qdrant vector store) ─────────────────
    // Allows retroactive enrichment once citation compliance improves

    source_chunk_ids: {
        type: [String],
        default: []
    },

    source_book: {
        type: String,
        default: null
    },

    source_pages: {
        type: String,
        default: null
    },

    source_confidence: {
        type: Number,
        required: true,
        min: 0.80,       // HARD GATE — only high-confidence answers create flashcards
        max: 1.0
    },

    source_tier: {
        type: String,
        enum: ['HIGH', 'MEDIUM'],
        required: true
    },

    // ── SM-2 Scheduling Fields ───────────────────────────────────────────────

    ease_factor: {
        type: Number,
        default: 2.5,    // SM-2 initial ease factor
        min: 1.3
    },

    interval_days: {
        type: Number,
        default: 0       // 0 = new card, due immediately
    },

    repetitions: {
        type: Number,
        default: 0       // Number of consecutive successful reviews
    },

    next_review: {
        type: Date,
        default: Date.now,
        index: true      // Queried heavily for "due cards" fetch
    },

    last_reviewed: {
        type: Date,
        default: null
    },

    last_quality: {
        type: Number,     // 0–5 quality rating submitted by user last session
        default: null
    },

    // ── Stats ────────────────────────────────────────────────────────────────

    total_reviews: {
        type: Number,
        default: 0
    },

    total_correct: {
        type: Number,
        default: 0
    },

    // ── Status ───────────────────────────────────────────────────────────────

    is_suspended: {
        type: Boolean,
        default: false   // Manually suspended by user or admin
    }

}, {
    timestamps: true,    // createdAt, updatedAt
    collection: 'flashcards'
});

// Compound index: fetch due cards for a user sorted by urgency
FlashcardSchema.index({ user_id: 1, next_review: 1, is_suspended: 1 });
FlashcardSchema.index({ user_id: 1, topic_id: 1 });

module.exports = mongoose.model('Flashcard', FlashcardSchema);
