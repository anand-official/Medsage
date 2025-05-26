import React, { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { StudyContextProvider } from './contexts/StudyContext';

// Pages
import HomePage from './pages/HomePage';
import QuestionPage from './pages/QuestionPage';
import StudyPlannerPage from './pages/StudyPlannerPage';
import BookReferencePage from './pages/BookReferencePage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import Layout from './components/Layout';

// Create ThemeContext to manage dark/light mode
export const ThemeContext = React.createContext();

function App() {
  // Get the saved mode from localStorage or default to 'light'
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'light');

  // Toggle between light and dark mode
  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('themeMode', newMode);
  };

  // Create the theme based on current mode
  // In App.js, update your theme creation
const theme = useMemo(() => createTheme({
  palette: {
    mode,
    primary: {
      light: '#4dabf5',
      main: '#1976d2',
      dark: '#1565c0',
      contrastText: '#fff',
    },
    secondary: {
      light: '#f73378',
      main: '#f50057',
      dark: '#ab003c',
      contrastText: '#fff',
    },
    info: {
      light: '#33c9dc',
      main: '#00b0cd',
      dark: '#007a8f',
    },
    success: {
      light: '#4caf50',
      main: '#2e7d32',
      dark: '#1b5e20',
    },
    background: {
      default: mode === 'light' ? '#f8f9fa' : '#121212',
      paper: mode === 'light' ? '#fff' : '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
}), [mode]);


  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudyContextProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="question" element={<QuestionPage />} />
                <Route path="planner" element={<StudyPlannerPage />} />
                <Route path="books" element={<BookReferencePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </StudyContextProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
