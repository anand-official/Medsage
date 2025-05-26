import React, { createContext, useState, useEffect } from 'react';

export const StudyContext = createContext();

export const StudyContextProvider = ({ children }) => {
  const [currentSyllabus, setCurrentSyllabus] = useState('Indian MBBS');
  const [studyMode, setStudyMode] = useState('conceptual'); // 'conceptual' or 'exam'
  const [studyProgress, setStudyProgress] = useState([]);
  const [examDate, setExamDate] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [recentQueries, setRecentQueries] = useState([]);

  // Load saved state from localStorage on initial render
  useEffect(() => {
    const savedSyllabus = localStorage.getItem('currentSyllabus');
    const savedMode = localStorage.getItem('studyMode');
    const savedProgress = JSON.parse(localStorage.getItem('studyProgress'));
    const savedExamDate = localStorage.getItem('examDate');
    const savedQueries = JSON.parse(localStorage.getItem('recentQueries'));

    if (savedSyllabus) setCurrentSyllabus(savedSyllabus);
    if (savedMode) setStudyMode(savedMode);
    if (savedProgress) setStudyProgress(savedProgress);
    if (savedExamDate) setExamDate(new Date(savedExamDate));
    if (savedQueries) setRecentQueries(savedQueries);
    
    // Check online status
    setIsOfflineMode(!navigator.onLine);
    window.addEventListener('online', () => setIsOfflineMode(false));
    window.addEventListener('offline', () => setIsOfflineMode(true));
    
    return () => {
      window.removeEventListener('online', () => setIsOfflineMode(false));
      window.removeEventListener('offline', () => setIsOfflineMode(true));
    };
  }, []);

  // Save state changes to localStorage
  useEffect(() => {
    localStorage.setItem('currentSyllabus', currentSyllabus);
    localStorage.setItem('studyMode', studyMode);
    localStorage.setItem('studyProgress', JSON.stringify(studyProgress));
    if (examDate) localStorage.setItem('examDate', examDate.toISOString());
    localStorage.setItem('recentQueries', JSON.stringify(recentQueries));
  }, [currentSyllabus, studyMode, studyProgress, examDate, recentQueries]);

  // Function to add a new query to recent queries
  const addRecentQuery = (query, response) => {
    const newQueries = [{ query, response, timestamp: new Date() }, ...recentQueries.slice(0, 9)];
    setRecentQueries(newQueries);
  };

  // Function to update study progress
  const updateProgress = (topic, completed) => {
    if (completed && !studyProgress.includes(topic)) {
      setStudyProgress([...studyProgress, topic]);
    } else if (!completed) {
      setStudyProgress(studyProgress.filter(t => t !== topic));
    }
  };

  return (
    <StudyContext.Provider
      value={{
        currentSyllabus,
        setCurrentSyllabus,
        studyMode,
        setStudyMode,
        studyProgress,
        updateProgress,
        examDate,
        setExamDate,
        isOfflineMode,
        recentQueries,
        addRecentQuery
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};
