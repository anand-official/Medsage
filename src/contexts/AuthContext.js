import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import { authAPI, formatRequestIdLabel } from '../services/api';
import {
  clearAuthToken,
  getAuthToken,
  migrateLegacyAuthToken,
  setAuthToken,
} from '../utils/authStorage';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function buildUserFromPayload(payload) {
  return {
    uid: payload.sub,
    email: payload.email,
    displayName: payload.name || payload.email,
    photoURL: payload.picture || null,
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState(null);

  const refreshTimerRef = useRef(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((expEpochSeconds) => {
    clearRefreshTimer();
    const msUntilRefresh = expEpochSeconds * 1000 - Date.now() - 5 * 60 * 1000;
    if (msUntilRefresh > 0) {
      refreshTimerRef.current = setTimeout(() => {
        console.warn('[Auth] Google ID token expiring soon - user will need to re-login');
      }, msUntilRefresh);
    }
  }, [clearRefreshTimer]);

  const clearSession = useCallback(() => {
    clearAuthToken();
    clearRefreshTimer();
    setCurrentUser(null);
    setUserProfile(null);
    setAuthError(null);
  }, [clearRefreshTimer]);

  const formatAuthError = useCallback((error) => {
    const requestIdText = formatRequestIdLabel(error?.requestId);
    if (error?.statusCode === 401) {
      return 'Your session expired. Please sign in again.';
    }
    if (error?.retryable) {
      return requestIdText
        ? `We could not reach your Medsage account. ${requestIdText}`
        : 'We could not reach your Medsage account. Please try again.';
    }
    return requestIdText
      ? `${error?.message || 'Authentication failed.'} ${requestIdText}`
      : (error?.message || 'Authentication failed.');
  }, []);

  const bootstrapFromToken = useCallback(async (token) => {
    if (!token) {
      clearSession();
      setAuthStatus('signed_out');
      return 'signed_out';
    }

    const payload = decodeJwt(token);
    if (!payload || payload.exp * 1000 <= Date.now() + 5 * 60 * 1000) {
      clearSession();
      setAuthStatus('signed_out');
      return 'signed_out';
    }

    const user = buildUserFromPayload(payload);
    setCurrentUser(user);
    setAuthStatus('loading');
    setAuthError(null);
    scheduleTokenRefresh(payload.exp);

    try {
      const profile = await authAPI.createOrUpdateUser({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid,
      });
      setUserProfile(profile?.data ?? profile);
      setAuthStatus('authenticated');
      return 'authenticated';
    } catch (error) {
      if (error?.statusCode === 401) {
        clearSession();
        setAuthStatus('signed_out');
        return 'signed_out';
      }
      setUserProfile(null);
      setAuthError(formatAuthError(error));
      setAuthStatus('degraded');
      return 'degraded';
    }
  }, [clearSession, formatAuthError, scheduleTokenRefresh]);

  useEffect(() => {
    const token = migrateLegacyAuthToken();
    if (!token) {
      setAuthStatus('signed_out');
      return;
    }
    bootstrapFromToken(token);
  }, [bootstrapFromToken]);

  const retryBootstrap = useCallback(async () => {
    const token = getAuthToken();
    return bootstrapFromToken(token);
  }, [bootstrapFromToken]);

  const handleGoogleSuccess = useCallback(async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      throw new Error('Google sign-in did not return a credential');
    }
    setAuthToken(credential);
    return bootstrapFromToken(credential);
  }, [bootstrapFromToken]);

  const logout = useCallback(() => {
    googleLogout();
    clearSession();
    setAuthStatus('signed_out');
  }, [clearSession]);

  const ensureAuthenticated = useCallback(() => {
    if (authStatus !== 'authenticated') {
      throw new Error('You must be signed in before updating your account.');
    }
  }, [authStatus]);

  const updateStudyPreferences = useCallback(async (preferences) => {
    ensureAuthenticated();
    const updatedProfile = await authAPI.updatePreferences(preferences);
    setUserProfile(updatedProfile.data);
    return updatedProfile.data;
  }, [ensureAuthenticated]);

  const updateOnboardingProfile = useCallback(async (profileData) => {
    ensureAuthenticated();
    const updatedProfile = await authAPI.updateProfile(profileData);
    setUserProfile(updatedProfile.data);
    return updatedProfile.data;
  }, [ensureAuthenticated]);

  const deleteAccount = useCallback(async () => {
    ensureAuthenticated();
    await authAPI.deleteAccount();
    logout();
  }, [ensureAuthenticated, logout]);

  const value = {
    currentUser,
    userProfile,
    authStatus,
    authError,
    handleGoogleSuccess,
    logout,
    retryBootstrap,
    updateStudyPreferences,
    updateOnboardingProfile,
    deleteAccount,
    signInWithGoogle: null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
