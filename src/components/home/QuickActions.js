import React, { useContext } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Checkbox,
  useTheme,
  Paper
} from '@mui/material';
import { 
  QuestionAnswer as QuestionIcon,
  School as SchoolIcon,
  Book as BookIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyContext } from '../../contexts/StudyContext';
import { format } from 'date-fns';

const QuickActions = () => {
  const { studyPlan, loading } = useStudyContext();
  const theme = useTheme();
  const navigate = useNavigate();

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const quickActions = [
    {
      title: 'Ask a Question',
      description: 'Get instant answers to your medical queries',
      icon: <QuestionIcon />,
      color: theme.palette.primary.main,
      path: '/question'
    },
    {
      title: 'Study Planner',
      description: 'Create and manage your study schedule',
      icon: <SchoolIcon />,
      color: theme.palette.secondary.main,
      path: '/planner'
    },
    {
      title: 'Book References',
      description: 'Access recommended medical textbooks',
      icon: <BookIcon />,
      color: theme.palette.success.main,
      path: '/books'
    }
  ];

  const todayTasks = [
    { id: 1, title: 'Review Cardiovascular System', completed: true },
    { id: 2, title: 'Practice MCQs - Respiratory System', completed: false },
    { id: 3, title: 'Read Chapter 5 - Nervous System', completed: false }
  ];

  return (
    <motion.div variants={itemVariants}>
      <Box>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <QuestionIcon sx={{ color: theme.palette.primary.main }} />
          Quick Actions
        </Typography>

        <Grid container spacing={2}>
          {/* Quick Action Cards */}
          {quickActions.map((action, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card 
                elevation={0}
                sx={{ 
                  height: '100%',
                  borderRadius: 4,
                  background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                  border: `1px solid ${theme.palette.divider}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 4px 12px ${action.color}20`,
                    borderColor: action.color
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2,
                    mb: 2
                  }}>
                    <Box sx={{ 
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: `${action.color}15`,
                      color: action.color
                    }}>
                      {action.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {action.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {action.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate(action.path)}
                    sx={{
                      mt: 2,
                      py: 1.5,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${action.color} 0%, ${action.color}dd 100%)`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${action.color}dd 0%, ${action.color} 100%)`,
                      }
                    }}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* Today's Schedule */}
          <Grid item xs={12} md={8}>
            <Card 
              elevation={0}
              sx={{ 
                height: '100%',
                borderRadius: 4,
                background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}20`,
                  borderColor: theme.palette.primary.main
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  mb: 3
                }}>
                  <Box sx={{ 
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: `${theme.palette.primary.main}15`,
                    color: theme.palette.primary.main
                  }}>
                    <CalendarIcon />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Today's Schedule
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                    </Typography>
                  </Box>
                </Box>

                <List sx={{ mb: 2 }}>
                  {todayTasks.map((task) => (
                    <ListItem 
                      key={task.id}
                      sx={{ 
                        px: 2, 
                        py: 1.5, 
                        borderRadius: 2,
                        mb: 1,
                        bgcolor: theme.palette.background.default,
                        border: `1px solid ${theme.palette.divider}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: `${theme.palette.primary.main}05`,
                          borderColor: `${theme.palette.primary.main}20`
                        }
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={task.completed}
                          icon={<UncheckedIcon />}
                          checkedIcon={<CheckCircleIcon sx={{ color: theme.palette.success.main }} />}
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: 500,
                              textDecoration: task.completed ? 'line-through' : 'none',
                              color: task.completed ? 'text.secondary' : 'text.primary'
                            }}
                          >
                            {task.title}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/planner')}
                  sx={{
                    mt: 2,
                    py: 1.5,
                    borderRadius: 2,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      background: `${theme.palette.primary.main}10`
                    }
                  }}
                >
                  View Full Schedule
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default QuickActions; 