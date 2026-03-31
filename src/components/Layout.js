// src/components/Layout.js
import React, { useContext, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, CssBaseline, Typography, useMediaQuery,
  Avatar, useTheme, Menu, MenuItem, Divider,
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

const NAVBAR_HEIGHT = 60;
const BOTTOM_DOCK_HEIGHT = 72;

const LogoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="2.8" fill="#ec4899" filter="drop-shadow(0 0 5px rgba(236,72,153,0.9))" />
    <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#lg1)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24"
      stroke="url(#lg2)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    <defs>
      <linearGradient id="lg1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818cf8" /><stop offset="1" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="lg2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ec4899" /><stop offset="1" stopColor="#6366f1" />
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

  const navItems = [
    { label: 'Dashboard',  icon: <HomeIcon sx={{ fontSize: 14 }} />,      path: '/' },
    { label: 'Cortex',     icon: <QuestionIcon sx={{ fontSize: 14 }} />,  path: '/question' },
    { label: 'Study Plan', icon: <DateRangeIcon sx={{ fontSize: 14 }} />, path: '/planner' },
    { label: 'Library',    icon: <BookIcon sx={{ fontSize: 14 }} />,      path: '/books' },
  ];

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const handleAvatarClick = (e) => setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = async () => {
    try { await logout(); navigate('/signin'); }
    catch (e) { console.error('Logout failed:', e); }
  };

  const displayName = userProfile?.displayName || currentUser?.displayName || '';
  const firstName = displayName.split(' ')[0] || 'Account';
  const avatarSrc = userProfile?.photoURL || currentUser?.photoURL;
  const avatarFallback = displayName[0]?.toUpperCase() || 'S';

  // ── Navbar ─────────────────────────────────────────────────────────────────
  const Navbar = () => (
    <Box
      component="header"
      sx={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: NAVBAR_HEIGHT,
        zIndex: theme.zIndex.appBar,
        background: 'rgba(7, 5, 16, 0.82)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      <Box sx={{
        maxWidth: 1280,
        mx: 'auto',
        px: { xs: 2, md: 5 },
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
      }}>

        {/* ── Left: Logo ── */}
        <Box
          onClick={() => navigate('/')}
          role="button"
          sx={{
            display: 'flex', alignItems: 'center', gap: '9px',
            cursor: 'pointer', width: 'fit-content',
            transition: 'opacity 0.15s',
            '&:hover': { opacity: 0.8 },
          }}
        >
          <LogoIcon />
          <Typography sx={{
            fontWeight: 800,
            fontSize: '0.93rem',
            letterSpacing: '-0.04em',
            background: 'linear-gradient(120deg, #c4b5fd 0%, #f0abfc 55%, #fb923c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            userSelect: 'none',
            display: { xs: 'none', sm: 'block' },
          }}>
            Medsage.ai
          </Typography>
        </Box>

        {/* ── Center: Nav tabs ── */}
        {!isMobile ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Box
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  role="button"
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    px: '14px', py: '7px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: active ? 'rgba(139,92,246,0.14)' : 'transparent',
                    '&:hover': {
                      background: active
                        ? 'rgba(139,92,246,0.2)'
                        : 'rgba(255,255,255,0.05)',
                    },
                    '&:active': { transform: 'scale(0.96)' },
                  }}
                >
                  <Box sx={{
                    color: active ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}>
                    {item.icon}
                  </Box>
                  <Typography sx={{
                    fontSize: '0.82rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#ede9fe' : 'rgba(255,255,255,0.45)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                    transition: 'color 0.15s',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </Typography>
                  {/* Active dot */}
                  {active && (
                    <Box sx={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#a78bfa',
                      boxShadow: '0 0 6px rgba(167,139,250,0.8)',
                      flexShrink: 0,
                    }} />
                  )}
                </Box>
              );
            })}
          </Box>
        ) : <Box />}

        {/* ── Right: Controls ── */}
        <Box sx={{
          display: 'flex', alignItems: 'center',
          gap: '8px', justifyContent: 'flex-end',
        }}>
          {/* Theme toggle */}
          <Box
            onClick={toggleColorMode}
            role="button"
            aria-label="Toggle theme"
            sx={{
              width: 34, height: 34, borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.35)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': {
                background: 'rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.7)',
              },
            }}
          >
            {mode === 'dark'
              ? <LightModeIcon sx={{ fontSize: 16 }} />
              : <DarkModeIcon sx={{ fontSize: 16 }} />}
          </Box>

          {/* Separator */}
          <Box sx={{ width: '1px', height: 18, bgcolor: 'rgba(255,255,255,0.1)' }} />

          {/* Avatar + name */}
          <Box
            onClick={handleAvatarClick}
            role="button"
            aria-label="Account menu"
            aria-controls={openMenu ? 'account-menu' : undefined}
            aria-haspopup="true"
            sx={{
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer', borderRadius: '10px',
              px: '8px', py: '5px',
              transition: 'background 0.15s',
              '&:hover': { background: 'rgba(255,255,255,0.06)' },
            }}
          >
            <Avatar
              src={avatarSrc}
              sx={{
                width: 28, height: 28,
                border: '2px solid rgba(139,92,246,0.45)',
                bgcolor: '#5b50e8',
                fontSize: '0.65rem', fontWeight: 800,
              }}
            >
              {avatarFallback}
            </Avatar>
            <Typography sx={{
              fontSize: '0.8rem', fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              display: { xs: 'none', lg: 'block' },
              maxWidth: 100, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {firstName}
            </Typography>
            {/* Chevron */}
            <Box sx={{
              color: 'rgba(255,255,255,0.25)',
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </Box>
          </Box>
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
          mt: 1, borderRadius: '14px',
          background: 'rgba(10, 8, 22, 0.97)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(168,85,247,0.07)',
          minWidth: 220,
        },
      }}
    >
      <Box sx={{ px: 2, pt: 1.75, pb: 1.5, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Avatar src={avatarSrc} sx={{
          width: 34, height: 34,
          border: '2px solid rgba(139,92,246,0.4)',
          bgcolor: '#5b50e8', fontSize: '0.72rem', fontWeight: 800,
        }}>
          {avatarFallback}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: '#f0eeff', lineHeight: 1.25 }} noWrap>
            {displayName || 'Student'}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', mt: '2px' }} noWrap>
            {userProfile?.email || currentUser?.email}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

      <Box sx={{ py: '5px', px: '5px' }}>
        {[
          { icon: <DashboardIcon sx={{ fontSize: 15 }} />, label: 'Dashboard', onClick: () => navigate('/') },
          { icon: <PersonIcon sx={{ fontSize: 15 }} />,    label: 'Profile & Settings', onClick: () => navigate('/profile') },
        ].map(({ icon, label, onClick }) => (
          <MenuItem key={label} onClick={() => { handleCloseMenu(); onClick(); }} sx={{
            borderRadius: '9px', py: '8px', px: '10px', gap: '10px',
            color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
          }}>
            <Box sx={{ color: 'rgba(255,255,255,0.3)', display: 'flex' }}>{icon}</Box>
            {label}
          </MenuItem>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

      <Box sx={{ py: '5px', px: '5px' }}>
        <MenuItem onClick={handleLogout} sx={{
          borderRadius: '9px', py: '8px', px: '10px', gap: '10px',
          color: '#f87171', fontSize: '0.82rem',
          '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' },
        }}>
          <LogoutIcon sx={{ fontSize: 15, color: '#f87171' }} />
          Sign Out
        </MenuItem>
      </Box>
    </Menu>
  );

  // ── Mobile bottom dock ──────────────────────────────────────────────────────
  const BottomDock = () => (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        pb: 'env(safe-area-inset-bottom, 0px)',
        height: BOTTOM_DOCK_HEIGHT,
        zIndex: theme.zIndex.appBar,
        background: 'rgba(7, 5, 16, 0.94)',
        backdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-around',
        px: 2,
      }}
    >
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Box
            key={item.path}
            onClick={() => navigate(item.path)}
            role="button"
            aria-current={active ? 'page' : undefined}
            sx={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px',
              cursor: 'pointer', minWidth: 56,
              transition: 'opacity 0.15s',
              '&:active': { opacity: 0.6 },
            }}
          >
            <Box sx={{
              width: 38, height: 26, borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? 'rgba(139,92,246,0.18)' : 'transparent',
              color: active ? '#a78bfa' : 'rgba(255,255,255,0.28)',
              transition: 'all 0.15s',
              '& .MuiSvgIcon-root': { fontSize: 18 },
            }}>
              {item.icon}
            </Box>
            <Typography sx={{
              fontSize: '0.58rem',
              fontWeight: active ? 700 : 500,
              color: active ? '#a78bfa' : 'rgba(255,255,255,0.28)',
              lineHeight: 1,
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
          pb: isMobile ? `${BOTTOM_DOCK_HEIGHT}px` : 0,
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          overflowX: 'hidden',
        }}
      >
        <Box sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 2, md: 3 },
          maxWidth: 1400, mx: 'auto',
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
