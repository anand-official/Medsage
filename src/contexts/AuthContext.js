import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { googleLogout } from '@react-oauth/google';
import {
  authAPI,
  formatRequestIdLabel,
  registerAuthInvalidationHandler,
} from '../services/api';
import {
  clearAuthToken,
  getAuthToken,
  migrateLegacyAuthToken,
  setAuthToken,
} from '../utils/authStorage';

const AuthContext = createContext();
const AUTH_BOOTSTRAP_TIMEOUT_MS = 15000;

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

function isBootstrapAbort(error) {
  return error?.name === 'AbortError'
    || error?.name === 'CanceledError'
    || error?.code === 'ERR_CANCELED'
    || error?.message === 'canceled';
}

function createBootstrapTimeoutError() {
  const error = new Error('The Medsage account service took too long to respond. Please try again.');
  error.code = 'AUTH_BOOTSTRAP_TIMEOUT';
  error.retryable = true;
  return error;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [authError, setAuthError] = useState(null);

  const refreshTimerRef = useRef(null);
  const bootstrapControllerRef = useRef(null);
  const mountedRef = useRef(true);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const cancelBootstrap = useCallback(() => {
    const controller = bootstrapControllerRef.current;
    bootstrapControllerRef.current = null;
    if (controller) {
      controller.abort();
    }
    clearRefreshTimer();
  }, [clearRefreshTimer]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelBootstrap();
    };
  }, [cancelBootstrap]);

  const scheduleTokenRefresh = useCallback((expEpochSeconds) => {
    clearRefreshTimer();
    const msUntilRefresh = expEpochSeconds * 1000 - Date.now() - 5 * 60 * 1000;
    if (msUntilRefresh > 0) {
      refreshTimerRef.current = setTimeout(() => {
        console.warn('[Auth] Google ID token expiring soon - user will need to re-login');
      }, msUntilRefresh);
    }
  }, [clearRefreshTimer]);

  const applySignedOutState = useCallback(() => {
    clearAuthToken();
    clearRefreshTimer();
    setCurrentUser(null);
    setUserProfile(null);
    setAuthError(null);
    setAuthStatus('signed_out');
  }, [clearRefreshTimer]);

  const transitionToSignedOut = useCallback(() => {
    cancelBootstrap();
    applySignedOutState();
  }, [applySignedOutState, cancelBootstrap]);

  const formatAuthError = useCallback((error) => {
    const requestIdText = formatRequestIdLabel(error?.requestId);
    if (error?.statusCode === 401) {
      return 'Your session expired. Please sign in again.';
    }
    if (error?.code === 'AUTH_BOOTSTRAP_TIMEOUT') {
      return error.message;
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

  const createBootstrapController = useCallback(() => {
    cancelBootstrap();
    const controller = new AbortController();
    bootstrapControllerRef.current = controller;
    return controller;
  }, [cancelBootstrap]);

  const isActiveBootstrap = useCallback((controller, token) => (
    mountedRef.current
    && bootstrapControllerRef.current === controller
    && getAuthToken() === token
  ), []);

  const bootstrapFromToken = useCallback(async (token) => {
    if (!token) {
      transitionToSignedOut();
      return 'signed_out';
    }

    const payload = decodeJwt(token);
    if (!payload || payload.exp * 1000 <= Date.now() + 5 * 60 * 1000) {
      transitionToSignedOut();
      return 'signed_out';
    }

    const controller = createBootstrapController();
    const user = buildUserFromPayload(payload);

    setCurrentUser(null);
    setUserProfile(null);
    setAuthStatus('loading');
    setAuthError(null);
    scheduleTokenRefresh(payload.exp);

    let timeoutHandle = null;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(createBootstrapTimeoutError());
          controller.abort();
        }, AUTH_BOOTSTRAP_TIMEOUT_MS);
      });

      const profile = await Promise.race([
        authAPI.createOrUpdateUser({
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
        }, {
          signal: controller.signal,
        }),
        timeoutPromise,
      ]);

      if (!isActiveBootstrap(controller, token)) {
        return 'aborted';
      }

      setCurrentUser(user);
      setUserProfile(profile?.data ?? profile);
      setAuthStatus('authenticated');
      return 'authenticated';
    } catch (error) {
      if (error?.code === 'AUTH_BOOTSTRAP_TIMEOUT') {
        if (isActiveBootstrap(controller, token)) {
          setCurrentUser(null);
          setUserProfile(null);
          setAuthError(formatAuthError(error));
          setAuthStatus('degraded');
        }
        return 'degraded';
      }

      if (isBootstrapAbort(error) || controller.signal.aborted) {
        return 'aborted';
      }

      if (!isActiveBootstrap(controller, token)) {
        return 'aborted';
      }

      if (error?.statusCode === 401) {
        transitionToSignedOut();
        return 'signed_out';
      }

      setCurrentUser(null);
      setUserProfile(null);
      setAuthError(formatAuthError(error));
      setAuthStatus('degraded');
      return 'degraded';
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (bootstrapControllerRef.current === controller) {
        bootstrapControllerRef.current = null;
      }
    }
  }, [
    createBootstrapController,
    formatAuthError,
    isActiveBootstrap,
    scheduleTokenRefresh,
    transitionToSignedOut,
  ]);

  useEffect(() => registerAuthInvalidationHandler(() => {
    transitionToSignedOut();
  }), [transitionToSignedOut]);

  useLayoutEffect(() => {
    const token = migrateLegacyAuthToken();
    if (!token) {
      setCurrentUser(null);
      setUserProfile(null);
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
    transitionToSignedOut();
    googleLogout();
  }, [transitionToSignedOut]);

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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
