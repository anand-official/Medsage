import React, { useState, useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Drawer, Box, 
  List, ListItem, ListItemIcon, ListItemText, 
  IconButton, Divider, Container, Badge, 
  Chip, useMediaQuery, useTheme, Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  QuestionAnswer as QuestionIcon,
  Book as BookIcon,
  CalendarToday as CalendarIcon,
  WifiOff as OfflineIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import { StudyContext } from '../contexts/StudyContext';
import { ThemeContext } from '../App'; // Import ThemeContext

function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isOfflineMode, currentSyllabus } = useContext(StudyContext);
  const { mode, toggleColorMode } = useContext(ThemeContext); // Use ThemeContext
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Question & Answer', icon: <QuestionIcon />, path: '/question' },
    { text: 'Study Planner', icon: <CalendarIcon />, path: '/planner' },
    { text: 'Book References', icon: <BookIcon />, path: '/books' },
  ];

  const drawer = (
    <Box>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" component="div">
          MedSage
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            component={Link} 
            to={item.path}
            selected={location.pathname === item.path}
            onClick={isMobile ? handleDrawerToggle : undefined}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2">Current Syllabus:</Typography>
        <Chip 
          label={currentSyllabus} 
          color="primary" 
          size="small" 
          sx={{ mt: 1 }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MedStudy Companion
          </Typography>
          
          {/* Dark Mode Toggle Button */}
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton onClick={toggleColorMode} color="inherit" sx={{ mr: 1 }}>
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
          
          {isOfflineMode && (
            <Badge color="error">
              <OfflineIcon />
              <Typography variant="caption" sx={{ ml: 1 }}>
                Offline
              </Typography>
            </Badge>
          )}
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: 240 }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          mt: '64px', // AppBar height
        }}
      >
        <Container maxWidth="lg" sx={{ pt: 2 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}

export default Layout;
