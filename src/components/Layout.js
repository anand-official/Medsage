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
  Divider
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
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { ThemeContext } from '../App';
import { useAuth } from '../contexts/AuthContext';
import '../animations.css';

const SIDEBAR_WIDTH_FULL = 220;
const SIDEBAR_WIDTH_MINI = 64;
const BOTTOM_DOCK_HEIGHT = 72;

// The sidebar background is always dark regardless of theme
const SIDEBAR_BG = '#0b0b12';
const SIDEBAR_BORDER = '1px solid rgba(255,255,255,0.05)';

const CortexLogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill="#ec4899" filter="drop-shadow(0 0 8px rgba(236,72,153,0.8))" />
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#sb-logo-grad-1)" strokeWidth="2.5" strokeLinecap="round" />
    <path
      d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24"
      stroke="url(#sb-logo-grad-2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"
    />
    <defs>
      <linearGradient id="sb-logo-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="sb-logo-grad-2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
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

  // Desktop breakpoints
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));   // >= 900px
  const isLarge   = useMediaQuery(theme.breakpoints.up('lg'));   // >= 1200px
  const isMobile  = !isDesktop;

  // On desktop: lg+ = full sidebar (220px), md = mini sidebar (64px)
  const sidebarWidth = isLarge ? SIDEBAR_WIDTH_FULL : SIDEBAR_WIDTH_MINI;
  const isMini = isDesktop && !isLarge;

  const navigationItems = [
    { label: 'Dashboard', icon: <HomeIcon />,        path: '/' },
    { label: 'Cortex',    icon: <QuestionIcon />,    path: '/question' },
    { label: 'Study Plan',icon: <DateRangeIcon />,   path: '/planner' },
    { label: 'Library',   icon: <BookIcon />,         path: '/books' },
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

  // ── Sidebar Nav Item ────────────────────────────────────────────────────────
  const NavItem = ({ item }) => {
    const isActive = location.pathname === item.path;

    const button = (
      <Box
        onClick={() => navigate(item.path)}
        role="button"
        aria-label={item.label}
        aria-current={isActive ? 'page' : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: isMini ? 0 : 1.5,
          justifyContent: isMini ? 'center' : 'flex-start',
          px: isMini ? 0 : 2,
          py: 1.1,
          mx: isMini ? 'auto' : 1.5,
          width: isMini ? 42 : 'auto',
          height: 42,
          borderRadius: 2.5,
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
          background: isActive
            ? 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.18) 100%)'
            : 'transparent',
          border: isActive ? '1px solid rgba(99,102,241,0.28)' : '1px solid transparent',
          color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.45)',
          '&:hover': {
            background: isActive
              ? 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(168,85,247,0.22) 100%)'
              : 'rgba(255,255,255,0.06)',
            color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.75)',
          },
          '&:active': { transform: 'scale(0.96)' },
          '& .MuiSvgIcon-root': { fontSize: 20, flexShrink: 0 },
        }}
      >
        {item.icon}
        {!isMini && (
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              lineHeight: 1,
              color: 'inherit',
              letterSpacing: '-0.01em',
            }}
          >
            {item.label}
          </Typography>
        )}
      </Box>
    );

    if (isMini) {
      return (
        <Tooltip title={item.label} placement="right" arrow>
          {button}
        </Tooltip>
      );
    }
    return button;
  };

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const Sidebar = () => (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: sidebarWidth,
        bgcolor: SIDEBAR_BG,
        borderRight: SIDEBAR_BORDER,
        display: 'flex',
        flexDirection: 'column',
        zIndex: theme.zIndex.drawer,
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflowX: 'hidden',
      }}
    >
      {/* Logo area */}
      <Box
        onClick={() => navigate('/')}
        role="button"
        aria-label="Go to dashboard"
        sx={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMini ? 'center' : 'flex-start',
          px: isMini ? 0 : 2.5,
          gap: 1.5,
          cursor: 'pointer',
          flexShrink: 0,
          borderBottom: SIDEBAR_BORDER,
        }}
      >
        <CortexLogoIcon />
        {!isMini && (
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '1.1rem',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 60%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              userSelect: 'none',
            }}
          >
            Cortex
          </Typography>
        )}
      </Box>

      {/* Nav items */}
      <Box sx={{ pt: 1.5, flex: 0 }}>
        {navigationItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </Box>

      {/* Flex spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Bottom controls */}
      <Box sx={{ borderTop: SIDEBAR_BORDER, pt: 1, pb: 1.5 }}>
        {/* Theme toggle */}
        {isMini ? (
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'} placement="right" arrow>
            <IconButton
              onClick={toggleColorMode}
              aria-label="Toggle theme"
              sx={{
                display: 'flex', mx: 'auto', mb: 0.5,
                width: 42, height: 42, borderRadius: 2.5,
                color: 'rgba(255,255,255,0.45)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' },
              }}
            >
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        ) : (
          <Box
            onClick={toggleColorMode}
            role="button"
            aria-label="Toggle theme"
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2, py: 1.1, mx: 1.5, borderRadius: 2.5,
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.45)',
              transition: 'background 0.15s, color 0.15s',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' },
              '& .MuiSvgIcon-root': { fontSize: 20 },
            }}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1, color: 'inherit' }}>
              {mode === 'dark' ? 'Light mode' : 'Dark mode'}
            </Typography>
          </Box>
        )}

        {/* User avatar */}
        {isMini ? (
          <Tooltip title={userProfile?.displayName || currentUser?.displayName || 'Account'} placement="right" arrow>
            <IconButton
              onClick={handleAvatarClick}
              aria-label="Account menu"
              aria-controls={openMenu ? 'account-menu' : undefined}
              aria-haspopup="true"
              sx={{ display: 'flex', mx: 'auto', mt: 0.25, width: 42, height: 42, borderRadius: 2.5 }}
            >
              <Avatar
                src={userProfile?.photoURL || currentUser?.photoURL}
                sx={{
                  width: 32, height: 32,
                  border: '2px solid rgba(99,102,241,0.4)',
                  bgcolor: '#6366f1',
                  fontSize: '0.75rem',
                }}
              />
            </IconButton>
          </Tooltip>
        ) : (
          <Box
            onClick={handleAvatarClick}
            role="button"
            aria-label="Account menu"
            aria-controls={openMenu ? 'account-menu' : undefined}
            aria-haspopup="true"
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 2, py: 1, mx: 1.5, mt: 0.25, borderRadius: 2.5,
              cursor: 'pointer',
              transition: 'background 0.15s',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            <Avatar
              src={userProfile?.photoURL || currentUser?.photoURL}
              sx={{
                width: 32, height: 32, flexShrink: 0,
                border: '2px solid rgba(99,102,241,0.4)',
                bgcolor: '#6366f1',
                fontSize: '0.75rem',
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2,
                color: 'rgba(255,255,255,0.85)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {userProfile?.displayName || currentUser?.displayName || 'Student'}
              </Typography>
              <Typography sx={{
                fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {userProfile?.email || currentUser?.email || ''}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  // ── Account dropdown menu ───────────────────────────────────────────────────
  const AccountMenu = () => (
    <Menu
      anchorEl={anchorEl}
      id="account-menu"
      open={openMenu}
      onClose={handleCloseMenu}
      onClick={handleCloseMenu}
      transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 8px 28px rgba(0,0,0,0.45))',
          mb: 1,
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'transparent' }}>
      <CssBaseline />

      {/* Desktop sidebar */}
      {isDesktop && <Sidebar />}

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // offset for sidebar on desktop, no offset on mobile
          ml: isDesktop ? `${sidebarWidth}px` : 0,
          pb: isMobile ? `${BOTTOM_DOCK_HEIGHT + 16}px` : 0,
          minHeight: '100vh',
          width: isDesktop ? `calc(100% - ${sidebarWidth}px)` : '100%',
          overflowX: 'hidden',
          transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3, md: 3, lg: 4 },
            py: { xs: 2, md: 3 },
            maxWidth: 1600,
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Mobile bottom dock */}
      {isMobile && <BottomDock />}

      {/* Account menu (shared between sidebar and dock) */}
      <AccountMenu />
    </Box>
  );
};

export default Layout;
