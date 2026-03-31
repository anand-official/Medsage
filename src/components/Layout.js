// src/components/Layout.js
import React, { useContext, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, CssBaseline, Typography, useMediaQuery,
  Avatar, Tooltip, useTheme, Menu, MenuItem,
  ListItemIcon, Divider,
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
const BOTTOM_DOCK_HEIGHT = 76;

const LogoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="2.8" fill="#ec4899" filter="drop-shadow(0 0 6px rgba(236,72,153,0.9))" />
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
    { label: 'Dashboard',  icon: <HomeIcon sx={{ fontSize: 15 }} />,       path: '/' },
    { label: 'Cortex',     icon: <QuestionIcon sx={{ fontSize: 15 }} />,   path: '/question' },
    { label: 'Study Plan', icon: <DateRangeIcon sx={{ fontSize: 15 }} />,  path: '/planner' },
    { label: 'Library',    icon: <BookIcon sx={{ fontSize: 15 }} />,       path: '/books' },
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

  // ── Floating Navbar ────────────────────────────────────────────────────────
  const Navbar = () => (
    <Box
      component="header"
      sx={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 920,
        height: 52,
        zIndex: theme.zIndex.appBar,
        borderRadius: '16px',
        background: 'rgba(8, 6, 18, 0.88)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: `
          0 0 0 1px rgba(168,85,247,0.07) inset,
          0 1px 0 rgba(255,255,255,0.05) inset,
          0 8px 32px rgba(0,0,0,0.5),
          0 2px 8px rgba(0,0,0,0.3)
        `,
      }}
    >
      {/* Top shimmer line */}
      <Box sx={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', borderRadius: 1,
        background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.45), rgba(99,102,241,0.45), transparent)',
        pointerEvents: 'none',
      }} />

      <Box sx={{
        px: { xs: 1.5, sm: 2 },
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 1,
      }}>

        {/* ── Logo ── */}
        <Box
          onClick={() => navigate('/')}
          role="button"
          sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            cursor: 'pointer', width: 'fit-content',
            borderRadius: '10px', p: '4px 8px', ml: -1,
            transition: 'background 0.18s',
            '&:hover': { background: 'rgba(255,255,255,0.05)' },
          }}
        >
          <LogoIcon />
          <Typography sx={{
            fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.04em',
            background: 'linear-gradient(120deg, #c4b5fd 0%, #f0abfc 55%, #fb923c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            userSelect: 'none',
            display: { xs: 'none', sm: 'block' },
          }}>
            Medsage.ai
          </Typography>
        </Box>

        {/* ── Center Nav ── */}
        {!isMobile ? (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: '2px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            p: '3px',
          }}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Box
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  role="button"
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    px: '11px', py: '6px',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    transition: 'all 0.16s ease',
                    background: active
                      ? 'linear-gradient(135deg, rgba(99,102,241,0.32) 0%, rgba(168,85,247,0.22) 100%)'
                      : 'transparent',
                    boxShadow: active
                      ? '0 1px 0 rgba(255,255,255,0.07) inset, 0 4px 12px rgba(99,102,241,0.15)'
                      : 'none',
                    '&:hover': {
                      background: active
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.38) 0%, rgba(168,85,247,0.28) 100%)'
                        : 'rgba(255,255,255,0.06)',
                    },
                    '&:active': { transform: 'scale(0.95)' },
                  }}
                >
                  <Box sx={{ color: active ? '#a78bfa' : 'rgba(255,255,255,0.32)', display: 'flex' }}>
                    {item.icon}
                  </Box>
                  <Typography sx={{
                    fontSize: '0.8rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#ddd6fe' : 'rgba(255,255,255,0.5)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ) : <Box />}

        {/* ── Right Controls ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>

          {/* Theme toggle */}
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'} arrow>
            <Box
              onClick={toggleColorMode}
              role="button"
              aria-label="Toggle theme"
              sx={{
                width: 32, height: 32, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.38)',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                transition: 'all 0.16s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.75)',
                  borderColor: 'rgba(255,255,255,0.14)',
                },
              }}
            >
              {mode === 'dark'
                ? <LightModeIcon sx={{ fontSize: 15 }} />
                : <DarkModeIcon sx={{ fontSize: 15 }} />}
            </Box>
          </Tooltip>

          {/* Separator */}
          <Box sx={{ width: '1px', height: 20, bgcolor: 'rgba(255,255,255,0.08)' }} />

          {/* Avatar button */}
          <Tooltip title={displayName || 'Account'} arrow>
            <Box
              onClick={handleAvatarClick}
              role="button"
              aria-label="Account menu"
              aria-controls={openMenu ? 'account-menu' : undefined}
              aria-haspopup="true"
              sx={{
                display: 'flex', alignItems: 'center', gap: '7px',
                pl: '5px', pr: { xs: '5px', lg: '10px' }, py: '3px',
                borderRadius: '10px',
                cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.03)',
                transition: 'all 0.16s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.07)',
                  borderColor: 'rgba(168,85,247,0.2)',
                },
              }}
            >
              <Avatar
                src={avatarSrc}
                sx={{
                  width: 24, height: 24,
                  border: '1.5px solid rgba(139,92,246,0.55)',
                  bgcolor: '#5b50e8',
                  fontSize: '0.6rem', fontWeight: 800,
                  boxShadow: '0 0 0 2px rgba(139,92,246,0.15)',
                }}
              >
                {avatarFallback}
              </Avatar>
              <Typography sx={{
                fontSize: '0.76rem', fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                maxWidth: 88, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: { xs: 'none', lg: 'block' },
              }}>
                {firstName}
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
          mt: 1.5, borderRadius: '16px',
          background: 'rgba(10, 8, 22, 0.97)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.65), 0 0 0 1px rgba(168,85,247,0.08)',
          minWidth: 230, overflow: 'visible',
        },
      }}
    >
      {/* User info header */}
      <Box sx={{ px: 2, pt: 1.75, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Avatar
          src={avatarSrc}
          sx={{
            width: 34, height: 34,
            border: '2px solid rgba(139,92,246,0.4)',
            bgcolor: '#5b50e8', fontSize: '0.75rem', fontWeight: 800,
          }}
        >
          {avatarFallback}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', lineHeight: 1.2 }} noWrap>
            {displayName || 'Student'}
          </Typography>
          <Typography sx={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.35)', mt: '2px' }} noWrap>
            {userProfile?.email || currentUser?.email}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 1 }} />

      <Box sx={{ py: '6px', px: '6px' }}>
        <MenuItem onClick={() => { handleCloseMenu(); navigate('/'); }} sx={{
          borderRadius: '10px', py: '8px', px: '10px',
          color: 'rgba(255,255,255,0.65)', fontSize: '0.83rem', gap: 1.2,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
        }}>
          <DashboardIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }} />
          Dashboard
        </MenuItem>
        <MenuItem onClick={() => { handleCloseMenu(); navigate('/profile'); }} sx={{
          borderRadius: '10px', py: '8px', px: '10px',
          color: 'rgba(255,255,255,0.65)', fontSize: '0.83rem', gap: 1.2,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
        }}>
          <PersonIcon sx={{ fontSize: 16, color: 'rgba(255,255,255,0.35)' }} />
          Profile & Settings
        </MenuItem>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 1 }} />

      <Box sx={{ py: '6px', px: '6px' }}>
        <MenuItem onClick={handleLogout} sx={{
          borderRadius: '10px', py: '8px', px: '10px',
          color: '#f87171', fontSize: '0.83rem', gap: 1.2,
          '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' },
        }}>
          <LogoutIcon sx={{ fontSize: 16, color: '#f87171' }} />
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
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 380,
        height: 58,
        zIndex: theme.zIndex.appBar,
        borderRadius: '18px',
        background: 'rgba(8, 6, 18, 0.92)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        px: 1,
      }}
    >
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Box
            key={item.path}
            onClick={() => navigate(item.path)}
            role="button"
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            sx={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', cursor: 'pointer',
              minWidth: 64, py: '6px', borderRadius: '12px',
              transition: 'all 0.18s ease',
              '&:active': { transform: 'scale(0.88)' },
            }}
          >
            <Box sx={{
              width: 36, height: 26, borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: active ? '#a78bfa' : 'rgba(255,255,255,0.32)',
              transition: 'all 0.18s ease',
              boxShadow: active ? '0 0 12px rgba(99,102,241,0.2)' : 'none',
              '& .MuiSvgIcon-root': { fontSize: 18 },
            }}>
              {item.icon}
            </Box>
            <Typography sx={{
              fontSize: '0.58rem', fontWeight: active ? 800 : 500,
              color: active ? '#a78bfa' : 'rgba(255,255,255,0.3)',
              lineHeight: 1, letterSpacing: '0.01em',
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
          mt: `${NAVBAR_HEIGHT + 12}px`,
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
