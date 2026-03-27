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

const NAVBAR_HEIGHT = 68;
const BOTTOM_DOCK_HEIGHT = 72;

const LogoIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="2.8" fill="#ec4899" filter="drop-shadow(0 0 6px rgba(236,72,153,0.9))" />
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#logo-g1)" strokeWidth="2.2" strokeLinecap="round" />
    <path
      d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24"
      stroke="url(#logo-g2)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"
    />
    <defs>
      <linearGradient id="logo-g1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="logo-g2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
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
  const handleAvatarClick = (e) => setAnchorEl(e.currentTarget);
  const handleCloseMenu   = () => setAnchorEl(null);

  const handleLogout = async () => {
    try { await logout(); navigate('/signin'); }
    catch (e) { console.error('Logout failed:', e); }
  };

  // ── Navbar ─────────────────────────────────────────────────────────────────
  const Navbar = () => (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: NAVBAR_HEIGHT,
        zIndex: theme.zIndex.appBar,
        // frosted glass
        background: 'rgba(7, 5, 16, 0.75)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        // subtle bottom glow line
        boxShadow: '0 1px 0 0 rgba(139,92,246,0.12), 0 4px 24px 0 rgba(0,0,0,0.35)',
      }}
    >
      {/* Three-column grid: logo | nav | controls */}
      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          height: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
        }}
      >
        {/* ── Left: Logo ── */}
        <Box
          onClick={() => navigate('/')}
          role="button"
          aria-label="Go to dashboard"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            width: 'fit-content',
            '&:hover .logo-text': {
              opacity: 1,
            },
          }}
        >
          <LogoIcon />
          <Typography
            className="logo-text"
            sx={{
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(120deg, #c4b5fd 0%, #f0abfc 50%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              userSelect: 'none',
              opacity: 0.92,
              transition: 'opacity 0.2s',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Medsage.ai
          </Typography>
        </Box>

        {/* ── Center: Nav links (desktop only) ── */}
        {!isMobile ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              px: 0.75,
              py: 0.5,
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
                    alignItems: 'center',
                    gap: 0.6,
                    px: 1.4,
                    py: 0.7,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    position: 'relative',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.28) 0%, rgba(168,85,247,0.2) 100%)'
                      : 'transparent',
                    boxShadow: isActive
                      ? 'inset 0 1px 0 rgba(255,255,255,0.08)'
                      : 'none',
                    '&:hover': {
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(168,85,247,0.28) 100%)'
                        : 'rgba(255,255,255,0.05)',
                    },
                    '&:active': { transform: 'scale(0.95)' },
                    '& .MuiSvgIcon-root': { fontSize: 16 },
                  }}
                >
                  <Box sx={{ color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.38)', display: 'flex' }}>
                    {item.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ddd6fe' : 'rgba(255,255,255,0.55)',
                      letterSpacing: '-0.01em',
                      lineHeight: 1,
                    }}
                  >
                    {item.label}
                  </Typography>
                  {/* Active indicator dot */}
                  {isActive && (
                    <Box sx={{
                      position: 'absolute',
                      bottom: 3,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 3,
                      height: 3,
                      borderRadius: '50%',
                      bgcolor: '#a78bfa',
                      boxShadow: '0 0 6px 1px rgba(167,139,250,0.7)',
                    }} />
                  )}
                </Box>
              );
            })}
          </Box>
        ) : (
          // empty center on mobile
          <Box />
        )}

        {/* ── Right: Controls ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            justifyContent: 'flex-end',
          }}
        >
          {/* Theme toggle */}
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'} arrow>
            <IconButton
              onClick={toggleColorMode}
              aria-label="Toggle theme"
              size="small"
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                transition: 'all 0.18s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  borderColor: 'rgba(255,255,255,0.15)',
                },
              }}
            >
              {mode === 'dark'
                ? <LightModeIcon sx={{ fontSize: 16 }} />
                : <DarkModeIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>

          {/* Divider */}
          <Box sx={{ width: 1, height: 22, bgcolor: 'rgba(255,255,255,0.08)' }} />

          {/* Avatar button */}
          <Tooltip title={userProfile?.displayName || currentUser?.displayName || 'Account'} arrow>
            <Box
              onClick={handleAvatarClick}
              role="button"
              aria-label="Account menu"
              aria-controls={openMenu ? 'account-menu' : undefined}
              aria-haspopup="true"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                pl: 0.5,
                pr: 1,
                py: 0.4,
                borderRadius: '10px',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                transition: 'all 0.18s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.07)',
                  borderColor: 'rgba(255,255,255,0.14)',
                },
              }}
            >
              <Avatar
                src={userProfile?.photoURL || currentUser?.photoURL}
                sx={{
                  width: 26,
                  height: 26,
                  border: '1.5px solid rgba(139,92,246,0.5)',
                  bgcolor: '#6366f1',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                }}
              >
                {(userProfile?.displayName || currentUser?.displayName || 'S')[0].toUpperCase()}
              </Avatar>
              <Typography
                sx={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)',
                  maxWidth: 90,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', lg: 'block' },
                }}
              >
                {userProfile?.displayName?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || 'Account'}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  // ── Account dropdown ────────────────────────────────────────────────────────
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
          mt: 1.5,
          borderRadius: '14px',
          background: 'rgba(12, 9, 24, 0.97)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)',
          minWidth: '220px',
          overflow: 'visible',
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }} noWrap>
          {userProfile?.displayName || currentUser?.displayName || 'Student'}
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', mt: 0.25, display: 'block' }} noWrap>
          {userProfile?.email || currentUser?.email}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      <MenuItem
        onClick={() => { handleCloseMenu(); navigate('/'); }}
        sx={{ py: 1.1, color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
      >
        <ListItemIcon><DashboardIcon sx={{ fontSize: 17, color: 'rgba(255,255,255,0.4)' }} /></ListItemIcon>
        Dashboard
      </MenuItem>
      <MenuItem
        onClick={() => { handleCloseMenu(); navigate('/profile'); }}
        sx={{ py: 1.1, color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' } }}
      >
        <ListItemIcon><PersonIcon sx={{ fontSize: 17, color: 'rgba(255,255,255,0.4)' }} /></ListItemIcon>
        Profile & Settings
      </MenuItem>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      <MenuItem
        onClick={handleLogout}
        sx={{ py: 1.1, color: '#f87171', fontSize: '0.85rem',
          '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' } }}
      >
        <ListItemIcon><LogoutIcon sx={{ fontSize: 17, color: '#f87171' }} /></ListItemIcon>
        Sign Out
      </MenuItem>
    </Menu>
  );

  // ── Mobile bottom dock ──────────────────────────────────────────────────────
  const BottomDock = () => (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        pb: 'env(safe-area-inset-bottom, 8px)',
        pt: 1, px: 1,
        bgcolor: 'rgba(7, 5, 16, 0.9)',
        backdropFilter: 'blur(30px) saturate(180%)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
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
              minWidth: 56, minHeight: 48,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:active': { transform: 'scale(0.9)' },
            }}
          >
            <Box sx={{
              color: isActive ? '#818cf8' : 'rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 40, height: 28, borderRadius: 2,
              bgcolor: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              transition: 'all 0.2s ease',
              '& .MuiSvgIcon-root': { fontSize: 20 },
            }}>
              {item.icon}
            </Box>
            <Typography variant="caption" sx={{
              fontSize: '0.6rem',
              fontWeight: isActive ? 800 : 500,
              color: isActive ? '#818cf8' : 'rgba(255,255,255,0.35)',
              lineHeight: 1, mt: 0.25,
            }}>
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      <Navbar />

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
        <Box sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, md: 3 },
          maxWidth: 1400,
          mx: 'auto',
        }}>
          <Outlet />
        </Box>
      </Box>

      {isMobile && <BottomDock />}
      <AccountMenu />
    </Box>
  );
};

export default Layout;
