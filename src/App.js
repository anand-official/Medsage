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
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#fff' : '#1e1e1e',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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
