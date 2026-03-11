/**
 * Composite Confidence Engine
 *
 * Formalizes the Unified Response Confidence Model.
 * Aggregates three independent scoring layers into a single auditable score.
 *
 * ─── Formula ────────────────────────────────────────────────────────────────
 *
 *   final_confidence =
 *     (WEIGHTS.topic      × topic_confidence)
 *   + (WEIGHTS.retrieval  × retrieval_confidence)
 *   + (WEIGHTS.citation   × citation_integrity_score)
 *
 * Where:
 *   topic_confidence        → TopicConfidenceScorer output (0–1)
 *   retrieval_confidence    → mean(final_scores) × (1 if valid, 0.6 if broadened)
 *   citation_integrity_score→ 1.0 if all cited; (1 - penalty) if uncited claims
 *
 * ─── Why These Weights ──────────────────────────────────────────────────────
 *
 *   Topic (0.4): If you retrieve the wrong topic, nothing downstream matters.
 *     The highest weight reflects that topic routing is the first failure mode.
 *
 *   Retrieval (0.4): Equal weight to topic. Correct topic + low-similarity chunks
 *     is still a garbage context. Both gates must pass for a useful response.
 *
 *   Citation (0.2): Lower weight because citation failure ≠ knowledge failure.
 *     A correct answer without citation is degraded, not wrong. Penalise, don't slam.
 *
 * ─── Confidence Tiers ───────────────────────────────────────────────────────
 *
 *   ≥ 0.85  → HIGH    🟢  Safe to show to user without qualification
 *   ≥ 0.65  → MEDIUM  🟡  Show with "Verify against textbook" advisory
 *   < 0.65  → LOW     🔴  Flag for manual review; do not use in SM-2 scoring
 *
 * ─── Interface Contract ─────────────────────────────────────────────────────
 *
 *   compute(inputs) → ConfidenceReport
 *
 *   ConfidenceReport: {
 *     topic_confidence:     number,   // raw scorer output
 *     retrieval_confidence: number,   // derived from retrieval telemetry
 *     citation_integrity:   number,   // derived from citation result
 *     final_confidence:     number,   // weighted composite
 *     tier:                 string,   // 'HIGH' | 'MEDIUM' | 'LOW'
 *     tier_label:           string,   // human-readable with emoji
 *     components:           object,   // breakdown for debugging/UI
 *     flags:                string[]  // active degradation reasons
 *   }
 */

// Weights — must sum to 1.0
const WEIGHTS = {
    topic: 0.4,
    retrieval: 0.4,
    citation: 0.2
};

// Broadening penalty: when context was only achievable by widening filters,
// the retrieval is less precise — penalise retrieval confidence.
const BROADENING_PENALTY = 0.15;

// Tiers
const TIERS = [
    { min: 0.85, tier: 'HIGH', label: '🟢 High Confidence' },
    { min: 0.65, tier: 'MEDIUM', label: '🟡 Moderate Confidence' },
    { min: 0.00, tier: 'LOW', label: '🔴 Needs Review' }
];

class ConfidenceEngine {

