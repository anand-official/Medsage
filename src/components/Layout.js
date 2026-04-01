// src/components/Layout.js
import React, { useContext, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, CssBaseline, Typography, useMediaQuery,
  Avatar, useTheme, Menu, MenuItem, Divider,
} from '@mui/material';
import {
  Home as HomeIcon,
  QuestionAnswer as QuestionIcon,
  DateRange as DateRangeIcon,
  Book as BookIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Dashboard as DashboardIcon,
  MonitorHeart as MonitorHeartIcon,
} from '@mui/icons-material';
import { ThemeContext } from '../App';
import { useAuth } from '../contexts/AuthContext';
import '../animations.css';

const NAVBAR_HEIGHT = 74;
const BOTTOM_DOCK_HEIGHT = 72;

const LogoMark = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="3.2" fill="url(#lm-fill)" />
    <filter id="lm-glow">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <circle cx="14" cy="14" r="3.2" fill="#ec4899" filter="url(#lm-glow)" opacity="0.9" />
    <path d="M14 3v7M14 18v7M3 14h7M18 14h7" stroke="url(#lm-stroke1)" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M5.75 5.75l4.95 4.95M17.3 17.3l4.95 4.95M22.25 5.75l-4.95 4.95M10.7 17.3l-4.95 4.95"
      stroke="url(#lm-stroke2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <defs>
      <radialGradient id="lm-fill" cx="50%" cy="50%" r="50%">
        <stop stopColor="#f0abfc" /><stop offset="1" stopColor="#ec4899" />
      </radialGradient>
      <linearGradient id="lm-stroke1" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
        <stop stopColor="#818cf8" /><stop offset="1" stopColor="#a855f7" />
      </linearGradient>
      <linearGradient id="lm-stroke2" x1="25" y1="3" x2="3" y2="25" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f472b6" /><stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
  </svg>
);

// ── Celestial Theme Toggle ───────────────────────────────────────────────
const STARS = [
  { left: 31, top: 6,  size: 1.4 },
  { left: 41, top: 4,  size: 1.0 },
  { left: 37, top: 17, size: 1.2 },
  { left: 47, top: 13, size: 0.85 },
  { left: 35, top: 12, size: 0.7 },
];

