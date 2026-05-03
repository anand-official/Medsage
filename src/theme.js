import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const getTheme = (mode) => {
  const isDark = mode === 'dark';

  // ── Palette tokens ─────────────────────────────────────────────────────
  const ink = {
    bg:        isDark ? '#0c0e1a' : '#f7eadf',
    surface:   isDark ? 'rgba(16, 18, 32, 0.82)' : 'rgba(255, 247, 238, 0.92)',
    card:      isDark ? 'rgba(18, 20, 34, 0.65)' : 'rgba(255, 250, 244, 0.9)',
    border:    isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(181, 126, 83, 0.16)',
    textPri:   isDark ? '#dde3f5' : '#352419',
    textSec:   isDark ? '#7e8ba3' : '#7b6655',
    divider:   isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(181, 126, 83, 0.12)',
  };

  // Ambient background gradient — adapts per mode
  const ambientGradient = isDark
    ? `
        radial-gradient(ellipse 60% 50% at 10% 8%,  rgba(99, 102, 241, 0.18) 0%, transparent 70%),
        radial-gradient(ellipse 50% 40% at 88% 6%,  rgba(168, 85, 247, 0.13) 0%, transparent 70%),
        radial-gradient(ellipse 55% 45% at 82% 92%, rgba(99, 102, 241, 0.10) 0%, transparent 70%),
        radial-gradient(ellipse 60% 50% at 4% 88%,  rgba(168, 85, 247, 0.14) 0%, transparent 70%)
      `
    : `
        radial-gradient(ellipse 62% 52% at 6%  6%,  rgba(245, 158, 11, 0.12) 0%, transparent 72%),
        radial-gradient(ellipse 48% 42% at 94% 6%,  rgba(251, 146, 60, 0.1) 0%, transparent 72%),
        radial-gradient(ellipse 58% 46% at 88% 94%, rgba(217, 119, 87, 0.08) 0%, transparent 74%),
        radial-gradient(ellipse 62% 52% at 2% 92%,  rgba(180, 83, 9, 0.08) 0%, transparent 70%)
      `;

  let theme = createTheme({
    breakpoints: {
      values: { xs: 0, sm: 375, md: 768, lg: 1024, xl: 1280 },
    },
    palette: {
      mode,
      primary: {
        main:         isDark ? '#6366f1' : '#b86a3f',
        light:        isDark ? '#818cf8' : '#d59668',
        dark:         isDark ? '#4f46e5' : '#8f4f2d',
        contrastText: '#ffffff',
      },
      secondary: {
        main:  isDark ? '#a855f7' : '#d78663',
        light: isDark ? '#c084fc' : '#edb08e',
        dark:  isDark ? '#9333ea' : '#b86746',
      },
      background: {
        default: ink.bg,
        paper:   ink.surface,
      },
      text: {
        primary:   ink.textPri,
        secondary: ink.textSec,
      },
      divider: ink.divider,
    },
    typography: {
      fontFamily: "'Inter', 'Poppins', sans-serif",
      h1: { fontWeight: 800, letterSpacing: '-0.025em' },
      h2: { fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 16 },
    components: {
      // ── Base ────────────────────────────────────────────────────────────
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: ink.bg,
            color: ink.textPri,
            '--surface-glass': isDark ? 'rgba(16, 18, 32, 0.82)' : 'rgba(255, 247, 238, 0.92)',
            '--surface-card': isDark ? 'rgba(18, 20, 34, 0.65)' : 'rgba(255, 250, 244, 0.9)',
            '--surface-strong': isDark ? 'rgba(12, 14, 26, 0.9)' : 'rgba(250, 239, 226, 0.96)',
            '--surface-soft': isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255, 241, 225, 0.72)',
            '--border-soft': ink.border,
            '--accent-primary': isDark ? '#818cf8' : '#b86a3f',
            '--accent-secondary': isDark ? '#c084fc' : '#d78663',
            '--accent-muted': isDark ? 'rgba(99,102,241,0.1)' : 'rgba(184, 106, 63, 0.1)',
            '--accent-border': isDark ? 'rgba(99,102,241,0.22)' : 'rgba(184, 106, 63, 0.18)',
            scrollbarWidth: 'thin',
            overflowX: 'hidden',
            position: 'relative',
            '&::-webkit-scrollbar':       { width: '6px', height: '6px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(184,106,63,0.2)',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: isDark ? 'rgba(165,180,252,0.35)' : 'rgba(184,106,63,0.34)',
            },
            // Ambient mesh — updates with theme mode
            '&::before': {
              content: '""',
              position: 'fixed',
              inset: 0,
              zIndex: -1,
              background: ambientGradient,
              filter: 'blur(80px)',
              pointerEvents: 'none',
            },
          },
        },
      },

      // ── Paper ───────────────────────────────────────────────────────────
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: ink.surface,
            backdropFilter: 'blur(20px) saturate(160%)',
            border: `1px solid ${ink.border}`,
          },
        },
      },

      // ── Card ────────────────────────────────────────────────────────────
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 24,
            overflow: 'hidden',
            backgroundImage: 'none',
            backgroundColor: ink.card,
            backdropFilter: 'blur(16px) saturate(140%)',
            border: `1px solid ${ink.border}`,
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s cubic-bezier(0.4,0,0.2,1), border-color 0.28s ease',
            '&:hover': {
              borderColor: isDark ? 'rgba(99,102,241,0.28)' : 'rgba(184,106,63,0.26)',
              boxShadow: isDark
                ? '0 20px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(99,102,241,0.18)'
                : '0 18px 44px rgba(152,93,51,0.12), 0 0 0 1px rgba(184,106,63,0.12)',
              transform: 'translateY(-3px)',
            },
            '@media (hover: none)': {
              '&:hover': { transform: 'none' },
            },
          },
        },
      },

      // ── Button ──────────────────────────────────────────────────────────
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 24px',
            minHeight: 44,
            transition: 'all 0.2s ease',
            '&:active': { transform: 'scale(0.97)' },
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: isDark
                ? '0 8px 20px rgba(99,102,241,0.35)'
                : '0 10px 24px rgba(184,106,63,0.22)',
              transform: 'translateY(-1px)',
            },
            '@media (hover: none)': {
              '&:hover': { transform: 'none', boxShadow: 'none' },
            },
          },
        },
      },

      // ── IconButton ──────────────────────────────────────────────────────
      MuiIconButton: {
        styleOverrides: {
          root: {
            minWidth: 44, minHeight: 44,
            '&:active': { transform: 'scale(0.92)' },
          },
        },
      },

      // ── AppBar ──────────────────────────────────────────────────────────
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark
              ? 'rgba(12, 14, 26, 0.78)'
              : 'rgba(247, 234, 223, 0.88)',
            backdropFilter: 'blur(20px) saturate(160%)',
            borderBottom: `1px solid ${ink.border}`,
            color: ink.textPri,
            boxShadow: 'none',
          },
        },
      },

      // ── Drawer ──────────────────────────────────────────────────────────
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#0e1020' : '#f8ede2',
            borderRight: `1px solid ${ink.border}`,
          },
        },
      },

      // ── TextField ───────────────────────────────────────────────────────
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 14,
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.03)'
                : 'rgba(184,106,63,0.05)',
              '& input': { fontSize: '16px' },
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(184,106,63,0.08)',
              },
              '&.Mui-focused': {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(184,106,63,0.07)',
              },
            },
          },
        },
      },

      // ── Dialog ──────────────────────────────────────────────────────────
      MuiDialog: {
        styleOverrides: {
          paper: {
            margin: 16,
            maxHeight: 'calc(100% - 32px)',
            width: 'calc(100% - 32px)',
            '@media (max-width: 768px)': {
              margin: 0,
              maxHeight: '100%',
              width: '100%',
              maxWidth: '100% !important',
              borderRadius: '24px 24px 0 0',
              position: 'fixed',
              bottom: 0,
            },
          },
        },
      },

      // ── Chip ────────────────────────────────────────────────────────────
      MuiChip: {
        styleOverrides: {
          root: {
            '&.MuiChip-clickable': { minHeight: 36 },
          },
        },
      },

      // ── Tab ─────────────────────────────────────────────────────────────
      MuiTab: {
        styleOverrides: {
          root: { minHeight: 48 },
        },
      },
    },
  });

  theme = responsiveFontSizes(theme);
  return theme;
};

export { getTheme };
export default getTheme;
