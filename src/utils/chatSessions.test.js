import {
  createChatTimestamp,
  hydrateSessionMessages,
  serializeSessionMessages,
} from './chatSessions';

describe('chatSessions', () => {
  it('serializes AI replies with text, numeric timestamps, and metadata', () => {
    const { timestamp, timestampMs } = createChatTimestamp(1711641600000);
    const messages = [
      { role: 'user', text: 'What is nephrotic syndrome?', timestamp, timestampMs },
      {
        role: 'ai',
        timestamp,
        timestampMs,
        topicId: 'renal',
        subject: 'Medicine',
        response: {
          text: 'Nephrotic syndrome causes heavy proteinuria.',
          pipeline: 'grounded_rag',
          confidence: { final_confidence: 0.91 },
        },
      },
      { role: 'error', text: 'temporary failure', timestamp, timestampMs },
    ];

    expect(serializeSessionMessages(messages)).toEqual([
      { role: 'user', text: 'What is nephrotic syndrome?', timestamp: 1711641600000 },
      {
        role: 'ai',
        text: 'Nephrotic syndrome causes heavy proteinuria.',
        timestamp: 1711641600000,
        meta: {
          topic_id: 'renal',
          subject: 'Medicine',
          confidence: 0.91,
          pipeline: 'grounded_rag',
        },
      },
    ]);
  });

  it('hydrates stored AI messages back into the UI shape', () => {
    const hydrated = hydrateSessionMessages([
      {
        role: 'ai',
        text: 'Diabetic ketoacidosis requires fluids and insulin.',
        timestamp: 1711641600000,
        meta: {
          topic_id: 'endocrine',
          subject: 'Medicine',
          confidence: 0.88,
          pipeline: 'grounded_rag',
        },
      },
    ]);

    expect(hydrated[0].response.text).toContain('Diabetic ketoacidosis');
    expect(hydrated[0].response.confidence.final_confidence).toBe(0.88);
    expect(hydrated[0].topicId).toBe('endocrine');
    expect(hydrated[0].subject).toBe('Medicine');
    expect(typeof hydrated[0].timestamp).toBe('string');
    expect(hydrated[0].timestampMs).toBe(1711641600000);
  });
});
