describe('topicConfidenceScorer scoreQueryAdvanced', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test('upgrades ambiguous queries with embedding-based subject routing', async () => {
        jest.doMock('../embeddingService', () => ({
            getEmbedding: jest.fn().mockResolvedValue([0, 1]),
            getEmbeddings: jest.fn().mockResolvedValue([
                [1, 0],
                [1, 0],
                [1, 0],
                [1, 0],
                [1, 0],
                [1, 0],
                [1, 0],
                [1, 0],
                [0, 1],
                [1, 0],
                [1, 0],
                [1, 0],
            ]),
        }));

        const scorer = require('../topicConfidenceScorer');
        const result = await scorer.scoreQueryAdvanced('Formal thought disorder and psychosis overview');

        expect(result.method).toBe('embedding_v1');
        expect(result.subject).toBe('Psychiatry');
        expect(result.matched).toBe(true);
    });
});
