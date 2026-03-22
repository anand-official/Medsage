const Flashcard = require('../models/Flashcard');
const confidenceEngine = require('./confidenceEngine');

/**
 * SM-2 Intelligence Service
 *
 * Implements the SuperMemo-2 spaced repetition algorithm with a confidence gate.
 * Only pipeline responses with final_confidence ≥ 0.80 (HIGH tier) may create
 * flashcards. This ensures SM-2 schedules are built on verified knowledge only.
 *
 * Quality Scale (expected from UI):
 *   5 — Perfect response, no hesitation
 *   4 — Correct after a moment of thought
 *   3 — Correct, but required significant effort
 *   2 — Incorrect but immediately recognised correct answer
 *   1 — Incorrect, but answer was familiar
 *   0 — Complete blackout
 */

// Minimum confidence to create a flashcard
const SM2_CONFIDENCE_GATE = 0.80;

class SM2Service {

    // ─── Scheduling Algorithm ────────────────────────────────────────────────

    /**
     * Applies the SM-2 algorithm to a flashcard given a quality rating.
     * Mutates and returns the updated SM-2 fields (not saved here).
     *
     * @param {object} card  - Current SM-2 state { ease_factor, interval_days, repetitions }
     * @param {number} quality - 0–5 quality rating
     * @returns {object} Updated { ease_factor, interval_days, repetitions, next_review }
     */
    applyReview(card, quality) {
        let { ease_factor, interval_days, repetitions } = card;

        if (quality < 0 || quality > 5) throw new Error('Quality must be 0–5');

        if (quality >= 3) {
            // Successful recall
            if (repetitions === 0) {
                interval_days = 1;
            } else if (repetitions === 1) {
                interval_days = 6;
            } else {
                interval_days = Math.round(interval_days * ease_factor);
            }
            repetitions += 1;
        } else {
            // Failed recall — reset
            repetitions = 0;
            interval_days = 1;
        }

        // Update ease factor (SM-2 formula)
        ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        ease_factor = Math.max(1.3, parseFloat(ease_factor.toFixed(4)));

        const next_review = new Date();
        next_review.setDate(next_review.getDate() + interval_days);
        next_review.setHours(0, 0, 0, 0); // schedule for midnight

        return { ease_factor, interval_days, repetitions, next_review };
    }

    // ─── Flashcard Creation (Confidence-Gated) ────────────────────────────────

    /**
     * Creates a flashcard from a pipeline response.
     * HARD GATE: blocks creation if final_confidence < SM2_CONFIDENCE_GATE.
     *
     * @param {string}  userId       - MongoDB ObjectId
     * @param {string}  question     - Original question text
     * @param {object}  pipelineResponse  - Full response from OpenAI pipeline
     * @param {string}  answerSummary     - Distilled key fact (1–3 sentences)
     * @returns {Flashcard | null}
     */
    async createFromPipelineResponse(userId, question, pipelineResponse, answerSummary) {
        const conf = pipelineResponse.confidence;

        // ── Confidence Gate ──────────────────────────────────────────────────
        if (!conf || conf.final_confidence < SM2_CONFIDENCE_GATE) {
            console.log(
                `[SM-2] ⛔ Flashcard blocked for topic ${pipelineResponse.meta?.topic_id}` +
                ` — confidence ${conf?.final_confidence} < gate ${SM2_CONFIDENCE_GATE}` +
                ` | tier=${conf?.tier} | flags=[${conf?.flags?.join(',')}]`
            );
            return null;
        }

        // ── Deduplication Check ──────────────────────────────────────────────
        const existing = await Flashcard.findOne({ user_id: userId, question: question }).lean();
        if (existing) {
            console.log(`[SM-2] ↩ Duplicate skipped | topic=${pipelineResponse.meta?.topic_id} | existing_id=${existing._id}`);
            return null;
        }

        // ── Citation Anchors ─────────────────────────────────────────────────
        const claims = pipelineResponse.claims || [];
        const chunkIds = [...new Set(claims.flatMap(c => c.chunk_ids || []).filter(Boolean))];
        const meta = pipelineResponse.meta || {};

        // ── Book / Page from first chunk payload ─────────────────────────────
        const firstChunk = (pipelineResponse.chunk_payloads || [])[0];
        const sourceBook = firstChunk?.book || meta.source_book || null;
        const sourcePages = firstChunk ? `${firstChunk.page_start}–${firstChunk.page_end}` : null;

        const card = await Flashcard.create({
            user_id: userId,
            topic_id: meta.topic_id || 'UNKNOWN',
            subject: meta.subject || 'General',
            chapter: firstChunk?.chapter || meta.topic_id || 'Unknown Chapter',
            question: question,
            answer_summary: answerSummary,
            source_chunk_ids: chunkIds,
            source_book: sourceBook,
            source_pages: sourcePages,
            source_confidence: conf.final_confidence,
            source_tier: conf.tier,
            // SM-2 initial state — new card, due now
            ease_factor: 2.5,
            interval_days: 0,
            repetitions: 0,
            next_review: new Date(),
        });

        console.log(
            `[SM-2] ✅ Flashcard created | id=${card._id} | topic=${meta.topic_id}` +
            ` | conf=${conf.final_confidence} [${conf.tier}]` +
            ` | chunks=[${chunkIds.join(',')}]`
        );

        return card;
    }

