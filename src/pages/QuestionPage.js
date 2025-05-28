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
  AutoAwesome as MagicIcon,
  Book as BookIcon
} from '@mui/icons-material';
import { useStudyContext } from '../contexts/StudyContext';
import { fetchMedicalQuery } from '../services/apiService';
import { motion } from 'framer-motion';

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
  } = useStudyContext();

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
        <Alert 
          severity="error" 
          sx={{ 
            my: 2, 
            maxWidth: '80%', 
            mx: 'auto',
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(211, 47, 47, 0.1)' 
              : 'rgba(211, 47, 47, 0.05)',
            border: `1px solid ${theme.palette.error.main}30`,
            '& .MuiAlert-icon': {
              color: theme.palette.error.main
            }
          }}
        >
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
            maxWidth: '80%',
            gap: 1
          }}
        >
          {isBot && (
            <Avatar
              sx={{
                bgcolor: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                width: 36,
                height: 36,
                boxShadow: `0 2px 8px ${theme.palette.primary.main}40`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}60`,
                }
              }}
            >
              <BotIcon />
            </Avatar>
          )}
          
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5
            }}
          >
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: isUser 
                  ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                color: isUser ? 'white' : 'inherit',
                maxWidth: '100%',
                border: `1px solid ${isUser 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.1)'}`,
                boxShadow: isUser
                  ? `0 4px 12px ${theme.palette.primary.main}40`
                  : theme.palette.mode === 'dark'
                    ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                    : '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isUser
                    ? `0 6px 16px ${theme.palette.primary.main}50`
                    : theme.palette.mode === 'dark'
                      ? '0 6px 16px rgba(0, 0, 0, 0.3)'
                      : '0 6px 16px rgba(0, 0, 0, 0.15)',
                }
              }}
            >
              {isUser ? (
                <Typography variant="body1">{message.content}</Typography>
              ) : (
                <>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      <BotIcon sx={{ fontSize: '1rem' }} />
                      MedSage AI
                    </Typography>
                    
                    {message.fromCache && (
                      <Chip 
                        label="Cached" 
                        size="small" 
                        color="secondary"
                        variant="outlined"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.7rem',
                          bgcolor: `${theme.palette.secondary.main}10`,
                          borderColor: `${theme.palette.secondary.main}30`,
                          '&:hover': {
                            bgcolor: `${theme.palette.secondary.main}20`,
                          }
                        }}
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
                    style={{ 
                      lineHeight: 1.6,
                      '& .reference': {
                        color: theme.palette.primary.main,
                        textDecoration: 'none',
                        borderBottom: `1px dashed ${theme.palette.primary.main}50`,
                        cursor: 'help',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          color: theme.palette.primary.dark,
                          borderBottom: `1px solid ${theme.palette.primary.main}`,
                        }
                      }
                    }}
                  />
                  
                  {message.references && message.references.length > 0 && (
                    <>
                      <Divider sx={{ 
                        my: 2,
                        borderColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.1)' 
                          : 'rgba(0, 0, 0, 0.1)'
                      }} />
                      <Typography 
                        variant="subtitle2" 
                        color="text.secondary" 
                        gutterBottom
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <BookIcon sx={{ fontSize: '1rem' }} />
                        References
                      </Typography>
                      {message.references.map((ref, idx) => (
                        <Typography 
                          key={idx} 
                          variant="caption" 
                          display="block" 
                          color="text.secondary"
                          sx={{
                            pl: 1,
                            py: 0.5,
                            borderRadius: 1,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: theme.palette.mode === 'dark' 
                                ? 'rgba(255, 255, 255, 0.05)' 
                                : 'rgba(0, 0, 0, 0.03)',
                            }
                          }}
                        >
                          {idx + 1}. {ref.book}, {ref.year}, p.{ref.page}
                        </Typography>
                      ))}
                    </>
                  )}
                </>
              )}
            </Paper>
            
            {isBot && (
              <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={() => speakAnswer(message.content)}
                  sx={{ 
                    color: theme.palette.text.secondary,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: theme.palette.primary.main,
                      transform: 'scale(1.1)',
                    }
                  }}
                >
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
                
                <IconButton 
                  size="small" 
                  onClick={() => toggleBookmark(index)}
                  sx={{ 
                    color: message.bookmarked ? theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: theme.palette.primary.main,
                      transform: 'scale(1.1)',
                    }
                  }}
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
                width: 36,
                height: 36,
                boxShadow: `0 2px 8px ${theme.palette.grey[500]}40`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: `0 4px 12px ${theme.palette.grey[500]}60`,
                }
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
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        mt: -8,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 50% 50%, rgba(25, 118, 210, 0.05) 0%, transparent 50%)'
            : 'radial-gradient(circle at 50% 50%, rgba(25, 118, 210, 0.03) 0%, transparent 50%)',
          pointerEvents: 'none'
        }
      }}
    >
      <Container 
        maxWidth={false}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          p: 0,
          gap: 0,
          maxWidth: '100% !important',
          mt: 8,
          px: 0,
          position: 'relative',
          zIndex: 1
        }}
      >
        <Card sx={{ 
          borderRadius: 0, 
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 4px 30px rgba(0, 0, 0, 0.5)' 
            : '0 4px 30px rgba(0, 0, 0, 0.1)', 
          overflow: 'visible',
          flex: '0 0 auto',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)'}`,
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}50, transparent)`,
            opacity: 0.5
          }
        }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography 
              variant="h5" 
              component="h1" 
              fontWeight="700" 
              sx={{
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 2,
                textShadow: `0 2px 10px ${theme.palette.primary.main}40`,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1
              }}
            >
              <BotIcon sx={{ 
                fontSize: 28,
                filter: `drop-shadow(0 2px 4px ${theme.palette.primary.main}40)`
              }} />
              Your Smartest Ally in Medical Mastery
            </Typography>
            
            {isOfflineMode && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 152, 0, 0.15)' 
                    : 'rgba(255, 152, 0, 0.1)',
                  border: `1px solid ${theme.palette.warning.main}40`,
                  backdropFilter: 'blur(10px)',
                  '& .MuiAlert-icon': {
                    color: theme.palette.warning.main
                  }
                }}
              >
                You're in offline mode. Only cached questions will be available.
              </Alert>
            )}
            
            {/* Quick prompt suggestions */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {quickPrompts.map((prompt, index) => (
                <Button 
                  key={index}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    borderRadius: 3,
                    textTransform: 'none',
                    borderColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255,255,255,0.2)' 
                      : 'rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`,
                      opacity: 0,
                      transition: 'opacity 0.3s ease'
                    },
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      backgroundColor: `${theme.palette.primary.main}20`,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
                      '&::before': {
                        opacity: 1
                      }
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
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(25, 25, 25, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(250, 250, 252, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
            borderRadius: 0,
            px: 2,
            py: 2,
            border: `1px solid ${theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.1)'}`,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.2)' 
                : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              '&:hover': {
                background: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.3)' 
                  : 'rgba(0, 0, 0, 0.3)',
              }
            }
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
                color: 'text.secondary',
                opacity: 0.8,
                position: 'relative'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '200px',
                  height: '200px',
                  background: `radial-gradient(circle at center, ${theme.palette.primary.main}10 0%, transparent 70%)`,
                  borderRadius: '50%',
                  filter: 'blur(40px)',
                  opacity: 0.5,
                  zIndex: 0
                }}
              />
              <BotIcon sx={{ 
                fontSize: 100, 
                mb: 3,
                color: theme.palette.primary.main,
                filter: `drop-shadow(0 4px 8px ${theme.palette.primary.main}40)`,
                animation: 'float 3s ease-in-out infinite',
                position: 'relative',
                zIndex: 1,
                '@keyframes float': {
                  '0%': { transform: 'translateY(0px)' },
                  '50%': { transform: 'translateY(-15px)' },
                  '100%': { transform: 'translateY(0px)' }
                }
              }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 2,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  textShadow: `0 2px 10px ${theme.palette.primary.main}40`,
                  fontWeight: 600,
                  position: 'relative',
                  zIndex: 1
                }}
              >
                Start a conversation with MedSage AI
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{
                  opacity: 0.8,
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                Ask a medical question or use one of the suggestions above
              </Typography>
            </Box>
          ) : (
            <>
              {chatHistory.map((message, index) => (
                <Box 
                  key={message.timestamp} 
                  id={`message-${index}`}
                  component={motion.div}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderMessage(message, index)}
                </Box>
              ))}
              
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                  <CircularProgress 
                    size={40} 
                    sx={{ 
                      color: theme.palette.primary.main,
                      filter: `drop-shadow(0 2px 4px ${theme.palette.primary.main}40)`,
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      }
                    }} 
                  />
                </Box>
              )}
              
              <div ref={chatEndRef} />
            </>
          )}
        </Box>
        
        {/* Input area */}
        <Card 
          sx={{ 
            borderRadius: 0,
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 -4px 30px rgba(0, 0, 0, 0.5)' 
              : '0 -4px 30px rgba(0, 0, 0, 0.1)',
            flex: '0 0 auto',
            position: 'relative',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.1)'}`,
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}50, transparent)`,
              opacity: 0.5
            }
          }}
        >
          <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
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
                    transition: 'all 0.3s ease',
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.03)',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.12)' 
                        : 'rgba(0, 0, 0, 0.05)',
                    },
                    '&.Mui-focused': {
                      bgcolor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.15)' 
                        : 'rgba(0, 0, 0, 0.08)',
                      '& fieldset': {
                        borderColor: theme.palette.primary.main,
                        borderWidth: 2
                      }
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
                        bgcolor: question.trim() 
                          ? `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                          : 'transparent',
                        color: question.trim() ? 'white' : theme.palette.action.disabled,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          boxShadow: question.trim() 
                            ? `0 4px 12px ${theme.palette.primary.main}50`
                            : 'none',
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
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mt: 1.5
              }}>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{
                    opacity: 0.8,
                    fontStyle: 'italic'
                  }}
                >
                  Powered by MedSage AI
                </Typography>
                
                <RadioGroup
                  row
                  value={studyMode}
                  onChange={(e) => setStudyMode(e.target.value)}
                >
                  <FormControlLabel 
                    value="exam" 
                    control={
                      <Radio 
                        size="small" 
                        sx={{
                          color: theme.palette.primary.main,
                          '&.Mui-checked': {
                            color: theme.palette.primary.main,
                          }
                        }}
                      />
                    } 
                    label={
                      <Typography 
                        variant="caption"
                        sx={{
                          color: studyMode === 'exam' 
                            ? theme.palette.primary.main 
                            : 'text.secondary',
                          fontWeight: studyMode === 'exam' ? 600 : 400
                        }}
                      >
                        Exam Focused
                      </Typography>
                    } 
                  />
                  <FormControlLabel 
                    value="conceptual" 
                    control={
                      <Radio 
                        size="small"
                        sx={{
                          color: theme.palette.secondary.main,
                          '&.Mui-checked': {
                            color: theme.palette.secondary.main,
                          }
                        }}
                      />
                    } 
                    label={
                      <Typography 
                        variant="caption"
                        sx={{
                          color: studyMode === 'conceptual' 
                            ? theme.palette.secondary.main 
                            : 'text.secondary',
                          fontWeight: studyMode === 'conceptual' ? 600 : 400
                        }}
                      >
                        Concept Focused
                      </Typography>
                    } 
                  />
                </RadioGroup>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default QuestionPage;
