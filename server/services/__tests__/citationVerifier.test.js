const citationVerifier = require('../citationVerifier');

describe('citationVerifier', () => {
    test('keeps valid chunk ids and strips hallucinated ids', () => {
        const parsedJson = {
            claims: [
                {
                    statement: 'Acute inflammation recruits neutrophils early.',
                    chunk_ids: ['C1', 'BAD_ID']
                }
            ]
        };

        const result = citationVerifier.verifyStructuredClaims(parsedJson, [
            {
                chunk_id: 'C1',
                book: 'Robbins',
                edition: '10th',
                section_heading: 'Inflammation',
                subsection_heading: 'Acute inflammation',
                page_start: 10,
                page_end: 11
            }
        ], 0.9);

        expect(result.claims[0].is_sourced).toBe(true);
        expect(result.claims[0].chunk_ids).toEqual(['C1']);
        expect(result.hallucinated).toEqual(['BAD_ID']);
        expect(result.citation_count).toBe(1);
    });

    test('requests a retry when all claims lose their citations', () => {
        const parsedJson = {
            claims: [
                {
                    statement: 'Unsupported claim one.',
                    chunk_ids: ['BAD_1']
                },
                {
                    statement: 'Unsupported claim two.',
                    chunk_ids: ['BAD_2']
                }
            ]
        };

        const result = citationVerifier.verifyStructuredClaims(parsedJson, [], 0.8);

        expect(result.needs_retry).toBe(true);
        expect(result.uncited_claims).toBe(true);
        expect(result.citation_count).toBe(0);
    });
});
