import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline
} from '@mui/material';

import './App.css';

// Import components
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import QuestionPage from './pages/QuestionPage';
import StudyPlannerPage from './pages/StudyPlannerPage';
import BookReferencePage from './pages/BookReferencePage';
import NotFoundPage from './pages/NotFoundPage';
import SignIn from './components/SignIn';
import ProfilePage from './pages/ProfilePage';
import Onboarding from './components/auth/Onboarding';
import LandingPage from './pages/LandingPage';
import TeamPage from './pages/TeamPage';

// Import contexts and theme
import { StudyProvider } from './contexts/StudyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getTheme } from './theme';
import { getStoredValue, setStoredValue } from './utils/browser';
import { ThemeContext } from './contexts/ThemeContext';

export { ThemeContext }; // re-export so existing `from '../App'` imports keep working

// Protected Route component
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/landing" />;
  }

  return children;
}

function App() {
  // State for theme mode
  const [mode, setMode] = useState(() => getStoredValue('themeMode', 'light'));

  // Save theme preference to localStorage when it changes
  useEffect(() => {
    setStoredValue('themeMode', mode);
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
        <AuthProvider>
          <StudyProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Onboarding />
              <Routes>
                <Route path="/landing" element={<LandingPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  } />
                  <Route path="question" element={
                    <ProtectedRoute>
                      <ErrorBoundary>
                        <QuestionPage />
                      </ErrorBoundary>
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
                  <Route path="profile" element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="settings" element={<Navigate to="/profile" replace />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Router>
          </StudyProvider>
        </AuthProvider>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App;
