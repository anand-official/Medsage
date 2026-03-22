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
  Logout as LogoutIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { ThemeContext } from '../App';
import { useAuth } from '../contexts/AuthContext';
import '../animations.css';

const APPBAR_HEIGHT_MOBILE = 64;
const APPBAR_HEIGHT_DESKTOP = 80;
const BOTTOM_DOCK_HEIGHT = 72;

const Layout = () => {
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const theme = useTheme();
  const { logout, userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigationItems = [
    { label: 'Dashboard', icon: <HomeIcon />, path: '/' },
    { label: 'Cortex', icon: <QuestionIcon />, path: '/question' },
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
          pt: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <Toolbar sx={{
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 2, md: 6 },
          height: { xs: APPBAR_HEIGHT_MOBILE, md: APPBAR_HEIGHT_DESKTOP },
          minHeight: { xs: APPBAR_HEIGHT_MOBILE, md: APPBAR_HEIGHT_DESKTOP },
        }}>
          {/* Logo Section */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', minWidth: 0 }}
            onClick={() => navigate('/')}
            role="button"
            aria-label="Go to dashboard"
          >
            <Box sx={{
              position: 'relative', width: 32, height: 32, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
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
            <Typography variant="h6" sx={{
              fontWeight: 900,
              letterSpacing: '-1px',
              display: { xs: 'none', sm: 'block' },
              fontSize: { sm: '1.1rem', md: '1.25rem' },
            }}>
              Medsage
            </Typography>
          </Box>

          {/* Desktop Navigation - Horizontal Links */}
          {!isMobile && (
            <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    startIcon={item.icon}
                    sx={{
                      px: { md: 2, lg: 3 },
                      py: 1,
                      borderRadius: 3,
                      fontSize: '0.85rem',
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, md: 2 } }}>
            <Tooltip title="Toggle Theme">
              <IconButton
                onClick={toggleColorMode}
                aria-label="Toggle dark mode"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
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
                aria-label="Account menu"
              >
                <Avatar
                  src={userProfile?.photoURL || currentUser?.photoURL}
                  sx={{
                    width: 36,
                    height: 36,
                    border: '2px solid rgba(99, 102, 241, 0.3)',
                    bgcolor: 'primary.main',
                    transition: 'all 0.3s ease',
                    '&:active': {
                      transform: 'scale(0.95)'
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

              <MenuItem onClick={() => { handleCloseMenu(); navigate('/'); }} sx={{ py: 1.5, minHeight: 48, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <ListItemIcon><DashboardIcon fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>
                Dashboard
              </MenuItem>
              <MenuItem onClick={() => { handleCloseMenu(); navigate('/profile'); }} sx={{ py: 1.5, minHeight: 48, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                <ListItemIcon><PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>
                Profile & Settings
              </MenuItem>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, minHeight: 48, color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
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
          px: { xs: 2, sm: 3, md: 4, lg: 6 },
          pt: {
            xs: `${APPBAR_HEIGHT_MOBILE + 16}px`,
            md: `${APPBAR_HEIGHT_DESKTOP + 32}px`,
          },
          pb: isMobile ? `${BOTTOM_DOCK_HEIGHT + 40}px` : 6,
          minHeight: '100vh',
          zIndex: 1,
          width: '100%',
          maxWidth: 1600,
          mx: 'auto',
        }}
      >
        <Outlet />
      </Box>

      {/* Mobile Bottom Dock Navigation */}
      {isMobile && (
        <Box
          component="nav"
          role="navigation"
          aria-label="Main navigation"
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            pb: 'env(safe-area-inset-bottom, 8px)',
            pt: 1,
            px: 1,
            bgcolor: 'rgba(10, 10, 15, 0.85)',
            backdropFilter: 'blur(30px) saturate(180%)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Box
                key={item.path}
                onClick={() => navigate(item.path)}
                role="button"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  minWidth: 56,
                  minHeight: 48,
                  pt: 0.5,
                  pb: 0.5,
                  borderRadius: 2,
                  transition: 'all 0.2s ease',
                  '&:active': {
                    transform: 'scale(0.9)',
                  },
                }}
              >
                <Box sx={{
                  color: isActive ? 'primary.main' : 'text.secondary',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 32,
                  borderRadius: 3,
                  bgcolor: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                  '& .MuiSvgIcon-root': {
                    fontSize: 22,
                  },
                }}>
                  {item.icon}
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.6rem',
                    fontWeight: isActive ? 800 : 500,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    lineHeight: 1,
                    mt: 0.25,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default Layout;
