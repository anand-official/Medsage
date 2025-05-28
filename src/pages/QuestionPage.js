import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Chip,
  Grid,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import { fetchMedicalQuery } from '../services/api';
import { usePageAnimation } from '../hooks/usePageAnimation';

const quickPrompts = [
  "Explain the pathophysiology of diabetes mellitus",
  "What are the key differences between Type 1 and Type 2 diabetes?",
  "Describe the mechanism of action of insulin",
  "What are the clinical manifestations of diabetic ketoacidosis?",
  "Explain the diagnostic criteria for diabetes mellitus"
];

const QuestionPage = () => {
  const theme = useTheme();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [mode, setMode] = useState('conceptual');
  usePageAnimation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchMedicalQuery(question, mode);
      setResponse(result.data);
    } catch (err) {
      setError(err.message || 'Failed to get response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setQuestion(prompt);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h4" component="h1" gutterBottom color="primary" sx={{ mb: 4 }}>
          Ask Your Medical Question
        </Typography>

        {/* Mode Selection */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Select Study Mode:
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip
              label="Conceptual"
              onClick={() => setMode('conceptual')}
              color={mode === 'conceptual' ? 'primary' : 'default'}
              variant={mode === 'conceptual' ? 'filled' : 'outlined'}
            />
            <Chip
              label="Exam"
              onClick={() => setMode('exam')}
              color={mode === 'exam' ? 'primary' : 'default'}
              variant={mode === 'exam' ? 'filled' : 'outlined'}
            />
          </Box>
        </Box>

        {/* Question Input */}
        <Paper 
          elevation={3} 
          sx={{ 
            p: 3, 
            mb: 4,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`
          }}
        >
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              label="Type your medical question here"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !question.trim()}
              sx={{ 
                minWidth: '200px',
                borderRadius: '30px'
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Get Answer'}
            </Button>
          </form>
        </Paper>

        {/* Quick Prompts */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom>
            Quick Prompts:
          </Typography>
          <Grid container spacing={1}>
            {quickPrompts.map((prompt, index) => (
              <Grid item key={index}>
                <Chip
                  label={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.light,
                      color: theme.palette.primary.contrastText
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Response Display */}
        {error && (
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'error.light' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        {response && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Paper sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom color="primary">
                Answer:
              </Typography>
              <Typography variant="body1" paragraph>
                {response.text}
              </Typography>

              {response.keyPoints && response.keyPoints.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Key Points:
                  </Typography>
                  <ul>
                    {response.keyPoints.map((point, index) => (
                      <li key={index}>
                        <Typography variant="body1">{point}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}

              {response.clinicalRelevance && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Clinical Relevance:
                  </Typography>
                  <Typography variant="body1">
                    {response.clinicalRelevance}
                  </Typography>
                </Box>
              )}

              {response.bookReferences && response.bookReferences.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    References:
                  </Typography>
                  <ul>
                    {response.bookReferences.map((ref, index) => (
                      <li key={index}>
                        <Typography variant="body2">
                          {ref.book}, Chapter {ref.chapter}, p.{ref.page}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Paper>
          </motion.div>
        )}
      </motion.div>
    </Container>
  );
};

export default QuestionPage;
