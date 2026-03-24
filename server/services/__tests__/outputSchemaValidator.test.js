const outputSchemaValidator = require('../outputSchemaValidator');

describe('outputSchemaValidator', () => {
  test('rejects responses with fewer than 2 claims', () => {
    const raw = JSON.stringify({
      claims: [{ statement: 'Only one claim here.', chunk_ids: ['X1'] }]
    });
    const result = outputSchemaValidator.validate(raw);
    expect(result.is_valid).toBe(false);
    expect(result.error).toContain('at least 2 claims');
  });

  test('accepts valid structured payload', () => {
    const raw = JSON.stringify({
      claims: [
        { statement: 'First valid medical claim statement.', chunk_ids: ['C1'] },
        { statement: 'Second valid medical claim statement.', chunk_ids: ['C2'] }
      ],
      exam_tips: 'Focus on differential diagnosis.'
    });
    const result = outputSchemaValidator.validate(raw);
    expect(result.is_valid).toBe(true);
  });
});
