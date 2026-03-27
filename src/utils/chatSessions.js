const MESSAGE_TIME_FORMAT = { hour: '2-digit', minute: '2-digit' };

function coerceTimestampMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function buildAiMeta(message) {
  const confidence = message.response?.confidence?.final_confidence;
  const meta = {
    topic_id: message.topicId || message.response?.topicId || null,
    subject: message.subject || message.response?.subject || null,
    confidence: Number.isFinite(confidence) ? confidence : null,
    pipeline: message.response?.pipeline || null,
  };

  return Object.fromEntries(Object.entries(meta).filter(([, value]) => value !== null && value !== ''));
}

export function formatMessageTimestamp(timestampMs) {
  return new Date(coerceTimestampMs(timestampMs)).toLocaleTimeString([], MESSAGE_TIME_FORMAT);
}

export function createChatTimestamp(now = Date.now()) {
  const timestampMs = coerceTimestampMs(now);
  return {
    timestamp: formatMessageTimestamp(timestampMs),
    timestampMs,
  };
}

export function serializeSessionMessages(messages = []) {
  return messages
    .filter((message) => message && (message.role === 'user' || message.role === 'ai'))
    .map((message) => {
      const timestamp = coerceTimestampMs(message.timestampMs ?? message.timestamp);
      const text = message.role === 'ai'
        ? (message.response?.text || message.text || '')
        : (message.text || '');

      if (message.role !== 'ai') {
        return { role: message.role, text, timestamp };
      }

      const meta = buildAiMeta(message);
      return Object.keys(meta).length > 0
        ? { role: 'ai', text, timestamp, meta }
        : { role: 'ai', text, timestamp };
    });
}

export function hydrateSessionMessages(messages = []) {
  return messages
    .filter((message) => message && typeof message === 'object')
    .map((message) => {
      const timestampMs = coerceTimestampMs(message.timestampMs ?? message.timestamp);
      const timestamp = formatMessageTimestamp(timestampMs);

      if (message.role === 'ai') {
        if (message.response) {
          return {
            ...message,
            timestamp,
            timestampMs,
          };
        }

        const confidence = Number.isFinite(message.meta?.confidence)
          ? { final_confidence: message.meta.confidence }
          : null;

        return {
          role: 'ai',
          text: message.text || '',
          timestamp,
          timestampMs,
          response: {
            text: message.text || '',
            type: 'ANSWER',
            confidence,
            pipeline: message.meta?.pipeline || null,
          },
          topicId: message.meta?.topic_id || null,
          subject: message.meta?.subject || null,
        };
      }

      return {
        ...message,
        text: message.text || '',
        timestamp,
        timestampMs,
      };
    });
}
