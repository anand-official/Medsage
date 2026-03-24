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
});
