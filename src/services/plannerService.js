import { apiCall } from './api';

export const plannerAPI = {
    // Generate a new AI-powered study plan
    generateStudyPlan: async (planData) => {
        return apiCall('/api/v1/study/generate', {
            method: 'POST',
            data: planData
        });
    },

    // Get the entire plan (for Plan tab)
    getStudyPlan: async () => {
        return apiCall('/api/v1/study/plan');
    },

    // Get today's dashboard data (tasks, streak, analytics)
    getTodayDashboard: async () => {
        return apiCall('/api/v1/study/today');
    },

    // Fetch curriculum syllabus for setup
    getSyllabus: async (year, country = 'India') => {
        return apiCall(`/api/v1/study/syllabus?year=${year}&country=${country}`);
    },

    // Tick a task as completed or incomplete
    tickTask: async (dateStr, taskId, completed) => {
        return apiCall('/api/v1/study/tick', {
            method: 'POST',
            data: { dateStr, taskId, completed }
        });
    },

    // Add a custom task to a specific day
    addTask: async (dateStr, text) => {
        return apiCall('/api/v1/study/task/add', {
            method: 'POST',
            data: { dateStr, text }
        });
    },

    // Edit an existing task's description
    editTask: async (dateStr, taskId, newText) => {
        return apiCall('/api/v1/study/task/edit', {
            method: 'PUT', // Using PUT since this is an idempotent modification
            data: { dateStr, taskId, newText }
        });
    },

    // Get full analytics (heatmap, performance)
    getAnalytics: async () => {
        return apiCall('/api/v1/study/analytics');
    },

    // Toggle a goal's done status
    tickGoal: async (goalType, goalId) => {
        return apiCall('/api/v1/study/goal/tick', {
            method: 'POST',
            data: { goalType, goalId }
        });
    }
};
