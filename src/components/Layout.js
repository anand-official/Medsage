
import React, { useState, useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Drawer, Box, 
  List, ListItem, ListItemIcon, ListItemText, 
  IconButton, Divider, Container, Badge, 
  Chip, useMediaQuery, useTheme, Tooltip,
  Button, Switch, FormControlLabel, Select, MenuItem
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
import { ThemeContext } from '../App';
import { StudyContext } from '../contexts/StudyContext';
function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isOfflineMode, setOfflineMode, currentSyllabus, setSyllabus } = useContext(StudyContext);
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const toggleOfflineMode = (checked) => {
    setOfflineMode(checked);
  };

  const drawerWidth = 240;

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Ask Question', icon: <QuestionIcon />, path: '/question' },
    { text: 'Study Planner', icon: <CalendarIcon />, path: '/planner' },
    { text: 'Book References', icon: <BookIcon />, path: '/books' },
  ];

  const drawer = (
    <Box>
      <Toolbar />
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            component={Link} 
            to={item.path}
            key={item.text}
            selected={location.pathname === item.path}
            onClick={isMobile ? handleDrawerToggle : undefined}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.18)',
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
            
            {item.text === 'Ask Question' && (
              <Chip 
                label="Pro" 
                size="small" 
                color="primary" 
                variant="outlined" 
                sx={{ ml: 1, height: 20 }} 
              />
            )}
          </ListItem>
        ))}
      </List>
      <Divider sx={{ mt: 2, mb: 2 }} />
      <List>
        <ListItem>
          <ListItemIcon>
            {isOfflineMode ? <OfflineIcon color="warning" /> : <OfflineIcon color="disabled" />}
          </ListItemIcon>
          <ListItemText 
            primary="Offline Mode" 
            secondary={isOfflineMode ? "Enabled" : "Disabled"} 
          />
          <Switch 
            edge="end"
            checked={isOfflineMode}
            onChange={(e) => toggleOfflineMode(e.target.checked)}
          />
        </ListItem>
      </List>
      <Divider sx={{ mt: 2, mb: 2 }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Current Syllabus:
        </Typography>
        <FormControlLabel
          control={
            <Select
              value={currentSyllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              size="small"
              fullWidth
              sx={{ mt: 1 }}
            >
              <MenuItem value="MBBS">Indian MBBS</MenuItem>
              <MenuItem value="USMLE">USMLE</MenuItem>
              <MenuItem value="PLAB">UK PLAB</MenuItem>
            </Select>
          }
          label=""
          labelPlacement="top"
          sx={{ m: 0, width: '100%' }}
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
          
          {isOfflineMode && (
            <Tooltip title="Offline Mode Active">
              <Badge 
                variant="dot" 
                color="error"
                sx={{ mr: 2 }}
              >
                <OfflineIcon color="action" />
              </Badge>
            </Tooltip>
          )}
          
          <IconButton
            color="inherit"
            onClick={toggleColorMode}
            sx={{ ml: 1 }}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          
          <Button 
            color="inherit" 
            variant="outlined" 
            size="small" 
            sx={{ ml: 2, borderRadius: 2 }}
          >
            Upgrade to Pro
          </Button>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: 8, sm: 3 },
          ml: { sm: `${drawerWidth}px` }
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}

export default Layout;