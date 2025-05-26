import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  Box, TextField, Button, Typography, Paper, CircularProgress,
  Container, FormControlLabel, Radio, RadioGroup, Card, CardContent,
  Divider, IconButton, Chip, Alert, Avatar, useTheme
} from '@mui/material';
import {
  Send as SendIcon,
  VolumeUp as VolumeUpIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Psychology as BotIcon,
  Person as PersonIcon,
  AutoAwesome as MagicIcon
} from '@mui/icons-material';
import { StudyContext } from '../contexts/StudyContext';
import { fetchMedicalQuery } from '../services/apiService';

const QuestionPage = () => {
  const theme = useTheme();
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  
  const { 
    studyMode, 
    setStudyMode, 
    currentSyllabus, 
    addRecentQuery,
    isOfflineMode
  } = useContext(StudyContext);

  // Handle question submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    // Add user question to chat history
    const userMessage = {
      type: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);
    
    // Clear input field
    setQuestion('');
    
    try {
      const data = await fetchMedicalQuery(question, studyMode, currentSyllabus);
      
      if (data.error) {
        setError(data.error);
        
        // Add error message to chat
        setChatHistory(prev => [...prev, {
          type: 'error',
          content: data.error,
          timestamp: new Date().toISOString()
        }]);
      } else {
        // Add bot response to chat history
        const botMessage = {
          type: 'bot',
          content: data.textWithReferences || data.text,
          rawData: data,
          timestamp: new Date().toISOString(),
          references: data.bookReferences || [],
          fromCache: data.fromCache
        };
        
        setChatHistory(prev => [...prev, botMessage]);
        addRecentQuery(userMessage.content, data);
      }
    } catch (err) {
      const errorMsg = 'Failed to get answer. Please try again later.';
      setError(errorMsg);
      
      // Add error message to chat
      setChatHistory(prev => [...prev, {
        type: 'error',
        content: errorMsg,
        timestamp: new Date().toISOString()
      }]);
      
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle bookmark status for a message
  const toggleBookmark = (messageIndex) => {
    if (messageIndex < 0 || messageIndex >= chatHistory.length) return;
    
    const message = chatHistory[messageIndex];
    if (message.type !== 'bot') return;
    
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    const userQuestion = chatHistory[messageIndex - 1]?.content || '';
    
    const isCurrentlyBookmarked = bookmarks.some(
      b => b.responseId === message.rawData.id || b.timestamp === message.timestamp
    );
    
    if (isCurrentlyBookmarked) {
      // Remove bookmark
      const updatedBookmarks = bookmarks.filter(
        b => b.responseId !== message.rawData.id && b.timestamp !== message.timestamp
      );
      localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
    } else {
      // Add bookmark
      bookmarks.push({
        question: userQuestion,
        responseId: message.rawData.id || message.timestamp,
        timestamp: message.timestamp
      });
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }
    
    // Update chat history to reflect bookmark status
    const updatedHistory = [...chatHistory];
    updatedHistory[messageIndex] = {
      ...message,
      bookmarked: !isCurrentlyBookmarked
    };
    
    setChatHistory(updatedHistory);
  };

  // Text-to-speech for answer
  const speakAnswer = (text) => {
    if (window.speechSynthesis) {
      const textToSpeak = text.replace(/<[^>]+>/g, '');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Format message with reference tooltips
  const formatMessageWithReferences = (text, references) => {
    if (!text) return '';
    
    return text.replace(
      /<ref id="(\d+)">\[(.*?)\]<\/ref>/g, 
      (match, refId, refText) => {
        const ref = references[parseInt(refId)];
        if (!ref) return refText;
        
        return `<span class="reference" data-ref-id="${refId}" title="${ref.book}, ${ref.year}, p.${ref.page}">${refText}</span>`;
      }
    );
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Quick prompt suggestions
  const quickPrompts = [
    "Create a quiz for me",
    "Plan an exam schedule for me",
    "Key topics in 1st Year",
    "Study Planner for the whole month"
  ];

  // Apply a prompt suggestion
  const applyPrompt = (prompt) => {
    setQuestion(prompt);
    inputRef.current?.focus();
  };

  // Check for bookmarked messages
  useEffect(() => {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    
    // Update bookmarked status in chat history
    const updatedHistory = chatHistory.map(message => {
      if (message.type === 'bot' && message.rawData) {
        const isBookmarked = bookmarks.some(
          b => b.responseId === message.rawData.id || b.timestamp === message.timestamp
        );
        return { ...message, bookmarked: isBookmarked };
      }
      return message;
    });
    
    if (JSON.stringify(updatedHistory) !== JSON.stringify(chatHistory)) {
      setChatHistory(updatedHistory);
    }
  }, []);

  // Render a chat message
  const renderMessage = (message, index) => {
    const isBot = message.type === 'bot';
    const isUser = message.type === 'user';
    const isError = message.type === 'error';
    
    if (isError) {
      return (
        <Alert severity="error" sx={{ my: 2, maxWidth: '80%', mx: 'auto' }}>
          {message.content}
        </Alert>
      );
    }
    
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isUser ? 'flex-end' : 'flex-start',
          mb: 3,
          width: '100%'
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            maxWidth: '80%'
          }}
        >
          {isBot && (
            <Avatar
              sx={{
                bgcolor: theme.palette.primary.main,
                mr: 2,
                mt: 0.5
              }}
            >
              <BotIcon />
            </Avatar>
          )}
          
          <Box sx={{ flexGrow: 1 }}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isUser 
                  ? theme.palette.primary.main 
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                color: isUser ? 'white' : 'inherit',
                maxWidth: '100%'
              }}
            >
              {isUser ? (
                <Typography variant="body1">{message.content}</Typography>
              ) : (
                <>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" color="text.secondary">MedSage AI</Typography>
                    
                    {message.fromCache && (
                      <Chip 
                        label="Cached" 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMessageWithReferences(
                        message.content,
                        message.references
                      )
                    }}
                    style={{ lineHeight: 1.6 }}
                  />
                  
                  {message.references && message.references.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        References
                      </Typography>
                      {message.references.map((ref, idx) => (
                        <Typography key={idx} variant="caption" display="block" color="text.secondary">
                          {idx + 1}. {ref.book}, {ref.year}, p.{ref.page}
                        </Typography>
                      ))}
                    </>
                  )}
                </>
              )}
            </Paper>
            
            {isBot && (
              <Box sx={{ display: 'flex', mt: 1, ml: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={() => speakAnswer(message.content)}
                  sx={{ color: theme.palette.text.secondary }}
                >
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={() => toggleBookmark(index)}
                  sx={{ color: message.bookmarked ? theme.palette.primary.main : theme.palette.text.secondary }}
                >
                  {message.bookmarked ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                </IconButton>
              </Box>
            )}
          </Box>
          
          {isUser && (
            <Avatar
              sx={{
                bgcolor: theme.palette.grey[500],
                ml: 2,
                mt: 0.5
              }}
            >
              <PersonIcon />
            </Avatar>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="md" sx={{ pt: 2, height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Card sx={{ 
        borderRadius: 2, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
        mb: 2,
        overflow: 'visible',
        flex: '0 0 auto'
      }}>
        <CardContent sx={{ py: 2 }}>
          <Typography variant="h5" component="h1" fontWeight="600" color="primary" gutterBottom>
            Your Medical Study Assistant
          </Typography>
          
          {isOfflineMode && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              You're in offline mode. Only cached questions will be available.
            </Alert>
          )}
          
          {/* Quick prompt suggestions */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {quickPrompts.map((prompt, index) => (
              <Button 
                key={index}
                variant="outlined"
                size="small"
                sx={{ 
                  borderRadius: 4,
                  textTransform: 'none',
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
                onClick={() => applyPrompt(prompt)}
                startIcon={<MagicIcon fontSize="small" />}
              >
                {prompt}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>
      
      {/* Chat messages container */}
      <Box 
        sx={{ 
          flex: '1 1 auto',
          overflowY: 'auto',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)',
          borderRadius: 2,
          p: 2,
          mb: 2
        }}
      >
        {chatHistory.length === 0 ? (
          <Box 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center',
              color: 'text.secondary'
            }}
          >
            <BotIcon sx={{ fontSize: 60, opacity: 0.5, mb: 2 }} />
            <Typography variant="h6">Start a conversation with MedSage AI</Typography>
            <Typography variant="body2">Ask a medical question or use one of the suggestions above</Typography>
          </Box>
        ) : (
          <>
            {chatHistory.map((message, index) => (
              <Box key={message.timestamp} id={`message-${index}`}>
                {renderMessage(message, index)}
              </Box>
            ))}
            
            {loading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={30} />
              </Box>
            )}
            
            <div ref={chatEndRef} />
          </>
        )}
      </Box>
      
      {/* Input area */}
      <Card 
        sx={{ 
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          flex: '0 0 auto',
          position: 'relative'
        }}
      >
        <CardContent sx={{ pb: '16px !important' }}>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              placeholder="Ask a medical question..."
              variant="outlined"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              inputRef={inputRef}
              sx={{ 
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  pr: 0.5,
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 2
                  }
                }
              }}
              disabled={loading || isOfflineMode}
              InputProps={{
                endAdornment: (
                  <IconButton 
                    type="submit" 
                    disabled={!question.trim() || loading || isOfflineMode}
                    color="primary"
                    sx={{ 
                      bgcolor: question.trim() ? theme.palette.primary.main : 'transparent',
                      color: question.trim() ? 'white' : theme.palette.action.disabled,
                      '&:hover': {
                        bgcolor: question.trim() ? theme.palette.primary.dark : 'transparent',
                      },
                      mr: 0.5
                    }}
                  >
                    <SendIcon />
                  </IconButton>
                )
              }}
            />
            
            {/* Learning mode selection */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Powered by MedSage AI
              </Typography>
              
              <RadioGroup
                row
                value={studyMode}
                onChange={(e) => setStudyMode(e.target.value)}
              >
                <FormControlLabel 
                  value="exam" 
                  control={<Radio size="small" />} 
                  label={<Typography variant="caption">Exam Focused</Typography>} 
                />
                <FormControlLabel 
                  value="conceptual" 
                  control={<Radio size="small" />} 
                  label={<Typography variant="caption">Concept Focused</Typography>} 
                />
              </RadioGroup>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default QuestionPage;
