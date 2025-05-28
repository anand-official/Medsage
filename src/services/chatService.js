import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
const ENDPOINT = 'https://api.github.com/copilot/chat/completions';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Auth service
export const authService = {
  async getCurrentUser() {
    try {
      const response = await api.get('/api/auth/user');
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user data');
    }
  },

  async syncUser(userData) {
    try {
      const response = await api.post('/api/auth/user', userData);
      return response.data;
    } catch (error) {
      console.error('Error syncing user:', error);
      throw new Error('Failed to sync user data');
    }
  }
};

// Chat service
export const chatService = {
  async sendMessage(message) {
    try {
      console.log('Sending message to server:', message);
      
      // First, store the user message
      const userMessage = {
        message,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      
      await api.post('/api/chat', userMessage);

      // Then, get the AI response
      const response = await api.post('/api/medical-query', {
        message
      });

      console.log('API response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get response');
      }

      // Store the bot response
      const botMessage = {
        message: response.data.response,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      await api.post('/api/chat', botMessage);

      return { 
        success: true,
        message: botMessage.message,
        timestamp: botMessage.timestamp
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        throw new Error(error.response.data.error || 'Failed to send message');
      }
      throw new Error('Could not process your query. Please try again later.');
    }
  },

  async getChatHistory() {
    try {
      const response = await api.get('/api/chat/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw new Error('Failed to fetch chat history');
    }
  },

  async clearChatHistory() {
    try {
      await api.delete('/api/chat/history');
      return { success: true };
    } catch (error) {
      console.error('Error clearing chat history:', error);
      throw new Error('Failed to clear chat history');
    }
  }
}; 