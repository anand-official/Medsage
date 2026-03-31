import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { googleLogout } from '@react-oauth/google';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Decode JWT payload without verification (verification happens on the server)
function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const lastSyncedUidRef = useRef(null);
  const refreshTimerRef = useRef(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('google_id_token');
    if (token) {
      const payload = decodeJwt(token);
      // Check if token is still valid (with 5-minute buffer)
      if (payload && payload.exp * 1000 > Date.now() + 5 * 60 * 1000) {
        const user = {
          uid: payload.sub,
          email: payload.email,
          displayName: payload.name || payload.email,
          photoURL: payload.picture || null,
        };
        setCurrentUser(user);
        syncWithBackend(user);
        scheduleTokenRefresh(payload.exp);
      } else {
        // Token expired — clear it
        localStorage.removeItem('google_id_token');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []); // runs once on mount — intentional

  const scheduleTokenRefresh = (expEpochSeconds) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // Warn 5 minutes before expiry
    const msUntilRefresh = expEpochSeconds * 1000 - Date.now() - 5 * 60 * 1000;
    if (msUntilRefresh > 0) {
      refreshTimerRef.current = setTimeout(() => {
        console.warn('[Auth] Google ID token expiring soon — user will need to re-login');
      }, msUntilRefresh);
    }
  };

  const syncWithBackend = async (user) => {
    if (user.uid === lastSyncedUidRef.current) return;
    lastSyncedUidRef.current = user.uid;
    try {
      const profile = await authAPI.createOrUpdateUser({
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid,
      });
      setUserProfile(profile?.data ?? profile);
    } catch (error) {
      console.error('Backend sync failed — using Google user as fallback:', error);
      setUserProfile({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL || '',
        mbbs_year: '',
        college: '',
        country: 'India',
        onboarded: true,
        _fallback: true,
      });
    }
    setLoading(false);
  };

  // Called by GoogleLogin onSuccess
  const handleGoogleSuccess = async (credentialResponse) => {
    const credential = credentialResponse.credential;
    localStorage.setItem('google_id_token', credential);

    const payload = decodeJwt(credential);
    const user = {
      uid: payload.sub,
      email: payload.email,
      displayName: payload.name || payload.email,
      photoURL: payload.picture || null,
    };
    setCurrentUser(user);
    scheduleTokenRefresh(payload.exp);
    await syncWithBackend(user);
  };

  const logout = () => {
    googleLogout();
    localStorage.removeItem('google_id_token');
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    lastSyncedUidRef.current = null;
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateStudyPreferences = async (preferences) => {
    const updatedProfile = await authAPI.updatePreferences(preferences);
    setUserProfile(updatedProfile.data);
    return updatedProfile.data;
  };

  const updateOnboardingProfile = async (profileData) => {
    const updatedProfile = await authAPI.updateProfile(profileData);
    setUserProfile(updatedProfile.data);
    return updatedProfile.data;
  };

  const deleteAccount = async () => {
    await authAPI.deleteAccount();
    logout();
  };

  const value = {
    currentUser,
    userProfile,
    handleGoogleSuccess,  // pass to GoogleLogin onSuccess
    logout,
    updateStudyPreferences,
    updateOnboardingProfile,
    deleteAccount,
    // signInWithGoogle is no longer a function — components must use <GoogleLogin> component
    signInWithGoogle: null,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
