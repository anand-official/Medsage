import axios from 'axios';
import { getApiBaseUrl } from '../config/apiBase';
import { clearAuthToken, getAuthToken } from '../utils/authStorage';

const API_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function getResponseRequestId(response) {
  return response?.headers?.['x-request-id'] || response?.data?.requestId || null;
}

function getFetchResponseRequestId(response, payload = null) {
  return response?.headers?.get?.('x-request-id') || payload?.requestId || null;
}

function createApiError({
  message,
  statusCode,
  requestId = null,
  retryable = false,
  endpoint = '',
}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.requestId = requestId;
  err.retryable = retryable;
  err.endpoint = endpoint;
  return err;
}

export function formatRequestIdLabel(requestId) {
  return requestId ? `Request ID: ${requestId}` : '';
}

function splitEndpointAndQuery(endpoint) {
  const [path, query = ''] = endpoint.split('?');
  return {
    path,
    suffix: query ? `?${query}` : '',
  };
}

function getLegacyEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.startsWith('/')) return null;

  const { path, suffix } = splitEndpointAndQuery(endpoint);

  if (path === '/api/v1/auth') {
    return `/auth${suffix}`;
  }

  if (path.startsWith('/api/v1/auth/')) {
    return `${path.replace('/api/v1/auth/', '/auth/')}${suffix}`;
  }

  if (path.startsWith('/api/v1/')) {
    return `${path.replace('/api/v1/', '/api/')}${suffix}`;
  }

  return null;
}

function shouldRetryWithLegacyContract(error) {
  const status = error?.response?.status;
  const originalUrl = error?.config?.url;
  return status === 404 && !error?.config?._legacyRetried && Boolean(getLegacyEndpoint(originalUrl));
}

async function fetchWithLegacyFallback(endpoint, init = {}) {
  const baseUrl = getApiBaseUrl();
  const candidates = [endpoint, getLegacyEndpoint(endpoint)].filter(Boolean);
  let lastResponse = null;

  for (const candidate of candidates) {
    const response = await fetch(`${baseUrl}${candidate}`, init);
    if (response.status === 404 && candidate !== candidates[candidates.length - 1]) {
      lastResponse = response;
      continue;
    }
    return response;
  }

  return lastResponse;
}

async function parseFetchPayload(response) {
  const contentType = response?.headers?.get?.('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeApiErrorMessage(payload, fallbackStatusText, statusCode) {
  const pickMessage = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value.map((item) => pickMessage(item)).filter(Boolean).join('; ');
    }
    if (typeof value === 'object') {
      return (
        pickMessage(value.error) ||
        pickMessage(value.message) ||
        pickMessage(value.msg) ||
        pickMessage(value.errors)
      );
    }
    return '';
  };

  return pickMessage(payload) || fallbackStatusText || `HTTP ${statusCode}`;
}

// Add request interceptor to attach Google ID token on every request.
// The UID is NOT sent as a header, the backend decodes it from the token.
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldRetryWithLegacyContract(error)) {
      const legacyUrl = getLegacyEndpoint(error.config.url);
      if (legacyUrl) {
        return api.request({
          ...error.config,
          url: legacyUrl,
          _legacyRetried: true,
        });
      }
    }

    if (error.response?.status === 401) {
      error.requestId = getResponseRequestId(error.response);
      clearAuthToken();
      // Use replace() so the protected page doesn't land in the browser history,
      // preventing the back-button from cycling back to an unauthenticated state.
      window.location.replace('/signin');
    }

    return Promise.reject(error);
  }
);

