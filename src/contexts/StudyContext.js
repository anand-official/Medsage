import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { studyAPI } from '../services/api';

const StudyContext = createContext();

export function useStudyContext() {
  return useContext(StudyContext);
}

export function StudyProvider({ children }) {
  const { userProfile, updateStudyPreferences } = useAuth();
  const [studyPlan, setStudyPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyMode, setStudyMode] = useState('comprehensive');

  // Load study plan when user profile changes
  useEffect(() => {
    const loadStudyPlan = async () => {
      if (!userProfile) {
        setStudyPlan(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const plan = await studyAPI.getStudyPlan();
        setStudyPlan(plan);
        setError(null);
      } catch (error) {
        console.error('Error loading study plan:', error);
        setError('Failed to load study plan');
      } finally {
        setLoading(false);
      }
    };

    loadStudyPlan();
  }, [userProfile]);

  const createOrUpdateStudyPlan = async (dailyPlan) => {
    try {
      setLoading(true);
      const updatedPlan = await studyAPI.createOrUpdateStudyPlan(dailyPlan);
      setStudyPlan(updatedPlan);
      setError(null);
      return updatedPlan;
    } catch (error) {
      console.error('Error updating study plan:', error);
      setError('Failed to update study plan');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateTopicStatus = async (topicId, completed) => {
    try {
      const updatedPlan = await studyAPI.updateTopicStatus(topicId, completed);
      setStudyPlan(updatedPlan);
      setError(null);
      return updatedPlan;
    } catch (error) {
      console.error('Error updating topic status:', error);
      setError('Failed to update topic status');
      throw error;
    }
  };

  const value = {
    studyPlan,
    loading,
    error,
    createOrUpdateStudyPlan,
    updateTopicStatus,
    examDate: userProfile?.studyPreferences?.examDate,
    selectedSubjects: userProfile?.studyPreferences?.selectedSubjects || [],
    weakSubjects: userProfile?.studyPreferences?.weakSubjects || [],
    updateStudyPreferences,
    studyMode,
    setStudyMode
  };

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  );
}