const ThemeToggle = ({ mode, onClick }) => {
  const isDark = mode === 'dark';
  return (
    <motion.div
      onClick={onClick}
      role="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      style={{ position: 'relative', width: 54, height: 28, cursor: 'pointer', flexShrink: 0 }}
    >
      {/* Track */}
      <motion.div
        animate={{
          background: isDark
            ? 'linear-gradient(140deg, #07051a 0%, #15093a 100%)'
            : 'linear-gradient(140deg, #93c5fd 0%, #fde68a 100%)',
          borderColor: isDark ? 'rgba(139,92,246,0.5)' : 'rgba(251,191,36,0.6)',
          boxShadow: isDark
            ? '0 0 0 2.5px rgba(139,92,246,0.09), inset 0 1px 8px rgba(0,0,0,0.75)'
            : '0 0 0 2.5px rgba(251,191,36,0.12), inset 0 1px 5px rgba(0,0,0,0.07)',
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 0,
          borderRadius: 14,
          border: '1.5px solid',
          overflow: 'hidden',
        }}
      >
        {/* Twinkling stars (dark mode only) */}
        <AnimatePresence>
          {isDark && STARS.map((s, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.95, 0.55, 0.95], scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                scale: { delay: i * 0.07, duration: 0.3 },
                opacity: { delay: i * 0.07, duration: 0.3, repeat: Infinity, repeatType: 'mirror', repeatDelay: i * 0.4 + 0.8 },
              }}
              style={{
                position: 'absolute',
                left: s.left, top: s.top,
                width: s.size * 2, height: s.size * 2,
                borderRadius: '50%',
                background: 'white',
                boxShadow: `0 0 ${s.size * 5}px rgba(255,255,255,0.85)`,
                display: 'block',
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Sliding orb */}
      <motion.div
        animate={{
          x: isDark ? 3 : 29,
          background: isDark
            ? 'linear-gradient(150deg, #dde6f5 20%, #b6c4e0 100%)'
            : 'linear-gradient(150deg, #fef08a 0%, #fbbf24 100%)',
          boxShadow: isDark
            ? 'inset -5px 0px 0 4px #0c0820, 0 2px 10px rgba(0,0,0,0.6)'
            : '0 0 18px rgba(251,191,36,0.95), 0 0 40px rgba(251,191,36,0.3), 0 2px 6px rgba(0,0,0,0.15)',
        }}
        transition={{ type: 'spring', stiffness: 560, damping: 33 }}
        style={{
          position: 'absolute',
          top: 3, left: 0,
          width: 22, height: 22,
          borderRadius: '50%',
        }}
      />
    </motion.div>
  );
};

const Layout = () => {
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const theme = useTheme();
  const { logout, userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navItems = [
    { label: 'Today',       icon: <HomeIcon sx={{ fontSize: 16 }} />,      path: '/' },
    { label: 'Cortex',     icon: <QuestionIcon sx={{ fontSize: 16 }} />,  path: '/question' },
    { label: 'Study Plan', icon: <DateRangeIcon sx={{ fontSize: 16 }} />, path: '/planner' },
    { label: 'Review',     icon: <DashboardIcon sx={{ fontSize: 16 }} />, path: '/review' },
    { label: 'Library',    icon: <BookIcon sx={{ fontSize: 16 }} />,      path: '/books' },
  ];

  const avatarBtnRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const handleAvatarClick = () => {
    // Use a stable ref (not event.currentTarget) to prevent Menu anchoring
    // to (0,0) when the click target is not an HTMLElement (rare, but happens).
    if (anchorEl) setAnchorEl(null);
    else setAnchorEl(avatarBtnRef.current);
  };
  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = async () => {
    try { await logout(); navigate('/signin'); }
    catch (e) { console.error('Logout failed:', e); }
  };

  const displayName = userProfile?.displayName || currentUser?.displayName || '';
  const firstName = displayName.split(' ')[0] || 'Account';
  const avatarSrc = userProfile?.photoURL || currentUser?.photoURL;
  const avatarFallback = displayName[0]?.toUpperCase() || 'S';

  // ── Render ─────────────────────────────────────────────────────────────────
  // NOTE: Navbar, AccountMenu, and BottomDock are NOT inner components —
  // defining them as `const Foo = () => (...)` inside Layout causes React to
  // treat them as new component types on every render, unmounting/remounting
  // the DOM tree. This destroys the avatar button's DOM node that anchorEl
  // points to, so MUI positions the dropdown at (0,0). Inline JSX is stable.
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />

      {/* ── Navbar ── */}
      <Box
        component="header"
        sx={{
          position: 'fixed', top: 0, left: 0, right: 0,
          height: NAVBAR_HEIGHT,
          zIndex: theme.zIndex.appBar,
          background: 'rgba(6, 4, 14, 0.74)',
          backdropFilter: 'blur(34px) saturate(220%)',
          WebkitBackdropFilter: 'blur(34px) saturate(220%)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.35)',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.25) 30%, rgba(99,102,241,0.25) 70%, transparent 100%)',
          },
        }}
      >
      <Box sx={{
        maxWidth: 1280, mx: 'auto',
        px: { xs: 3, md: 6 },
        height: '100%',
        display: 'grid',
        gridTemplateColumns: '220px 1fr 220px',
        alignItems: 'center',
      }}>

        {/* ── Logo ── */}
        <Box
          onClick={() => navigate('/')}
          role="button"
          sx={{
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', width: 'fit-content',
            '&:hover': { '& .logo-wordmark': { opacity: 1 } },
          }}
        >
          <LogoMark />
          <Box className="logo-wordmark" sx={{ opacity: 0.88, transition: 'opacity 0.2s', display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{
              fontWeight: 800,
              fontSize: '1.08rem',
              letterSpacing: '-0.045em',
              lineHeight: 1,
              background: 'linear-gradient(105deg, #c4b5fd 0%, #e879f9 50%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              userSelect: 'none',
            }}>
              Medsage.ai
            </Typography>
          </Box>
        </Box>

        {/* ── Center Nav — sliding pill ── */}
        {!isMobile && (
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '4px',
            px: '6px',
            py: '6px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 10px 34px rgba(0,0,0,0.28)',
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
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    px: '18px', py: '10px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    '&:hover .nav-label': { color: active ? '#fff' : 'rgba(255,255,255,0.78)' },
                    '&:hover .nav-icon': { color: active ? '#c4b5fd' : 'rgba(255,255,255,0.6)' },
                    '&:active': { transform: 'scale(0.96)' },
                    transition: 'transform 0.12s',
                  }}
                >
                  {/* Sliding pill background */}
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      style={{
                        position: 'absolute', inset: 0,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(99,102,241,0.16), rgba(236,72,153,0.14))',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 10px 28px rgba(124,58,237,0.18), 0 0 0 1px rgba(255,255,255,0.04) inset',
                      }}
                    />
                  )}

                  <Box className="nav-icon" sx={{
                    color: active ? '#c4b5fd' : 'rgba(255,255,255,0.32)',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.18s',
                    position: 'relative', zIndex: 1,
                    '& .MuiSvgIcon-root': { fontSize: 18 },
                  }}>
                    {item.icon}
                  </Box>

                  <Typography className="nav-label" sx={{
                    fontSize: '0.9rem',
                    fontWeight: active ? 700 : 520,
                    color: active ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.44)',
                    letterSpacing: '-0.015em',
                    lineHeight: 1,
                    transition: 'color 0.18s, font-weight 0.18s',
                    position: 'relative', zIndex: 1,
                    whiteSpace: 'nowrap',
                  }}>
                    {item.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {/* ── Right controls ── */}
        <Box sx={{
          display: 'flex', alignItems: 'center',
          gap: '6px', justifyContent: 'flex-end',
        }}>

          {/* Theme toggle */}
          <ThemeToggle mode={mode} onClick={toggleColorMode} />

          {/* Separator */}
          <Box sx={{ width: 1, height: 16, bgcolor: 'rgba(255,255,255,0.1)' }} />

          {/* Avatar */}
          <Box
            onClick={handleAvatarClick}
            ref={avatarBtnRef}
            role="button"
            aria-label="Account menu"
            aria-controls={openMenu ? 'account-menu' : undefined}
            aria-haspopup="true"
            component={motion.div}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            sx={{
              display: 'flex', alignItems: 'center', gap: '8px',
              cursor: 'pointer', borderRadius: '10px',
              px: '8px', py: '6px',
              transition: 'background 0.15s',
              '&:hover': { background: 'rgba(255,255,255,0.05)' },
            }}
          >
            <Box sx={{
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute', inset: -2.5,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #818cf8, #a855f7, #ec4899)',
                zIndex: 0,
                opacity: 0.7,
              },
            }}>
              <Avatar
                src={avatarSrc}
                sx={{
                  width: 32, height: 32,
                  bgcolor: '#4f46e5',
                  fontSize: '0.7rem', fontWeight: 800,
                  position: 'relative', zIndex: 1,
                }}
              >
                {avatarFallback}
              </Avatar>
            </Box>
            <Typography sx={{
              fontSize: '0.86rem', fontWeight: 650,
              color: 'rgba(255,255,255,0.52)',
              display: { xs: 'none', lg: 'block' },
              maxWidth: 110, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {firstName}
            </Typography>
            <Box sx={{ color: 'rgba(255,255,255,0.2)', display: { xs: 'none', lg: 'flex' } }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </Box>
          </Box>
        </Box>

      </Box>
      </Box>

      {/* ── Main content ── */}
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
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      {/* ── Mobile Bottom Dock ── */}
      {isMobile && (
        <Box
          component="nav"
          aria-label="Main navigation"
          sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            height: BOTTOM_DOCK_HEIGHT,
            pb: 'env(safe-area-inset-bottom, 0px)',
            zIndex: theme.zIndex.appBar,
            background: 'rgba(6, 4, 14, 0.94)',
            backdropFilter: 'blur(28px)',
            '&::before': {
              content: '""', position: 'absolute',
              top: 0, left: 0, right: 0, height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)',
            },
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-around', px: 2,
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
                component={motion.div}
                whileTap={{ scale: 0.88 }}
                sx={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '4px',
                  cursor: 'pointer', minWidth: 60, py: '6px',
                  borderRadius: '12px',
                  position: 'relative',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="dock-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(139,92,246,0.12)' }}
                  />
                )}
                <Box sx={{
                  color: active ? '#a78bfa' : 'rgba(255,255,255,0.25)',
                  display: 'flex', transition: 'color 0.18s',
                  position: 'relative', zIndex: 1,
                  '& .MuiSvgIcon-root': { fontSize: 20 },
                }}>
                  {item.icon}
                </Box>
                <Typography sx={{
                  fontSize: '0.58rem', fontWeight: active ? 700 : 500,
                  color: active ? '#a78bfa' : 'rgba(255,255,255,0.25)',
                  lineHeight: 1, position: 'relative', zIndex: 1,
                  transition: 'color 0.18s',
                }}>
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Account Dropdown ── */}
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={openMenu}
        onClose={handleCloseMenu}
        onClick={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        disableScrollLock
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 1.5, borderRadius: '16px',
            background: 'rgba(9, 7, 20, 0.97)',
            backdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08)',
            minWidth: 228, overflow: 'hidden',
          },
        }}
        TransitionComponent={undefined}
        TransitionProps={{ timeout: 0 }}
      >
        {/* User header */}
        <Box sx={{ px: 2, pt: 2, pb: 1.75, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Box sx={{
            position: 'relative', flexShrink: 0,
            '&::after': {
              content: '""', position: 'absolute', inset: -2,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #818cf8, #a855f7)',
              opacity: 0.6,
            },
          }}>
            <Avatar src={avatarSrc} sx={{
              width: 36, height: 36, bgcolor: '#4f46e5',
              fontSize: '0.75rem', fontWeight: 800,
              position: 'relative', zIndex: 1,
            }}>
              {avatarFallback}
            </Avatar>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#f5f3ff', lineHeight: 1.25 }} noWrap>
              {displayName || 'Student'}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.32)', mt: '3px' }} noWrap>
              {userProfile?.email || currentUser?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mx: 0 }} />

        <Box sx={{ p: '6px' }}>
          {[
            { icon: <DashboardIcon sx={{ fontSize: 14 }} />, label: 'Dashboard', path: '/' },
            { icon: <PersonIcon sx={{ fontSize: 14 }} />, label: 'Profile & Settings', path: '/profile' },
            { icon: <MonitorHeartIcon sx={{ fontSize: 14 }} />, label: 'System Status', path: '/status' },
          ].map(({ icon, label, path }) => (
            <MenuItem key={label} onClick={() => { handleCloseMenu(); navigate(path); }} sx={{
              borderRadius: '10px', py: '9px', px: '12px', gap: '10px',
              color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', fontWeight: 500,
              minHeight: 'unset',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)' },
            }}>
              <Box sx={{ color: 'rgba(255,255,255,0.28)', display: 'flex' }}>{icon}</Box>
              {label}
            </MenuItem>
          ))}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

        <Box sx={{ p: '6px' }}>
          <MenuItem onClick={handleLogout} sx={{
            borderRadius: '10px', py: '9px', px: '12px', gap: '10px',
            color: '#f87171', fontSize: '0.82rem', fontWeight: 500,
            minHeight: 'unset',
            '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' },
          }}>
            <LogoutIcon sx={{ fontSize: 14, color: '#f87171' }} />
            Sign out
          </MenuItem>
        </Box>
      </Menu>

    </Box>
  );
};

export default Layout;
