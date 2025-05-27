import React, { createContext, useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';

// Create the context with initial values
export const StudyContext = createContext({
  examDate: new Date(),
  setExamDate: () => {},
  currentSyllabus: '',
  setSyllabus: () => {},
  studyProgress: {},
  setStudyProgress: () => {},
  studyMode: 'exam',
  setStudyMode: () => {},
  recentQueries: [],
  addRecentQuery: () => {},
  isOfflineMode: false,
  setOfflineMode: () => {},
  selectedSubjects: [],
  setSelectedSubjects: () => {},
  handleSubjectChange: () => {},
  weakSubjects: [],
  setWeakSubjects: () => {},
  handleWeakSubjectChange: () => {},
  generateStudyPlan: () => {},
  isGenerating: false,
  studyPlan: null,
  progress: {},
  updateProgress: () => {}
});

// Sample subject data - in a real app this would come from an API
export const SUBJECTS = [
  "Anatomy",
  "Physiology",
  "Biochemistry",
  "Pharmacology",
  "Pathology",
  "Microbiology",
  "Community Medicine",
  "Forensic Medicine",
  "Medicine",
  "Surgery",
  "Obstetrics & Gynecology",
  "Pediatrics",
  "Psychiatry",
  "Dermatology",
  "Orthopedics",
  "ENT",
  "Ophthalmology",
  "Radiology"
];

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

  // Load cached plan on initial render
  useEffect(() => {
    const cachedPlan = localStorage.getItem('studyPlan');
    if (cachedPlan) {
      try {
        const parsedPlan = JSON.parse(cachedPlan);
        setStudyPlan({...parsedPlan, fromCache: true});
      } catch (e) {
        console.error('Error parsing cached study plan:', e);
      }
    }
  }, []);

  // Add to recent queries
  const addRecentQuery = (query) => {
    setRecentQueries(prev => {
      const updated = [query, ...prev.filter(q => q.id !== query.id)];
      return updated.slice(0, 10); // Keep only 10 most recent
    });
  };

  // Handle subject selection
  const handleSubjectChange = (event) => {
    setSelectedSubjects(event.target.value);
  };

  // Handle weak subject selection
  const handleWeakSubjectChange = (event) => {
    setWeakSubjects(event.target.value);
  };

  // Update progress
  const updateProgress = (newProgress) => {
    setProgress(prev => ({
      ...prev,
      ...newProgress
    }));
  };

  // Handle form submission
  const generateStudyPlan = () => {
    setIsGenerating(true);
    
    // Simulate API call or complex calculation
    setTimeout(() => {
      // Calculate days remaining
      const daysRemaining = differenceInDays(examDate, new Date());
      
      // Generate daily plan based on selected subjects
      const dailyPlan = [];
      for (let i = 0; i < Math.min(daysRemaining, 30); i++) {
        const dayTopics = [];
        
        // Add 2-3 topics per day
        const topicsPerDay = Math.floor(Math.random() * 2) + 2;
        for (let j = 0; j < topicsPerDay; j++) {
          if (selectedSubjects.length > 0) {
            const subject = selectedSubjects[Math.floor(Math.random() * selectedSubjects.length)];
            dayTopics.push(subject);
          }
        }
        
        // Add a weak subject every 3 days
        if (i % 3 === 0 && weakSubjects.length > 0) {
          const weakSubject = weakSubjects[Math.floor(Math.random() * weakSubjects.length)];
          dayTopics.push(weakSubject);
        }
        
        dailyPlan.push(dayTopics);
      }
      
      // Create plan object
      const newPlan = {
        dailyPlan,
        daysRemaining,
        generatedAt: new Date().toISOString()
      };
      
      // Save to state and localStorage
      setStudyPlan(newPlan);
      localStorage.setItem('studyPlan', JSON.stringify(newPlan));
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <StudyContext.Provider value={{
      examDate,
      setExamDate,
      currentSyllabus,
      setSyllabus,
      studyProgress,
      setStudyProgress,
      studyMode,
      setStudyMode,
      recentQueries,
      addRecentQuery,
      isOfflineMode,
      setOfflineMode,
      selectedSubjects,
      setSelectedSubjects,
      handleSubjectChange,
      weakSubjects,
      setWeakSubjects,
      handleWeakSubjectChange,
      generateStudyPlan,
      isGenerating,
      studyPlan,
      progress,
      updateProgress
    }}>
      {children}
    </StudyContext.Provider>
  );
};