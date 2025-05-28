import React, { createContext, useContext, useState } from 'react';
import { studyAPI } from '../services/api';

const StudyContext = createContext();

export const useStudyContext = () => {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error('useStudyContext must be used within a StudyProvider');
  }
  return context;
};

export const StudyProvider = ({ children }) => {
  const [studyPlan, setStudyPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [examDate, setExamDate] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [weakSubjects, setWeakSubjects] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateStudyPlan = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const data = await studyAPI.generateStudyPlan({
        examDate,
        selectedSubjects,
        weakSubjects,
      });
      setStudyPlan(data.data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to generate study plan');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const getStudyPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await studyAPI.getStudyPlan();
      setStudyPlan(data.data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch study plan');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStudyPlan = async (dailyPlan) => {
    try {
      setLoading(true);
      setError(null);
      const data = await studyAPI.updateStudyPlan({ dailyPlan });
      setStudyPlan(data.data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to update study plan');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    studyPlan,
    loading,
    error,
    examDate,
    setExamDate,
    selectedSubjects,
    setSelectedSubjects,
    weakSubjects,
    setWeakSubjects,
    isGenerating,
    generateStudyPlan,
    getStudyPlan,
    updateStudyPlan,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};