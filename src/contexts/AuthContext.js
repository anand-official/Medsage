import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    console.log('Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user);
      setCurrentUser(user);

      if (user) {
        try {
          // Sync with backend — creates/updates user profile in MongoDB
          const profile = await authAPI.createOrUpdateUser({
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            uid: user.uid
          });
          // apiCall() returns response.data (the full body: {success, data})
          // so we need .data to get the actual user object
          const userObj = profile?.data ?? profile;
          setUserProfile(userObj);
        } catch (error) {
          console.error('Backend sync failed — using Firebase user as fallback:', error);
          // ✅ FALLBACK: build a minimal userProfile from Firebase so UI doesn't go blank
          setUserProfile({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Student',
            photoURL: user.photoURL || '',
            mbbs_year: '',
            college: '',
            country: 'India',
            onboarded: true, // treat existing Google users as onboarded — they've already signed in before
            _fallback: true,
          });
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('Initiating Google sign in...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google sign in successful:', result.user);
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
      console.log('Logging out...');
      await signOut(auth);
      console.log('Logout successful');
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
      // Proceed to logout
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