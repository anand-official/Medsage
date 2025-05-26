import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2',
    },
    secondary: {
      main: '#DC004E',
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
    h1: {
      fontSize: '24px',
      lineHeight: '32px',
      fontWeight: 600,
    },
    h2: {
      fontSize: '20px',
      lineHeight: '28px',
      fontWeight: 500,
    },
    body1: {
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: 400,
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
        },
        contained: {
          boxShadow: 'none',
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
          borderRadius: 8,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
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
          },
        },
      },
      defaultProps: {
        maxWidth: 'sm', // 600px
      },
    },
  },
});

export default theme;
