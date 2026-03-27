const topicConfidenceScorer = require('../topicConfidenceScorer');

describe('topicConfidenceScorer', () => {
  test('matches strong keyword rules', () => {
    const result = topicConfidenceScorer.scoreQuery('Explain the mechanism of acute inflammation.');
    expect(result.matched).toBe(true);
    expect(result.subject).toBe('Pathology');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('routes psychiatry-style queries to the psychiatry subject', () => {
    const result = topicConfidenceScorer.scoreQuery('How do thought disorder patterns influence cognition in mental illness?');
    expect(result.matched).toBe(true);
    expect(result.subject).toBe('Psychiatry');
    expect(result.confidence).toBeGreaterThanOrEqual(0.55);
  });

  test('does not treat partial word overlaps as keyword matches', () => {
    const result = topicConfidenceScorer.scoreQuery('How do thought patterns change in psychosis?');
    expect(result.subject).not.toBe('ENT');
  });
});
