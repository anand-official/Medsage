


import { useTheme } from '@mui/material/styles';
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  Box, TextField, Button, Typography, Paper, CircularProgress,
  Container, FormControlLabel, Radio, RadioGroup, Card, CardContent,
  Divider, IconButton, Chip, Alert
} from '@mui/material';
import {
  Send as SendIcon,
  VolumeUp as VolumeUpIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon
} from '@mui/icons-material';
import { StudyContext } from '../contexts/StudyContext';
import { fetchMedicalQuery } from '../services/apiService';







const QuestionPage = () => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookmarked, setBookmarked] = useState(false);
  const responseRef = useRef(null);
  
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
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchMedicalQuery(question, studyMode, currentSyllabus);
      
      if (data.error) {
        setError(data.error);
        setResponse(null);
      } else {
        setResponse(data);
        addRecentQuery(question, data);
      }
    } catch (err) {
      setError('Failed to get answer. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle bookmark status
  const toggleBookmark = () => {
    setBookmarked(!bookmarked);
    
    if (!bookmarked && response) {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
      bookmarks.push({
        question,
        responseId: response.id || Date.now(),
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }
  };

  // Text-to-speech for answer
  const speakAnswer = () => {
    if (response && window.speechSynthesis) {
      const textToSpeak = response.textWithReferences?.replace(/<[^>]+>/g, '') || 
                          response.text || 
                          'No answer available';
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Format the response with reference tooltips
  const formatResponseWithReferences = (text, references) => {
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

  useEffect(() => {
    if (responseRef.current && response?.bookReferences) {
      const refElements = responseRef.current.querySelectorAll('.reference');
      refElements.forEach(el => {
        el.style.textDecoration = 'underline';
        el.style.color = '#1976d2';
        el.style.cursor = 'pointer';
      });
    }
  }, [response]);

  // Reset bookmark status when question changes
  useEffect(() => {
    setBookmarked(false);
  }, [question]);

  // Check if the current response is bookmarked
  useEffect(() => {
    if (response) {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
      const isBookmarked = bookmarks.some(b => b.question === question);
      setBookmarked(isBookmarked);
    }
  }, [response, question]);

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
  };

  return (
    <Container maxWidth="md" sx={{ pt: 2 }}>
      <Card sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
        mb: 4,
        overflow: 'visible'
      }}>
        <CardContent sx={{ pt: 3, pb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="600" color="primary" gutterBottom>
            Your Study Buddy
          </Typography>
          
          {isOfflineMode && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              You're in offline mode. Only cached questions will be available.
            </Alert>
          )}
          
          {/* Quick prompt suggestions */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {quickPrompts.map((prompt, index) => (
              <Button 
                key={index}
                variant="outlined"
                size="small"
                sx={{ borderRadius: 2 }}
                onClick={() => applyPrompt(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </Box>
          
          {/* Pro upgrade banner */}
          <Paper 
            sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: '#f5f5f5', 
              borderRadius: 2,
              border: '1px solid #e0e0e0'
            }}
          >
            <Typography variant="subtitle1" fontWeight="600">
              Upgrade to Pro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unlock powerful features with our pro upgrade today!
            </Typography>
          </Paper>
          
          {/* Question input field */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              placeholder="Enter a doubt here"
              variant="outlined"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
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
                  >
                    <SendIcon />
                  </IconButton>
                )
              }}
            />
            
            {/* Learning mode selection */}
            <RadioGroup
              row
              value={studyMode}
              onChange={(e) => setStudyMode(e.target.value)}
              sx={{ justifyContent: 'flex-end' }}
            >
              <FormControlLabel 
                value="exam" 
                control={<Radio size="small" />} 
                label="Exam Focused" 
                sx={{ ml: 1 }} 
              />
              <FormControlLabel 
                value="conceptual" 
                control={<Radio size="small" />} 
                label="Concept Focused" 
              />
            </RadioGroup>
          </form>
        </CardContent>
      </Card>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Response section */}
      {response && (
        <Card sx={{ 
          borderRadius: 3, 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
          mb: 4 
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" component="h2" fontWeight="600">
                Answer
              </Typography>
              
              <Box>
                <IconButton onClick={speakAnswer} title="Read aloud">
                  <VolumeUpIcon />
                </IconButton>
                
                <IconButton onClick={toggleBookmark} title={bookmarked ? "Remove bookmark" : "Bookmark"}>
                  {bookmarked ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
                </IconButton>
              </Box>
            </Box>
            
            {response.fromCache && (
              <Chip 
                label="Cached Response" 
                color="secondary" 
                size="small" 
                sx={{ mb: 2 }} 
              />
            )}
            
            <div 
              ref={responseRef}
              dangerouslySetInnerHTML={{ 
                __html: formatResponseWithReferences(
                  response.textWithReferences || response.text,
                  response.bookReferences || []
                )
              }}
              style={{ marginBottom: '16px', lineHeight: 1.6 }}
            />
            
            {response.bookReferences && response.bookReferences.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" component="h3" sx={{ mb: 1 }} fontWeight="600">
                  References
                </Typography>
                {response.bookReferences.map((ref, index) => (
                  <Typography key={index} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                    {index + 1}. {ref.book}, {ref.year}, p.{ref.page}
                  </Typography>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default QuestionPage;