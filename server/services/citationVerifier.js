/**
 * Citation Verifier — Stage 10 of the 11-stage pipeline.
 *
 * Strategy: Fully Structured Output Enforcement + Auto-Retry
 *
 * Flow:
 *  1. LLM output has already passed Stage 8 (Schema Validation), ensuring 
 *     we have a valid `claims` array where each has a `statement` and `chunk_ids`.
 *  2. For every chunk_id asserted, we verify it exists in the retrieval payload.
 *  3. Invalid/hallucinated IDs are stripped.
 *  4. Any claim left with zero valid citations triggers Strategy D (downgrade confidence).
 *  5. [NEW v2.0] If ALL claims fail citation, we flag for retry with corrective prompt.
 *
 * This guarantees structural citation integrity and completely eliminates 
 * the brittle regex pattern matching of previous iterations.
 */

const UNCITED_CONFIDENCE_PENALTY = 0.25;

class CitationVerifier {

    /**
     * Verifies the semantic integrity of structured JSON claims.
     *
     * @param {object}   parsedJson      - Validated JSON from Stage 8 (must have .claims array).
     * @param {Array}    chunkPayloads   - Array of chunk metadata objects from Stage 4.
     * @param {number}   baseConfidence  - Upstream topic classifier confidence (0–1).
     * @returns {CitationReport}
     */
    verifyStructuredClaims(parsedJson, chunkPayloads, baseConfidence = 1.0) {
        const validChunkIds = new Set(chunkPayloads.filter(p => p.chunk_id).map(p => p.chunk_id));
        const citationIndex = {};
        chunkPayloads.forEach(p => { if (p.chunk_id) citationIndex[p.chunk_id] = p; });

        const verifiedClaims = [];
        const hallucinated = [];
        let totalCitations = 0;
        let sourcedCount = 0;

        for (const claim of (parsedJson.claims || [])) {
            const claimIds = claim.chunk_ids || [];
            const validIds = [];
            const invalidIds = [];

            for (const id of claimIds) {
                if (validChunkIds.has(id)) {
                    validIds.push(id);
                } else {
                    invalidIds.push(id);
                }
            }

            if (invalidIds.length > 0) {
                hallucinated.push(...invalidIds);
                console.warn(`[CITATION] Hallucinated IDs stripped from claim: ${invalidIds.join(', ')}`);
            }

            const isSourced = validIds.length > 0;
            if (isSourced) sourcedCount++;

            // Reconstruct the claim with enriched citation metadata
            verifiedClaims.push({
                statement: claim.statement,
                citations: validIds.map(id => citationIndex[id]),
                is_sourced: isSourced,
                chunk_ids: validIds // Preserved for downstream
            });
            totalCitations += validIds.length;
        }

        // Strategy D: Downgrade confidence if any valid claim is unsupported
        const noClaimsAtAll = verifiedClaims.length === 0;
        const uncitedClaims = verifiedClaims.some(c => !c.is_sourced) || noClaimsAtAll;

        // Citation compliance rate (for monitoring)
        const complianceRate = verifiedClaims.length > 0
            ? parseFloat((sourcedCount / verifiedClaims.length).toFixed(4))
            : 0;

        let confidenceScore = baseConfidence;
        if (uncitedClaims) {
            confidenceScore = Math.max(0, baseConfidence - UNCITED_CONFIDENCE_PENALTY);
            console.warn(`[CITATION] Strategy D applied: uncited claims found. Conf downgraded ${baseConfidence.toFixed(2)} → ${confidenceScore.toFixed(2)}. Compliance: ${(complianceRate * 100).toFixed(0)}%`);
        }

        // Flag if retry is needed: ALL claims failed to cite properly
        const needsRetry = verifiedClaims.length > 0 && sourcedCount === 0;

        return {
            verified_response: parsedJson,
            claims: verifiedClaims,
            hallucinated: hallucinated,
            citation_integrity: hallucinated.length === 0,
            uncited_claims: uncitedClaims,
            confidence_score: confidenceScore,
            citation_count: totalCitations,
            compliance_rate: complianceRate,
            needs_retry: needsRetry
        };
    }

    /**
     * Build the citation instruction block injected into the LLM prompt.
     *
     * @param {Array} chunkPayloads
     * @returns {string}
     */
    buildCitationContext(chunkPayloads) {
        const availableIds = chunkPayloads
            .filter(p => p.chunk_id)
            .map(p =>
                `  - [${p.chunk_id}] ${p.book} ${p.edition}, ` +
                `"${p.section_heading} > ${p.subsection_heading}", ` +
                `pp. ${p.page_start}–${p.page_end}`
            );

        if (availableIds.length === 0) {
            return 'No citation sources are available for this query.';
        }

        return [
            'CITATION RULES (strictly enforced — violations cause claim deletion):',
            '  1. You MUST cite at least one source for EVERY factual statement.',
            '  2. Use ONLY the exact chunk_ids listed below — do NOT invent IDs.',
            '  3. Place them ONLY inside the "chunk_ids" array for that specific claim.',
            '  4. chunk_ids: [] means HALLUCINATION — the claim will be DELETED.',
            '  5. If you cannot support a statement, DO NOT include that claim at all.',
            '  6. Your response MUST have at least 3 cited claims.',
            '',
            'AVAILABLE CITATIONS:',
            ...availableIds
        ].join('\n');
    }

    /**
     * Generate a corrective retry prompt for citation failures.
     * Used by geminiService when Stage 10 reports needs_retry=true.
     *
     * @param {string} originalPrompt - The original prompt that was sent
     * @param {Array} chunkPayloads - Available chunk payloads
     * @returns {string}
     */
    buildRetryPrompt(originalPrompt, chunkPayloads) {
        const availableIds = chunkPayloads
            .filter(p => p.chunk_id)
            .map(p => p.chunk_id);

        return [
            'IMPORTANT CORRECTION: Your previous response failed citation verification.',
            'EVERY claim MUST include at least one chunk_id from this list:',
            `  ${availableIds.join(', ')}`,
            '',
            'Please re-answer the question, ensuring every claim has valid chunk_ids.',
            'Claims WITHOUT valid chunk_ids will be DELETED from the final response.',
            '',
            '--- ORIGINAL PROMPT ---',
            originalPrompt
        ].join('\n');
    }
}

module.exports = new CitationVerifier();
