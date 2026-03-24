const geminiService = require('../geminiService');

describe('geminiService follow-up detection', () => {
  test('detects short referential follow-up questions', () => {
    expect(geminiService._looksLikeFollowUp('What about this in adults?')).toBe(true);
    expect(geminiService._looksLikeFollowUp('And management?')).toBe(true);
  });

  test('does not mark fully standalone question as follow-up', () => {
    expect(geminiService._looksLikeFollowUp('Explain the pathogenesis of acute pancreatitis in detail.')).toBe(false);
  });
});
