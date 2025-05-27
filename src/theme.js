import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Create a function to generate a theme based on mode
const getTheme = (mode) => {
  let theme = createTheme({
    palette: {
      mode: mode,
      ...(mode === 'light' 
        ? {
            // Light mode palette
            primary: {
              main: '#1976d2',
            },
            secondary: {
              main: '#f50057',
            },
            background: {
              default: '#f5f7fa',
              paper: '#ffffff',
            },
          }
        : {
            // Dark mode palette
            primary: {
              main: '#90caf9',
            },
            secondary: {
              main: '#f48fb1',
            },
            background: {
              default: '#121212',
              paper: '#1e1e1e',
            },
            text: {
              primary: 'rgba(255, 255, 255, 0.87)',
              secondary: 'rgba(255, 255, 255, 0.6)',
            },
          }),
    },
    typography: {
      fontFamily: "'Poppins', sans-serif",
      h1: {
        fontWeight: 600,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h4: {
        fontWeight: 500,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 500,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 500,
        fontSize: '1.1rem',
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 400,
      },
      body1: {
        fontSize: '0.95rem',
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
            boxShadow: mode === 'dark' 
              ? '0 8px 24px rgba(0, 0, 0, 0.2)' 
              : '0 2px 12px rgba(0, 0, 0, 0.08)',
            borderRadius: 12,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 500,
          },
          containedPrimary: {
            boxShadow: mode === 'dark' 
              ? '0 4px 12px rgba(144, 202, 249, 0.3)' 
              : '0 4px 12px rgba(25, 118, 210, 0.2)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? '#1a1a1a' : '#ffffff',
            color: mode === 'dark' ? '#ffffff' : '#000000',
            boxShadow: mode === 'dark' 
              ? '0 2px 10px rgba(0, 0, 0, 0.3)' 
              : '0 2px 10px rgba(0, 0, 0, 0.1)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            marginBottom: 4,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            margin: '16px 0',
            borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8,
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