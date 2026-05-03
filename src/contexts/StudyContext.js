import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { plannerAPI } from '../services/plannerService';
import { formatRequestIdLabel } from '../services/api';
import { useAuth } from './AuthContext';

const StudyContext = createContext();

export const useStudyContext = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudyContext must be used within a StudyProvider');
  }
  return context;
};

function withRequestId(message, error) {
  const label = formatRequestIdLabel(error?.requestId);
  return label ? `${message} ${label}` : message;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const StudyProvider = ({ children }) => {
  const { userProfile, authStatus } = useAuth();

  const [studyPlan, setStudyPlan] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [dailyAdvisory, setDailyAdvisory] = useState(null);

  const [planState, setPlanState] = useState('idle');
  const [todayState, setTodayState] = useState('idle');
  const [analyticsState, setAnalyticsState] = useState('idle');
  const [isGenerating, setIsGenerating] = useState(false);

  const [planError, setPlanError] = useState(null);
  const [todayError, setTodayError] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [generateError, setGenerateError] = useState(null);

  const canLoadStudyData = authStatus === 'authenticated' && Boolean(userProfile);

  const planLoading = planState === 'loading';
  const todayLoading = todayState === 'loading';
  const analyticsLoading = analyticsState === 'loading';
  const loading = planLoading || todayLoading || analyticsLoading;
  const error = generateError || planError || todayError || analyticsError;

  useEffect(() => {
    if (canLoadStudyData) return;
    setStudyPlan(null);
    setTodayData(null);
    setAnalyticsData(null);
    setDailyAdvisory(null);
    setPlanState('idle');
    setTodayState('idle');
    setAnalyticsState('idle');
    setPlanError(null);
    setTodayError(null);
    setAnalyticsError(null);
    setGenerateError(null);
    setIsGenerating(false);
  }, [canLoadStudyData]);

  const fetchToday = useCallback(async () => {
    if (!canLoadStudyData) return null;
    setTodayState('loading');
    setTodayError(null);
    try {
      const res = await plannerAPI.getTodayDashboard();
      const nextToday = res?.data ?? null;
      if (nextToday) {
        setTodayData(nextToday);
        setTodayState('ready');
      } else {
        setTodayData(null);
        setTodayState('empty');
      }
      return nextToday;
    } catch (err) {
      setTodayError(withRequestId(err.message || 'Failed to fetch today dashboard.', err));
      setTodayState('error');
      return null;
    }
  }, [canLoadStudyData]);

  const getStudyPlan = useCallback(async () => {
    if (!canLoadStudyData) return undefined;
    setPlanState('loading');
    setPlanError(null);
    try {
      const res = await plannerAPI.getStudyPlan();
      const nextPlan = res?.data ?? null;
      setStudyPlan(nextPlan);
      setPlanState(nextPlan ? 'ready' : 'empty');
      return nextPlan;
    } catch (err) {
      setPlanError(withRequestId(err.message || 'Failed to fetch study plan.', err));
      setPlanState('error');
      return undefined;
    }
  }, [canLoadStudyData]);

  const fetchAnalytics = useCallback(async () => {
    if (!canLoadStudyData) return null;
    setAnalyticsState('loading');
    setAnalyticsError(null);
    try {
      const res = await plannerAPI.getAnalytics();
      const nextAnalytics = res?.data ?? null;
      if (nextAnalytics) {
        setAnalyticsData(nextAnalytics);
        setAnalyticsState('ready');
      } else {
        setAnalyticsData(null);
        setAnalyticsState('empty');
      }
      return nextAnalytics;
    } catch (err) {
      setAnalyticsError(withRequestId(err.message || 'Failed to fetch analytics.', err));
      setAnalyticsState('error');
      return null;
    }
  }, [canLoadStudyData]);

  const fetchDailyAdvisory = useCallback(async () => {
    if (!canLoadStudyData) return null;
    try {
      const res = await plannerAPI.getDailyAdvisory();
      const advisory = res?.data ?? null;
      if (advisory?.text) setDailyAdvisory(advisory);
      return advisory;
    } catch {
      return null;
    }
  }, [canLoadStudyData]);

  const refreshPlannerViews = useCallback(async () => {
    const [plan, today, analytics] = await Promise.all([
      getStudyPlan(),
      fetchToday(),
      fetchAnalytics()
    ]);
    fetchDailyAdvisory();
    return { plan, today, analytics };
  }, [fetchAnalytics, fetchToday, getStudyPlan, fetchDailyAdvisory]);

  const generateStudyPlan = useCallback(async (planData) => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await plannerAPI.generateStudyPlan({
        ...planData,
        country: planData?.country || userProfile?.country || 'India',
      });
      const nextPlan = res?.data ?? null;
      setStudyPlan(nextPlan);
      setPlanState(nextPlan ? 'ready' : 'empty');
      await Promise.all([fetchToday(), fetchAnalytics()]);
      return nextPlan;
    } catch (err) {
      setGenerateError(withRequestId(err.message || 'Failed to generate study plan.', err));
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [fetchAnalytics, fetchToday, userProfile?.country]);

  const syncTodayIntoPlan = useCallback((dateStr, nextTodayData) => {
    if (!nextTodayData?.tasks) return;
    setStudyPlan((prev) => {
      if (!prev) return prev;
      const dailyPlan = Array.isArray(prev.daily_plan) ? prev.daily_plan : [];
      return {
        ...prev,
        daily_plan: dailyPlan.map((day) =>
          day.date === dateStr ? { ...day, tasks: nextTodayData.tasks } : day
        )
      };
    });
  }, []);

  const tickTask = useCallback(async (dateStr, taskId, completedStatus) => {
    try {
      setTodayError(null);
      const res = await plannerAPI.tickTask(dateStr, taskId, completedStatus);
      if (res?.data) {
        const changedDay = res.data;
        const todayStr = todayData?.date || getLocalDateString();
        if (changedDay.date === todayStr) {
          setTodayData(changedDay);
          setTodayState('ready');
        }
        syncTodayIntoPlan(changedDay.date || dateStr, changedDay);
      }
      return res?.data ?? null;
    } catch (err) {
      const message = withRequestId('Failed to update task status.', err);
      setTodayError(message);
      throw new Error(message);
    }
  }, [syncTodayIntoPlan, todayData?.date]);

  const tickGoal = useCallback(async (goalType, goalId) => {
    setStudyPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        goals: {
          ...prev.goals,
          [goalType]: (prev.goals?.[goalType] || []).map((goal) =>
            goal.id === goalId ? { ...goal, done: !goal.done } : goal
          )
        }
      };
    });
    try {
      await plannerAPI.tickGoal(goalType, goalId);
    } catch (err) {
      // Revert optimistic update so the UI doesn't show a false state
      setStudyPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          goals: {
            ...prev.goals,
            [goalType]: (prev.goals?.[goalType] || []).map((goal) =>
              goal.id === goalId ? { ...goal, done: !goal.done } : goal
            )
          }
        };
      });
      // Surface the error so the UI can show a toast instead of a silent snap-back
      const message = withRequestId(err.message || 'Failed to update goal. Please try again.', err);
      setPlanError(message);
      throw new Error(message);
    }
  }, []);

  const addNewTask = useCallback(async (dateStr, text) => {
    try {
      setTodayError(null);
      const res = await plannerAPI.addTask(dateStr, text);
      if (res?.data) {
        const changedDay = res.data;
        const todayStr = todayData?.date || getLocalDateString();
        if (changedDay.date === todayStr) {
          setTodayData(changedDay);
          setTodayState('ready');
        }
        syncTodayIntoPlan(changedDay.date || dateStr, changedDay);
      }
      return res?.data ?? null;
    } catch (err) {
      const message = withRequestId('Failed to add a task.', err);
      setTodayError(message);
      throw new Error(message);
    }
  }, [syncTodayIntoPlan, todayData?.date]);

  const updateTaskText = useCallback(async (dateStr, taskId, newText) => {
    try {
      setTodayError(null);
      const res = await plannerAPI.editTask(dateStr, taskId, newText);
      if (res?.data) {
        const changedDay = res.data;
        const todayStr = todayData?.date || getLocalDateString();
        if (changedDay.date === todayStr) {
          setTodayData(changedDay);
          setTodayState('ready');
        }
        syncTodayIntoPlan(changedDay.date || dateStr, changedDay);
      }
      return res?.data ?? null;
    } catch (err) {
      const message = withRequestId('Failed to update the task.', err);
      setTodayError(message);
      throw new Error(message);
    }
  }, [syncTodayIntoPlan, todayData?.date]);

  const rebalancePlan = useCallback(async (payload = {}) => {
    setPlanError(null);
    try {
      const res = await plannerAPI.rebalancePlan(payload);
      const nextPlan = res?.data?.plan ?? null;
      if (nextPlan) {
        setStudyPlan(nextPlan);
        setPlanState('ready');
      }
      await Promise.all([fetchToday(), fetchAnalytics()]);
      return res?.data ?? null;
    } catch (err) {
      const message = withRequestId(err.message || 'Failed to rebalance planner.', err);
      setPlanError(message);
      throw new Error(message);
    }
  }, [fetchAnalytics, fetchToday]);

  const chatWithPlannerAssistant = useCallback(async (message) => {
    setPlanError(null);
    try {
      const res = await plannerAPI.chatWithPlannerAssistant(message);
      return res?.data ?? null;
    } catch (err) {
      const nextMessage = withRequestId(err.message || 'Planner coach failed to respond.', err);
      setPlanError(nextMessage);
      throw new Error(nextMessage);
    }
  }, []);

  const applyAssistantProposal = useCallback(async (proposalId) => {
    setPlanError(null);
    try {
      const res = await plannerAPI.applyAssistantProposal(proposalId);
      const nextPlan = res?.data?.plan ?? null;
      if (nextPlan) {
        setStudyPlan(nextPlan);
        setPlanState('ready');
      }
      await Promise.all([fetchToday(), fetchAnalytics()]);
      return res?.data ?? null;
    } catch (err) {
      const message = withRequestId(err.message || 'Failed to apply planner coach changes.', err);
      setPlanError(message);
      throw new Error(message);
    }
  }, [fetchAnalytics, fetchToday]);

  const value = {
    userProfile,
    studyPlan,
    todayData,
    analyticsData,
    dailyAdvisory,
    planState,
    todayState,
    analyticsState,
    planLoading,
    todayLoading,
    analyticsLoading,
    planError,
    todayError,
    analyticsError,
    generateError,
    loading,
    isGenerating,
    error,
    setError: setGenerateError,
    fetchToday,
    getStudyPlan,
    fetchAnalytics,
    fetchDailyAdvisory,
    refreshPlannerViews,
    generateStudyPlan,
    tickTask,
    tickGoal,
    addNewTask,
    updateTaskText,
    rebalancePlan,
    chatWithPlannerAssistant,
    applyAssistantProposal,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};