// Helper function to make API calls, attaches Google ID token when available
export const apiCall = async (endpoint, options = {}) => {
  try {
    const token = getAuthToken();
    const response = await api({
      url: endpoint,
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      signal: options.signal
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const requestId = getResponseRequestId(error.response);
      const message = normalizeApiErrorMessage(error.response.data, error.response.statusText, status);
      throw createApiError({
        message,
        statusCode: status,
        requestId,
        retryable: status >= 500,
        endpoint,
      });
    }

    throw createApiError({
      message: error.message || 'Network error - check your connection and try again.',
      statusCode: error.statusCode,
      requestId: error.requestId || null,
      retryable: true,
      endpoint,
    });
  }
};

// Auth API calls
export const authAPI = {
  createOrUpdateUser: async (userData) => {
    return apiCall('/api/v1/auth/user', {
      method: 'POST',
      data: userData
    });
  },

  getUserProfile: async () => {
    return apiCall('/api/v1/auth/profile');
  },

  updateProfile: async (profileData) => {
    return apiCall('/api/v1/auth/profile', {
      method: 'PUT',
      data: profileData
    });
  },

  updatePreferences: async (preferences) => {
    return apiCall('/api/v1/auth/preferences', {
      method: 'PUT',
      data: preferences
    });
  },

  deleteAccount: () => apiCall('/api/v1/auth/profile', { method: 'DELETE' }),
};

export const systemAPI = {
  getHealthStatus: async () => {
    try {
      const response = await fetchWithLegacyFallback('/healthz', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const payload = await parseFetchPayload(response);
      const requestId = getFetchResponseRequestId(response, payload);

      if (!response.ok) {
        throw createApiError({
          message: normalizeApiErrorMessage(payload, response.statusText, response.status),
          statusCode: response.status,
          requestId,
          retryable: response.status >= 500,
          endpoint: '/healthz',
        });
      }

      return {
        data: payload,
        statusCode: response.status,
        requestId,
      };
    } catch (error) {
      if (error.statusCode || error.requestId) {
        throw error;
      }

      throw createApiError({
        message: error.message || 'Failed to reach the API health endpoint.',
        retryable: true,
        endpoint: '/healthz',
      });
    }
  },
};

export const fetchMedicalQuery = async (query, mode = 'conceptual', syllabus = 'Indian MBBS', history = [], imageBase64 = null, signal = null, subject = null) => {
  const response = await apiCall('/api/v1/medical/query', {
    method: 'POST',
    data: {
      message: query,
      mode,
      syllabus,
      history,
      ...(imageBase64 ? { imageBase64 } : {}),
      ...(subject ? { subject } : {}),
    },
    signal
  });

  if (!response || typeof response !== 'object') {
    throw createApiError({
      message: 'The server returned an empty response. Please try again.',
      endpoint: '/api/v1/medical/query',
    });
  }
  if (response.success === false) {
    const serverMsg = response.error || response.errors?.[0]?.msg;
    throw createApiError({
      message: serverMsg || 'The server could not process your question. Please try again.',
      statusCode: response.statusCode,
      requestId: response.requestId || null,
      endpoint: '/api/v1/medical/query',
    });
  }
  if (!response.data && !response.text && !response.answer) {
    throw createApiError({
      message: 'The server returned an incomplete response. Please try again.',
      endpoint: '/api/v1/medical/query',
    });
  }

  const payload = response?.data ?? response ?? {};
  const responseType = payload?.type || 'ANSWER';

  return {
    success: Boolean(response?.success ?? true),
    type: responseType,
    data: {
      type: responseType,
      text: payload?.text || payload?.answer || payload?.short_note || '',
      keyPoints: payload?.keyPoints || payload?.high_yield_summary || payload?.key_bullets || [],
      clinicalRelevance: payload?.clinicalRelevance || payload?.clinical_correlation || payload?.exam_tips || '',
      citations: payload?.citations || payload?.bookReferences || [],
      bookReferences: payload?.bookReferences || payload?.citations || [],
      followUpOptions: payload?.followUpOptions || [],
      confidence: payload?.confidence || null,
      trust: payload?.trust || null,
      flags: payload?.flags || payload?.trust?.flags || [],
      verified: Boolean(payload?.verified ?? payload?.trust?.verified),
      verificationLevel: payload?.verificationLevel || payload?.trust?.verification_level || null,
      pipeline: payload?.pipeline || payload?.trust?.pipeline || payload?.meta?.pipeline || null,
      meta: payload?.meta || {},
      topicId: payload?.topicId || payload?.meta?.topic_id || null,
      subject: payload?.subject || payload?.meta?.subject || null,
      timestamp: payload?.timestamp || new Date().toISOString(),
      feedback_id: payload?.feedback_id || payload?.log_id || null,
      public_log_id: payload?.public_log_id || payload?.log_id || null,
      answerMode: payload?.answerMode || payload?.answer_mode || null,
      threadMode: payload?.threadMode || payload?.thread_mode || null,
      claims: payload?.claims || null,
      allClaimsSourced: payload?.allClaimsSourced ?? null,
      partial_answer: payload?.partial_answer || null,
    }
  };
};

/**
 * Fetch a paginated page of messages for a saved session.
 * page=1 is the oldest batch; higher pages are more recent.
 * Use limit=200 to fetch the full session in one shot (server cap).
 */
export const fetchSessionMessages = async (sessionId, page = 1, limit = 50) => {
  const response = await api.get(
    `/api/v1/chat/sessions/${sessionId}?page=${page}&limit=${limit}`
  );
  return response.data;
};

export const submitFeedback = async (feedbackId, rating) => {
  return apiCall('/api/v1/audit/feedback', {
    method: 'POST',
    data: { feedback_id: feedbackId, rating },
  });
};

/**
 * streamMedicalQuery - streams Cortex tokens via SSE.
 *
 * @param {string} query
 * @param {object} options
 * @param {function} onToken
 * @param {function} onDone
 * @param {function} onError
 * @param {AbortSignal} signal
 */
export const streamMedicalQuery = async (query, options = {}, onToken, onDone, onError, signal = null) => {
  const { mode = 'conceptual', history = [], subject = null, onStart = null } = options;

  const storedToken = getAuthToken();
  const authHeader = storedToken ? `Bearer ${storedToken}` : '';

  const response = await fetchWithLegacyFallback('/api/v1/medical/query/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify({
      message: query,
      mode,
      history: (history || []).slice(-20),
      ...(subject ? { subject } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      window.location.replace('/signin');
      return;
    }
    if (onError) onError(new Error(`HTTP ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let tokenBuffer = '';
  let currentEvent = 'message';
  let doneSignaled = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim() || 'message';
        } else if (line.startsWith('data: ')) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (currentEvent === 'start' && onStart) {
              onStart(payload);
            } else if (currentEvent === 'message' && payload.token && onToken) {
              tokenBuffer += payload.token;
              onToken(payload.token);
            } else if (currentEvent === 'error' && onError) {
              onError(new Error(payload.message || 'Stream error from server'));
            }
          } catch (_) {
            // skip malformed events
          }
        } else if (!line.trim()) {
          if (currentEvent === 'done' && onDone && !doneSignaled) {
            doneSignaled = true;
            onDone();
          }
          currentEvent = 'message';
        }
      }
    }
    if (onDone && !doneSignaled) onDone();
  } catch (err) {
    if (err.name === 'AbortError') return;
    if (tokenBuffer && onToken) {
      onToken('\n\n... (stream interrupted)');
    }
    if (onError) onError(err);
  }
};

export default api;
