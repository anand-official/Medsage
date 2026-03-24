const topicConfidenceScorer = require('../topicConfidenceScorer');

describe('topicConfidenceScorer', () => {
  test('matches strong keyword rules', () => {
    const result = topicConfidenceScorer.scoreQuery('Explain the mechanism of acute inflammation.');
    expect(result.matched).toBe(true);
    expect(result.subject).toBe('Pathology');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('uses semantic fallback for weak keyword queries', () => {
    const result = topicConfidenceScorer.scoreQuery('How do thought disorder patterns influence cognition in mental illness?');
    expect(result.matched).toBe(true);
    expect(result.method).toBe('semantic_fallback_v1');
    expect(result.subject).toBe('Psychiatry');
  });
});
