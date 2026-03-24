const {
    applyTrustMetadata,
    buildTrustMetadata,
} = require('../cortexResponsePolicy');

describe('cortexResponsePolicy', () => {
    test('builds verified trust metadata for grounded answers', () => {
        const trust = buildTrustMetadata({
            pipeline: 'full_rag',
            confidence: {
                tier: 'HIGH',
                tier_label: 'High confidence',
                final_confidence: 0.92,
                flags: ['LOW_RETRIEVAL_CONFIDENCE']
            },
            citationCount: 3,
            sourcedClaimsCount: 3,
        });

        expect(trust.verified).toBe(true);
        expect(trust.verification_level).toBe('verified');
        expect(trust.pipeline).toBe('full_rag');
        expect(trust.confidence_score).toBe(0.92);
        expect(trust.citation_count).toBe(3);
    });

    test('applies degraded trust metadata to ungrounded direct answers', () => {
        const response = applyTrustMetadata({
            answer: 'Fallback answer',
            confidence: {
                tier: 'MEDIUM',
                tier_label: 'Moderate confidence',
                final_confidence: 0.61,
                flags: []
            },
            meta: {
                pipeline: 'direct_no_chunks',
                citation_count: 0,
                sourced_claims_count: 0,
            }
        }, {
            pipeline: 'direct_no_chunks',
            flags: ['NO_GROUNDED_CONTEXT']
        });

        expect(response.trust.verified).toBe(false);
        expect(response.trust.verification_level).toBe('degraded');
        expect(response.trust.flags).toContain('NO_GROUNDED_CONTEXT');
        expect(response.meta.trust.status_label).toBe('Grounding unavailable');
    });
});
