// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Fetch medical query from API or cache
export const fetchMedicalQuery = async (question, mode, syllabus) => {
  try {
    // Check if we're offline
    if (!navigator.onLine) {
      return getFromCache('medical-responses', question, mode, syllabus);
    }

    // Create a cache key
    const cacheKey = `${question}_${mode}_${syllabus}`.toLowerCase().trim();
    
    // Check cache first
    const cachedResponse = await getFromCache('medical-responses', cacheKey);
    if (cachedResponse) return cachedResponse;
    
    // If not in cache, fetch from API
    const response = await fetch('/api/medical-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        mode,
        syllabus,
      }),
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        // API rate limit reached, try to find similar cached response
        const similarResponse = await findSimilarCachedQuery(question, mode, syllabus);
        if (similarResponse) return similarResponse;
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    await saveToCache('medical-responses', cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('Error fetching medical query:', error);
    
    // Try to get from cache even if there was an error
    const cacheKey = `${question}_${mode}_${syllabus}`.toLowerCase().trim();
    const cachedResponse = await getFromCache('medical-responses', cacheKey);
    
    if (cachedResponse) {
      return {
        ...cachedResponse,
        fromCache: true,
      };
    }
    
    return {
      error: 'Could not process your query. Please try again later.',
      details: error.message,
    };
  }
};

// Get study plan
export const getStudyPlan = async (syllabus, examDate, progress) => {
  try {
    if (!navigator.onLine) {
      return getFromCache('study-plans', `${syllabus}_${examDate}`);
    }
    
    const response = await fetch('/api/study-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        syllabus,
        examDate,
        progress,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the plan
    await saveToCache('study-plans', `${syllabus}_${examDate}`, data);
    
    return data;
  } catch (error) {
    console.error('Error fetching study plan:', error);
    
    // Try to get from cache
    const cachedPlan = await getFromCache('study-plans', `${syllabus}_${examDate}`);
    
    if (cachedPlan) {
      return {
        ...cachedPlan,
        fromCache: true,
      };
    }
    
    return {
      error: 'Could not generate study plan. Please try again later.',
      details: error.message,
    };
  }
};

// IndexedDB cache functions
const saveToCache = async (storeName, key, data) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MedStudyDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('medical-responses')) {
        db.createObjectStore('medical-responses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('study-plans')) {
        db.createObjectStore('study-plans', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const item = {
        id: key,
        data: data,
        timestamp: Date.now(),
      };
      
      const putRequest = store.put(item);
      
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

const getFromCache = async (storeName, key) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MedStudyDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('medical-responses')) {
        db.createObjectStore('medical-responses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('study-plans')) {
        db.createObjectStore('study-plans', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        
        if (!result) {
          resolve(null);
          return;
        }
        
        // Check if cache is expired
        if (Date.now() - result.timestamp > CACHE_DURATION) {
          // Cache expired, but return if offline
          if (!navigator.onLine) {
            resolve({
              ...result.data,
              fromCache: true,
              cacheExpired: true,
            });
          } else {
            resolve(null);
          }
          return;
        }
        
        resolve(result.data);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

const findSimilarCachedQuery = async (question, mode, syllabus) => {
  // This would be a more complex implementation in a real app
  // For the hackathon, a simplified version:
  try {
    const request = indexedDB.open('MedStudyDB', 1);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['medical-responses'], 'readonly');
        const store = transaction.objectStore('medical-responses');
        
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const allResponses = getAllRequest.result;
          
          // Simple matching by looking for keywords in the cached questions
          const keywords = question.toLowerCase().split(' ')
            .filter(word => word.length > 3);
          
          for (const response of allResponses) {
            const cachedId = response.id;
            const [cachedQuestion, cachedMode, cachedSyllabus] = cachedId.split('_');
            
            // Check if mode and syllabus match
            if (cachedMode === mode && cachedSyllabus === syllabus) {
              // Check if any keywords match
              if (keywords.some(keyword => cachedQuestion.includes(keyword))) {
                resolve({
                  ...response.data,
                  fromCache: true,
                  isSimilarQuery: true,
                  originalQuestion: cachedQuestion,
                });
                return;
              }
            }
          }
          
          resolve(null);
        };
        
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error finding similar cached query:', error);
    return null;
  }
};
