import React, { useState, useContext, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, LinearProgress, Card, CardContent, Container,
  Chip, Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { StudyContext } from '../contexts/StudyContext';
import { getStudyPlan } from '../services/apiService';

const StudyPlannerPage = () => {
  const { 
    currentSyllabus, 
    examDate, 
    setExamDate, 
    studyProgress, 
    updateProgress,
    isOfflineMode
  } = useContext(StudyContext);
  
  const [studyPlan, setStudyPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Generate or refresh study plan
  const generatePlan = async () => {
    if (!examDate) {
      setError('Please select an exam date');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const plan = await getStudyPlan(currentSyllabus, examDate.toISOString(), studyProgress);
      if (plan.error) {
        setError(plan.error);
      } else {
        setStudyPlan(plan);
      }
    } catch (err) {
      setError('Failed to generate study plan. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate days until exam
  const getDaysUntilExam = () => {
    if (!examDate) return null;
    
    const today = new Date();
    const exam = new Date(examDate);
    return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  };
  
  // Format date to display
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Toggle topic completion status
  const toggleTopicCompleted = (topic) => {
    const isCompleted = studyProgress.includes(topic);
    updateProgress(topic, !isCompleted);
  };
  
  // Calculate overall progress percentage
  const calculateProgress = () => {
    if (!studyPlan || !studyPlan.allTopics || studyPlan.allTopics.length === 0) return 0;
    
    return Math.round((studyProgress.length / studyPlan.allTopics.length) * 100);
  };
  
  useEffect(() => {
    // If we have an exam date, generate the plan when the component mounts
    if (examDate && !studyPlan && !loading) {
      generatePlan();
    }
  }, []);

  return (
    <Container maxWidth="md" sx={{ pt: 2 }}>
      <Card sx={{ 
        borderRadius: 3, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
        mb: 4 
      }}>
        <CardContent sx={{ pt: 3, pb: 3 }}>
          <Typography variant="h5" component="h1" fontWeight="600" color="primary" gutterBottom>
            Study Planner
          </Typography>
          
          {isOfflineMode && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              You're in offline mode. Only cached study plans will be available.
            </Alert>
          )}
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              Set Your Exam Date
            </Typography>
            
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Exam Date"
                value={examDate}
                onChange={(newValue) => {
                  setExamDate(newValue);
                }}
                renderInput={(params) => (
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid #e0e0e0',
                    borderRadius: 3,
                    p: 1,
                    backgroundColor: '#f5f5f5'
                  }}>
                    <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <input
                      {...params}
                      style={{ 
                        border: 'none', 
                        background: 'transparent',
                        fontSize: '1rem',
                        width: '100%',
                        outline: 'none'
                      }}
                    />
                  </Box>
                )}
                disablePast
                minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // Tomorrow
              />
            </LocalizationProvider>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box>
              <Typography variant="body1" fontWeight="500">
                Current Syllabus: <Chip label={currentSyllabus} color="primary" size="small" />
              </Typography>
              
              {getDaysUntilExam() !== null && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <TimerIcon fontSize="small" sx={{ mr: 0.5, color: 'secondary.main' }} />
                  <Typography variant="body2" color="secondary.main" fontWeight="500">
                    {getDaysUntilExam()} days until exam
                  </Typography>
                </Box>
              )}
            </Box>
            
            <Button
              variant="contained"
              color="primary"
              onClick={generatePlan}
              disabled={!examDate || loading || isOfflineMode}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {studyPlan ? 'Refresh Plan' : 'Generate Plan'}
            </Button>
          </Box>
          
          {/* Pro tip */}
          <Paper 
            sx={{ 
              p: 2, 
              mt: 3, 
              bgcolor: '#f5f5f5', 
              borderRadius: 2,
              border: '1px solid #e0e0e0'
            }}
          >
            <Typography variant="subtitle2" fontWeight="600">
              Pro Tip
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A well-structured study plan can increase your exam performance by up to 30%.
              Set realistic daily goals and track your progress regularly.
            </Typography>
          </Paper>
        </CardContent>
      </Card>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ my: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      
      {studyPlan && studyPlan.dailyPlan && (
        <>
          <Card sx={{ 
            borderRadius: 3, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
            mb: 4 
          }}>
            <CardContent>
              <Typography variant="h6" component="h2" fontWeight="600" gutterBottom>
                Overall Progress
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={calculateProgress()} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {studyProgress.length} topics completed
                  </Typography>
                  <Typography variant="body2" fontWeight="600" color="primary">
                    {calculateProgress()}% Complete
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Based on your current progress, you need to cover approximately 
                  <strong> {studyPlan.dailyPlan.flat().length} topics</strong> in 
                  <strong> {studyPlan.daysRemaining} days</strong>.
                </Typography>
                
                {studyPlan.fromCache && (
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                    This is a cached study plan. Generate a new one for the most up-to-date recommendations.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
          
          <Typography variant="h5" component="h2" fontWeight="600" gutterBottom>
            Daily Study Schedule
          </Typography>
          
          {studyPlan.dailyPlan.map((dayTopics, dayIndex) => (
            <Card key={dayIndex} sx={{ 
              borderRadius: 3, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
              mb: 3,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'primary.main', 
                color: 'white' 
              }}>
                <Typography variant="h6" component="h3" fontWeight="600">
                  Day {dayIndex + 1} - {formatDate(new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000))}
                </Typography>
              </Box>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Topic</TableCell>
                      <TableCell align="center">Difficulty</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dayTopics.map((topic, index) => (
                      <TableRow 
                        key={index} 
                        hover
                        sx={{
                          backgroundColor: studyProgress.includes(topic.name) 
                            ? 'rgba(76, 175, 80, 0.08)' 
                            : 'inherit'
                        }}
                      >
                        <TableCell>
                          <Typography 
                            variant="body2"
                            sx={{
                              textDecoration: studyProgress.includes(topic.name) 
                                ? 'line-through' 
                                : 'none'
                            }}
                          >
                            {topic.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {Array(topic.difficulty).fill('★').join('')}
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={studyProgress.includes(topic.name)}
                            onChange={() => toggleTopicCompleted(topic.name)}
                            color="primary"
                            icon={<CheckCircleIcon sx={{ opacity: 0.3 }} />}
                            checkedIcon={<CheckCircleIcon />}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {dayTopics.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No topics scheduled for this day
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: '#f9f9f9'
              }}>
                <Typography variant="body2" color="text.secondary">
                  Estimated difficulty: {studyPlan.difficultyByDay[dayIndex]}/10
                </Typography>
                
                <Chip 
                  label={`${dayTopics.filter(t => studyProgress.includes(t.name)).length}/${dayTopics.length} complete`}
                  color={dayTopics.filter(t => studyProgress.includes(t.name)).length === dayTopics.length ? "success" : "primary"}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Card>
          ))}
        </>
      )}
    </Container>
  );
};

export default StudyPlannerPage;