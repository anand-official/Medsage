import React, { useContext } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  useTheme,
  LinearProgress,
  Grid,
  Tooltip,
  IconButton,
  Avatar,
  Badge,
  useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import { useStudyContext } from '../../contexts/StudyContext';
import { 
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingIcon,
  EmojiEvents as TrophyIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';

const ProgressCard = () => {
  const { studyPlan, loading } = useStudyContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
    return (
      <Box sx={{ 
        p: 3,
        borderRadius: 2,
        bgcolor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.05)' 
          : 'rgba(0, 0, 0, 0.02)',
        border: `1px solid ${theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(0, 0, 0, 0.1)'}`,
      }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const completionPercentage = studyPlan?.completionPercentage || 0;
  const completedTopics = studyPlan?.completedTopics || 0;
  const totalTopics = studyPlan?.totalTopics || 0;

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const stats = [
    {
      label: 'Completion',
      value: `${completionPercentage}%`,
      icon: <CheckCircleIcon />,
      color: theme.palette.primary.main,
      tooltip: 'Overall completion of your study plan'
    },
    {
      label: 'Topics',
      value: `${completedTopics}/${totalTopics}`,
      icon: <SchoolIcon />,
      color: theme.palette.secondary.main,
      tooltip: 'Topics covered vs total topics'
    },
    {
      label: 'Streak',
      value: '7 days',
      icon: <TimerIcon />,
      color: theme.palette.success.main,
      tooltip: 'Current study streak'
    },
    {
      label: 'Progress',
      value: '+12%',
      icon: <TrendingIcon />,
      color: theme.palette.warning.main,
      tooltip: 'Progress made this week'
    }
  ];

  const achievements = [
    { id: 1, title: 'Early Bird', icon: <TimerIcon />, color: theme.palette.primary.main },
    { id: 2, title: 'Quick Learner', icon: <SchoolIcon />, color: theme.palette.success.main }
  ];

  return (
    <motion.div variants={itemVariants}>
      <Card 
        elevation={0}
        sx={{ 
          borderRadius: 4,
          background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          {/* Header with Notifications */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 3
          }}>
            <Typography variant="h5" sx={{ 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <TrendingIcon sx={{ color: theme.palette.primary.main }} />
              Study Progress
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="View Achievements">
                <IconButton size="small">
                  <Badge badgeContent={2} color="primary">
                    <TrophyIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Notifications">
                <IconButton size="small">
                  <Badge badgeContent={1} color="error">
                    <NotificationIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Progress Circle */}
            <Grid item xs={12} md={4}>
              <Box sx={{ 
                position: 'relative',
                width: { xs: 140, md: 160 },
                height: { xs: 140, md: 160 },
                mx: 'auto'
              }}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: `conic-gradient(${theme.palette.primary.main} ${completionPercentage}%, ${theme.palette.divider} 0%)`,
                    transform: 'rotate(-90deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Box
                    sx={{
                      width: '85%',
                      height: '85%',
                      borderRadius: '50%',
                      bgcolor: theme.palette.background.paper,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: 'rotate(90deg)',
                      boxShadow: `0 4px 12px ${theme.palette.primary.main}20`
                    }}
                  >
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {completionPercentage}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Stats Grid */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                {stats.map((stat, index) => (
                  <Grid item xs={6} key={index}>
                    <Tooltip title={stat.tooltip}>
                      <Box sx={{ 
                        p: 2,
                        borderRadius: 2,
                        bgcolor: `${stat.color}10`,
                        border: `1px solid ${stat.color}20`,
                        height: '100%',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: `0 4px 12px ${stat.color}20`,
                          borderColor: stat.color
                        }
                      }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          mb: 1
                        }}>
                          <Box sx={{ 
                            color: stat.color,
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {stat.icon}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {stat.label}
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {stat.value}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>

              {/* Achievements Section */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'text.secondary'
                }}>
                  <TrophyIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                  Recent Achievements
                </Typography>
                <Grid container spacing={1.5}>
                  {achievements.map((achievement) => (
                    <Grid item xs={6} key={achievement.id}>
                      <Box sx={{ 
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: `${achievement.color}10`,
                        border: `1px solid ${achievement.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5
                      }}>
                        <Avatar sx={{ 
                          width: 32,
                          height: 32,
                          bgcolor: `${achievement.color}20`,
                          color: achievement.color
                        }}>
                          {achievement.icon}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {achievement.title}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
          </Grid>

          {/* Progress Bar */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1
            }}>
              <Typography variant="body2" color="text.secondary">
                Overall Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {completedTopics} of {totalTopics} topics completed
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={completionPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: `${theme.palette.primary.main}20`,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProgressCard; 