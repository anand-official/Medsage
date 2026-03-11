import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { plannerAPI } from '../services/plannerService';
import { useAuth } from './AuthContext';

const StudyContext = createContext();

export const useStudyContext = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudyContext must be used within a StudyProvider');
  }
  return context;
};

export const StudyProvider = ({ children }) => {
  const { userProfile } = useAuth(); // Access user profile from auth context

  // Core Data
  const [studyPlan, setStudyPlan] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Planner Setup Form State
  const [examDate, setExamDate] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [strongTopics, setStrongTopics] = useState([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Data Fetching actions
  const fetchToday = useCallback(async () => {
    if (!userProfile) return;
    try {
      setLoading(true); setError(null);
      const res = await plannerAPI.getTodayDashboard();
      if (res.data) setTodayData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch today dashboard');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  const getStudyPlan = useCallback(async () => {
    if (!userProfile) return;
    try {
      setLoading(true); setError(null);
      const res = await plannerAPI.getStudyPlan();
      setStudyPlan(res.data);
      return res.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch study plan');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  const fetchAnalytics = useCallback(async () => {
    if (!userProfile) return;
    try {
      setLoading(true); setError(null);
      const res = await plannerAPI.getAnalytics();
      setAnalyticsData(res.data);
      return res.data;
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  // Action methods
  const generateStudyPlan = async (year) => {
    try {
      setIsGenerating(true);
      setError(null);
      const res = await plannerAPI.generateStudyPlan({
        year,
        country: userProfile?.country || 'India',
        examDate,
        selectedSubjects,
        weakTopics,
        strongTopics
      });
      setStudyPlan(res.data);
      await fetchToday();
      return res.data;
    } catch (err) {
      setError(err.message || 'Failed to generate study plan');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const tickTask = async (dateStr, taskId, completedStatus) => {
    try {
      // Optimistic update for UI feel could be added here
      const res = await plannerAPI.tickTask(dateStr, taskId, completedStatus);
      if (res.data) setTodayData(res.data);
      return res.data;
    } catch (err) {
      console.error('Error ticking task:', err);
      setError('Failed to update task status');
    }
  };

  const addNewTask = async (dateStr, text) => {
    try {
      const res = await plannerAPI.addTask(dateStr, text);
      if (res.data) setTodayData(res.data);
      return res.data;
    } catch (err) {
      console.error('Error adding new task:', err);
      setError('Failed to add new task');
      throw err;
    }
  };

  const updateTaskText = async (dateStr, taskId, newText) => {
    try {
      const res = await plannerAPI.editTask(dateStr, taskId, newText);
      if (res.data) setTodayData(res.data);
      return res.data;
    } catch (err) {
      console.error('Error updating task text:', err);
      setError('Failed to update task text');
      throw err;
    }
  };

  const value = {
    userProfile, // Extracted user profile for direct access via study context
    studyPlan,
    todayData,
    analyticsData,

    examDate, setExamDate,
    selectedSubjects, setSelectedSubjects,
    weakTopics, setWeakTopics,
    strongTopics, setStrongTopics,

    loading,
    isGenerating,
    error,

    fetchToday,
    getStudyPlan,
    fetchAnalytics,
    generateStudyPlan,
    tickTask,
    addNewTask,
    updateTaskText,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};