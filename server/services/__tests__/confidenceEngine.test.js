const confidenceEngine = require('../confidenceEngine');

describe('confidenceEngine', () => {
    test('scores a fully grounded response as high confidence', () => {
        const report = confidenceEngine.compute({
            topicResult: {
                confidence: 0.92,
                method: 'embedding_v1'
            },
            retrievalTelemetry: {
                final_scores: [0.91, 0.87, 0.85],
                broadened: false,
                validation_passed: true
            },
            citationResult: {
                hallucinated: [],
                uncited_claims: false
            },
            schemaFailed: false
        });

        expect(report.final_confidence).toBeGreaterThan(0.85);
        expect(report.tier).toBe('HIGH');
    });

    test('penalizes weak retrieval and uncited claims', () => {
        const report = confidenceEngine.compute({
            topicResult: {
                confidence: 0.68,
                method: 'keyword_v1'
            },
            retrievalTelemetry: {
                final_scores: [0.42, 0.39],
                broadened: true,
                validation_passed: false
            },
            citationResult: {
                hallucinated: ['C999'],
                uncited_claims: true
            },
            schemaFailed: false
        });

        expect(report.tier).toBe('LOW');
        expect(report.flags).toContain('RETRIEVAL_BROADENED');
        expect(report.flags).toContain('UNCITED_CLAIMS');
        expect(report.flags).toContain('HALLUCINATED_CITATIONS');
    });
});
