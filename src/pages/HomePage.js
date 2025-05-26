import React, { useContext } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent,
  CardActions, Button, Divider, List, ListItem,
  ListItemText, ListItemIcon, Chip, useTheme
} from '@mui/material';
import {
  QuestionAnswer as QuestionIcon,
  CalendarToday as CalendarIcon,
  Book as BookIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  Bookmark as BookmarkIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { StudyContext } from '../contexts/StudyContext';

const HomePage = () => {
  const { 
    currentSyllabus, 
    examDate, 
    studyProgress, 
    recentQueries, 
    isOfflineMode 
  } = useContext(StudyContext);
  const theme = useTheme();
  
  // Calculate days until exam
  const getDaysUntilExam = () => {
    if (!examDate) return null;
    
    const today = new Date();
    const exam = new Date(examDate);
    return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Get bookmarks from localStorage
  const getBookmarks = () => {
    try {
      return JSON.parse(localStorage.getItem('bookmarks') || '[]');
    } catch (err) {
      console.error('Error parsing bookmarks:', err);
      return [];
    }
  };
  
  const bookmarks = getBookmarks();

  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          MedStudy Companion
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Your AI-powered medical learning assistant
        </Typography>
        
        {isOfflineMode && (
          <Chip 
            label="Offline Mode Active" 
            color="warning" 
            icon={<HistoryIcon />} 
            sx={{ mt: 1 }}
          />
        )}
      </Box>
      
      <Grid container spacing={3}>
        {/* Study Status Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Study Status
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <BookIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Current Syllabus" 
                    secondary={currentSyllabus} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Exam Date" 
                    secondary={examDate ? formatDate(examDate) : 'Not set'} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <TrendingIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Topics Completed" 
                    secondary={`${studyProgress.length} topics`} 
                  />
                </ListItem>
                
                {getDaysUntilExam() !== null && (
                  <ListItem>
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Days until exam
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        p: 1,
                        bgcolor: theme.palette.primary.main,
                        color: 'white',
                        borderRadius: 2
                      }}>
                        <Typography variant="h4" component="div">
                          {getDaysUntilExam()}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                )}
              </List>
            </CardContent>
            <CardActions>
              <Button 
                component={RouterLink} 
                to="/planner" 
                color="primary"
                fullWidth
              >
                View Study Plan
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        {/* Quick Actions Card */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Quick Actions
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Paper
                    sx={{
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      bgcolor: 'rgba(25, 118, 210, 0.08)',
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': { 
                        boxShadow: 3,
                        bgcolor: 'rgba(25, 118, 210, 0.12)',
                      }
                    }}
                    component={RouterLink}
                    to="/question"
                    style={{ textDecoration: 'none' }}
                  >
                    <QuestionIcon 
                      sx={{ fontSize: 40, color: theme.palette.primary.main, mb: 1 }} 
                    />
                    <Typography variant="h6" component="div" gutterBottom>
                      Ask a Question
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Get answers to your medical questions with textbook references
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Paper
                    sx={{
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      bgcolor: 'rgba(245, 0, 87, 0.08)',
                      borderRadius: 2,
                      transition: 'all 0.2s',
                      '&:hover': { 
                        boxShadow: 3,
                        bgcolor: 'rgba(245, 0, 87, 0.12)',
                      }
                    }}
                    component={RouterLink}
                    to="/books"
                    style={{ textDecoration: 'none' }}
                  >
                    <BookIcon 
                      sx={{ fontSize: 40, color: theme.palette.secondary.main, mb: 1 }} 
                    />
                    <Typography variant="h6" component="div" gutterBottom>
                      Book References
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Browse recommended textbooks for your syllabus
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Recent Questions
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {recentQueries.length > 0 ? (
              <List>
                {recentQueries.slice(0, 5).map((item, index) => (
                  <ListItem 
                    key={index}
                    component={RouterLink}
                    to="/question"
                    sx={{ 
                      borderBottom: index < recentQueries.length - 1 ? '1px solid #eee' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                    }}
                  >
                    <ListItemIcon>
                      <QuestionIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.query.length > 60 ? `${item.query.substring(0, 60)}...` : item.query}
                      secondary={new Date(item.timestamp).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No recent questions. Start by asking something!
              </Typography>
            )}
            
            {recentQueries.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  component={RouterLink} 
                  to="/question" 
                  color="primary"
                >
                  Ask New Question
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Bookmarks */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              Bookmarked Questions
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {bookmarks.length > 0 ? (
              <List>
                {bookmarks.slice(0, 5).map((bookmark, index) => (
                  <ListItem 
                    key={index}
                    component={RouterLink}
                    to="/question"
                    sx={{ 
                      borderBottom: index < bookmarks.length - 1 ? '1px solid #eee' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                    }}
                  >
                    <ListItemIcon>
                      <BookmarkIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={bookmark.question.length > 60 ? `${bookmark.question.substring(0, 60)}...` : bookmark.question}
                      secondary={new Date(bookmark.timestamp).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No bookmarked questions yet.
              </Typography>
            )}
            
            {bookmarks.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  component={RouterLink} 
                  to="/books" 
                  color="secondary"
                >
                  View All Bookmarks
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
