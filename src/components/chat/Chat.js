import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  useTheme,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  Button
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as UserIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '../../services/chatService';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await chatService.getChatHistory();
      setMessages(history);
    } catch (error) {
      setError('Failed to load chat history');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatService.sendMessage(input);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response.message,
        sender: 'bot',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setError('Failed to send message. Please try again.');
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = async () => {
    try {
      await chatService.clearChatHistory();
      setMessages([]);
    } catch (error) {
      setError('Failed to clear chat history');
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: theme.palette.background.default
    }}>
      {/* Chat Header */}
      <Box sx={{ 
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BotIcon color="primary" />
          <Typography variant="h6">AI Study Assistant</Typography>
        </Box>
        <Button
          startIcon={<DeleteIcon />}
          onClick={handleClearChat}
          color="error"
          size="small"
        >
          Clear Chat
        </Button>
      </Box>

      {/* Messages Area */}
      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Box sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
              }}>
                <Avatar sx={{ 
                  bgcolor: message.sender === 'user' 
                    ? theme.palette.primary.main 
                    : theme.palette.secondary.main
                }}>
                  {message.sender === 'user' ? <UserIcon /> : <BotIcon />}
                </Avatar>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: message.sender === 'user'
                      ? theme.palette.primary.main
                      : theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.05)',
                    color: message.sender === 'user'
                      ? theme.palette.primary.contrastText
                      : theme.palette.text.primary,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {message.text}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'block',
                      mt: 1,
                      opacity: 0.7
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <BotIcon color="primary" />
            <CircularProgress size={20} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input Area */}
      <Box sx={{ 
        p: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper
      }}>
        <Box sx={{ 
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end'
        }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            variant="outlined"
            size="small"
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: theme.palette.background.default
              }
            }}
          />
          <IconButton 
            color="primary" 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            sx={{ 
              p: 1,
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                bgcolor: theme.palette.primary.dark
              },
              '&.Mui-disabled': {
                bgcolor: theme.palette.action.disabledBackground,
                color: theme.palette.action.disabled
              }
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Chat; 