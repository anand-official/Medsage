import React, { useContext, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  CardActions, Button, Divider, List, ListItem,
  ListItemText, ListItemIcon, Chip, useTheme, 
  Container, Fade, Grow, Slide, Avatar, CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  QuestionAnswer as QuestionIcon,
  CalendarToday as CalendarIcon,
  Book as BookIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  Bookmark as BookmarkIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { StudyContext } from '../contexts/StudyContext';
import { usePageAnimation } from '../hooks/usePageAnimation';
import { format, differenceInDays } from 'date-fns';
import '../animations.css';

const HomePage = () => {
  const { 
    currentSyllabus, 
    examDate, 
    studyProgress, 
    recentQueries, 
    isOfflineMode 
  } = useContext(StudyContext);
  const theme = useTheme();
  usePageAnimation();
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 80, damping: 12 }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero Section with elegant animation */}
      <Fade in timeout={800}>
        <Box sx={{ 
          textAlign: 'center', 
          mb: 6
        }}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Typography 
              variant="h2" 
              component="h1"
              className="classic-header"
              sx={{ 
                fontWeight: 700,
                mb: 2,
                backgroundImage: 'linear-gradient(135deg, #333, #000)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '0.02em'
              }}
            >
              MedSage
            </Typography>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
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
              Your AI-powered medical learning assistant
            </Typography>
          </motion.div>
        </Box>
      </Fade>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Grid container spacing={4}>
          {/* Feature Cards Section */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Typography 
                variant="h4" 
                sx={{ 
                  mb: 3, 
                  fontWeight: 600,
                  textAlign: 'left',
                  position: 'relative',
                  '&:after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-10px',
                    left: 0,
                    width: '60px',
                    height: '3px',
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: '2px'
                  }
                }}
              >
                Learning Tools
              </Typography>
            </motion.div>
            
            <Grid container spacing={3}>
              {[
                {
                  title: "Ask a Question",
                  icon: <QuestionIcon />,
                  description: "Get answers to your medical questions with textbook references",
                  to: "/question",
                  color: theme.palette.primary.main
                },
                {
                  title: "Study Planner",
                  icon: <CalendarIcon />,
                  description: "Create and manage your personalized study schedule",
                  to: "/planner",
                  color: theme.palette.secondary.main
                },
                {
                  title: "Book References",
                  icon: <BookIcon />,
                  description: "Browse recommended medical textbooks and resources",
                  to: "/books",
                  color: "#f57c00"
                },
                {
                  title: "Track Progress",
                  icon: <TrendingIcon />,
                  description: "Monitor your learning journey and identify weak areas",
                  to: "/planner",
                  color: "#7cb342"
                }
              ].map((feature, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + (index * 0.1) }}
                    whileHover={{ 
                      y: -8,
                      transition: { duration: 0.2 }
                    }}
                    className="hover-lift shine"
                  >
                    <Paper
                      elevation={0}
                      component={RouterLink}
                      to={feature.to}
                      sx={{
                        p: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        bgcolor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: 2,
                        border: '1px solid rgba(0,0,0,0.05)',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        overflow: 'hidden',
                        position: 'relative',
                        '&:hover': { 
                          boxShadow: '0 15px 30px rgba(0,0,0,0.07)',
                          bgcolor: 'rgba(255, 255, 255, 1)',
                          borderColor: 'transparent',
                          transform: 'translateY(-5px)'
                        },
                        '&:after': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                          transition: 'all 0.6s',
                        },
                        '&:hover:after': {
                          left: '100%'
                        }
                      }}
                      style={{ textDecoration: 'none' }}
                    >
                      <Box
                        sx={{
                          width: 70,
                          height: 70,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 3,
                          background: `linear-gradient(135deg, ${feature.color}90, ${feature.color}40)`,
                          boxShadow: `0 5px 15px ${feature.color}30`,
                          transition: 'all 0.3s ease'
                        }}
                        className="float"
                      >
                        {React.cloneElement(feature.icon, { 
                          sx: { fontSize: 32, color: feature.color } 
                        })}
                      </Box>
                      <Typography 
                        variant="h6" 
                        component="h3" 
                        gutterBottom
                        sx={{ 
                          fontWeight: 600,
                          transition: 'color 0.3s ease'
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ lineHeight: 1.7 }}
                      >
                        {feature.description}
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Study Progress Section */}
          <Grid item xs={12} md={4}>
            <motion.div 
              variants={itemVariants}
              className="animate-on-scroll"
            >
              <Card sx={{ 
                borderRadius: 2, 
                boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
                height: '100%',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                }
              }}>
                <CardContent>
                  <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    Study Progress
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    mb: 2 
                  }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                      >
                        <CircularProgress 
                          variant="determinate" 
                          value={studyProgress?.completionPercentage || 0} 
                          size={120}
                          thickness={4}
                          sx={{ color: theme.palette.primary.main }}
                        />
                      </motion.div>
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.9 }}
                        >
                          <Typography
                            variant="h4"
                            component="div"
                            color="text.primary"
                            sx={{ fontWeight: 700 }}
                          >
                            {studyProgress?.completionPercentage || 0}%
                          </Typography>
                        </motion.div>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                      of your {currentSyllabus} syllabus completed
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      Exam Countdown
                    </Typography>
                    <Typography variant="h5" color="secondary" sx={{ fontWeight: 700 }}>
                      {differenceInDays(examDate, new Date())} days
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      until your exam on {format(examDate, 'MMM dd, yyyy')}
                    </Typography>
                  </Box>

                  <List>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <TrendingIcon color="secondary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Topics Completed" 
                        secondary={`${studyProgress?.length || 0} topics`}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Recent Activity Section */}
          <Grid item xs={12} md={8}>
            <motion.div 
              variants={itemVariants}
              className="animate-on-scroll"
            >
              <Card sx={{ 
                borderRadius: 2, 
                boxShadow: '0 5px 20px rgba(0,0,0,0.05)',
                height: '100%',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
                }
              }}>
                <CardContent>
                  <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    Recent Questions
                  </Typography>
                  
                  {recentQueries && recentQueries.length > 0 ? (
                    <List>
                      {recentQueries.slice(0, 4).map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + (index * 0.1) }}
                        >
                          <ListItem 
                            sx={{ 
                              px: 0, 
                              py: 1.5,
                              borderBottom: index < recentQueries.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                              transition: 'background-color 0.2s ease',
                              borderRadius: 1,
                              '&:hover': {
                                backgroundColor: 'rgba(0,0,0,0.02)'
                              }
                            }}
                            button
                            component={RouterLink}
                            to="/question"
                          >
                            <ListItemIcon>
                              <Avatar 
                                sx={{ 
                                  bgcolor: `${theme.palette.primary.main}20`,
                                  color: theme.palette.primary.main
                                }}
                              >
                                <QuestionIcon fontSize="small" />
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText 
                              primary={item.query.length > 60 ? item.query.substring(0, 60) + '...' : item.query} 
                              secondary={format(new Date(item.timestamp), 'MMM dd, yyyy • h:mm a')}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                        </motion.div>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ 
                      textAlign: 'center', 
                      py: 6,
                      opacity: 0.7
                    }}>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.4 }}
                      >
                        <QuestionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No recent questions yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Start asking medical questions to see your history here
                        </Typography>
                        
                        <Button 
                          component={RouterLink} 
                          to="/question" 
                          variant="outlined"
                          sx={{ mt: 3 }}
                          endIcon={<QuestionIcon />}
                        >
                          Ask Your First Question
                        </Button>
                      </motion.div>
                    </Box>
                  )}

                  {recentQueries && recentQueries.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                      <Button 
                        component={RouterLink} 
                        to="/question" 
                        color="primary"
                        variant="outlined"
                        sx={{ 
                          borderRadius: 2,
                          px: 3,
                          py: 1,
                          transition: 'all 0.3s ease',
                        }}
                        endIcon={<QuestionIcon />}
                      >
                        Ask New Question
                      </Button>
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

export default HomePage;