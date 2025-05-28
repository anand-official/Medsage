// StudyPlannerPage.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, Typography, Box, Grid, Card, CardContent, 
  Button, Divider, TextField, FormControl, InputLabel,
  Select, MenuItem, Chip, Alert, CircularProgress, 
  Paper, List, ListItem, ListItemText, Collapse,
  useTheme,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { motion } from 'framer-motion';
import { format, differenceInDays, addDays, isValid } from 'date-fns';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import TimelineIcon from '@mui/icons-material/Timeline';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { useStudyContext } from '../contexts/StudyContext';
import { ThemeContext } from '../App';
import { usePageAnimation } from '../hooks/usePageAnimation';
import TodaySchedule from '../components/study-planner/TodaySchedule';

// Sample subject data - in a real app this would come from an API
const SUBJECTS = [
  "Anatomy",
  "Physiology",
  "Biochemistry",
  "Pharmacology",
  "Pathology",
  "Microbiology",
  "Community Medicine",
  "Forensic Medicine",
  "Medicine",
  "Surgery",
  "Obstetrics & Gynecology",
  "Pediatrics",
  "Psychiatry",
  "Dermatology",
  "Orthopedics",
  "ENT",
  "Ophthalmology",
  "Radiology"
];

const StudyPlannerPage = () => {
  // Hooks
  usePageAnimation();
  const { mode } = useContext(ThemeContext);
  const { 
    currentSyllabus, 
    progress, 
    examDate, 
    setExamDate, 
    selectedSubjects, 
    setSelectedSubjects,
    weakSubjects, 
    setWeakSubjects,
    generateStudyPlan: contextGenerateStudyPlan,
    isGenerating,
    studyPlan,
    loading,
    error
  } = useStudyContext();
  
  // State
  const [expandedDay, setExpandedDay] = useState(null);
  const [localExamDate, setLocalExamDate] = useState(examDate || addDays(new Date(), 30));
  const theme = useTheme();

  // Update context exam date when local date changes
  useEffect(() => {
    if (setExamDate && isValid(localExamDate)) {
      setExamDate(localExamDate);
    }
  }, [localExamDate, setExamDate]);

  // Toggle day expansion
  const toggleDayExpansion = (dayIndex) => {
    if (expandedDay === dayIndex) {
      setExpandedDay(null);
    } else {
      setExpandedDay(dayIndex);
    }
  };

  // Handle subject selection
  const handleSubjectChange = (subject) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  // Handle weak subject selection
  const handleWeakSubjectChange = (subject) => {
    setWeakSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  // Mark topic as complete
  const markTopicComplete = (dayIndex, topicIndex) => {
    // Get the topic
    const topic = studyPlan.dailyPlan[dayIndex][topicIndex];
    
    // Update progress in context
    const updatedProgress = { ...progress };
    updatedProgress[topic] = 100;
    
    // In a real app, you would call a context method to update progress
    // For now, we'll just update the local study plan
    const updatedPlan = { ...studyPlan };
    
    // Remove topic from plan
    updatedPlan.dailyPlan[dayIndex] = updatedPlan.dailyPlan[dayIndex].filter(
      (_, index) => index !== topicIndex
    );
    
    // Remove day if empty
    if (updatedPlan.dailyPlan[dayIndex].length === 0) {
      updatedPlan.dailyPlan = updatedPlan.dailyPlan.filter(
        (_, index) => index !== dayIndex
      );
    }
    
    // In a real app, you would call a context method to update the study plan
    localStorage.setItem('studyPlan', JSON.stringify(updatedPlan));
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.3,
        staggerChildren: 0.1,
        when: "beforeChildren"
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  // Get today's schedule from study plan
  const getTodaySchedule = () => {
    if (!studyPlan || !studyPlan.dailyPlan) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const todayPlan = studyPlan.dailyPlan.find(day => {
      const planDate = new Date(day.date);
      planDate.setHours(0, 0, 0, 0); // Reset time to start of day
      return planDate.getTime() === today.getTime();
    });
    
    return todayPlan ? todayPlan.topics.map(topic => ({
      title: topic,
      subject: topic.split(' - ')[0],
      time: '9:00 AM',
      completed: false
    })) : [];
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      isValid(localExamDate) &&
      selectedSubjects.length > 0 &&
      weakSubjects.length > 0
    );
  };

  // Handle generate plan
  const handleGeneratePlan = async () => {
    try {
      await contextGenerateStudyPlan();
    } catch (err) {
      console.error('Failed to generate study plan:', err);
    }
  };

  const todaySchedule = getTodaySchedule();

  return (
    <Container 
      maxWidth={false} 
      sx={{ 
        py: 4, 
        minHeight: '100vh',
        px: { xs: 2, sm: 3, md: 4 },
        maxWidth: '100% !important'
      }}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{ 
          position: 'relative',
          width: '100%',
          height: '100%'
        }}
      >
        {/* Page Header */}
        <motion.div 
          variants={itemVariants}
          style={{ 
            position: 'relative',
            width: '100%'
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 4,
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -16,
              left: 0,
              right: 0,
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}40, transparent)`
            }
          }}>
            <Typography 
              variant="h4" 
              component="h1" 
              sx={{ 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: `0 2px 10px ${theme.palette.primary.main}40`
              }}
            >
              <CalendarTodayIcon sx={{ mr: 2, filter: `drop-shadow(0 2px 4px ${theme.palette.primary.main}40)` }} />
              Study Planner
            </Typography>
            
            {studyPlan && studyPlan.daysRemaining && (
              <Chip
                icon={<TimelineIcon />}
                label={`${studyPlan.daysRemaining} days until exam`}
                color="primary"
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 3,
                  background: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.02)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${theme.palette.primary.main}30`,
                  '& .MuiChip-label': {
                    fontWeight: 600
                  }
                }}
              />
            )}
          </Box>
        </motion.div>

        <Grid container spacing={3} sx={{ position: 'relative', width: '100%' }}>
          {/* Left Column - Today's Schedule and Form */}
          <Grid item xs={12} md={5} sx={{ width: '100%' }}>
            <motion.div 
              variants={itemVariants}
              style={{ 
                position: 'relative',
                width: '100%'
              }}
            >
              <TodaySchedule schedule={todaySchedule} />
            </motion.div>

            <motion.div 
              variants={itemVariants}
              style={{ 
                position: 'relative',
                width: '100%',
                marginTop: '2rem'
              }}
            >
              <Card 
                elevation={0}
                sx={{ 
                  height: '100%',
                  width: '100%',
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.1)'}`,
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 4px 30px rgba(0, 0, 0, 0.5)'
                    : '0 4px 30px rgba(0, 0, 0, 0.1)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{
                      fontWeight: 600,
                      mb: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: theme.palette.primary.main
                    }}
                  >
                    <BookmarkIcon sx={{ color: 'inherit' }} />
                    Generate Your Study Plan
                  </Typography>
                  
                  <Box component="form" sx={{ mt: 3 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Exam Date"
                        value={localExamDate}
                        onChange={(newDate) => setLocalExamDate(newDate)}
                        slotProps={{ 
                          textField: { 
                            fullWidth: true,
                            margin: "normal",
                            sx: {
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  '& fieldset': {
                                    borderColor: theme.palette.primary.main
                                  }
                                }
                              }
                            }
                          }
                        }}
                        disablePast
                        sx={{ mb: 3 }}
                      />
                    </LocalizationProvider>
                    
                    <FormControl component="fieldset" sx={{ mt: 2 }}>
                      <FormLabel component="legend">Select Subjects</FormLabel>
                      <FormGroup>
                        {SUBJECTS.map((subject) => (
                          <FormControlLabel
                            key={subject}
                            control={
                              <Checkbox
                                checked={selectedSubjects.includes(subject)}
                                onChange={() => handleSubjectChange(subject)}
                              />
                            }
                            label={subject}
                          />
                        ))}
                      </FormGroup>
                    </FormControl>
                    
                    <FormControl component="fieldset" sx={{ mt: 2 }}>
                      <FormLabel component="legend">Weak Subjects (Optional)</FormLabel>
                      <FormGroup>
                        {SUBJECTS.map((subject) => (
                          <FormControlLabel
                            key={subject}
                            control={
                              <Checkbox
                                checked={weakSubjects.includes(subject)}
                                onChange={() => handleWeakSubjectChange(subject)}
                                disabled={!selectedSubjects.includes(subject)}
                              />
                            }
                            label={subject}
                          />
                        ))}
                      </FormGroup>
                    </FormControl>

                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={handleGeneratePlan}
                      sx={{
                        mt: 3,
                        py: 1.5,
                        borderRadius: 2
                      }}
                      disabled={!isFormValid()}
                    >
                      {isGenerating ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        'Generate Study Plan'
                      )}
                    </Button>
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {error}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Right Column - Study Plan */}
          <Grid item xs={12} md={7} sx={{ width: '100%' }}>
            <motion.div 
              variants={itemVariants}
              style={{ 
                position: 'relative',
                width: '100%',
                height: '100%'
              }}
            >
              <Card 
                elevation={0}
                sx={{ 
                  height: '100%',
                  width: '100%',
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 3,
                  border: `1px solid ${theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.1)'}`,
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 4px 30px rgba(0, 0, 0, 0.5)'
                    : '0 4px 30px rgba(0, 0, 0, 0.1)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{
                      fontWeight: 600,
                      mb: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: theme.palette.primary.main
                    }}
                  >
                    <TimelineIcon sx={{ color: 'inherit' }} />
                    Your Study Plan
                  </Typography>
                  
                  {studyPlan && studyPlan.dailyPlan ? (
                    <List sx={{ p: 0 }}>
                      {studyPlan.dailyPlan.map((day, dayIndex) => {
                        const planDate = new Date(day.date);
                        if (!isValid(planDate)) return null;
                        
                        return (
                          <React.Fragment key={dayIndex}>
                            <ListItem
                              button
                              onClick={() => toggleDayExpansion(dayIndex)}
                              sx={{ 
                                borderRadius: 2,
                                mb: 1,
                                bgcolor: theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.03)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  bgcolor: theme.palette.mode === 'dark'
                                    ? 'rgba(255, 255, 255, 0.08)'
                                    : 'rgba(0, 0, 0, 0.05)',
                                  transform: 'translateX(4px)'
                                }
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography 
                                    variant="subtitle1" 
                                    sx={{ 
                                      fontWeight: 600,
                                      color: theme.palette.primary.main
                                    }}
                                  >
                                    {format(planDate, 'EEEE, MMMM d')}
                                  </Typography>
                                }
                                secondary={
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{ mt: 0.5 }}
                                  >
                                    {day.topics.length} topics to cover
                                  </Typography>
                                }
                              />
                              {expandedDay === dayIndex ? 
                                <ExpandLessIcon sx={{ color: theme.palette.primary.main }} /> : 
                                <ExpandMoreIcon sx={{ color: theme.palette.primary.main }} />
                              }
                            </ListItem>
                            
                            <Collapse in={expandedDay === dayIndex}>
                              <List component="div" disablePadding>
                                {day.topics.map((topic, topicIndex) => (
                                  <ListItem 
                                    key={topicIndex}
                                    sx={{ 
                                      pl: 4,
                                      borderRadius: 2,
                                      mb: 1,
                                      bgcolor: theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.03)'
                                        : 'rgba(0, 0, 0, 0.02)',
                                      transition: 'all 0.3s ease',
                                      '&:hover': {
                                        bgcolor: theme.palette.mode === 'dark'
                                          ? 'rgba(255, 255, 255, 0.05)'
                                          : 'rgba(0, 0, 0, 0.03)',
                                        transform: 'translateX(4px)'
                                      }
                                    }}
                                  >
                                    <ListItemText
                                      primary={topic}
                                      secondary={
                                        <Typography 
                                          variant="caption" 
                                          color="text.secondary"
                                          sx={{ mt: 0.5 }}
                                        >
                                          Click to mark as complete
                                        </Typography>
                                      }
                                    />
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      onClick={() => markTopicComplete(dayIndex, topicIndex)}
                                      sx={{
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                          transform: 'translateY(-2px)',
                                          boxShadow: `0 4px 12px ${theme.palette.primary.main}40`
                                        }
                                      }}
                                    >
                                      Complete
                                    </Button>
                                  </ListItem>
                                ))}
                              </List>
                            </Collapse>
                          </React.Fragment>
                        );
                      })}
                    </List>
                  ) : (
                    <Box 
                      sx={{ 
                        py: 8, 
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        background: theme.palette.mode === 'dark'
                          ? 'radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%)'
                          : 'radial-gradient(circle at center, rgba(0, 0, 0, 0.02) 0%, transparent 70%)',
                        borderRadius: 3
                      }}
                    >
                      <TimelineIcon 
                        sx={{ 
                          fontSize: 60,
                          color: theme.palette.primary.main,
                          opacity: 0.5,
                          filter: `drop-shadow(0 4px 8px ${theme.palette.primary.main}40)`
                        }} 
                      />
                      <Typography 
                        variant="h6" 
                        color="text.secondary" 
                        gutterBottom
                        sx={{ fontWeight: 600 }}
                      >
                        No study plan generated yet
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ maxWidth: 400 }}
                      >
                        Fill out the form and click "Generate Study Plan" to create your personalized study schedule
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default StudyPlannerPage;