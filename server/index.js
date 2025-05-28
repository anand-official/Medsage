const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Chat history storage
const CHAT_HISTORY_FILE = path.join(__dirname, 'data', 'chat_history.json');

// Ensure chat history file exists
async function ensureChatHistoryFile() {
  try {
    const dirPath = path.dirname(CHAT_HISTORY_FILE);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.access(CHAT_HISTORY_FILE);
  } catch {
    console.log('Creating new chat history file');
    await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify([]));
  }
}

// Read chat history
async function readChatHistory() {
  try {
    await ensureChatHistoryFile();
    const data = await fs.readFile(CHAT_HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading chat history:', error);
    throw new Error('Failed to read chat history');
  }
}

// Write chat history
async function writeChatHistory(history) {
  try {
    await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error writing chat history:', error);
    throw new Error('Failed to write chat history');
  }
}

// Routes

// Chat endpoints
app.post('/api/chat', async (req, res) => {
  try {
    console.log('Received chat message:', req.body);
    const { message, role, timestamp } = req.body;
    
    if (!message || !role || !timestamp) {
      return res.status(400).json({ 
        error: 'Message, role, and timestamp are required',
        details: 'Please provide all required fields'
      });
    }

    const history = await readChatHistory();
    
    const newMessage = {
      id: Date.now(),
      timestamp,
      role,
      message,
      sender: role === 'user' ? 'user' : 'bot'
    };

    console.log('Adding new message to history:', newMessage);
    history.push(newMessage);

    await writeChatHistory(history);
    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ 
      error: 'Failed to save message',
      details: error.message 
    });
  }
});

app.get('/api/chat/history', async (req, res) => {
  try {
    console.log('Fetching chat history');
    const history = await readChatHistory();
    res.json(history);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat history',
      details: error.message 
    });
  }
});

app.delete('/api/chat/history', async (req, res) => {
  try {
    console.log('Clearing chat history');
    await writeChatHistory([]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ 
      error: 'Failed to clear chat history',
      details: error.message 
    });
  }
});

// Medical query endpoint
app.post('/api/medical-query', async (req, res) => {
  try {
    console.log('Received medical query:', req.body);
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        details: 'Please provide a message in the request body'
      });
    }

    // Store the query in chat history
    const history = await readChatHistory();
    const timestamp = new Date().toISOString();
    
    history.push({
      id: Date.now(),
      timestamp,
      role: "user",
      message,
      sender: 'user'
    });

    await writeChatHistory(history);

    // For now, return a mock response
    // TODO: Replace with actual AI integration
    const mockResponse = {
      success: true,
      response: `I understand you're asking about: "${message}". This is a mock response. The actual AI integration will be implemented soon.`
    };

    console.log('Sending response:', mockResponse);
    res.json(mockResponse);
  } catch (error) {
    console.error('Error processing medical query:', error);
    res.status(500).json({ 
      error: 'Failed to process medical query',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auth endpoints
app.get('/auth/user', (req, res) => {
  // For now, return a mock user
  res.json({
    id: '1',
    name: 'Test User',
    email: 'test@example.com'
  });
});

app.post('/auth/user', (req, res) => {
  // For now, just acknowledge the user sync
  res.json({ success: true });
});

app.get('/auth/profile', (req, res) => {
  res.json({
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      theme: 'light',
      notifications: true
    }
  });
});

app.put('/auth/preferences', (req, res) => {
  res.json({ success: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Chat history file: ${CHAT_HISTORY_FILE}`);
}); 