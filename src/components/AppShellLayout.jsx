'use client';

import React, { useContext, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Avatar,
  Box,
  CssBaseline,
  Divider,
  Menu,
  MenuItem,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Book as BookIcon,
  Dashboard as DashboardIcon,
  DateRange as DateRangeIcon,
  Home as HomeIcon,
  Logout as LogoutIcon,
  MonitorHeart as MonitorHeartIcon,
  Person as PersonIcon,
  QuestionAnswer as QuestionIcon,
} from '@mui/icons-material';
import { ThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import '../animations.css';

const FLOAT_TOP = 14;
const NAVBAR_HEIGHT = 64;
const BOTTOM_DOCK_HEIGHT = 68;
const PAGE_TOP_OFFSET = FLOAT_TOP + NAVBAR_HEIGHT + 16;

const STARS = [
  { left: 31, top: 6, size: 1.4 },
  { left: 41, top: 4, size: 1.0 },
  { left: 37, top: 17, size: 1.2 },
  { left: 47, top: 13, size: 0.85 },
  { left: 35, top: 12, size: 0.7 },
];

function LogoMark({ isDarkMode }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="3.2" fill="url(#lm-fill)" />
      <filter id="lm-glow">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <circle
        cx="14"
        cy="14"
        r="3.2"
        fill={isDarkMode ? '#ec4899' : '#c97348'}
        filter="url(#lm-glow)"
        opacity="0.92"
      />
      <path d="M14 3v7M14 18v7M3 14h7M18 14h7" stroke="url(#lm-stroke1)" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M5.75 5.75l4.95 4.95M17.3 17.3l4.95 4.95M22.25 5.75l-4.95 4.95M10.7 17.3l-4.95 4.95"
        stroke="url(#lm-stroke2)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      <defs>
        <radialGradient id="lm-fill" cx="50%" cy="50%" r="50%">
          <stop stopColor={isDarkMode ? '#f0abfc' : '#f6d4af'} />
          <stop offset="1" stopColor={isDarkMode ? '#ec4899' : '#c97348'} />
        </radialGradient>
        <linearGradient id="lm-stroke1" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDarkMode ? '#818cf8' : '#d59a6d'} />
          <stop offset="1" stopColor={isDarkMode ? '#a855f7' : '#b86a3f'} />
        </linearGradient>
        <linearGradient id="lm-stroke2" x1="25" y1="3" x2="3" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDarkMode ? '#f472b6' : '#efb08a'} />
          <stop offset="1" stopColor={isDarkMode ? '#6366f1' : '#d78663'} />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ThemeToggle({ isDarkMode, onClick }) {
  return (
    <motion.div
      onClick={onClick}
      role="button"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      style={{ position: 'relative', width: 54, height: 28, cursor: 'pointer', flexShrink: 0 }}
    >
      <motion.div
        animate={{
          background: isDarkMode
            ? 'linear-gradient(140deg, #07051a 0%, #15093a 100%)'
            : 'linear-gradient(140deg, #f0c793 0%, #fde68a 100%)',
          borderColor: isDarkMode ? 'rgba(139,92,246,0.5)' : 'rgba(191,113,61,0.26)',
          boxShadow: isDarkMode
            ? '0 0 0 2px rgba(139,92,246,0.08), inset 0 1px 8px rgba(0,0,0,0.78)'
            : '0 0 0 2px rgba(191,113,61,0.08), inset 0 1px 5px rgba(120,72,35,0.08)',
        }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 14,
          border: '1.5px solid',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence>
          {isDarkMode && STARS.map((star, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.95, 0.55, 0.95], scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                scale: { delay: index * 0.07, duration: 0.3 },
                opacity: {
                  delay: index * 0.07,
                  duration: 0.3,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  repeatDelay: index * 0.35 + 0.75,
                },
              }}
              style={{
                position: 'absolute',
                left: star.left,
                top: star.top,
                width: star.size * 2,
                height: star.size * 2,
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: `0 0 ${star.size * 5}px rgba(255,255,255,0.85)`,
                display: 'block',
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>
      <motion.div
        animate={{
          x: isDarkMode ? 3 : 29,
          background: isDarkMode
            ? 'linear-gradient(150deg, #dde6f5 20%, #b6c4e0 100%)'
            : 'linear-gradient(150deg, #fff1bf 0%, #e1a652 100%)',
          boxShadow: isDarkMode
            ? 'inset -5px 0 0 4px #0c0820, 0 2px 10px rgba(0,0,0,0.6)'
            : '0 0 18px rgba(225,166,82,0.55), 0 2px 6px rgba(0,0,0,0.12)',
        }}
        transition={{ type: 'spring', stiffness: 560, damping: 33 }}
        style={{
          position: 'absolute',
          top: 3,
          left: 0,
          width: 22,
          height: 22,
          borderRadius: '50%',
        }}
      />
    </motion.div>
  );
}

function isRouteActive(pathname, itemPath) {
  if (itemPath === '/') {
    return pathname === '/';
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

const AppShellLayout = ({ children }) => {
  const { mode, toggleColorMode } = useContext(ThemeContext);
  const theme = useTheme();
  const { logout, userProfile, currentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDarkMode = mode === 'dark';
  const navigate = (path, options = {}) => {
    if (options.replace) {
      router.replace(path);
      return;
    }
    router.push(path);
  };

  const navItems = [
    { label: 'Dashboard', icon: <HomeIcon sx={{ fontSize: 16 }} />, path: '/' },
    { label: 'Cortex', icon: <QuestionIcon sx={{ fontSize: 16 }} />, path: '/question' },
    { label: 'Study Plan', icon: <DateRangeIcon sx={{ fontSize: 16 }} />, path: '/planner' },
    { label: 'Review', icon: <DashboardIcon sx={{ fontSize: 16 }} />, path: '/review' },
    { label: 'Library', icon: <BookIcon sx={{ fontSize: 16 }} />, path: '/books' },
  ];

  const avatarBtnRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const shell = isDarkMode
    ? {
        frameBg: 'rgba(8, 6, 18, 0.86)',
        frameBorder: '1px solid rgba(255,255,255,0.08)',
        frameShadow: '0 18px 60px rgba(0,0,0,0.46), 0 0 0 1px rgba(168,85,247,0.06) inset',
        topGlow: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.38), rgba(99,102,241,0.34), transparent)',
        wordmark: 'linear-gradient(108deg, #c4b5fd 0%, #f0abfc 56%, #fb923c 100%)',
        navGroupBg: 'rgba(255,255,255,0.035)',
        navGroupBorder: '1px solid rgba(255,255,255,0.06)',
        navGroupShadow: '0 10px 30px rgba(0,0,0,0.3)',
        navActiveBg: 'linear-gradient(135deg, rgba(99,102,241,0.32), rgba(168,85,247,0.24), rgba(236,72,153,0.16))',
        navActiveBorder: '1px solid rgba(255,255,255,0.11)',
        navActiveShadow: '0 8px 24px rgba(99,102,241,0.18), 0 1px 0 rgba(255,255,255,0.05) inset',
        navLabel: 'rgba(255,255,255,0.48)',
        navLabelHover: 'rgba(255,255,255,0.82)',
        navLabelActive: '#f5f3ff',
        navIcon: 'rgba(255,255,255,0.3)',
        navIconHover: '#c4b5fd',
        navIconActive: '#c4b5fd',
        separator: 'rgba(255,255,255,0.1)',
        actionHover: 'rgba(255,255,255,0.06)',
        actionBorder: 'rgba(255,255,255,0.06)',
        avatarRing: 'linear-gradient(135deg, #818cf8, #a855f7, #ec4899)',
        avatarBg: '#4f46e5',
        avatarHover: 'rgba(255,255,255,0.06)',
        name: 'rgba(255,255,255,0.58)',
        chevron: 'rgba(255,255,255,0.24)',
        mobileBg: 'rgba(8, 6, 18, 0.92)',
        mobileBorder: '1px solid rgba(255,255,255,0.08)',
        mobileShadow: '0 16px 40px rgba(0,0,0,0.42)',
        mobileActiveBg: 'rgba(139,92,246,0.16)',
        mobileActive: '#a78bfa',
        mobileIdle: 'rgba(255,255,255,0.28)',
        menuBg: 'rgba(9, 7, 20, 0.97)',
        menuBorder: '1px solid rgba(255,255,255,0.08)',
        menuShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.08)',
        menuHeader: '#f5f3ff',
        menuMuted: 'rgba(255,255,255,0.34)',
        menuDivider: 'rgba(255,255,255,0.07)',
        menuText: 'rgba(255,255,255,0.6)',
        menuIcon: 'rgba(255,255,255,0.3)',
        menuHoverBg: 'rgba(255,255,255,0.05)',
        menuHoverText: '#ffffff',
      }
    : {
        frameBg: 'rgba(250, 241, 232, 0.9)',
        frameBorder: '1px solid rgba(181,126,83,0.14)',
        frameShadow: '0 18px 46px rgba(138,92,55,0.18), 0 0 0 1px rgba(255,255,255,0.45) inset',
        topGlow: 'linear-gradient(90deg, transparent, rgba(212,143,90,0.34), rgba(184,106,63,0.28), transparent)',
        wordmark: 'linear-gradient(108deg, #8f4f30 0%, #c97348 56%, #efba84 100%)',
        navGroupBg: 'rgba(255, 249, 244, 0.78)',
        navGroupBorder: '1px solid rgba(181,126,83,0.12)',
        navGroupShadow: '0 10px 26px rgba(138,92,55,0.12)',
        navActiveBg: 'linear-gradient(135deg, rgba(245,207,168,0.95), rgba(234,188,143,0.82), rgba(215,134,99,0.24))',
        navActiveBorder: '1px solid rgba(184,106,63,0.12)',
        navActiveShadow: '0 10px 24px rgba(160,96,56,0.14), 0 1px 0 rgba(255,255,255,0.45) inset',
        navLabel: '#8c735f',
        navLabelHover: '#6f5643',
        navLabelActive: '#3f2819',
        navIcon: '#b39680',
        navIconHover: '#c4865d',
        navIconActive: '#b86a3f',
        separator: 'rgba(181,126,83,0.18)',
        actionHover: 'rgba(184,106,63,0.08)',
        actionBorder: 'rgba(181,126,83,0.1)',
        avatarRing: 'linear-gradient(135deg, #d9a06f, #c97348, #e8b286)',
        avatarBg: '#b86a3f',
        avatarHover: 'rgba(184,106,63,0.08)',
        name: '#715948',
        chevron: 'rgba(113,89,72,0.46)',
        mobileBg: 'rgba(250, 241, 232, 0.94)',
        mobileBorder: '1px solid rgba(181,126,83,0.14)',
        mobileShadow: '0 16px 36px rgba(138,92,55,0.16)',
        mobileActiveBg: 'rgba(184,106,63,0.12)',
        mobileActive: '#b86a3f',
        mobileIdle: '#b39680',
        menuBg: 'rgba(255, 247, 239, 0.98)',
        menuBorder: '1px solid rgba(181,126,83,0.16)',
        menuShadow: '0 24px 64px rgba(130,88,48,0.18), 0 0 0 1px rgba(255,255,255,0.42)',
        menuHeader: '#352419',
        menuMuted: '#8a735f',
        menuDivider: 'rgba(181,126,83,0.12)',
        menuText: '#6c5542',
        menuIcon: '#b08668',
        menuHoverBg: 'rgba(184,106,63,0.08)',
        menuHoverText: '#3f2819',
      };

  const handleAvatarClick = () => {
    if (anchorEl) {
      setAnchorEl(null);
      return;
    }

    setAnchorEl(avatarBtnRef.current);
  };

  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/signin');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const displayName = userProfile?.displayName || currentUser?.displayName || '';
  const firstName = displayName.split(' ')[0] || 'Account';
  const avatarSrc = userProfile?.photoURL || currentUser?.photoURL;
  const avatarFallback = displayName[0]?.toUpperCase() || 'S';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />

      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: FLOAT_TOP,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(calc(100% - 28px), 1280px)',
          height: NAVBAR_HEIGHT,
          zIndex: theme.zIndex.appBar,
          borderRadius: { xs: '18px', md: '22px' },
          background: shell.frameBg,
          border: shell.frameBorder,
          backdropFilter: 'blur(34px) saturate(220%)',
          WebkitBackdropFilter: 'blur(34px) saturate(220%)',
          boxShadow: shell.frameShadow,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '16%',
            right: '16%',
            height: '1px',
            background: shell.topGlow,
            pointerEvents: 'none',
          }}
        />

        <Box
          sx={{
            px: { xs: 2, sm: 2.5, md: 3 },
            height: '100%',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr auto' : 'minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            onClick={() => navigate('/')}
            role="button"
            sx={{
              display: 'flex',
              alignItems: 'center',
                gap: 1.1,
                width: 'fit-content',
                cursor: 'pointer',
                justifySelf: 'start',
                borderRadius: '14px',
                px: 0.75,
                py: 0.5,
                transition: 'background 0.18s ease',
              '&:hover': {
                background: shell.actionHover,
              },
            }}
          >
            <LogoMark isDarkMode={isDarkMode} />
            <Typography
              sx={{
                display: { xs: 'none', sm: 'block' },
                fontWeight: 800,
                fontSize: '1rem',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                background: shell.wordmark,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                userSelect: 'none',
              }}
            >
              Medsage.ai
            </Typography>
          </Box>

          {!isMobile && (
            <Box
              sx={{
                justifySelf: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                px: '6px',
                py: '6px',
                borderRadius: '16px',
                background: shell.navGroupBg,
                border: shell.navGroupBorder,
                boxShadow: shell.navGroupShadow,
              }}
            >
              {navItems.map((item) => {
                const active = isRouteActive(pathname, item.path);

                return (
                  <Box
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    role="button"
                    aria-current={active ? 'page' : undefined}
                    component={motion.div}
                    whileHover={{ y: -1.5 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      px: '17px',
                      py: '10px',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      '&:hover .nav-label': { color: active ? shell.navLabelActive : shell.navLabelHover },
                      '&:hover .nav-icon': { color: active ? shell.navIconActive : shell.navIconHover },
                    }}
                  >
                    {active && (
                      <motion.div
                        layoutId="nav-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 14,
                          background: shell.navActiveBg,
                          border: shell.navActiveBorder,
                          boxShadow: shell.navActiveShadow,
                        }}
                      />
                    )}

                    <Box
                      className="nav-icon"
                      sx={{
                        color: active ? shell.navIconActive : shell.navIcon,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.18s ease',
                        position: 'relative',
                        zIndex: 1,
                        '& .MuiSvgIcon-root': { fontSize: 18 },
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography
                      className="nav-label"
                      sx={{
                        fontSize: '0.88rem',
                        fontWeight: active ? 700 : 540,
                        color: active ? shell.navLabelActive : shell.navLabel,
                        letterSpacing: '-0.015em',
                        lineHeight: 1,
                        transition: 'color 0.18s ease',
                        position: 'relative',
                        zIndex: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'flex-end',
              justifySelf: 'end',
            }}
          >
            <ThemeToggle isDarkMode={isDarkMode} onClick={toggleColorMode} />
            <Box sx={{ width: '1px', height: 18, bgcolor: shell.separator }} />

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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                borderRadius: '12px',
                px: { xs: '6px', lg: '8px' },
                py: '6px',
                border: `1px solid ${shell.actionBorder}`,
                transition: 'background 0.18s ease, border-color 0.18s ease',
                '&:hover': {
                  background: shell.avatarHover,
                },
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: -2.5,
                    borderRadius: '50%',
                    background: shell.avatarRing,
                    opacity: 0.72,
                  },
                }}
              >
                <Avatar
                  src={avatarSrc}
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: shell.avatarBg,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {avatarFallback}
                </Avatar>
              </Box>
              <Typography
                sx={{
                  display: { xs: 'none', lg: 'block' },
                  maxWidth: 104,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.82rem',
                  fontWeight: 650,
                  color: shell.name,
                }}
              >
                {firstName}
              </Typography>
              <Box sx={{ color: shell.chevron, display: { xs: 'none', lg: 'flex' } }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: `${PAGE_TOP_OFFSET}px`,
          pb: isMobile ? `${BOTTOM_DOCK_HEIGHT + 20}px` : 0,
          minHeight: `calc(100vh - ${PAGE_TOP_OFFSET}px)`,
          overflowX: 'hidden',
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
          {children}
        </Box>
      </Box>

      {isMobile && (
        <Box
          component="nav"
          aria-label="Main navigation"
          sx={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(calc(100% - 24px), 420px)',
            height: BOTTOM_DOCK_HEIGHT,
            zIndex: theme.zIndex.appBar,
            borderRadius: '20px',
            background: shell.mobileBg,
            border: shell.mobileBorder,
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            boxShadow: shell.mobileShadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            px: 1.25,
          }}
        >
          {navItems.map((item) => {
            const active = isRouteActive(pathname, item.path);

            return (
              <Box
                key={item.path}
                onClick={() => navigate(item.path)}
                role="button"
                aria-current={active ? 'page' : undefined}
                component={motion.div}
                whileTap={{ scale: 0.9 }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  minWidth: 62,
                  py: '6px',
                  borderRadius: '12px',
                  position: 'relative',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="dock-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 12,
                      background: shell.mobileActiveBg,
                    }}
                  />
                )}
                <Box
                  sx={{
                    color: active ? shell.mobileActive : shell.mobileIdle,
                    display: 'flex',
                    position: 'relative',
                    zIndex: 1,
                    '& .MuiSvgIcon-root': { fontSize: 20 },
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.58rem',
                    fontWeight: active ? 700 : 520,
                    color: active ? shell.mobileActive : shell.mobileIdle,
                    lineHeight: 1,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

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
            mt: 1.5,
            borderRadius: '16px',
            background: shell.menuBg,
            backdropFilter: 'blur(32px)',
            border: shell.menuBorder,
            boxShadow: shell.menuShadow,
            minWidth: 236,
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 1.75, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Box
            sx={{
              position: 'relative',
              flexShrink: 0,
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: -2,
                borderRadius: '50%',
                background: shell.avatarRing,
                opacity: 0.64,
              },
            }}
          >
            <Avatar
              src={avatarSrc}
              sx={{
                width: 36,
                height: 36,
                bgcolor: shell.avatarBg,
                fontSize: '0.75rem',
                fontWeight: 800,
                position: 'relative',
                zIndex: 1,
              }}
            >
              {avatarFallback}
            </Avatar>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: shell.menuHeader, lineHeight: 1.25 }} noWrap>
              {displayName || 'Student'}
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: shell.menuMuted, mt: '3px' }} noWrap>
              {userProfile?.email || currentUser?.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: shell.menuDivider }} />

        <Box sx={{ p: '6px' }}>
          {[
            { icon: <DashboardIcon sx={{ fontSize: 14 }} />, label: 'Dashboard', path: '/' },
            { icon: <PersonIcon sx={{ fontSize: 14 }} />, label: 'Profile & Settings', path: '/profile' },
            { icon: <MonitorHeartIcon sx={{ fontSize: 14 }} />, label: 'System Status', path: '/status' },
          ].map(({ icon, label, path }) => (
            <MenuItem
              key={label}
              onClick={() => {
                handleCloseMenu();
                navigate(path);
              }}
              sx={{
                borderRadius: '10px',
                py: '9px',
                px: '12px',
                gap: '10px',
                color: shell.menuText,
                fontSize: '0.82rem',
                fontWeight: 500,
                minHeight: 'unset',
                '&:hover': {
                  bgcolor: shell.menuHoverBg,
                  color: shell.menuHoverText,
                },
              }}
            >
              <Box sx={{ color: shell.menuIcon, display: 'flex' }}>{icon}</Box>
              {label}
            </MenuItem>
          ))}
        </Box>

        <Divider sx={{ borderColor: shell.menuDivider }} />

        <Box sx={{ p: '6px' }}>
          <MenuItem
            onClick={handleLogout}
            sx={{
              borderRadius: '10px',
              py: '9px',
              px: '12px',
              gap: '10px',
              color: '#f87171',
              fontSize: '0.82rem',
              fontWeight: 500,
              minHeight: 'unset',
              '&:hover': { bgcolor: 'rgba(239,68,68,0.08)' },
            }}
          >
            <LogoutIcon sx={{ fontSize: 14, color: '#f87171' }} />
            Sign out
          </MenuItem>
        </Box>
      </Menu>
    </Box>
  );
};

export default AppShellLayout;
