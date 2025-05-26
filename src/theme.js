// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2',
      light: '#4791db',
      dark: '#115293',
    },
    secondary: {
      main: '#DC004E',
      light: '#e33371',
      dark: '#9a0036',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    divider: '#E0E0E0',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: 600,
      marginBottom: '16px',
    },
    h2: {
      fontSize: '20px',
      lineHeight: '28px',
      fontWeight: 500,
      marginBottom: '12px',
    },
    h5: {
      fontWeight: 600,
      fontSize: '18px',
      lineHeight: '26px',
    },
    h6: {
      fontWeight: 600,
      fontSize: '16px',
      lineHeight: '24px',
    },
    body1: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 400,
    },
    body2: {
      fontSize: '14px',
      lineHeight: '20px',
      color: '#757575',
    },
    button: {
      fontSize: '14px',
      lineHeight: '20px',
      fontWeight: 500,
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          height: 40,
          borderRadius: 4,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
            backgroundColor: '#1565C0', // Darker on hover
          },
        },
        contained: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#115293',
          },
        },
        containedSecondary: {
          '&:hover': {
            backgroundColor: '#9a0036',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: 16,
        },
      },
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
        InputProps: {
          style: {
            height: 48,
            borderRadius: 8,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: 16,
          paddingRight: 16,
          '@media (min-width:600px)': {
            paddingLeft: 24,
            paddingRight: 24,
            maxWidth: 600,
          },
          '@media (min-width:960px)': {
            maxWidth: 960,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          height: 10,
        },
      },
    },
  },
});

export default theme;
