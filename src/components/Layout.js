// src/components/Layout.js
import React, { useContext, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  CssBaseline, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  useMediaQuery, 
  Avatar, 
  Tooltip, 
  Menu, 
  MenuItem,
  Fab,
  Badge,
  useTheme,
  Select,
  FormControl,
  Grid,
  Checkbox,
  Button,
  Stack,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Home as HomeIcon, 
  QuestionAnswer as QuestionIcon, 
  DateRange as DateRangeIcon, 
  Book as BookIcon, 
  Brightness4 as DarkModeIcon, 
  Brightness7 as LightModeIcon,
  NotificationsOutlined as NotificationIcon,
  AccountCircle as AccountIcon,
  Help as HelpIcon,
  Add as AddIcon,
  School as SchoolIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  LocalHospital as LocalHospitalIcon,
  CalendarToday as CalendarTodayIcon,
  CalendarMonth as CalendarMonthIcon,
  Timer as TimerIcon,
  Note as NoteIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { ThemeContext } from '../App';
import { StudyContext } from '../contexts/StudyContext';

const Layout = () => {
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const theme = useTheme();
  const { currentSyllabus, examDate, studyProgress, setSyllabus } = useContext(StudyContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [scheduleTab, setScheduleTab] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Study Reminder',
      message: 'Time to review Cardiovascular System',
      time: '5 minutes ago',
      read: false,
      type: 'reminder'
    },
    {
      id: 2,
      title: 'New Achievement',
      message: 'You completed 5 topics today!',
      time: '1 hour ago',
      read: false,
      type: 'achievement'
    },
    {
      id: 3,
      title: 'Study Plan Update',
      message: 'Your study plan has been optimized',
      time: '2 hours ago',
      read: true,
      type: 'update'
    }
  ]);

  const handleSyllabusChange = (event) => {
    setSyllabus(event.target.value);
  };
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleProfileClose = () => {
    setAnchorEl(null);
  };
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  const navItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Ask Question', icon: <QuestionIcon />, path: '/question' },
    { text: 'Study Planner', icon: <DateRangeIcon />, path: '/planner' },
    { text: 'Book References', icon: <BookIcon />, path: '/books' },
  ];
  
  const drawer = (
      <Box sx={{ 
      width: sidebarCollapsed ? 80 : 320,
      height: '100%',
        display: 'flex', 
      flexDirection: 'column',
      background: `linear-gradient(180deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(18, 18, 18, 0.95)' 
        : 'rgba(255, 255, 255, 0.95)'} 0%, 
        ${theme.palette.mode === 'dark' 
        ? 'rgba(18, 18, 18, 0.85)' 
        : 'rgba(255, 255, 255, 0.85)'} 100%)`,
      backdropFilter: 'blur(10px)',
      borderRight: `1px solid ${theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'rgba(0, 0, 0, 0.1)'}`,
      overflowY: 'auto',
      overflowX: 'hidden',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      '&::-webkit-scrollbar': {
        width: '4px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '&::-webkit-scrollbar-thumb': {
        background: `${theme.palette.primary.main}20`,
        borderRadius: '2px',
        '&:hover': {
          background: `${theme.palette.primary.main}40`,
        },
      },
    }}>
      {/* Study Info Section */}
      <Box 
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ 
          p: 4,
          background: `linear-gradient(145deg, 
            ${theme.palette.mode === 'dark' 
              ? 'rgba(25, 25, 25, 0.8)' 
              : 'rgba(255, 255, 255, 0.8)'} 0%, 
            ${theme.palette.mode === 'dark' 
              ? 'rgba(30, 30, 30, 0.8)' 
              : 'rgba(250, 250, 250, 0.8)'} 100%)`,
          borderRadius: 3,
          mx: 3,
          mt: 3,
          border: `1px solid ${theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow: `0 4px 20px ${theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.3)' 
            : 'rgba(0, 0, 0, 0.1)'}`,
          display: sidebarCollapsed ? 'none' : 'block',
          backdropFilter: 'blur(10px)',
          '&:hover': {
            boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' 
              ? 'rgba(0, 0, 0, 0.4)' 
              : 'rgba(0, 0, 0, 0.15)'}`,
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Typography 
          variant="subtitle1" 
          color="text.secondary" 
          gutterBottom 
          sx={{ 
            fontWeight: 500,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            opacity: 0.8,
        display: 'flex', 
        alignItems: 'center', 
            gap: 1
          }}
        >
          <SchoolIcon sx={{ fontSize: '1rem', opacity: 0.7 }} />
          Current Program
        </Typography>
        <FormControl fullWidth size="small" sx={{ mb: 3 }}>
          <Select
            value={currentSyllabus}
            onChange={(e) => setSyllabus(e.target.value)}
            sx={{
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.02)',
              borderRadius: 2,
              '& .MuiSelect-select': {
                py: 1.5,
                px: 2,
                fontWeight: 600,
                color: 'primary.main',
                letterSpacing: '0.3px'
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: `${theme.palette.primary.main}20`
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: `${theme.palette.primary.main}40`
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main
              }
            }}
          >
            <MenuItem value="MBBS-India">MBBS (India - MCI)</MenuItem>
            <MenuItem value="MBBS-Nepal">MBBS (Nepal - NMC)</MenuItem>
            <MenuItem value="MBBS-UK">MBBS (UK - GMC)</MenuItem>
            <MenuItem value="MBBS-US">MD (US - LCME)</MenuItem>
            <MenuItem value="MBBS-Australia">MBBS (Australia - AMC)</MenuItem>
            <MenuItem value="MBBS-Canada">MD (Canada - MCC)</MenuItem>
            <MenuItem value="MBBS-Singapore">MBBS (Singapore - SMC)</MenuItem>
            <MenuItem value="MBBS-Malaysia">MBBS (Malaysia - MMC)</MenuItem>
            <MenuItem value="MBBS-SouthAfrica">MBBS (South Africa - HPCSA)</MenuItem>
          </Select>
        </FormControl>
        
        <Box 
          component={motion.div}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
          sx={{ 
            mt: 3,
            p: 2.5,
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.03)' 
              : 'rgba(0, 0, 0, 0.02)',
            border: `1px solid ${theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.1)'}`,
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.03)',
            }
          }}
        >
          <Typography 
            variant="subtitle1" 
            color="text.secondary" 
            gutterBottom 
            sx={{ 
              fontWeight: 500,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <DateRangeIcon sx={{ fontSize: '1rem', opacity: 0.7 }} />
            Exam Countdown
        </Typography>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            sx={{ 
              color: theme.palette.secondary.main,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              letterSpacing: '-0.5px'
            }}
          >
            {Math.floor((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))}
            <Typography 
              variant="subtitle1" 
              color="text.secondary" 
              sx={{ 
                fontWeight: 400,
                opacity: 0.8
              }}
            >
              days
        </Typography>
        </Typography>
        </Box>
      </Box>
      
      <Divider sx={{ 
        my: 3, 
        display: sidebarCollapsed ? 'none' : 'block',
        borderColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.1)' 
          : 'rgba(0, 0, 0, 0.1)'
      }} />
      
      {/* Navigation Items */}
      <List sx={{ px: sidebarCollapsed ? 1 : 3 }}>
        {navItems.map((item, index) => (
          <ListItem 
            button 
            key={item.text}
            component={motion.div}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            onClick={() => {
              navigate(item.path);
              if(isMobile) setDrawerOpen(false);
            }}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 2,
              mb: 1.5,
              transition: 'all 0.2s ease',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              px: sidebarCollapsed ? 1 : 2,
              '&.Mui-selected': {
                bgcolor: `${theme.palette.primary.main}15`,
                '&:hover': {
                  bgcolor: `${theme.palette.primary.main}20`,
                },
                '& .MuiListItemIcon-root': {
                  color: theme.palette.primary.main,
                },
                '& .MuiListItemText-primary': {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                }
              },
              '&:hover': {
                bgcolor: `${theme.palette.primary.main}10`,
                transform: 'translateX(4px)',
              }
            }}
          >
            <ListItemIcon sx={{ 
              minWidth: sidebarCollapsed ? 0 : 48,
              color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
              transition: 'color 0.2s ease',
              justifyContent: 'center',
              opacity: location.pathname === item.path ? 1 : 0.7
            }}>
              {item.icon}
            </ListItemIcon>
            {!sidebarCollapsed && (
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  fontSize: '0.95rem',
                  letterSpacing: '0.3px',
                  transition: 'all 0.2s ease'
                }}
              />
            )}
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      {/* Study Progress Section */}
      <Box 
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        sx={{ 
          p: 3,
          mx: 3,
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(145deg, 
            ${theme.palette.mode === 'dark' 
              ? 'rgba(25, 25, 25, 0.8)' 
              : 'rgba(255, 255, 255, 0.8)'} 0%, 
            ${theme.palette.mode === 'dark' 
              ? 'rgba(30, 30, 30, 0.8)' 
              : 'rgba(250, 250, 250, 0.8)'} 100%)`,
          border: `1px solid ${theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow: `0 4px 20px ${theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.3)' 
            : 'rgba(0, 0, 0, 0.1)'}`,
          display: sidebarCollapsed ? 'none' : 'block',
          backdropFilter: 'blur(10px)',
          '&:hover': {
            boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' 
              ? 'rgba(0, 0, 0, 0.4)' 
              : 'rgba(0, 0, 0, 0.15)'}`,
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Grid container spacing={3}>
          {/* Study Progress */}
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 2.5,
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.03)' 
                : 'rgba(0, 0, 0, 0.02)',
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Typography 
                variant="subtitle1" 
                color="text.secondary" 
                gutterBottom 
                sx={{ 
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <TrendingUpIcon sx={{ fontSize: '1rem', opacity: 0.7 }} />
          Study Progress
        </Typography>
              
        <Box sx={{ 
                position: 'relative',
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
        }}>
          <Box 
                  component={motion.div}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
            sx={{ 
                    position: 'relative',
                    width: 100,
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Box
                    component={motion.div}
                    initial={{ rotate: -90 }}
                    animate={{ rotate: (studyProgress.completionPercentage * 3.6) - 90 }}
                    transition={{ duration: 1, ease: "easeOut" }}
            sx={{ 
                      position: 'absolute',
                      width: '100%',
              height: '100%', 
                      borderRadius: '50%',
                      background: `conic-gradient(
                        ${theme.palette.primary.main} 0% ${studyProgress.completionPercentage}%,
                        ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} ${studyProgress.completionPercentage}% 100%
                      )`,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 5,
                        borderRadius: '50%',
                        background: theme.palette.mode === 'dark' 
                          ? 'rgba(25, 25, 25, 0.95)' 
                          : 'rgba(255, 255, 255, 0.95)',
                      }
                    }}
                  />
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      color: theme.palette.primary.main,
                      position: 'relative',
                      zIndex: 1
                    }}
                  >
                    {studyProgress.completionPercentage}%
                  </Typography>
        </Box>
              </Box>
        </Box>
          </Grid>

          {/* Days Until Exam */}
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              p: 2.5,
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.03)' 
                : 'rgba(0, 0, 0, 0.02)',
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Typography 
                variant="subtitle1" 
                color="text.secondary" 
                gutterBottom 
                sx={{ 
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <DateRangeIcon sx={{ fontSize: '1rem', opacity: 0.7 }} />
                Days Until Exam
              </Typography>
              
              <Box sx={{ 
                position: 'relative',
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Typography 
                  variant="h2" 
                  sx={{ 
                    fontWeight: 700,
                    color: theme.palette.secondary.main,
                    position: 'relative',
                    zIndex: 1,
                    textShadow: `0 2px 8px ${theme.palette.secondary.main}40`
                  }}
                >
                  {Math.floor((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))}
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    position: 'absolute',
                    bottom: 20,
                    color: 'text.secondary',
                    opacity: 0.8
                  }}
                >
                  days remaining
        </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );

  const handleNotificationClick = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prevNotifications =>
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh',
      width: '100%',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(145deg, #121212 0%, #1a1a1a 100%)'
        : 'linear-gradient(145deg, #f5f5f5 0%, #ffffff 100%)'
    }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: theme.palette.mode === 'dark' 
            ? 'rgba(32, 33, 35, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(0, 0, 0, 0.1)'}`,
          color: 'text.primary',
          width: '100%',
          height: { xs: 56, sm: 64 },
        }}
      >
        <Toolbar sx={{ 
          height: '100%',
          px: { xs: 1, sm: 2 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '100% !important'
        }}>
          {/* Left Section - Logo and Navigation */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 3
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 1.5
            }}>
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: { xs: 32, sm: 36 },
                height: { xs: 32, sm: 36 },
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                boxShadow: `0 2px 8px ${theme.palette.primary.main}40`,
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.1)',
                  transform: 'rotate(45deg) translateY(100%)',
                  transition: 'transform 0.3s ease',
                },
                '&:hover::before': {
                  transform: 'rotate(45deg) translateY(0)',
                }
              }}>
                <LocalHospitalIcon sx={{ 
                  color: 'white',
                  fontSize: { xs: 20, sm: 22 }
                }} />
              </Box>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 600,
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  letterSpacing: '0.3px'
                }}
              >
                Medsage
            </Typography>
          </Box>
          
            {/* Navigation Items */}
            <Box sx={{ 
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1
            }}>
              {navItems.map((item) => (
                <Button
                  key={item.text}
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                    bgcolor: location.pathname === item.path 
                      ? `${theme.palette.primary.main}15`
                      : 'transparent',
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    '&:hover': {
                      bgcolor: location.pathname === item.path 
                        ? `${theme.palette.primary.main}20`
                        : `${theme.palette.primary.main}10`,
                    }
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          </Box>
          
          {/* Right Section - Actions */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: { xs: 0.5, sm: 1 }
          }}>
            <Tooltip title="Toggle theme">
              <IconButton 
                color="inherit" 
                onClick={toggleColorMode} 
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)',
                    color: 'primary.main'
                  }
                }}
              >
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Notifications">
              <IconButton 
                color="inherit" 
                onClick={handleNotificationClick}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)',
                    color: 'primary.main'
                  }
                }}
              >
                <Badge 
                  badgeContent={unreadCount} 
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.6rem',
                      height: 16,
                      minWidth: 16,
                      padding: '0 4px'
                    }
                  }}
                >
                  <NotificationIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={notificationAnchorEl}
              open={Boolean(notificationAnchorEl)}
              onClose={handleNotificationClose}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  width: 360,
                  maxHeight: 400,
                  borderRadius: 2,
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 4px 20px rgba(0, 0, 0, 0.5)'
                    : '0 4px 20px rgba(0, 0, 0, 0.15)',
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.1)'}`,
                }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Notifications
                  </Typography>
                  {unreadCount > 0 && (
                    <Button
                      size="small"
                      onClick={markAllAsRead}
                      sx={{ 
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: `${theme.palette.primary.main}10`
                        }
                      }}
                    >
                      Mark all as read
                    </Button>
                  )}
                </Box>
              </Box>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <MenuItem
                      key={notification.id}
                      onClick={() => markNotificationAsRead(notification.id)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        bgcolor: !notification.read ? `${theme.palette.primary.main}10` : 'transparent',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.02)'
                        }
                      }}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {notification.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {notification.time}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No notifications
                    </Typography>
                  </Box>
                )}
              </Box>
            </Menu>
            
            <Tooltip title="Profile">
              <IconButton
                onClick={handleProfileMenu}
                sx={{ 
                  ml: 1,
                  '&:hover': {
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.08)' 
                      : 'rgba(0, 0, 0, 0.04)',
                  }
                }}
              >
                <Avatar 
                  sx={{ 
                    width: { xs: 32, sm: 36 }, 
                    height: { xs: 32, sm: 36 },
                    bgcolor: 'primary.main',
                    border: `2px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(0, 0, 0, 0.1)'}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <AccountIcon />
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileClose}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  width: 280,
                  borderRadius: 2,
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 4px 20px rgba(0, 0, 0, 0.5)'
                    : '0 4px 20px rgba(0, 0, 0, 0.15)',
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(45, 45, 45, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 250, 0.95) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.1)'}`,
                }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {/* Profile Header */}
              <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 56, 
                      height: 56,
                      bgcolor: 'primary.main',
                      border: `2px solid ${theme.palette.primary.main}`
                    }}
                  >
                    <AccountIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Shagun Vyas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      john.doe@example.com
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Menu Items */}
              <Box sx={{ py: 1 }}>
                <MenuItem 
                  onClick={handleProfileClose}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.02)'
                    }
                  }}
                >
                  <ListItemIcon>
                    <AccountIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="My Profile" />
                </MenuItem>

                <MenuItem 
                  onClick={handleProfileClose}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.02)'
                    }
                  }}
                >
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Settings" />
                </MenuItem>

                <Divider sx={{ my: 1 }} />

                <MenuItem 
                  onClick={handleProfileClose}
                  sx={{
                    py: 1.5,
                    px: 2,
                    color: 'error.main',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark'
                        ? 'rgba(211, 47, 47, 0.08)'
                        : 'rgba(211, 47, 47, 0.04)'
                    }
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText primary="Logout" />
                </MenuItem>
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Quick Stats Bar */}
        <Box
          sx={{
            width: '100%',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(32, 33, 35, 0.95)' 
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(0, 0, 0, 0.1)'}`,
          }}
        >
          {/* Empty Quick Stats Bar - Removed Topics Covered */}
          </Box>

        {/* Main Content Area */}
        <Box
        sx={{
            flex: 1,
            width: '100%',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            gap: 3,
            flexDirection: { xs: 'column', lg: 'row' }
          }}
        >
          {/* Left Column - Main Content */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(32, 33, 35, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
              p: { xs: 2, sm: 3 },
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' 
                  ? 'rgba(0, 0, 0, 0.4)' 
                  : 'rgba(0, 0, 0, 0.15)'}`,
              }
            }}
          >
            <Outlet />
          </Box>

          {/* Right Column - Today's Schedule */}
          <Box
            sx={{
              width: { xs: '100%', lg: 320 },
              bgcolor: theme.palette.mode === 'dark' 
                ? 'rgba(32, 33, 35, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
              p: { xs: 2, sm: 3 },
              transition: 'all 0.2s ease',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(145deg, rgba(32, 33, 35, 0.95) 0%, rgba(25, 26, 28, 0.95) 100%)'
                : 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 250, 252, 0.95) 100%)',
              '&:hover': {
                boxShadow: `0 8px 32px ${theme.palette.mode === 'dark' 
                  ? 'rgba(0, 0, 0, 0.4)' 
                  : 'rgba(0, 0, 0, 0.15)'}`,
                transform: 'translateY(-2px)',
              }
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={scheduleTab} 
                onChange={(e, newValue) => setScheduleTab(newValue)}
                variant="fullWidth"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    minHeight: 48,
                    color: 'text.secondary',
                    '&.Mui-selected': {
                      color: 'primary.main',
                      fontWeight: 600,
                      background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(90deg, rgba(25, 118, 210, 0.1) 0%, rgba(25, 118, 210, 0.05) 100%)'
                        : 'linear-gradient(90deg, rgba(25, 118, 210, 0.08) 0%, rgba(25, 118, 210, 0.03) 100%)',
                    }
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'primary.main',
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  }
                }}
              >
                <Tab label="Today" />
                <Tab label="Week" />
                <Tab label="Month" />
              </Tabs>
            </Box>

            {scheduleTab === 0 && (
              <>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    fontWeight: 600
                  }}
                >
                  <CalendarTodayIcon color="primary" />
                  Today's Schedule
                </Typography>
                
                <List sx={{ width: '100%', mb: 2 }}>
                  {[
                    { text: 'Review Cardiovascular System', time: '2 hours', checked: true, priority: 'high' },
                    { text: 'Practice MCQs - Respiratory System', time: '1.5 hours', checked: false, priority: 'medium' },
                    { text: 'Read Chapter 5 - Nervous System', time: '3 hours', checked: false, priority: 'high' }
                  ].map((task, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        borderRadius: 1.5,
                        mb: 1,
                        transition: 'all 0.2s ease',
                        border: `1px solid ${theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(0, 0, 0, 0.05)'}`,
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'rgba(0, 0, 0, 0.04)',
                          transform: 'translateX(4px)',
                          borderColor: theme.palette.primary.main,
                          boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' 
                            ? 'rgba(0, 0, 0, 0.2)' 
                            : 'rgba(0, 0, 0, 0.1)'}`,
                        }
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={task.checked}
                          tabIndex={-1}
                          disableRipple
                          sx={{
                            color: theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.3)' 
                              : 'rgba(0, 0, 0, 0.3)',
                            '&.Mui-checked': {
                              color: 'primary.main',
                            }
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {task.text}
                            <Chip 
                              size="small" 
                              label={task.priority}
                              sx={{ 
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: task.priority === 'high' 
                                  ? `${theme.palette.error.main}20`
                                  : `${theme.palette.warning.main}20`,
                                color: task.priority === 'high' 
                                  ? theme.palette.error.main
                                  : theme.palette.warning.main,
                                border: `1px solid ${task.priority === 'high' 
                                  ? `${theme.palette.error.main}30`
                                  : `${theme.palette.warning.main}30`}`,
                                '&:hover': {
                                  bgcolor: task.priority === 'high' 
                                    ? `${theme.palette.error.main}30`
                                    : `${theme.palette.warning.main}30`,
                                }
                              }}
                            />
                          </Box>
                        }
                        secondary={task.time}
                      />
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ 
                  my: 2,
                  borderColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : 'rgba(0, 0, 0, 0.1)'
                }} />

                {/* Study Focus Area */}
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary" 
                    sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <SchoolIcon sx={{ fontSize: '1rem' }} />
                    Today's Focus
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 1.5,
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.02)',
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.05)'}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.2)' 
                        : 'rgba(0, 0, 0, 0.1)'}`,
                    }
                  }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Cardiovascular System
                    </Typography>
                    <Box sx={{ 
                      height: 4, 
                      bgcolor: 'divider', 
                      borderRadius: 2,
                      overflow: 'hidden',
                      mb: 0.5
                    }}>
                      <Box sx={{ 
                        height: '100%', 
                        width: '60%',
                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        borderRadius: 2,
                        transition: 'width 0.3s ease'
                      }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      60% Complete
                    </Typography>
                  </Box>
                </Box>

                {/* Break Timer */}
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary" 
                    sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <TimerIcon sx={{ fontSize: '1rem' }} />
                    Next Break
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 1.5,
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.02)',
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.05)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: theme.palette.secondary.main,
                      boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.2)' 
                        : 'rgba(0, 0, 0, 0.1)'}`,
                    }
                  }}>
                    <Typography variant="body2">
                      Break in 25 minutes
                    </Typography>
                    <Button 
                      size="small" 
                      variant="outlined"
                      sx={{ 
                        minWidth: 'auto',
                        px: 1,
                        py: 0.5,
                        fontSize: '0.75rem',
                        borderColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.2)' 
                          : 'rgba(0, 0, 0, 0.2)',
                        '&:hover': {
                          borderColor: theme.palette.secondary.main,
                          bgcolor: `${theme.palette.secondary.main}10`,
                        }
                      }}
                    >
                      Skip
                    </Button>
                  </Box>
                </Box>

                {/* Quick Notes */}
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="subtitle2" 
                    color="text.secondary" 
                    sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <NoteIcon sx={{ fontSize: '1rem' }} />
                    Quick Notes
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 1.5,
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.02)',
                    border: `1px solid ${theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.05)'}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: theme.palette.success.main,
                      boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.2)' 
                        : 'rgba(0, 0, 0, 0.1)'}`,
                    }
                  }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      "Remember to review the ECG patterns for tomorrow's practice session"
                    </Typography>
                  </Box>
                </Box>

                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  sx={{ 
                    mt: 2,
                    transition: 'all 0.2s ease',
                    borderWidth: 2,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderWidth: 2,
                      boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}10, ${theme.palette.secondary.main}10)`,
                    }
                  }}
                  startIcon={<AddIcon />}
                >
                  Add New Task
                </Button>
              </>
            )}

            {scheduleTab === 1 && (
              <>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <DateRangeIcon color="secondary" />
                  Weekly Goals
                </Typography>
                
                <List sx={{ width: '100%' }}>
                  {[
                    { text: 'Complete Cardiovascular Module', progress: 75, total: 100 },
                    { text: 'Finish 50 MCQs', progress: 30, total: 50 },
                    { text: 'Review 3 Chapters', progress: 2, total: 3 }
                  ].map((goal, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        borderRadius: 1,
                        mb: 1,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'rgba(0, 0, 0, 0.04)',
                          transform: 'translateX(4px)',
                        }
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {goal.text}
                      </Typography>
                      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, height: 6, bgcolor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                          <Box
        sx={{
                              height: '100%',
                              width: `${(goal.progress / goal.total) * 100}%`,
                              bgcolor: 'secondary.main',
                              borderRadius: 3,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {goal.progress}/{goal.total}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {scheduleTab === 2 && (
              <>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <CalendarMonthIcon color="success" />
                  Monthly Goals
                </Typography>
                
                <List sx={{ width: '100%' }}>
                  {[
                    { text: 'Complete 3 Major Systems', progress: 1, total: 3 },
                    { text: 'Score 80% in Mock Tests', progress: 75, total: 80 },
                    { text: 'Finish 200 MCQs', progress: 120, total: 200 }
                  ].map((goal, index) => (
                    <ListItem
                      key={index}
                      sx={{
                        bgcolor: theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        borderRadius: 1,
                        mb: 1,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(255, 255, 255, 0.08)' 
                            : 'rgba(0, 0, 0, 0.04)',
                          transform: 'translateX(4px)',
                        }
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {goal.text}
                      </Typography>
                      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ flex: 1, height: 6, bgcolor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${(goal.progress / goal.total) * 100}%`,
                              bgcolor: 'success.main',
                              borderRadius: 3,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {goal.progress}/{goal.total}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            <Button
              variant="outlined"
              color="primary"
              fullWidth
              sx={{ 
                mt: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
                }
              }}
              startIcon={<AddIcon />}
            >
              Add New Goal
            </Button>
          </Box>
        </Box>
      </Box>
      
      {/* Quick Action FAB */}
      <Fab 
        color="primary" 
        aria-label="ask question"
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20,
          display: { xs: 'flex', md: 'none' },
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
          }
        }}
        onClick={() => navigate('/question')}
      >
        <QuestionIcon />
      </Fab>
      
      {/* Help FAB */}
      <Fab 
        size="small"
        color="secondary" 
        aria-label="help"
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: isMobile ? 80 : 20,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: `0 4px 12px ${theme.palette.secondary.main}40`,
          }
        }}
      >
        <HelpIcon />
      </Fab>
    </Box>
  );
};

export default Layout;