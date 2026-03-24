import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  // Track the last UID we synced so token refreshes don't re-trigger backend sync
  const lastSyncedUidRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Only sync with backend when the user actually changes (sign-in),
        // not on every token refresh (which fires onAuthStateChanged hourly).
        if (user.uid !== lastSyncedUidRef.current) {
          lastSyncedUidRef.current = user.uid;
          try {
            const profile = await authAPI.createOrUpdateUser({
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              uid: user.uid
            });
            const userObj = profile?.data ?? profile;
            setUserProfile(userObj);
          } catch (error) {
            console.error('Backend sync failed — using Firebase user as fallback:', error);
            // Fallback: build a minimal profile from Firebase so UI doesn't go blank.
            // onboarded:true in fallback to suppress onboarding — saving would fail anyway
            // since the backend is unreachable.
            setUserProfile({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Student',
              photoURL: user.photoURL || '',
              mbbs_year: '',
              college: '',
              country: 'India',
              onboarded: true,
              _fallback: true,
            });
          }
        }
      } else {
        lastSyncedUidRef.current = null;
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result;
    } catch (error) {
      console.error('Error in signInWithGoogle:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled. Please try again.');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const updateStudyPreferences = async (preferences) => {
    try {
      const updatedProfile = await authAPI.updatePreferences(preferences);
      setUserProfile(updatedProfile.data);
      return updatedProfile.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  const updateOnboardingProfile = async (profileData) => {
    try {
      const updatedProfile = await authAPI.updateProfile(profileData);
      setUserProfile(updatedProfile.data);
      return updatedProfile.data;
    } catch (error) {
      console.error('Error updating onboarding profile:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      await authAPI.deleteAccount();
      await logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    signInWithGoogle,
    logout,
    updateStudyPreferences,
    updateOnboardingProfile,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
