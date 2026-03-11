// src/components/Layout.js
import React, { useContext } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useMediaQuery,
  Avatar,
  Tooltip,
  useTheme,
  Stack,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Home as HomeIcon,
  QuestionAnswer as QuestionIcon,
  DateRange as DateRangeIcon,
  Book as BookIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  LocalHospital as LocalHospitalIcon,
  Bolt as ReviewIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { ThemeContext } from '../App';
import { useAuth } from '../contexts/AuthContext';
import '../animations.css';

const Layout = () => {
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const theme = useTheme();
  const { logout, userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigationItems = [
    { label: 'Dashboard', icon: <HomeIcon />, path: '/' },
    { label: 'AI Assistant', icon: <QuestionIcon />, path: '/question' },
    { label: 'Review', icon: <ReviewIcon />, path: '/review' },
    { label: 'Study Plan', icon: <DateRangeIcon />, path: '/planner' },
    { label: 'Library', icon: <BookIcon />, path: '/books' },
  ];

  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'transparent', flexDirection: 'column' }}>
      <CssBaseline />

      {/* Top App Bar - Glassmorphic Horizontal Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          width: '100%',
          background: 'rgba(5, 5, 5, 0.4)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <Toolbar sx={{
          justifyContent: 'space-between',
          px: { xs: 2, md: 6 },
          height: 80,
        }}>
          {/* Logo Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <Box sx={{
              position: 'relative', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="#ec4899" filter="drop-shadow(0 0 8px rgba(236,72,153,0.8))" />
                <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#nav-logo-grad-1)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" stroke="url(#nav-logo-grad-2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                <defs>
                  <linearGradient id="nav-logo-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366f1" />
                    <stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                  <linearGradient id="nav-logo-grad-2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ec4899" />
                    <stop offset="1" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '-1.5px', display: { xs: 'none', sm: 'block' } }}>
              Medsage
            </Typography>
          </Box>

          {/* Desktop Navigation - Horizontal Links */}
          {!isMobile && (
            <Stack direction="row" spacing={1} sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    startIcon={item.icon}
                    sx={{
                      px: 3,
                      py: 1,
                      borderRadius: 3,
                      fontSize: '0.9rem',
                      fontWeight: isActive ? 800 : 500,
                      color: isActive ? 'primary.main' : 'text.secondary',
                      bgcolor: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        transform: 'translateY(-2px)',
                        color: 'primary.light'
                      },
                      '& .MuiButton-startIcon': {
                        color: isActive ? 'primary.main' : 'inherit'
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>
          )}

          {/* Actions Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Toggle Theme">
              <IconButton onClick={toggleColorMode} sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Account settings">
              <IconButton
                onClick={handleAvatarClick}
                size="small"
                aria-controls={openMenu ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu ? 'true' : undefined}
              >
                <Avatar
                  src={userProfile?.photoURL || currentUser?.photoURL}
                  sx={{
                    width: 40,
                    height: 40,
                    border: '2px solid rgba(99, 102, 241, 0.3)',
                    bgcolor: 'primary.main',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'scale(1.05)'
                    }
                  }}
                />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={openMenu}
              onClose={handleCloseMenu}
              onClick={handleCloseMenu}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 8px 24px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  borderRadius: 3,
                  background: 'rgba(20, 15, 30, 0.85)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  minWidth: '220px',
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'rgba(20, 15, 30, 0.85)',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                  {userProfile?.displayName || currentUser?.displayName || 'Student'}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {userProfile?.email || currentUser?.email}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

              <MenuItem onClick={() => { handleCloseMenu(); navigate('/'); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <ListItemIcon><DashboardIcon fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>
                Dashboard
              </MenuItem>
              <MenuItem onClick={() => { handleCloseMenu(); navigate('/profile'); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <ListItemIcon><PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>
                Profile & Metrics
              </MenuItem>
              <MenuItem onClick={() => { handleCloseMenu(); navigate('/profile'); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <ListItemIcon><SettingsIcon fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>
                Account Settings
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
                Sign Out Securely
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content Pane */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 3, md: 6 },
          pt: { xs: 12, md: 16 },
          pb: isMobile ? 14 : 6,
          minHeight: '100vh',
          zIndex: 1,
          width: '100%',
          maxWidth: 1600,
          mx: 'auto'
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile Bottom Dock - Kept as requested previously for premium mobile flow */}
      {isMobile && (
        <Box sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 400,
          height: 72,
          bgcolor: 'rgba(15, 15, 15, 0.7)',
          backdropFilter: 'blur(30px) saturate(180%)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          px: 2
        }}>
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Box key={item.path} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <IconButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    color: isActive ? 'primary.main' : 'text.secondary',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: isActive ? 'scale(1.3) translateY(-8px)' : 'scale(1)',
                    p: 1.5,
                    bgcolor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    borderRadius: 4
                  }}
                >
                  {item.icon}
                </IconButton>
                {isActive && (
                  <Box sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    mt: -0.5,
                    boxShadow: '0 0 8px #6366f1'
                  }} />
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default Layout;