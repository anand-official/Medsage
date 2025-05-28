import axios from 'axios';
import { auth } from '../firebase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper function to get the auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user');
  }
  return user.getIdToken();
};

// Helper function to make API calls
export const apiCall = async (endpoint, options = {}) => {
  try {
    const token = await getAuthToken();
    const response = await api({
      url: endpoint,
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API error: ${error.response.status}`);
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

  updatePreferences: async (preferences) => {
    return apiCall('/auth/preferences', {
      method: 'PUT',
      data: preferences
    });
  },

  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
};

// Study API calls
export const studyAPI = {
  generateStudyPlan: (data) => api.post('/study/generate', data),
  getStudyPlan: () => api.get('/study/plan'),
  updateStudyPlan: (data) => api.put('/study/plan', data),
};

// Questions API calls
export const questionAPI = {
  getQuestions: () => api.get('/questions'),
  createQuestion: (data) => api.post('/questions', data),
  updateQuestion: (id, data) => api.put(`/questions/${id}`, data),
  deleteQuestion: (id) => api.delete(`/questions/${id}`),
};

export const fetchMedicalQuery = async (query, mode = 'conceptual', syllabus = 'Indian MBBS') => {
  return apiCall('/api/medical/query', {
    method: 'POST',
    data: { 
      message: query,
      mode,
      syllabus
    }
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

export default api; 