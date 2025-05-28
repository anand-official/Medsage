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
          // Create or update user in our backend
          const profile = await authAPI.createOrUpdateUser({
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            uid: user.uid
          });
          setUserProfile(profile);
        } catch (error) {
          console.error('Error syncing user with backend:', error);
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
      setUserProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    signInWithGoogle,
    logout,
    updateStudyPreferences
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 