import axios from 'axios';
import { getApiBaseUrl } from '../config/apiBase';

// Read the Google ID token stored on login
const getStoredToken = () => localStorage.getItem('google_id_token');

const API_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach Google ID token on every request.
// The UID is NOT sent as a header — the backend decodes it from the token.
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear expired/invalid Google ID token and redirect to sign-in
      localStorage.removeItem('google_id_token');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Helper function to make API calls — attaches Google ID token when available
export const apiCall = async (endpoint, options = {}) => {
  try {
    const token = getStoredToken();
    const response = await api({
      url: endpoint,
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      signal: options.signal
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || error.response.statusText || `HTTP ${status}`;
      const err = new Error(`${message}`);
      err.statusCode = status;
      err.retryable = status >= 500; // 5xx errors are worth retrying; 4xx are client errors
      throw err;
    }
    // Network error (no response received)
    const err = new Error(error.message || 'Network error — check your connection and try again.');
    err.retryable = true;
    throw err;
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

  // Guard: server must return a truthy success flag and a data object.
  // Any deviation (null body, missing data, success:false) is surfaced as a
  // user-friendly error so the component can display a fallback message.
  if (!response || typeof response !== 'object') {
    throw new Error('The server returned an empty response. Please try again.');
  }
  if (response.success === false) {
    const serverMsg = response.error || response.errors?.[0]?.msg;
    throw new Error(serverMsg || 'The server could not process your question. Please try again.');
  }
  if (!response.data && !response.text && !response.answer) {
    throw new Error('The server returned an incomplete response. Please try again.');
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
      log_id: payload?.log_id || null,
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
  return response.data; // { success, session: { messages, ... }, pagination }
};

export const submitFeedback = async (logId, rating) => {
  return apiCall('/api/v1/audit/feedback', {
    method: 'POST',
    data: { log_id: logId, rating },
  });
};




/**
 * streamMedicalQuery — streams Cortex tokens via SSE.
 *
 * @param {string}   query      - The medical question
 * @param {object}   options    - { mode, history, subject }
 * @param {function} onToken    - Called with each text chunk as it arrives
 * @param {function} onDone     - Called when stream completes
 * @param {function} onError    - Called on stream error
 * @param {AbortSignal} signal  - Optional AbortController signal to cancel
 */
export const streamMedicalQuery = async (query, options = {}, onToken, onDone, onError, signal = null) => {
  const { mode = 'conceptual', history = [], subject = null, onStart = null } = options;

  // Get stored Google ID token
  const storedToken = getStoredToken();
  const authHeader = storedToken ? `Bearer ${storedToken}` : '';

  const API_URL = getApiBaseUrl();

  const response = await fetch(`${API_URL}/api/v1/medical/query/stream`, {
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
      localStorage.removeItem('google_id_token');
      window.location.href = '/signin';
      return;
    }
    if (onError) onError(new Error(`HTTP ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let tokenBuffer = ''; // accumulates all tokens received so far
  let currentEvent = 'message';
  let doneSignaled = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

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
          } catch (_) { /* skip malformed */ }
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
    // If we buffered partial content, append an interrupted notice before surfacing the error
    if (tokenBuffer && onToken) {
      onToken('\n\n… (stream interrupted)');
    }
    if (onError) onError(err);
  }
};

export default api;
