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

  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
};

// Study API calls
export const studyAPI = {
  generateStudyPlan: (data) => api.post('/api/study/generate', data),
  getStudyPlan: () => api.get('/api/study/plan'),
  updateStudyPlan: (data) => api.put('/api/study/plan', data),
};

// Questions API calls
export const questionAPI = {
  getQuestions: () => api.get('/api/questions'),
  createQuestion: (data) => api.post('/api/questions', data),
  updateQuestion: (id, data) => api.put(`/api/questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`/api/questions/${id}`),
};

export const fetchMedicalQuery = async (query, mode = 'conceptual', syllabus = 'Indian MBBS', history = [], imageBase64 = null, signal = null) => {
  return apiCall('/api/medical/query', {
    method: 'POST',
    data: {
      message: query,
      mode,
      syllabus,
      history,
      ...(imageBase64 ? { imageBase64 } : {}),
    },
    signal
  });
};


export const syncUserWithBackend = async (user) => {
  return apiCall('/auth/user', {
    method: 'POST',
    data: user
  });
};

export const chatAPI = {
  sendMessage: async (message) => {
    const response = await api.post('/chat', { message });
    return response.data;
  },
};

export const sm2API = {
  getDueCards: (limit = 20) => apiCall(`/api/sm2/due?limit=${limit}`),
  submitReview: (cardId, quality) => apiCall('/api/sm2/review', { method: 'POST', data: { card_id: cardId, quality } })
};

export default api; 