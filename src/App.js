import React, { useState, createContext, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import SignIn from './components/SignIn';
import Chat from './components/chat/Chat';

// Import contexts and theme
import { StudyProvider } from './contexts/StudyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getTheme } from './theme';

// Export the theme context
export const ThemeContext = createContext({ toggleColorMode: () => {} });

// Protected Route component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/signin" />;
  }

  return children;
}

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
          <AuthProvider>
            <StudyProvider>
              <Router>
                <Routes>
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/" element={<Layout />}>
                    <Route index element={
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    } />
                    <Route path="question" element={
                      <ProtectedRoute>
                        <QuestionPage />
                      </ProtectedRoute>
                    } />
                    <Route path="planner" element={
                      <ProtectedRoute>
                        <StudyPlannerPage />
                      </ProtectedRoute>
                    } />
                    <Route path="books" element={
                      <ProtectedRoute>
                        <BookReferencePage />
                      </ProtectedRoute>
                    } />
                    <Route path="chat" element={<Chat />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Router>
            </StudyProvider>
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
