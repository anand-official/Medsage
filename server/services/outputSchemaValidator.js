/**
 * Stage 8: Output Schema Validator
 * 
 * Enforces the fully structured JSON claim output required by the pipeline.
 * Separates structural integrity (is it valid JSON with the right fields?) 
 * from semantic integrity (are the citations real?), which remains in Stage 10.
 */

class OutputSchemaValidator {
    /**
     * @param {string} rawString 
     * @returns {{ is_valid: boolean, parsed: object, error: string }}
     */
    validate(rawString) {
        if (!rawString || typeof rawString !== 'string') {
            return { is_valid: false, parsed: null, error: 'Empty or non-string output.' };
        }

        let parsed;
        try {
            parsed = JSON.parse(rawString);
        } catch (e) {
            return { is_valid: false, parsed: null, error: 'Output is not valid JSON.' };
        }

        // Structural checks
        if (!parsed.claims || !Array.isArray(parsed.claims)) {
            return { is_valid: false, parsed, error: 'Missing or invalid "claims" array.' };
        }

        if (parsed.claims.length < 2) {
            return { is_valid: false, parsed, error: 'The "claims" array must include at least 2 claims.' };
        }

        for (let i = 0; i < parsed.claims.length; i++) {
            const claim = parsed.claims[i];
            if (!claim.statement || typeof claim.statement !== 'string') {
                return { is_valid: false, parsed, error: `Claim at index ${i} is missing a "statement" string.` };
            }
            if (claim.statement.trim().length < 12) {
                return { is_valid: false, parsed, error: `Claim at index ${i} has an overly short "statement".` };
            }
            if (!claim.chunk_ids || !Array.isArray(claim.chunk_ids)) {
                return { is_valid: false, parsed, error: `Claim at index ${i} is missing a "chunk_ids" array.` };
            }
        }

        return { is_valid: true, parsed, error: null };
    }
}

module.exports = new OutputSchemaValidator();
