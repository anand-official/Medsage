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

function buildResponseSnapshot(response = {}) {
  if (!response || typeof response !== 'object') return null;

  const snapshot = {
    type: response.type || 'ANSWER',
    text: response.text || '',
    keyPoints: Array.isArray(response.keyPoints) ? response.keyPoints : [],
    clinicalRelevance: response.clinicalRelevance || '',
    bookReferences: Array.isArray(response.bookReferences) ? response.bookReferences : [],
    followUpOptions: Array.isArray(response.followUpOptions) ? response.followUpOptions : [],
    confidence: response.confidence || null,
    trust: response.trust || null,
    flags: Array.isArray(response.flags) ? response.flags : [],
    verified: Boolean(response.verified),
    verificationLevel: response.verificationLevel || null,
    pipeline: response.pipeline || null,
    log_id: response.log_id || null,
    claims: Array.isArray(response.claims) ? response.claims : null,
    allClaimsSourced: response.allClaimsSourced ?? null,
    partial_answer: response.partial_answer || null,
  };

  return Object.fromEntries(Object.entries(snapshot).filter(([, value]) => {
    if (value === null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }));
}

function buildConfidenceSnapshot(responseConfidence, metaConfidence) {
  if (responseConfidence && typeof responseConfidence === 'object') {
    return responseConfidence;
  }

  return Number.isFinite(metaConfidence)
    ? { final_confidence: metaConfidence }
    : null;
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
      const response = buildResponseSnapshot(message.response);
      const base = { role: 'ai', text, timestamp };

      if (Object.keys(meta).length > 0) {
        base.meta = meta;
      }
      if (response && Object.keys(response).length > 0) {
        base.response = response;
      }

      return base;
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
          const confidence = buildConfidenceSnapshot(
            message.response.confidence,
            message.meta?.confidence
          );

          return {
            role: 'ai',
            text: message.response.text || message.text || '',
            response: {
              type: message.response.type || 'ANSWER',
              text: message.response.text || message.text || '',
              keyPoints: message.response.keyPoints || [],
              clinicalRelevance: message.response.clinicalRelevance || '',
              bookReferences: message.response.bookReferences || [],
              followUpOptions: message.response.followUpOptions || [],
              confidence,
              trust: message.response.trust || null,
              flags: message.response.flags || [],
              verified: Boolean(message.response.verified),
              verificationLevel: message.response.verificationLevel || null,
              pipeline: message.response.pipeline || message.meta?.pipeline || null,
              log_id: message.response.log_id || null,
              claims: message.response.claims || null,
              allClaimsSourced: message.response.allClaimsSourced ?? null,
              partial_answer: message.response.partial_answer || null,
            },
            topicId: message.meta?.topic_id || message.topicId || null,
            subject: message.meta?.subject || message.subject || null,
            meta: message.meta || undefined,
            timestamp,
            timestampMs,
          };
        }

        const confidence = buildConfidenceSnapshot(null, message.meta?.confidence);

        return {
          role: 'ai',
          text: message.text || '',
          timestamp,
          timestampMs,
          response: {
            text: message.text || '',
            type: 'ANSWER',
            keyPoints: [],
            clinicalRelevance: '',
            bookReferences: [],
            followUpOptions: [],
            confidence,
            trust: null,
            flags: [],
            verified: false,
            verificationLevel: null,
            pipeline: message.meta?.pipeline || null,
            claims: null,
            allClaimsSourced: null,
            partial_answer: null,
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
