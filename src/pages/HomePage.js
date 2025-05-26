import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Grid, Card, CardContent, CardActionArea, 
  Button, Paper, Divider, Avatar, IconButton, Grow, Fade,
  useTheme, alpha, Container, CircularProgress, Chip
} from '@mui/material';
import { 
  School as SchoolIcon,
  QuestionAnswer as QuestionIcon,
  CalendarMonth as CalendarIcon,
  MenuBook as BookIcon,
  TrendingUp as TrendingUpIcon,
  Bookmark as BookmarkIcon,
  Notifications as NotificationsIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { StudyContext } from '../contexts/StudyContext';
import { getBookmarks } from '../utils/bookmarkUtils';

const HomePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { studyProgress, examDate, currentSyllabus } = useContext(StudyContext);
  const bookmarks = getBookmarks();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    topicsCompleted: 0,
    daysUntilExam: 0,
    recentActivity: 0
  });

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setStats({
        topicsCompleted: studyProgress?.length || 0,
        daysUntilExam: examDate ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)) : 30,
        recentActivity: 7
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [studyProgress, examDate]);

  // Animation variants for cards
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Navigation cards configuration
  const navCards = [
    { 
      title: 'Question & Answer', 
      description: 'Get precise answers to your medical questions with citations',
      icon: <QuestionIcon fontSize="large" color="primary" />,
      path: '/question',
      color: theme.palette.primary.main
    },
    { 
      title: 'Study Planner', 
      description: 'Create and manage your personalized study schedule',
      icon: <CalendarIcon fontSize="large" color="secondary" />,
      path: '/planner',
      color: theme.palette.secondary.main
    },
    { 
      title: 'Book References', 
      description: 'Access recommended textbooks and resources',
      icon: <BookIcon fontSize="large" style={{ color: theme.palette.success.main }} />,
      path: '/books',
      color: theme.palette.success.main
    }
  ];

  return (
    <Container maxWidth="lg">
      <Fade in={true} timeout={1000}>
        <Box sx={{ position: 'relative', overflow: 'hidden', mb: 6 }}>
          {/* Header area with wave background */}
          <Box 
            sx={{ 
              position: 'relative',
              borderRadius: 4,
              overflow: 'hidden',
              pt: 8,
              pb: 6,
              px: 4,
              backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.8)} 100%)`,
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
              color: 'white',
            }}
          >
            {/* Animated wave background - created using SVG */}
            <Box sx={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              width: '100%',
              height: '30%',
              opacity: 0.4,
              animation: 'wave 8s ease-in-out infinite alternate',
              '@keyframes wave': {
                '0%': { transform: 'translateX(-5%)' },
                '100%': { transform: 'translateX(5%)' }
              }
            }}>
              <svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                <path fill="#ffffff" fillOpacity="1" d="M0,224L60,213.3C120,203,240,181,360,176C480,171,600,181,720,181.3C840,181,960,171,1080,176C1200,181,1320,203,1380,213.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
              </svg>
            </Box>

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'white', 
                      color: theme.palette.primary.main, 
                      width: 56, 
                      height: 56,
                      boxShadow: 3,
                      mr: 2
                    }}
                  >
                    <SchoolIcon fontSize="large" />
                  </Avatar>
                  <Box>
                    <Typography variant="h3" component="h1" fontWeight="bold" 
                      sx={{ 
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        fontSize: { xs: '2rem', md: '2.5rem' }
                      }}
                    >
                      MedSage
                    </Typography>
                    <Typography variant="h6" 
                      sx={{ 
                        opacity: 0.9,
                        fontSize: { xs: '1rem', md: '1.25rem' }
                      }}
                    >
                      Your AI-powered medical learning assistant
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                  <IconButton 
                    color="inherit" 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.15)', 
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                      mr: 1
                    }}
                  >
                    <NotificationsIcon />
                  </IconButton>
                  <IconButton 
                    color="inherit" 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.15)', 
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } 
                    }}
                  >
                    <MoreIcon />
                  </IconButton>
                </Box>
              </Box>
              
              <Grid container spacing={3} sx={{ mt: 2 }}>
                {loading ? (
                  <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress color="inherit" />
                  </Grid>
                ) : (
                  <>
                    <Grid item xs={12} sm={4}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(255,255,255,0.15)', 
                          backdropFilter: 'blur(10px)',
                          borderRadius: 3,
                          textAlign: 'center',
                          transition: 'transform 0.3s',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            bgcolor: 'rgba(255,255,255,0.2)'
                          }
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold">
                          {stats.topicsCompleted}
                        </Typography>
                        <Typography variant="body2">
                          Topics Completed
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(255,255,255,0.15)', 
                          backdropFilter: 'blur(10px)',
                          borderRadius: 3,
                          textAlign: 'center',
                          transition: 'transform 0.3s',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            bgcolor: 'rgba(255,255,255,0.2)'
                          }
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold">
                          {stats.daysUntilExam}
                        </Typography>
                        <Typography variant="body2">
                          Days Until Exam
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          bgcolor: 'rgba(255,255,255,0.15)', 
                          backdropFilter: 'blur(10px)',
                          borderRadius: 3,
                          textAlign: 'center',
                          transition: 'transform 0.3s',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            bgcolor: 'rgba(255,255,255,0.2)'
                          }
                        }}
                      >
                        <Typography variant="h4" fontWeight="bold">
                          {stats.recentActivity}
                        </Typography>
                        <Typography variant="body2">
                          Recent Activities
                        </Typography>
                      </Paper>
                    </Grid>
                  </>
                )}
              </Grid>
              
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Chip 
                  label={`Current Syllabus: ${currentSyllabus}`} 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 'medium',
                    px: 1
                  }} 
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Fade>

      {/* Main Navigation Cards */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h5" component="h2" fontWeight="bold" sx={{ mb: 3 }}>
          Start Your Learning Journey
        </Typography>
        
        <Grid container spacing={3}>
          {navCards.map((card, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Grow in={true} timeout={(index + 1) * 300}>
                <Card 
                  component={motion.div}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  sx={{ 
                    height: '100%',
                    borderRadius: 4,
                    overflow: 'hidden',
                    boxShadow: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 8,
                      '& .hover-overlay': {
                        opacity: 1
                      }
                    }
                  }}
                >
                  <CardActionArea 
                    onClick={() => navigate(card.path)}
                    sx={{ height: '100%', position: 'relative' }}
                  >
                    <Box 
                      className="hover-overlay"
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: `linear-gradient(135deg, ${alpha(card.color, 0.1)}, ${alpha(card.color, 0.3)})`,
                        opacity: 0,
                        transition: 'opacity 0.3s ease'
                      }}
                    />
                    <Box 
                      sx={{
                        height: 8,
                        width: '100%',
                        bgcolor: card.color
                      }}
                    />
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(card.color, 0.1),
                            color: card.color,
                            width: 64,
                            height: 64,
                          }}
                        >
                          {card.icon}
                        </Avatar>
                      </Box>
                      <Typography variant="h5" component="h3" fontWeight="bold" gutterBottom>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grow>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Quick Stats and Recent Activity Section */}
      <Grid container spacing={4} sx={{ mb: 5 }}>
        {/* Recent Activity */}
        <Grid item xs={12} md={7}>
          <Fade in={true} timeout={800}>
            <Card sx={{ 
              borderRadius: 4, 
              boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px 0 rgba(0,0,0,0.5)' : '0 4px 20px 0 rgba(0,0,0,0.1)',
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  right: 0, 
                  width: '50%', 
                  height: '100%',
                  background: `linear-gradient(135deg, transparent, ${alpha(theme.palette.primary.main, 0.05)})`,
                  zIndex: 0
                }}
              />
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" component="h3" fontWeight="bold">
                    Recent Activity
                  </Typography>
                  <TrendingUpIcon color="primary" />
                </Box>
                <Divider sx={{ mb: 2 }} />

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box>
                    {/* Mock activity items - would be populated from actual user data */}
                    {[1, 2, 3].map((item, index) => (
                      <Paper 
                        key={index} 
                        elevation={0}
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderRadius: 2, 
                          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : alpha(theme.palette.background.paper, 0.8),
                          border: `1px solid ${theme.palette.divider}`,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateX(5px)',
                            boxShadow: 1
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {index === 0 ? 'Completed Cardiovascular Chapter' : 
                             index === 1 ? 'Created New Study Plan' : 'Bookmarked Gray\'s Anatomy'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {index === 0 ? '2 hours ago' : 
                             index === 1 ? 'Yesterday' : '3 days ago'}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                    
                    <Button 
                      variant="outlined"
                      sx={{ 
                        mt: 1, 
                        borderRadius: 6, 
                        px: 3,
                        transition: 'all 0.2s',
                        '&:hover': {
                          px: 4,
                          bgcolor: alpha(theme.palette.primary.main, 0.1)
                        }
                      }}
                    >
                      View All Activity
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        </Grid>

        {/* Bookmarks */}
        <Grid item xs={12} md={5}>
          <Fade in={true} timeout={1000}>
            <Card sx={{ 
              borderRadius: 4, 
              boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px 0 rgba(0,0,0,0.5)' : '0 4px 20px 0 rgba(0,0,0,0.1)',
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box 
                sx={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                  width: '70%', 
                  height: '50%',
                  background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 70%)`,
                  zIndex: 0
                }}
              />
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" component="h3" fontWeight="bold">
                    Bookmarks
                  </Typography>
                  <BookmarkIcon color="secondary" />
                </Box>
                <Divider sx={{ mb: 2 }} />

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : bookmarks && bookmarks.length > 0 ? (
                  <Box>
                    {bookmarks.slice(0, 3).map((bookmark, index) => (
                      <Box 
                        key={index}
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          borderRadius: 2,
                          bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : alpha(theme.palette.background.paper, 0.8),
                          border: `1px solid ${theme.palette.divider}`,
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateX(5px)',
                            boxShadow: 1
                          },
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/question?q=${encodeURIComponent(bookmark.text)}`)}
                      >
                        <Typography variant="body2" noWrap fontWeight="medium">
                          {bookmark.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Bookmarked on {new Date(bookmark.timestamp).toLocaleDateString()}
                        </Typography>
                      </Box>
                    ))}
                    {bookmarks.length > 3 && (
                      <Button 
                        variant="outlined" 
                        color="secondary"
                        sx={{ 
                          mt: 1, 
                          borderRadius: 6, 
                          px: 3,
                          transition: 'all 0.2s',
                          '&:hover': {
                            px: 4,
                            bgcolor: alpha(theme.palette.secondary.main, 0.1)
                          }
                        }}
                      >
                        View All Bookmarks
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <BookmarkIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                      No bookmarks yet. Save important information as you study!
                    </Typography>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      sx={{ 
                        mt: 2,
                        borderRadius: 6,
                        px: 3
                      }}
                      onClick={() => navigate('/question')}
                    >
                      Start Learning
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        </Grid>
      </Grid>

      {/* Pro Tip Section */}
      <Fade in={true} timeout={1200}>
        <Paper 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 4,
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.info.light, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.2)} 100%)`,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            boxShadow: `0 4px 20px 0 ${alpha(theme.palette.info.main, 0.1)}`,
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Box 
            sx={{ 
              position: 'absolute',
              right: -20,
              top: -20,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${alpha(theme.palette.info.main, 0.3)} 0%, transparent 70%)`,
              zIndex: 0
            }} 
          />
          
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.info.main, 0.2),
              color: theme.palette.info.main,
              width: 56,
              height: 56,
            }}
          >
            <SchoolIcon fontSize="large" />
          </Avatar>
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="subtitle1" fontWeight="600" color="info.main" gutterBottom>
              Pro Tip
            </Typography>
            <Typography variant="body1">
              A well-structured study plan can increase your exam performance by up to 30%.
              Set realistic daily goals and track your progress regularly.
            </Typography>
          </Box>
        </Paper>
      </Fade>
    </Container>
  );
};

export default HomePage;
