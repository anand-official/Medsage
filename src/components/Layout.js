// src/components/Layout.js
import React, { useContext } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  CssBaseline,
  Typography,
  IconButton,
  useMediaQuery,
  Avatar,
  Tooltip,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  Home as HomeIcon,
  QuestionAnswer as QuestionIcon,
  DateRange as DateRangeIcon,
  Book as BookIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { ThemeContext } from '../App';
import { useAuth } from '../contexts/AuthContext';
import '../animations.css';

const NAVBAR_HEIGHT = 64;
const BOTTOM_DOCK_HEIGHT = 72;

const CortexLogoIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill="#ec4899" filter="drop-shadow(0 0 8px rgba(236,72,153,0.8))" />
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#nb-logo-grad-1)" strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24"
      stroke="url(#nb-logo-grad-2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"
    />
    <defs>
      <linearGradient id="nb-logo-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="nb-logo-grad-2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ec4899" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
  </svg>
);

const Layout = () => {
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const theme = useTheme();
  const { logout, userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigationItems = [
    { label: 'Dashboard', icon: <HomeIcon />,      path: '/' },
    { label: 'Cortex',    icon: <QuestionIcon />,  path: '/question' },
    { label: 'Study Plan',icon: <DateRangeIcon />, path: '/planner' },
    { label: 'Library',   icon: <BookIcon />,       path: '/books' },
  ];

  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleAvatarClick = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu   = () => setAnchorEl(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // ── Top Navbar ───────────────────────────────────────────────────────────────
  const Navbar = () => (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        height: NAVBAR_HEIGHT,
        bgcolor: 'rgba(8, 6, 18, 0.92)',
        backdropFilter: 'blur(24px) saturate(160%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: theme.zIndex.appBar,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          height: NAVBAR_HEIGHT,
          minHeight: `${NAVBAR_HEIGHT}px !important`,
          px: { xs: 2, md: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {/* Logo */}
        <Box
          onClick={() => navigate('/')}
          role="button"
          aria-label="Go to dashboard"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            mr: { xs: 0, md: 3 },
            flexShrink: 0,
          }}
        >
          <CortexLogoIcon />
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '1.05rem',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 60%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              userSelect: 'none',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Medsage.ai
          </Typography>
        </Box>

        {/* Nav links — desktop only */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
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
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(168,85,247,0.15) 100%)'
                      : 'transparent',
                    border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                    color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.28) 0%, rgba(168,85,247,0.2) 100%)'
                        : 'rgba(255,255,255,0.06)',
                      color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.8)',
                    },
                    '&:active': { transform: 'scale(0.96)' },
                    '& .MuiSvgIcon-root': { fontSize: 18, flexShrink: 0 },
                  }}
                >
                  {item.icon}
                  <Typography
                    sx={{
                      fontSize: '0.85rem',
                      fontWeight: isActive ? 700 : 500,
                      lineHeight: 1,
                      color: 'inherit',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Spacer for mobile */}
        {isMobile && <Box sx={{ flex: 1 }} />}

        {/* Right controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          {/* Theme toggle */}
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'} arrow>
            <IconButton
              onClick={toggleColorMode}
              aria-label="Toggle theme"
              size="small"
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                color: 'rgba(255,255,255,0.45)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)' },
              }}
            >
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* Avatar */}
          <Tooltip title={userProfile?.displayName || currentUser?.displayName || 'Account'} arrow>
            <IconButton
              onClick={handleAvatarClick}
              aria-label="Account menu"
              aria-controls={openMenu ? 'account-menu' : undefined}
              aria-haspopup="true"
              size="small"
              sx={{ ml: 0.25, p: 0.25 }}
            >
              <Avatar
                src={userProfile?.photoURL || currentUser?.photoURL}
                sx={{
                  width: 34,
                  height: 34,
                  border: '2px solid rgba(99,102,241,0.4)',
                  bgcolor: '#6366f1',
                  fontSize: '0.75rem',
                }}
              >
                {(userProfile?.displayName || currentUser?.displayName || 'S')[0].toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );

  // ── Account dropdown menu ───────────────────────────────────────────────────
  const AccountMenu = () => (
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
          filter: 'drop-shadow(0px 8px 28px rgba(0,0,0,0.45))',
          mt: 1,
          borderRadius: 3,
          background: 'rgba(14, 11, 26, 0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.09)',
          minWidth: '220px',
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700} color="rgba(255,255,255,0.9)" noWrap>
          {userProfile?.displayName || currentUser?.displayName || 'Student'}
        </Typography>
        <Typography variant="caption" color="rgba(255,255,255,0.4)" noWrap sx={{ display: 'block' }}>
          {userProfile?.email || currentUser?.email}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      <MenuItem
        onClick={() => { handleCloseMenu(); navigate('/'); }}
        sx={{ py: 1.25, color: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
      >
        <ListItemIcon><DashboardIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.45)' }} /></ListItemIcon>
        Dashboard
      </MenuItem>
      <MenuItem
        onClick={() => { handleCloseMenu(); navigate('/profile'); }}
        sx={{ py: 1.25, color: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
      >
        <ListItemIcon><PersonIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.45)' }} /></ListItemIcon>
        Profile & Settings
      </MenuItem>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      <MenuItem
        onClick={handleLogout}
        sx={{ py: 1.25, color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
      >
        <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
        Sign Out
      </MenuItem>
    </Menu>
  );

  // ── Mobile bottom dock ──────────────────────────────────────────────────────
  const BottomDock = () => (
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
        bgcolor: 'rgba(8, 6, 18, 0.88)',
        backdropFilter: 'blur(30px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        zIndex: theme.zIndex.appBar,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: BOTTOM_DOCK_HEIGHT,
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
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              minWidth: 56, minHeight: 48, pt: 0.5, pb: 0.5,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:active': { transform: 'scale(0.9)' },
            }}
          >
            <Box sx={{
              color: isActive ? '#818cf8' : 'rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 28, borderRadius: 2.5,
              bgcolor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              transition: 'all 0.2s ease',
              '& .MuiSvgIcon-root': { fontSize: 21 },
            }}>
              {item.icon}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                fontWeight: isActive ? 800 : 500,
                color: isActive ? '#818cf8' : 'rgba(255,255,255,0.4)',
                lineHeight: 1, mt: 0.25,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'transparent' }}>
      <CssBaseline />

      {/* Top navbar */}
      <Navbar />

      {/* Main content area — offset by navbar height */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: `${NAVBAR_HEIGHT}px`,
          pb: isMobile ? `${BOTTOM_DOCK_HEIGHT + 16}px` : 0,
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          overflowX: 'hidden',
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 2, md: 3 },
            maxWidth: 1600,
            mx: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Mobile bottom dock */}
      {isMobile && <BottomDock />}

      {/* Account menu */}
      <AccountMenu />
    </Box>
  );
};

export default Layout;
