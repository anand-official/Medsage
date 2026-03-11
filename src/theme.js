import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Create a function to generate a theme based on mode
const getTheme = (mode) => {
  const isDark = mode === 'dark';

  let theme = createTheme({
    palette: {
      mode: mode,
      primary: {
        main: '#6366f1', // Indigo/Blue
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#a855f7', // Purple
        light: '#c084fc',
        dark: '#9333ea',
      },
      background: {
        default: isDark ? '#050505' : '#f8fafc',
        paper: isDark ? 'rgba(15, 15, 15, 0.8)' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: "'Inter', 'Poppins', sans-serif",
      h1: { fontWeight: 800, letterSpacing: '-0.025em' },
      h2: { fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontWeight: 700, letterSpacing: '-0.025em' },
      h4: { fontWeight: 700, letterSpacing: '-0.025em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
      borderRadius: 16,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '6px',
              height: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              borderRadius: '10px',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            ...(isDark && {
              backgroundColor: 'rgba(15, 15, 15, 0.7)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 24,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
            ...(isDark && {
              backgroundColor: 'rgba(20, 20, 20, 0.6)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              '&:hover': {
                border: '1px solid rgba(99, 102, 241, 0.3)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                transform: 'translateY(-4px)',
              },
            }),
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 24px',
            transition: 'all 0.2s ease',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
              transform: 'translateY(-1px)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(5, 5, 5, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
            color: isDark ? '#ffffff' : '#0f172a',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#080808' : '#ffffff',
            borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 14,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
              },
            },
          },
        },
      },
    },
  });

  // Add responsive font sizes
  theme = responsiveFontSizes(theme);

  return theme;
}

// Export default light theme
const theme = getTheme('light');

// Export the theme generator function
export { getTheme };

export default theme;