// src/pages/HomePage.js
import React, { useContext } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  CardActionArea,
  Button, 
  Divider, 
  Chip,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  useTheme
} from '@mui/material';
import { 
  TrendingUp as TrendingIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowIcon,
  Book as BookIcon,
  School as SchoolIcon,
  CalendarToday as CalendarIcon,
  Check as CheckIcon,
  QuestionAnswer as QuestionIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { StudyContext } from '../contexts/StudyContext';
import { usePageAnimation } from '../hooks/usePageAnimation';

const HomePage = () => {
  const { 
    currentSyllabus, 
    examDate, 
    studyProgress, 
    recentQueries, 
    isOfflineMode 
  } = useContext(StudyContext);
  const theme = useTheme();
  const navigate = useNavigate();
  usePageAnimation();
  
  // Calculate date-related information
  const daysRemaining = differenceInDays(examDate, new Date());
  const formattedExamDate = format(examDate, 'MMM dd, yyyy');
  
  // Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
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
  
  // Quick action cards
  const quickActions = [
    { 
      title: 'Ask a Question', 
      description: 'Get syllabus-aligned answers with citations', 
      icon: <QuestionIcon fontSize="large" />, 
      color: theme.palette.primary.main,
      path: '/question'
    },
    { 
      title: 'Study Planner', 
      description: 'Create personalized study schedules', 
      icon: <CalendarIcon fontSize="large" />, 
      color: theme.palette.secondary.main,
      path: '/planner'
    },
    { 
      title: 'Book References', 
      description: 'Find recommended medical textbooks', 
      icon: <BookIcon fontSize="large" />, 
      color: theme.palette.info.main,
      path: '/books'
    },
    { 
      title: 'Track Progress', 
      description: 'Monitor your learning journey', 
      icon: <TrendingIcon fontSize="large" />, 
      color: theme.palette.success.main,
      path: '/progress'
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <motion.div variants={itemVariants}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } 
            }}
          >
            Welcome to MedSage
          </Typography>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            gutterBottom
            sx={{ 
              fontStyle: 'italic',
              fontWeight: 300,
              mb: 3
            }}
          >
            Your Smartest Ally in Medical Mastery 
          </Typography>
        </motion.div>
      </Box>
      
      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
          Quick Actions
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card 
                elevation={1} 
                className="hover-lift"
                sx={{ 
                  height: '100%', 
                  borderRadius: 3,
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[4]
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => navigate(action.path)}
                  sx={{ height: '100%', p: 2 }}
                >
                  <Box 
                    sx={{ 
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: action.color,
                        width: 60,
                        height: 60,
                        mb: 2
                      }}
                    >
                      {action.icon}
                    </Avatar>
                    
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                      {action.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </motion.div>
      
      {/* Main Content Section */}
      <Grid container spacing={4}>
        {/* Left Column - Stats */}
        <Grid item xs={12} md={4}>
          <motion.div variants={itemVariants}>
            <Card 
              elevation={1}
              sx={{ 
                mb: 3, 
                borderRadius: 3,
                background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Your Progress
                </Typography>
                
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <Box
                      sx={{
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        background: `conic-gradient(${theme.palette.primary.main} ${studyProgress.completionPercentage}%, ${theme.palette.divider} 0%)`,
                        transform: 'rotate(-90deg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Box
                        sx={{
                          width: 100,
                          height: 100,
                          borderRadius: '50%',
                          bgcolor: theme.palette.background.paper,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: 'rotate(90deg)'
                        }}
                      >
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {studyProgress.completionPercentage}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    of your {currentSyllabus} syllabus completed
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Exam Countdown
                  </Typography>
                  <Typography variant="h5" color="secondary" sx={{ fontWeight: 700 }}>
                    {daysRemaining} days
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    until your exam on {formattedExamDate}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Card 
              elevation={1}
              sx={{ 
                borderRadius: 3,
                background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Today's Schedule
                  </Typography>
                  <Chip 
                    icon={<ScheduleIcon />} 
                    label="3 Tasks" 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </Box>
                
                <List sx={{ p: 0 }}>
                  <ListItem 
                    sx={{ 
                      px: 0, 
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: theme.palette.background.default
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.success.light }}>
                        <CheckIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Cardiovascular System"
                      secondary="Chapter 3 • 9:00 AM"
                    />
                  </ListItem>
                  
                  <ListItem 
                    sx={{ 
                      px: 0, 
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: theme.palette.background.default
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                        <SchoolIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Pharmacology Quiz"
                      secondary="Beta Blockers • 2:00 PM"
                    />
                  </ListItem>
                  
                  <ListItem 
                    sx={{ 
                      px: 0, 
                      borderRadius: 2,
                      bgcolor: theme.palette.background.default
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: theme.palette.info.light }}>
                        <BookIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary="Review Anatomy Notes"
                      secondary="Upper Limb • 4:30 PM"
                    />
                  </ListItem>
                </List>
                
                <Button 
                  fullWidth 
                  variant="outlined" 
                  color="primary" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/planner')}
                >
                  View Full Schedule
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        
        {/* Right Column - Recent Activity */}
        <Grid item xs={12} md={8}>
          <motion.div variants={itemVariants}>
            <Card 
              elevation={1}
              sx={{ 
                height: '100%',
                borderRadius: 3,
                background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Recent Activity
                  </Typography>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    size="small"
                    endIcon={<ArrowIcon />}
                  >
                    View All
                  </Button>
                </Box>
                
                {recentQueries && recentQueries.length > 0 ? (
                  <List>
                    {recentQueries.slice(0, 5).map((query, index) => (
                      <React.Fragment key={index}>
                        <ListItem 
                          alignItems="flex-start" 
                          sx={{ 
                            px: 2, 
                            py: 1.5, 
                            borderRadius: 2,
                            mb: 1,
                            bgcolor: theme.palette.background.default,
                            '&:hover': {
                              bgcolor: theme.palette.action.hover
                            }
                          }}
                          button
                          onClick={() => navigate('/question', { state: { question: query.question } })}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              <QuestionIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                {query.question.length > 60 
                                  ? `${query.question.substring(0, 60)}...` 
                                  : query.question}
                              </Typography>
                            }
                            secondary={
                              <React.Fragment>
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {format(new Date(query.timestamp), 'MMM dd, yyyy • h:mm a')}
                                </Typography>
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary" gutterBottom>
                      No recent activity
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary"
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/question')}
                    >
                      Ask Your First Question
                    </Button>
                  </Box>
                )}
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Recommended for You
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          borderRadius: 2,
                          bgcolor: theme.palette.primary.light,
                          color: theme.palette.primary.contrastText,
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: theme.palette.primary.main,
                          }
                        }}
                        onClick={() => navigate('/books')}
                      >
                        <BookIcon sx={{ mr: 1 }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Top Anatomy References
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          borderRadius: 2,
                          bgcolor: theme.palette.secondary.light,
                          color: theme.palette.secondary.contrastText,
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: theme.palette.secondary.main,
                          }
                        }}
                        onClick={() => navigate('/planner')}
                      >
                        <CalendarIcon sx={{ mr: 1 }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Generate Study Plan
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default HomePage;