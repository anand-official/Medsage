import axios from 'axios';
import { auth } from '../firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach Firebase UID + token on every request
api.interceptors.request.use(
  async (config) => {
    try {
      const { auth } = await import('../firebase');
      const user = auth.currentUser;
      if (user) {
        config.headers['x-user-id'] = user.uid;
        const token = await user.getIdToken();
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      // Not authenticated — let request go through without headers
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
      localStorage.removeItem('token');
      // Don't force redirect on 401 — let components handle it
    }
    return Promise.reject(error);
  }
);

// Helper function to get the Firebase ID token (optional — returns null if not logged in)
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

// Helper function to make API calls — attaches Firebase token when available
export const apiCall = async (endpoint, options = {}) => {
  try {
    const token = await getAuthToken();
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
      throw new Error(`API error: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
    }
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  createOrUpdateUser: async (userData) => {
    return apiCall('/auth/user', {
      method: 'POST',
      data: userData
    });
  },

  getUserProfile: async () => {
    return apiCall('/auth/profile');
  },

  updateProfile: async (profileData) => {
    return apiCall('/auth/profile', {
      method: 'PUT',
      data: profileData
    });
  },

  updatePreferences: async (preferences) => {
    return apiCall('/auth/preferences', {
      method: 'PUT',
      data: preferences
    });
  },

  deleteAccount: () => apiCall('/auth/profile', { method: 'DELETE' }),
};


export const fetchMedicalQuery = async (query, mode = 'conceptual', syllabus = 'Indian MBBS', history = [], imageBase64 = null, signal = null, subject = null) => {
  const response = await apiCall('/api/medical/query', {
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
      meta: payload?.meta || {},
      topicId: payload?.topicId || payload?.meta?.topic_id || null,
      subject: payload?.subject || payload?.meta?.subject || null,
      timestamp: payload?.timestamp || new Date().toISOString(),
    }
  };
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
  const { mode = 'conceptual', history = [], subject = null } = options;

  // Get Firebase token
  let authHeader = '';
  try {
    const { auth } = await import('../firebase');
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      authHeader = `Bearer ${token}`;
    }
  } catch (e) {
    // proceed without auth header
  }

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const response = await fetch(`${API_URL}/api/medical/query/stream`, {
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
    if (onError) onError(new Error(`HTTP ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.token && onToken) onToken(payload.token);
          } catch (_) { /* skip malformed */ }
        } else if (line.startsWith('event: done')) {
          if (onDone) onDone();
        } else if (line.startsWith('event: error')) {
          if (onError) onError(new Error('Stream error from server'));
        }
      }
    }
    if (onDone) onDone();
  } catch (err) {
    if (err.name !== 'AbortError' && onError) onError(err);
  }
};

export default api;