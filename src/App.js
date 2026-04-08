import React, { useState, useMemo, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link as RouterLink } from 'react-router-dom';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Button,
  CircularProgress,
  Typography,
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
import ReviewSession from './pages/ReviewSession';
import SystemStatusPage from './pages/SystemStatusPage';

// Import contexts and theme
import { StudyProvider } from './contexts/StudyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getTheme } from './theme';
import { getStoredValue, setStoredValue } from './utils/browser';
import { ThemeContext } from './contexts/ThemeContext';

export { ThemeContext }; // re-export so existing `from '../App'` imports keep working

// Protected Route component
function ProtectedRoute({ children }) {
  const { currentUser, authStatus, authError, retryBootstrap } = useAuth();

  if (authStatus === 'loading') {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading your Medsage workspace...</Typography>
      </Box>
    );
  }

  if (authStatus === 'degraded') {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3 }}>
        <Box sx={{ maxWidth: 520, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
            We could not load your account
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {authError || 'Please retry account bootstrap before opening protected pages.'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={retryBootstrap}>
              Retry
            </Button>
            <Button component={RouterLink} to="/status" variant="outlined">
              Open Status
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

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
                  <Route path="review" element={
                    <ProtectedRoute>
                      <ReviewSession />
                    </ProtectedRoute>
                  } />
                  <Route path="status" element={<SystemStatusPage />} />
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
