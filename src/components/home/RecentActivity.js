import React, { useContext } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Button, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Paper, 
  Grid,
  useTheme,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import { 
  ArrowForward as ArrowIcon,
  QuestionAnswer as QuestionIcon,
  Book as BookIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { StudyContext } from '../../contexts/StudyContext';

const RecentActivity = () => {
  const { recentQueries, studyProgress } = useContext(StudyContext);
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

  const recommendedTopics = [
    {
      title: 'Cardiovascular System',
      icon: <BookIcon />,
      color: theme.palette.primary.main,
      progress: 75
    },
    {
      title: 'Respiratory System',
      icon: <BookIcon />,
      color: theme.palette.secondary.main,
      progress: 45
    },
    {
      title: 'Nervous System',
      icon: <BookIcon />,
      color: theme.palette.success.main,
      progress: 30
    }
  ];

  const trackProgress = [
    {
      title: 'Anatomy',
      progress: 85,
      color: theme.palette.primary.main
    },
    {
      title: 'Physiology',
      progress: 65,
      color: theme.palette.secondary.main
    },
    {
      title: 'Biochemistry',
      progress: 45,
      color: theme.palette.success.main
    }
  ];

  return (
    <motion.div variants={itemVariants}>
      <Card 
        elevation={0}
        sx={{ 
          height: '100%',
          borderRadius: 4,
          background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 3 
          }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <QuestionIcon sx={{ color: theme.palette.primary.main }} />
              Recent Activity
            </Typography>
            <Button 
              variant="outlined" 
              color="primary"
              size="small"
              endIcon={<ArrowIcon />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 2
              }}
            >
              View All
            </Button>
          </Box>
          
          {recentQueries && recentQueries.length > 0 ? (
            <List sx={{ mb: 4 }}>
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
                      border: `1px solid ${theme.palette.divider}`,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateX(4px)',
                        bgcolor: `${theme.palette.primary.main}05`,
                        borderColor: `${theme.palette.primary.main}20`
                      }
                    }}
                    button
                    onClick={() => navigate('/question', { state: { question: query.question } })}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${theme.palette.primary.main}15`,
                          color: theme.palette.primary.main
                        }}
                      >
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
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          mt: 0.5
                        }}>
                          <Chip
                            size="small"
                            label={format(new Date(query.timestamp), 'MMM dd, yyyy')}
                            sx={{
                              bgcolor: `${theme.palette.primary.main}10`,
                              color: theme.palette.primary.main,
                              height: 24
                            }}
                          />
                          <Chip
                            size="small"
                            label={format(new Date(query.timestamp), 'h:mm a')}
                            sx={{
                              bgcolor: `${theme.palette.secondary.main}10`,
                              color: theme.palette.secondary.main,
                              height: 24
                            }}
                          />
                        </Box>
                      }
                    />
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <StarBorderIcon fontSize="small" />
                    </IconButton>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ 
              py: 4, 
              textAlign: 'center',
              bgcolor: `${theme.palette.primary.main}05`,
              borderRadius: 2,
              mb: 4
            }}>
              <QuestionIcon sx={{ 
                fontSize: 48, 
                color: theme.palette.primary.main,
                mb: 2,
                opacity: 0.5
              }} />
              <Typography color="text.secondary" gutterBottom>
                No recent activity
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                sx={{ 
                  mt: 2,
                  borderRadius: 2,
                  px: 3
                }}
                onClick={() => navigate('/question')}
              >
                Ask Your First Question
              </Button>
            </Box>
          )}
          
          <Grid container spacing={3}>
            {/* Book References Section */}
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <BookIcon sx={{ color: theme.palette.primary.main }} />
                  Book References
                </Typography>
                
                <Grid container spacing={2}>
                  {recommendedTopics.map((topic, index) => (
                    <Grid item xs={12} key={index}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          borderRadius: 2,
                          bgcolor: `${topic.color}10`,
                          border: `1px solid ${topic.color}20`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 4px 12px ${topic.color}20`,
                            borderColor: topic.color
                          }
                        }}
                        onClick={() => navigate('/planner')}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          mb: 1
                        }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: `${topic.color}20`,
                              color: topic.color,
                              width: 32,
                              height: 32
                            }}
                          >
                            {topic.icon}
                          </Avatar>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {topic.title}
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Progress
                          </Typography>
                          <Box sx={{ 
                            height: 4, 
                            bgcolor: `${topic.color}20`,
                            borderRadius: 2,
                            overflow: 'hidden'
                          }}>
                            <Box sx={{ 
                              height: '100%', 
                              width: `${topic.progress}%`,
                              bgcolor: topic.color,
                              borderRadius: 2
                            }} />
                          </Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ mt: 0.5, textAlign: 'right' }}
                          >
                            {topic.progress}%
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>

            {/* Track Progress Section */}
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <TrendingIcon sx={{ color: theme.palette.warning.main }} />
                  Track Progress
                </Typography>
                
                <Grid container spacing={2}>
                  {trackProgress.map((track, index) => (
                    <Grid item xs={12} key={index}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2,
                          borderRadius: 2,
                          bgcolor: `${track.color}10`,
                          border: `1px solid ${track.color}20`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 4px 12px ${track.color}20`,
                            borderColor: track.color
                          }
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1
                        }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {track.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: track.color,
                              fontWeight: 600
                            }}
                          >
                            {track.progress}%
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          height: 6, 
                          bgcolor: `${track.color}20`,
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <Box sx={{ 
                            height: '100%', 
                            width: `${track.progress}%`,
                            bgcolor: track.color,
                            borderRadius: 3
                          }} />
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RecentActivity; 