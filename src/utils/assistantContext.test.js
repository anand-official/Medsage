import { buildHistoryForRequest } from './assistantContext';

describe('assistantContext', () => {
  it('keeps recent turns within budget', () => {
    const messages = [
      { role: 'user', text: 'What is inflammation?' },
      { role: 'ai', response: { text: 'Inflammation is a protective response...' } },
      { role: 'user', text: 'How is chronic inflammation different?' },
      { role: 'ai', response: { text: 'Chronic inflammation lasts longer and involves...' } },
    ];

    const history = buildHistoryForRequest(messages, 60);
    expect(history.length).toBeGreaterThan(0);
    expect(history[history.length - 1].content).toContain('lasts longer');
  });

  it('adds salient older context when space remains', () => {
    const messages = [
      { role: 'user', text: 'Differentiate coagulative and liquefactive necrosis with examples.' },
      { role: 'ai', response: { text: 'Coagulative necrosis preserves architecture...' } },
      { role: 'user', text: 'ok' },
      { role: 'ai', response: { text: 'Sure.' } },
    ];

    const history = buildHistoryForRequest(messages, 120);
    expect(history.some((turn) => turn.content.includes('Differentiate coagulative'))).toBe(true);
  });

  it('uses partial answers and claims for AI history turns', () => {
    const messages = [
      { role: 'user', text: 'Explain nephrotic syndrome.' },
      {
        role: 'ai',
        response: {
          type: 'CLARIFICATION',
          text: 'Which age group do you want?',
          partial_answer: 'Nephrotic syndrome is characterized by heavy proteinuria and edema.',
          claims: [
            { text: 'Heavy proteinuria lowers plasma oncotic pressure and drives edema.' },
            { statement: 'Hypoalbuminemia and hyperlipidemia are classic associated findings.' },
          ],
          clinicalRelevance: 'Children often present first with periorbital swelling.',
        },
      },
    ];

    const history = buildHistoryForRequest(messages, 120);
    const aiTurn = history.find((turn) => turn.role === 'ai');

    expect(aiTurn.content).toContain('Partial answer: Nephrotic syndrome is characterized');
    expect(aiTurn.content).toContain('Heavy proteinuria lowers plasma oncotic pressure');
    expect(aiTurn.content).toContain('Clinical note: Children often present first');
    expect(aiTurn.content).not.toContain('Which age group do you want?');
  });

  it('keeps the immediate user anchor turn even when an older assistant turn is longer', () => {
    const messages = [
      { role: 'user', text: 'Explain shock briefly.' },
      { role: 'ai', response: { text: `${'Long recap. '.repeat(80)}Mechanism and classification details.` } },
      { role: 'user', text: 'What about septic shock in pregnancy?' },
      { role: 'ai', response: { text: 'It has distinct hemodynamic and maternal-fetal considerations.' } },
    ];

    const history = buildHistoryForRequest(messages, 150);
    expect(history.some((turn) => turn.role === 'user' && turn.content.includes('septic shock in pregnancy'))).toBe(true);
  });
});
