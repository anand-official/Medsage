// StudyPlannerPage.js
import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, Typography, Box, Grid, Card, CardContent, 
  Button, Divider, TextField, FormControl, InputLabel,
  Select, MenuItem, Chip, Alert, CircularProgress, 
  Paper, List, ListItem, ListItemText, Collapse
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { motion } from 'framer-motion';
import { format, differenceInDays, addDays } from 'date-fns';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import TimelineIcon from '@mui/icons-material/Timeline';

import { StudyContext } from '../contexts/StudyContext';
import { ThemeContext } from '../App';
import { usePageAnimation } from '../hooks/usePageAnimation';

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

  // Update context exam date when local date changes
  useEffect(() => {
    if (setExamDate) {
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
          {/* Form Section */}
          <Grid item xs={12} md={5}>
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
                    
                    <Box sx={{ mt: 4 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        fullWidth
                        onClick={contextGenerateStudyPlan}
                        disabled={isGenerating || selectedSubjects.length === 0}
                        sx={{ 
                          py: 1.5,
                          fontWeight: 600,
                          boxShadow: '0 4px 14px rgba(25, 118, 210, 0.3)'
                        }}
                      >
                        {isGenerating ? (
                          <>
                            <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                            Generating Plan...
                          </>
                        ) : (
                          'Generate Study Plan'
                        )}
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
          
          {/* Plan Display Section */}
          <Grid item xs={12} md={7}>
            <motion.div variants={itemVariants}>
              <Card 
                elevation={3}
                className="classic-card"
                sx={{ 
                  mb: 4,
                  background: mode === 'dark' ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom className="classic-header">
                    Your Study Plan
                  </Typography>
                  
                  {studyPlan && studyPlan.dailyPlan && studyPlan.dailyPlan.length > 0 && (
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
                  )}
                </CardContent>
              </Card>
              
              {/* Daily Plan List */}
              {studyPlan && studyPlan.dailyPlan && studyPlan.dailyPlan.length > 0 ? (
                <Box sx={{ mt: 3 }}>
                  {studyPlan.dailyPlan.map((dayTopics, dayIndex) => (
                    <motion.div
                      key={dayIndex}
                      variants={itemVariants}
                      className="animate-on-scroll"
                    >
                      <Paper 
                        elevation={2}
                        sx={{ 
                          mb: 2, 
                          overflow: 'hidden',
                          borderRadius: 2,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <Box 
                          sx={{ 
                            p: 2, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bgcolor: expandedDay === dayIndex ? 
                              'primary.light' : 
                              (mode === 'dark' ? 'background.paper' : 'grey.100')
                          }}
                          onClick={() => toggleDayExpansion(dayIndex)}
                        >
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: 600,
                              color: expandedDay === dayIndex ? 'white' : 'text.primary'
                            }}
                          >
                            Day {dayIndex + 1} - {format(addDays(new Date(), dayIndex), 'EEEE, MMM d')}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Chip 
                              label={`${dayTopics.length} topics`} 
                              size="small" 
                              color={expandedDay === dayIndex ? "secondary" : "default"}
                              sx={{ mr: 1 }}
                            />
                            {expandedDay === dayIndex ? 
                              <ExpandLessIcon /> : 
                              <ExpandMoreIcon />
                            }
                          </Box>
                        </Box>
                        
                        <Collapse in={expandedDay === dayIndex}>
                          <List>
                            {dayTopics.map((topic, topicIndex) => (
                              <ListItem 
                                key={topicIndex}
                                secondaryAction={
                                  <Button
                                    size="small"
                                    startIcon={<BookmarkIcon />}
                                    onClick={() => markTopicComplete(dayIndex, topicIndex)}
                                    color="success"
                                    variant="outlined"
                                    sx={{ borderRadius: 2 }}
                                  >
                                    Mark Complete
                                  </Button>
                                }
                                sx={{
                                  '&:hover': {
                                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                                  }
                                }}
                              >
                                <ListItemText 
                                  primary={topic} 
                                  secondary={`${progress[topic] || 0}% completed`} 
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Collapse>
                      </Paper>
                    </motion.div>
                  ))}
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    py: 6,
                    px: 3,
                    bgcolor: mode === 'dark' ? 'rgba(30, 30, 30, 0.6)' : 'rgba(245, 245, 245, 0.8)',
                    borderRadius: 2,
                    textAlign: 'center'
                  }}
                >
                  <TimelineIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Study Plan Generated Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Select your subjects and exam date to generate a personalized study plan.
                  </Typography>
                </Box>
              )}
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default StudyPlannerPage;