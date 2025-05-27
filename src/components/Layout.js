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
  useTheme
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
  Add as AddIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { ThemeContext } from '../App';
import { StudyContext } from '../contexts/StudyContext';
import logo from './assets/logo.jpg'; // Ensure you have a logo file

const Layout = () => {
  const theme = useTheme();
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const { currentSyllabus, examDate, studyProgress } = useContext(StudyContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleProfileClose = () => {
    setAnchorEl(null);
  };
  
  const navItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Ask Question', icon: <QuestionIcon />, path: '/question' },
    { text: 'Study Planner', icon: <DateRangeIcon />, path: '/planner' },
    { text: 'Book References', icon: <BookIcon />, path: '/books' },
  ];
  
  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <img src={logo} alt="MedSage Logo" height="40" />
        <Typography variant="h6" sx={{ ml: 1, fontWeight: 700 }}>
          MedSage
        </Typography>
      </Box>
      
      <Box sx={{ mt: 2, px: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Current Program:
        </Typography>
        <Typography variant="body1" fontWeight={500}>
          {currentSyllabus}
        </Typography>
        
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
          Exam Countdown:
        </Typography>
        <Typography variant="body1" fontWeight={600} color="secondary">
          {Math.floor((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))} days
        </Typography>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if(isMobile) setDrawerOpen(false);
            }}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'primary.light',
                '&:hover': {
                  bgcolor: 'primary.light',
                },
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Study Progress
        </Typography>
        <Box sx={{ 
          height: 10, 
          bgcolor: 'background.paper', 
          borderRadius: 5,
          border: `1px solid ${theme.palette.divider}`,
          overflow: 'hidden'
        }}>
          <Box 
            sx={{ 
              height: '100%', 
              width: `${studyProgress.completionPercentage}%`, 
              bgcolor: 'success.main',
              transition: 'width 1s ease-in-out'
            }} 
          />
        </Box>
        <Typography variant="body2" align="right" sx={{ mt: 0.5 }}>
          {studyProgress.completionPercentage}% Complete
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: theme.palette.background.paper,
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <img src={logo} alt="MedSage Logo" height="30" style={{ marginRight: 8 }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              MedSage
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Toggle theme">
              <IconButton color="inherit" onClick={toggleColorMode} sx={{ mr: 1 }}>
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Notifications">
              <IconButton color="inherit" sx={{ mr: 1 }}>
                <Badge badgeContent={3} color="error">
                  <NotificationIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Profile">
              <IconButton
                onClick={handleProfileMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  <AccountIcon />
                </Avatar>
              </IconButton>
            </Tooltip>
            
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleProfileClose}
            >
              <MenuItem onClick={handleProfileClose}>Profile</MenuItem>
              <MenuItem onClick={handleProfileClose}>Settings</MenuItem>
              <Divider />
              <MenuItem onClick={handleProfileClose}>Log Out</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Side Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? drawerOpen : true}
        onClose={handleDrawerToggle}
        sx={{
          width: 250,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 250,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar /> {/* Spacer to push content below AppBar */}
        {drawer}
      </Drawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 250px)` },
          ml: { sm: '250px' },
          pt: { xs: 8, sm: 10 }
        }}
      >
        <Container maxWidth="lg" sx={{ mb: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Outlet />
          </motion.div>
        </Container>
      </Box>
      
      {/* Quick Action FAB */}
      <Fab 
        color="primary" 
        aria-label="ask question"
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          right: 20,
          display: { xs: 'flex', md: 'none' }
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
        }}
      >
        <HelpIcon />
      </Fab>
    </Box>
  );
};

export default Layout;