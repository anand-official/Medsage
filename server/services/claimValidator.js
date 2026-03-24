/**
 * Claim Validator — lexical similarity stage (runs after CitationVerifier).
 *
 * Structural citation verification (CitationVerifier) confirms that the
 * chunk_id cited by the LLM actually exists in the retrieval payload.
 * This stage goes further: it checks whether the *content* of the cited
 * chunk lexically supports the *content* of the claim.
 *
 * ─── Algorithm ───────────────────────────────────────────────────────────────
 *
 *   1. For each sourced claim, tokenise the claim statement and the text of
 *      every chunk it cites (section heading + body content).
 *   2. Build term-frequency (TF) vectors for both sides.
 *   3. Compute cosine similarity between the two TF vectors.
 *   4. Take the best (maximum) similarity across all cited chunks.
 *   5. Flag the claim as LOW_SIMILARITY if best_sim < SIMILARITY_THRESHOLD.
 *
 * ─── Threshold Rationale ────────────────────────────────────────────────────
 *
 *   TF cosine between a SHORT claim (~10 terms) and a LONG textbook paragraph
 *   (~150–300 terms) is asymmetrically low even when the claim IS supported —
 *   the chunk's many unique non-claim terms inflate the denominator. A raw
 *   threshold of 0.7 (appropriate for same-length document pairs) would flag
 *   virtually every valid claim as unsupported.
 *
 *   Default: 0.25 — calibrated for the claim-vs-chunk length asymmetry.
 *   Override via CLAIM_SIMILARITY_THRESHOLD env var.
 *
 * ─── Confidence Impact ───────────────────────────────────────────────────────
 *
 *   similarity_penalty = CLAIM_SIMILARITY_PENALTY × (unvalidated / total)
 *
 *   Applied additively in cortexOrchestrator after confidenceEngine.compute().
 *   Default penalty weight: 0.10. Override via CLAIM_SIMILARITY_PENALTY.
 */

const SIMILARITY_THRESHOLD = parseFloat(process.env.CLAIM_SIMILARITY_THRESHOLD || '0.25');
const SIMILARITY_PENALTY   = parseFloat(process.env.CLAIM_SIMILARITY_PENALTY   || '0.10');

// Common English + basic medical stopwords that carry no discriminative weight
const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'this', 'that', 'these', 'those', 'it', 'its', 'as', 'if', 'then',
    'than', 'so', 'such', 'both', 'each', 'more', 'most', 'other', 'some',
    'any', 'all', 'can', 'also', 'not', 'no', 'its', 'which', 'who', 'when',
    'where', 'how', 'what', 'their', 'they', 'them', 'there', 'here', 'thus',
    'due', 'via', 'per', 'i.e', 'e.g', 'vs', 'etc'
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenize(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function buildTermFreq(tokens) {
    const freq = {};
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
    return freq;
}

/**
 * Standard TF cosine similarity between two term-frequency maps.
 * Returns a value in [0, 1].
 */
function cosineSimilarity(freqA, freqB) {
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (const [term, countA] of Object.entries(freqA)) {
        magA += countA * countA;
        if (freqB[term]) dot += countA * freqB[term];
    }
    for (const countB of Object.values(freqB)) magB += countB * countB;

    if (magA === 0 || magB === 0) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ─── ClaimValidator ───────────────────────────────────────────────────────────

class ClaimValidator {
    /**
     * Build a chunk_id → content text lookup from the parallel arrays returned
     * by RAGService.retrieveContext().
     *
     * @param {string[]} chunks        - retrieval.chunks  (content text, indexed)
     * @param {object[]} chunkPayloads - retrieval.chunk_payloads (metadata, same order)
     * @returns {object} Map of chunk_id → content string
     */
    buildChunkTextIndex(chunks, chunkPayloads) {
        const index = {};
        for (let i = 0; i < chunkPayloads.length; i++) {
            const id = chunkPayloads[i]?.chunk_id;
            if (id && chunks[i]) {
                index[id] = chunks[i];
            }
        }
        return index;
    }

    /**
     * Validate each claim against its cited chunks via TF cosine similarity.
     *
     * @param {object[]} claims        - Verified claims from CitationVerifier
     * @param {object}   chunkTextIndex - chunk_id → content text (from buildChunkTextIndex)
     * @returns {{ claim_validation: object[], unvalidated_count: number, similarity_penalty: number }}
     */
    validateClaims(claims, chunkTextIndex) {
        let unvalidatedCount = 0;

        const claimValidation = claims.map((claim, idx) => {
            // Uncited claims are already penalised by CitationVerifier; mark and skip
            if (!claim.is_sourced || !claim.citations || claim.citations.length === 0) {
                return {
                    claim_index:       idx,
                    statement_preview: (claim.statement || '').substring(0, 80),
                    similarity:        0,
                    best_chunk_id:     null,
                    validated:         false,
                    reason:            'NO_CITATION',
                };
            }

            const claimFreq = buildTermFreq(tokenize(claim.statement));

            let bestSim     = 0;
            let bestChunkId = null;

            for (const citation of claim.citations) {
                const chunkId   = citation?.chunk_id;
                const chunkBody = chunkId ? chunkTextIndex[chunkId] : null;
                if (!chunkBody) continue;

                // Concatenate heading fields with body for a richer comparison surface
                const fullText = [
                    citation.section_heading    || '',
                    citation.subsection_heading || '',
                    chunkBody,
                ].join(' ');

                const sim = cosineSimilarity(claimFreq, buildTermFreq(tokenize(fullText)));
                if (sim > bestSim) {
                    bestSim     = sim;
                    bestChunkId = chunkId;
                }
            }

            const validated = bestSim >= SIMILARITY_THRESHOLD;
            if (!validated) {
                unvalidatedCount++;
                console.warn(
                    `[CLAIM VALIDATOR] Low similarity (${bestSim.toFixed(3)} < ${SIMILARITY_THRESHOLD}) ` +
                    `for claim[${idx}]: "${(claim.statement || '').substring(0, 60)}..."`
                );
            }

            return {
                claim_index:       idx,
                statement_preview: (claim.statement || '').substring(0, 80),
                similarity:        parseFloat(bestSim.toFixed(4)),
                best_chunk_id:     bestChunkId,
                validated,
                reason:            validated ? 'OK' : 'LOW_SIMILARITY',
            };
        });

        // Penalty is proportional to the unvalidated fraction, capped at SIMILARITY_PENALTY
        const totalClaims         = claims.length;
        const unvalidatedFraction = totalClaims > 0 ? unvalidatedCount / totalClaims : 0;
        const similarityPenalty   = parseFloat((SIMILARITY_PENALTY * unvalidatedFraction).toFixed(4));

        return {
            claim_validation:  claimValidation,
            unvalidated_count: unvalidatedCount,
            similarity_penalty: similarityPenalty,
        };
    }
}

module.exports = new ClaimValidator();
