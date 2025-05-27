import React, { useState, createContext, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { 
  ThemeProvider, 
  CssBaseline 
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import './App.css';

// Import components
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import QuestionPage from './pages/QuestionPage';
import StudyPlannerPage from './pages/StudyPlannerPage';
import BookReferencePage from './pages/BookReferencePage';
import NotFoundPage from './pages/NotFoundPage';

// Import contexts and theme
import { StudyContextProvider } from './contexts/StudyContext';
import { getTheme } from './theme';

// Export the theme context
export const ThemeContext = createContext({ toggleColorMode: () => {} });

function App() {
  // State for theme mode
  const [mode, setMode] = useState(localStorage.getItem('themeMode') || 'light');
  
  // Save theme preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Create theme based on mode
  const appTheme = useMemo(
    () => getTheme(mode),
    [mode],
  );

  // Toggle theme mode
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode],
  );

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <ThemeContext.Provider value={colorMode}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <StudyContextProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="question" element={<QuestionPage />} />
                  <Route path="planner" element={<StudyPlannerPage />} />
                  <Route path="books" element={<BookReferencePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Router>
          </StudyContextProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
