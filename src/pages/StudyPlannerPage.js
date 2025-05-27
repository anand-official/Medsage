// StudyPlannerPage.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, Typography, Box, Grid, Card, CardContent, 
  Button, Divider, TextField, FormControl, InputLabel,
  Select, MenuItem, Chip, Alert, CircularProgress, 
  Paper, List, ListItem, ListItemText, Collapse,
  useTheme
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

import { StudyContext } from '../contexts/StudyContext';
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
    studyPlan
  } = useContext(StudyContext);
  
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
  const handleSubjectChange = (event) => {
    setSelectedSubjects(event.target.value);
  };

  // Handle weak subject selection
  const handleWeakSubjectChange = (event) => {
    setWeakSubjects(event.target.value);
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
        staggerChildren: 0.1 
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Page Header */}
        <motion.div variants={itemVariants}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              mb: 4
            }}
          >
            <CalendarTodayIcon sx={{ mr: 2 }} />
            Study Planner
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {/* Left Column - Today's Schedule and Form */}
          <Grid item xs={12} md={5}>
            <motion.div variants={itemVariants}>
              <TodaySchedule schedule={getTodaySchedule()} />
            </motion.div>

            <motion.div variants={itemVariants} style={{ marginTop: '2rem' }}>
              <Card 
                elevation={3}
                className="classic-card"
                sx={{ 
                  height: '100%',
                  background: mode === 'dark' ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom className="classic-header">
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
                            margin: "normal"
                          }
                        }}
                        disablePast
                        sx={{ mb: 3 }}
                      />
                    </LocalizationProvider>
                    
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Subjects to Study</InputLabel>
                      <Select
                        multiple
                        value={selectedSubjects}
                        onChange={handleSubjectChange}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {SUBJECTS.map((subject) => (
                          <MenuItem key={subject} value={subject}>
                            {subject}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Weak Areas (Priority)</InputLabel>
                      <Select
                        multiple
                        value={weakSubjects}
                        onChange={handleWeakSubjectChange}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip 
                                key={value} 
                                label={value} 
                                size="small"
                                color="secondary"
                              />
                            ))}
                          </Box>
                        )}
                      >
                        {SUBJECTS.map((subject) => (
                          <MenuItem key={subject} value={subject}>
                            {subject}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={contextGenerateStudyPlan}
                      disabled={isGenerating}
                      sx={{ mt: 3 }}
                    >
                      {isGenerating ? (
                        <>
                          <CircularProgress size={24} sx={{ mr: 1 }} />
                          Generating Plan...
                        </>
                      ) : (
                        'Generate Study Plan'
                      )}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Right Column - Study Plan */}
          <Grid item xs={12} md={7}>
            <motion.div variants={itemVariants}>
              <Card 
                elevation={3}
                className="classic-card"
                sx={{ 
                  height: '100%',
                  background: mode === 'dark' ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom className="classic-header">
                    Your Study Plan
                  </Typography>
                  
                  {studyPlan && studyPlan.dailyPlan ? (
                    <List>
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
                                bgcolor: theme.palette.background.default
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {format(planDate, 'EEEE, MMMM d')}
                                  </Typography>
                                }
                                secondary={`${day.topics.length} topics`}
                              />
                              {expandedDay === dayIndex ? <ExpandLessIcon /> : <ExpandMoreIcon />}
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
                                      bgcolor: theme.palette.background.paper
                                    }}
                                  >
                                    <ListItemText
                                      primary={topic}
                                      secondary="Click to mark as complete"
                                    />
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      onClick={() => markTopicComplete(dayIndex, topicIndex)}
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
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary" gutterBottom>
                        No study plan generated yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Fill out the form and click "Generate Study Plan" to get started
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