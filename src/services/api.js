import axios from 'axios';
import { auth } from '../firebase';

const API_URL = 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
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
  }
};

// Study API calls
export const studyAPI = {
  getStudyPlan: async () => {
    return apiCall('/study/plan');
  },

  createOrUpdateStudyPlan: async (dailyPlan) => {
    return apiCall('/study/plan', {
      method: 'POST',
      data: { dailyPlan }
    });
  },

  updateTopicStatus: async (topicId, completed) => {
    return apiCall(`/study/topic/${topicId}`, {
      method: 'PUT',
      data: { completed }
    });
  }
};

// Questions API calls
export const questionsAPI = {
  getQuestions: async () => {
    return apiCall('/questions');
  },

  createQuestion: async (questionData) => {
    return apiCall('/questions', {
      method: 'POST',
      data: questionData
    });
  },

  getQuestionById: async (id) => {
    return apiCall(`/questions/${id}`);
  }
};

export const fetchMedicalQuery = async (query) => {
  return apiCall('/api/medical-query', {
    method: 'POST',
    data: { message: query }
  });
};

export const syncUserWithBackend = async (user) => {
  return apiCall('/auth/user', {
    method: 'POST',
    data: user
  });
};

export default api; 