    // ─── Due Cards ───────────────────────────────────────────────────────────

    /**
     * Returns all due or overdue flashcards for a user, sorted by urgency (oldest first).
     * Excludes suspended cards.
     *
     * @param {string} userId
     * @param {object} filters - Optional: { topic_id, subject }
     * @param {number} limit   - Max cards per session (default 20)
     */
    async getDueCards(userId, filters = {}, limit = 20) {
        const query = {
            user_id: userId,
            next_review: { $lte: new Date() },
            is_suspended: false
        };
        if (filters.topic_id) query.topic_id = filters.topic_id;
        if (filters.subject) query.subject = filters.subject;

        const cards = await Flashcard.find(query)
            .sort({ next_review: 1 })  // oldest due first (most urgent)
            .limit(limit)
            .lean();

        console.log(`[SM-2] Due cards for user ${userId}: ${cards.length} (limit=${limit})`);
        return cards;
    }

    // ─── Submit Review ───────────────────────────────────────────────────────

    /**
     * Submits a quality rating for a flashcard and applies SM-2 scheduling.
     *
     * @param {string} cardId   - Flashcard _id
     * @param {string} userId   - Validated against card owner
     * @param {number} quality  - 0–5 rating
     */
    async submitReview(cardId, userId, quality) {
        const card = await Flashcard.findOne({ _id: cardId, user_id: userId });
        if (!card) throw new Error(`Flashcard ${cardId} not found or access denied`);

        const { ease_factor, interval_days, repetitions, next_review } = this.applyReview(card, quality);

        card.ease_factor = ease_factor;
        card.interval_days = interval_days;
        card.repetitions = repetitions;
        card.next_review = next_review;
        card.last_reviewed = new Date();
        card.last_quality = quality;
        card.total_reviews += 1;
        if (quality >= 3) card.total_correct += 1;

        await card.save();

        console.log(
            `[SM-2] Review submitted | card=${cardId} | quality=${quality}` +
            ` | next_review=${next_review.toISOString().split('T')[0]}` +
            ` | interval=${interval_days}d | ef=${ease_factor}`
        );

        return card;
    }

    // ─── Session Stats ───────────────────────────────────────────────────────

    /**
     * Returns aggregate study stats for a user's SM-2 deck.
     *
     * @param {string} userId
     */
    async getStats(userId) {
        const [total, due, suspended] = await Promise.all([
            Flashcard.countDocuments({ user_id: userId }),
            Flashcard.countDocuments({ user_id: userId, next_review: { $lte: new Date() }, is_suspended: false }),
            Flashcard.countDocuments({ user_id: userId, is_suspended: true })
        ]);

        const retention = await Flashcard.aggregate([
            { $match: { user_id: userId, total_reviews: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    avg_retention: { $avg: { $divide: ['$total_correct', '$total_reviews'] } },
                    avg_ef: { $avg: '$ease_factor' },
                    total_reviews: { $sum: '$total_reviews' }
                }
            }
        ]);

        const r = retention[0] || { avg_retention: 0, avg_ef: 2.5, total_reviews: 0 };

        return {
            total_cards: total,
            due_now: due,
            suspended: suspended,
            avg_retention: parseFloat((r.avg_retention * 100).toFixed(1)),
            avg_ease_factor: parseFloat(r.avg_ef.toFixed(3)),
            total_reviews: r.total_reviews
        };
    }

    // ─── Suspend / Unsuspend ──────────────────────────────────────────────────

    async suspendCard(cardId, userId) {
        const card = await Flashcard.findOneAndUpdate(
            { _id: cardId, user_id: userId },
            { is_suspended: true },
            { new: true }
        );
        if (!card) throw new Error(`Card ${cardId} not found`);
        return card;
    }

    async unsuspendCard(cardId, userId) {
        const card = await Flashcard.findOneAndUpdate(
            { _id: cardId, user_id: userId },
            { is_suspended: false, next_review: new Date() },
            { new: true }
        );
        if (!card) throw new Error(`Card ${cardId} not found`);
        return card;
    }
}

module.exports = new SM2Service();