    /**
     * Compute the composite confidence report.
     *
     * @param {object} inputs
     * @param {object} inputs.topicResult     - From TopicConfidenceScorer.scoreQuery()
     * @param {object} inputs.retrievalTelemetry - From RAGService.retrieveContext() telemetry
     * @param {object} inputs.citationResult  - From CitationVerifier.verifyStructuredClaims()
     * @param {boolean} inputs.schemaFailed   - True if Stage 8 blocked the response
     * @returns {ConfidenceReport}
     */
    compute({ topicResult, retrievalTelemetry, citationResult, schemaFailed = false }) {
        const flags = [];

        if (schemaFailed) {
            flags.push('SCHEMA_VALIDATION_FAILED');
        }

        // ─── Component 1: Topic Confidence ──────────────────────────────────
        const topicConf = Math.max(0, Math.min(1, topicResult.confidence || 0));
        if (topicConf < 0.75) flags.push('LOW_TOPIC_CONFIDENCE');
        if (topicResult.method === 'keyword_v1' && topicConf < 0.85) {
            flags.push('KEYWORD_CLASSIFIER_RISK'); // embedding upgrade needed
        }

        // ─── Component 2: Retrieval Confidence ──────────────────────────────
        // Base: mean of all final (reranked) scores
        const finalScores = retrievalTelemetry.final_scores || [];
        const meanFinal = finalScores.length > 0
            ? finalScores.reduce((s, v) => s + v, 0) / finalScores.length
            : 0;

        // Validation gate multiplier: validated=1.0, broadened=0.6, invalid=0.4
        let validationMultiplier = 1.0;
        if (retrievalTelemetry.broadened) { validationMultiplier = 0.60; flags.push('RETRIEVAL_BROADENED'); }
        else if (!retrievalTelemetry.validation_passed) { validationMultiplier = 0.40; flags.push('RETRIEVAL_LOW_SIMILARITY'); }

        const retrievalConf = Math.max(0, Math.min(1, meanFinal * validationMultiplier));
        if (retrievalConf < 0.65) flags.push('LOW_RETRIEVAL_CONFIDENCE');

        // ─── Component 3: Citation Integrity Score ───────────────────────────
        // 1.0 if all citations verified, proportionally reduced if uncited/hallucinated
        let citationScore = 1.0;
        if (citationResult.hallucinated && citationResult.hallucinated.length > 0) {
            citationScore -= (0.15 * citationResult.hallucinated.length); // 0.15 per hallucination
            flags.push('HALLUCINATED_CITATIONS');
        }
        if (citationResult.uncited_claims) {
            citationScore -= 0.25; // matches UNCITED_CONFIDENCE_PENALTY in citationVerifier
            flags.push('UNCITED_CLAIMS');
        }
        citationScore = Math.max(0, Math.min(1, citationScore));

        // ─── Composite Score ─────────────────────────────────────────────────
        let finalConfidence = parseFloat((
            (WEIGHTS.topic * topicConf) +
            (WEIGHTS.retrieval * retrievalConf) +
            (WEIGHTS.citation * citationScore)
        ).toFixed(4));

        if (schemaFailed) {
            finalConfidence = Math.min(finalConfidence, 0.60); // force LOW tier
            console.warn(`[CONFIDENCE] Stage 8 schema validation failed. Confidence penalised to ${finalConfidence}.`);
        }

        // ─── Tier Classification ─────────────────────────────────────────────
        const { tier, label } = TIERS.find(t => finalConfidence >= t.min);

        const report = {
            topic_confidence: parseFloat(topicConf.toFixed(4)),
            retrieval_confidence: parseFloat(retrievalConf.toFixed(4)),
            citation_integrity: parseFloat(citationScore.toFixed(4)),
            final_confidence: finalConfidence,
            tier: tier,
            tier_label: label,
            components: {
                topic_raw: topicConf,
                topic_weighted: parseFloat((WEIGHTS.topic * topicConf).toFixed(4)),
                retrieval_raw: parseFloat(meanFinal.toFixed(4)),
                retrieval_weighted: parseFloat((WEIGHTS.retrieval * retrievalConf).toFixed(4)),
                citation_raw: parseFloat(citationScore.toFixed(4)),
                citation_weighted: parseFloat((WEIGHTS.citation * citationScore).toFixed(4)),
                weights: { ...WEIGHTS }
            },
            flags: flags
        };

        console.log(
            `[CONFIDENCE] final=${finalConfidence} tier=${tier} ` +
            `[topic=${topicConf.toFixed(2)} retrieval=${retrievalConf.toFixed(2)} citation=${citationScore.toFixed(2)}]` +
            (flags.length > 0 ? ` flags=[${flags.join(',')}]` : '')
        );

        return report;
    }

    /**
     * Quick helper: is this response safe to surface in the UI without qualification?
     */
    isSafe(report) {
        return report.tier === 'HIGH';
    }

    /**
     * Quick helper: does this response need the "Verify with textbook" advisory?
     */
    needsAdvisory(report) {
        return report.tier === 'MEDIUM';
    }

    /**
     * Quick helper: should this response be blocked from SM-2 scoring?
     * Low confidence answers must not influence student spaced repetition weights.
     */
    blockFromSM2(report) {
        return report.tier === 'LOW';
    }
}

module.exports = new ConfidenceEngine();
