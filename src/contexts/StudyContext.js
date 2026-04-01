import React, { createContext, useContext, useState, useCallback } from 'react';
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
  const { userProfile } = useAuth();

  // Core Data
  const [studyPlan, setStudyPlan] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Per-operation loading states (no more shared flicker)
  const [planLoading, setPlanLoading] = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Per-operation error states
  const [planError, setPlanError] = useState(null);
  const [todayError, setTodayError] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [generateError, setGenerateError] = useState(null);

  // Derived: true if ANY fetch is in-flight (used by pages that just need a spinner)
  const loading = planLoading || todayLoading || analyticsLoading;
  // Derived: surface the most recent error to pages that use a single error slot
  const error = generateError || planError || todayError || analyticsError;

  const fetchToday = useCallback(async () => {
    if (!userProfile) return;
    setTodayLoading(true);
    setTodayError(null);
    try {
      const res = await plannerAPI.getTodayDashboard();
      if (res.data) setTodayData(res.data);
    } catch (err) {
      setTodayError(err.message || 'Failed to fetch today dashboard');
    } finally {
      setTodayLoading(false);
    }
  }, [userProfile]);

  const getStudyPlan = useCallback(async () => {
    if (!userProfile) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await plannerAPI.getStudyPlan();
      setStudyPlan(res.data);
      return res.data;
    } catch (err) {
      setPlanError(err.message || 'Failed to fetch study plan');
    } finally {
      setPlanLoading(false);
    }
  }, [userProfile]);

  const fetchAnalytics = useCallback(async () => {
    if (!userProfile) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await plannerAPI.getAnalytics();
      setAnalyticsData(res.data);
      return res.data;
    } catch (err) {
      setAnalyticsError(err.message || 'Failed to fetch analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [userProfile]);

  const generateStudyPlan = async (planData) => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await plannerAPI.generateStudyPlan({
        ...planData,
        country: userProfile?.country || 'India',
      });
      setStudyPlan(res.data);
      await fetchToday();
      return res.data;
    } catch (err) {
      const msg = err.message || 'Failed to generate study plan';
      setGenerateError(msg);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const tickTask = async (dateStr, taskId, completedStatus) => {
    try {
      const res = await plannerAPI.tickTask(dateStr, taskId, completedStatus);
      if (res.data) {
        setTodayData(res.data);
        // Keep studyPlan.daily_plan in sync so the calendar view updates too
        setStudyPlan(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            daily_plan: prev.daily_plan.map(d =>
              d.date === dateStr ? { ...d, tasks: res.data.tasks } : d
            )
          };
        });
      }
      return res.data;
    } catch (err) {
      console.error('Error ticking task:', err);
      setTodayError('Failed to update task status');
    }
  };

  const tickGoal = async (goalType, goalId) => {
    // Optimistic toggle
    setStudyPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        goals: {
          ...prev.goals,
          [goalType]: (prev.goals?.[goalType] || []).map(g =>
            g.id === goalId ? { ...g, done: !g.done } : g
          )
        }
      };
    });
    try {
      await plannerAPI.tickGoal(goalType, goalId);
    } catch (err) {
      console.error('Error ticking goal:', err);
      // Revert on failure
      setStudyPlan(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          goals: {
            ...prev.goals,
            [goalType]: (prev.goals?.[goalType] || []).map(g =>
              g.id === goalId ? { ...g, done: !g.done } : g
            )
          }
        };
      });
    }
  };

  const addNewTask = async (dateStr, text) => {
    try {
      const res = await plannerAPI.addTask(dateStr, text);
      if (res.data) setTodayData(res.data);
      return res.data;
    } catch (err) {
      console.error('Error adding new task:', err);
      setTodayError('Failed to add new task');
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
      setTodayError('Failed to update task text');
      throw err;
    }
  };

  const value = {
    userProfile,
    studyPlan,
    todayData,
    analyticsData,

    // Granular loading/error for components that need them
    planLoading, todayLoading, analyticsLoading,
    planError, todayError, analyticsError, generateError,

    // Derived combined states for backward-compat with pages using loading/error
    loading,
    isGenerating,
    error,
    setError: setGenerateError, // backward compat

    fetchToday,
    getStudyPlan,
    fetchAnalytics,
    generateStudyPlan,
    tickTask,
    tickGoal,
    addNewTask,
    updateTaskText,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};
