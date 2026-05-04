'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Analytics } from '@vercel/analytics/react';

import { AuthProvider } from '../contexts/AuthContext';
import { GoogleOAuthRuntimeProvider } from '../contexts/GoogleOAuthContext';
import { StudyProvider } from '../contexts/StudyContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { getApiBaseUrl } from '../config/apiBase';
import { getGoogleClientId, setRuntimeGoogleClientId } from '../config/googleAuth';
import { getStoredValue, setStoredValue } from '../utils/browser';
import { getTheme } from '../theme';

const GOOGLE_OAUTH_CONFIG_TIMEOUT_MS = 8000;

function GoogleOAuthBootstrap({ children }) {
  const [googleClientId, setGoogleClientId] = useState(() => getGoogleClientId());
  const [loading, setLoading] = useState(() => !getGoogleClientId());
  const [error, setError] = useState('');

  useEffect(() => {
    if (googleClientId) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), GOOGLE_OAUTH_CONFIG_TIMEOUT_MS);

    const loadRuntimeGoogleClientId = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/config`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Google sign-in configuration failed to load (HTTP ${response.status}).`);
        }
        const payload = await response.json().catch(() => null);
        const runtimeClientId = payload?.data?.googleClientId?.trim() || '';
        if (runtimeClientId) {
          setRuntimeGoogleClientId(runtimeClientId);
          setGoogleClientId(runtimeClientId);
          setError('');
          return;
        }
        setRuntimeGoogleClientId('');
        setError('Google sign-in is unavailable right now. Please try again later.');
      } catch (loadError) {
        setRuntimeGoogleClientId('');
        if (loadError.name === 'AbortError') {
          setError('Google sign-in configuration took too long to load. Please refresh and try again.');
        } else {
          console.warn('[Google OAuth] Could not load runtime client id:', loadError.message);
          setError(loadError.message || 'Google sign-in is unavailable right now. Please try again later.');
        }
      } finally {
        clearTimeout(timeoutHandle);
        if (active) {
          setLoading(false);
        }
      }
    };

    loadRuntimeGoogleClientId();
    return () => {
      active = false;
      clearTimeout(timeoutHandle);
      controller.abort();
    };
  }, [googleClientId]);

  const runtimeValue = {
    clientId: googleClientId,
    loading,
    error,
    unavailable: !loading && (!googleClientId || Boolean(error)),
  };

  const app = (
    <GoogleOAuthRuntimeProvider value={runtimeValue}>
      {children}
      <Analytics />
    </GoogleOAuthRuntimeProvider>
  );

  if (!googleClientId) {
    return app;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      {app}
    </GoogleOAuthProvider>
  );
}

export default function Providers({ children }) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState(() => getStoredValue('themeMode', 'light'));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setStoredValue('themeMode', mode);
  }, [mode]);

  const appTheme = useMemo(() => (mounted ? getTheme(mode) : null), [mounted, mode]);
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode]
  );

  const providerTree = (
    <GoogleOAuthBootstrap>
      <AuthProvider>
        <StudyProvider>
          {children}
        </StudyProvider>
      </AuthProvider>
    </GoogleOAuthBootstrap>
  );

  return (
    <ThemeContext.Provider value={colorMode}>
      {mounted && appTheme ? (
        <ThemeProvider theme={appTheme}>{providerTree}</ThemeProvider>
      ) : providerTree}
    </ThemeContext.Provider>
  );
}
