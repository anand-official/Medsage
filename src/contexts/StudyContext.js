import React, { createContext, useState, useContext, useEffect } from 'react';
import { differenceInDays, format } from 'date-fns';
import { getStudyPlan } from '../services/apiService';

// Create the context
export const StudyContext = createContext();

// Hook for using the context
export const useStudyContext = () => useContext(StudyContext);

// You can optionally create a provider component if needed
export const StudyContextProvider = ({ children }) => {
  // State management
  const [examDate, setExamDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)); // 90 days from now
  const [currentSyllabus, setSyllabus] = useState('MBBS');
  const [studyProgress, setStudyProgress] = useState({
    completedTopics: [],
    weakAreas: [],
    lastStudySession: new Date(),
    completionPercentage: 25
  });
  const [progress, setProgress] = useState({
    completedTopics: [],
    weakAreas: [],
    lastStudySession: new Date(),
    completionPercentage: 25
  });
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [weakSubjects, setWeakSubjects] = useState([]);
  const [studyMode, setStudyMode] = useState('exam'); // 'exam' or 'conceptual'
  const [recentQueries, setRecentQueries] = useState([]);
  const [isOfflineMode, setOfflineMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [studyPlan, setStudyPlan] = useState({
    dailyPlan: [],
    daysRemaining: 0,
    fromCache: false
  });

  // Check for network status on mount
  useEffect(() => {
    const handleOfflineStatus = () => {
      setOfflineMode(!navigator.onLine);
    };

    window.addEventListener('online', handleOfflineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // Set initial status
    setOfflineMode(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOfflineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  // Handle form submission
  const generateStudyPlan = () => {
    setIsGenerating(true);
    
    // Simulate API call or complex calculation
    setTimeout(async () => {
      try {
        // Calculate days remaining
        const daysRemaining = differenceInDays(examDate, new Date());
        
        // Call the API service to get the study plan
        const result = await getStudyPlan(currentSyllabus, examDate, progress);
        
        if (result.error) {
          console.error("Error generating study plan:", result.error);
          // Set default plan in case of error
          setStudyPlan({
            dailyPlan: generateDefaultPlan(daysRemaining),
            daysRemaining,
            fromCache: false
          });
        } else {
          // Set the study plan from API result
          setStudyPlan({
            dailyPlan: result.dailyTopics || [],
            daysRemaining,
            fromCache: result.fromCache || false
          });
        }
      } catch (error) {
        console.error("Exception in study plan generation:", error);
        // Fallback to a default plan
        const daysRemaining = differenceInDays(examDate, new Date());
        setStudyPlan({
          dailyPlan: generateDefaultPlan(daysRemaining),
          daysRemaining,
          fromCache: false
        });
      } finally {
        setIsGenerating(false);
      }
    }, 1500); // Simulate processing time
  };
  
  // Helper function to generate a default plan if API fails
  const generateDefaultPlan = (daysRemaining) => {
    // Simple algorithm to distribute subjects evenly
    const allSubjects = [
      'Anatomy', 'Physiology', 'Biochemistry',
      'Pathology', 'Pharmacology', 'Microbiology',
      'Community Medicine', 'Forensic Medicine', 
      'ENT', 'Ophthalmology', 'Medicine', 'Surgery',
      'Obstetrics & Gynecology', 'Pediatrics', 'Psychiatry'
    ];
    
    // Prioritize weak subjects
    const prioritizedSubjects = [
      ...weakSubjects,
      ...allSubjects.filter(subject => !weakSubjects.includes(subject))
    ];
    
    // Generate daily plan
    const dailyPlan = [];
    const subjectsPerDay = 2;
    
    for (let day = 0; day < Math.min(daysRemaining, 30); day++) {
      const todaySubjects = [];
      for (let i = 0; i < subjectsPerDay; i++) {
        const subjectIndex = (day * subjectsPerDay + i) % prioritizedSubjects.length;
        todaySubjects.push(prioritizedSubjects[subjectIndex]);
      }
      dailyPlan.push(todaySubjects);
    }
    
    return dailyPlan;
  };

  // Add recent query
  const addRecentQuery = (query) => {
    setRecentQueries(prev => {
      const newQueries = [query, ...prev.filter(q => q.id !== query.id)];
      // Keep only the 10 most recent queries
      return newQueries.slice(0, 10);
    });
  };

  // Mark topic as completed
  const markTopicCompleted = (topic) => {
    setProgress(prev => {
      const newCompletedTopics = [...prev.completedTopics, topic];
      const newPercentage = Math.min(
        100, 
        Math.round((newCompletedTopics.length / allTopicsCount) * 100)
      );
      
      return {
        ...prev,
        completedTopics: newCompletedTopics,
        lastStudySession: new Date(),
        completionPercentage: newPercentage
      };
    });
  };

  // Mark topic as weak area
  const markTopicAsWeak = (topic) => {
    setProgress(prev => {
      const newWeakAreas = [...prev.weakAreas];
      if (!newWeakAreas.includes(topic)) {
        newWeakAreas.push(topic);
      }
      
      return {
        ...prev,
        weakAreas: newWeakAreas
      };
    });
  };

  // Set the exam date
  const updateExamDate = (date) => {
    setExamDate(date);
    // Regenerate the study plan with the new date
    generateStudyPlan();
  };

  // Set the syllabus
  const updateSyllabus = (syllabus) => {
    setSyllabus(syllabus);
    // Regenerate the study plan with the new syllabus
    generateStudyPlan();
  };

  // Calculate the total number of topics (for progress percentage)
  const allTopicsCount = 150; // This would be dynamic in a real app

  return (
    <StudyContext.Provider value={{
      examDate,
      setExamDate: updateExamDate,
      currentSyllabus,
      setSyllabus: updateSyllabus,
      studyProgress,
      setStudyProgress,
      progress,
      setProgress,
      selectedSubjects,
      setSelectedSubjects,
      weakSubjects,
      setWeakSubjects,
      studyMode,
      setStudyMode,
      recentQueries,
      addRecentQuery,
      isOfflineMode,
      isGenerating,
      studyPlan,
      generateStudyPlan,
      markTopicCompleted,
      markTopicAsWeak
    }}>
      {children}
    </StudyContext.Provider>
  );
};

export default StudyContext;