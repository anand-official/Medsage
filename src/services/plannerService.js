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
        const params = new URLSearchParams();
        if (year) params.set('year', String(year));
        if (country) params.set('country', country);
        const query = params.toString();
        return apiCall(`/api/v1/study/syllabus${query ? `?${query}` : ''}`);
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

    rebalancePlan: async (payload = {}) => {
        return apiCall('/api/v1/study/plan/rebalance', {
            method: 'POST',
            data: payload
        });
    },

    chatWithPlannerAssistant: async (message) => {
        return apiCall('/api/v1/study/assistant/chat', {
            method: 'POST',
            data: { message }
        });
    },

    applyAssistantProposal: async (proposalId) => {
        return apiCall('/api/v1/study/assistant/apply', {
            method: 'POST',
            data: { proposalId }
        });
    },

    getResources: async ({ subject, topic, country, year } = {}) => {
        const params = new URLSearchParams();
        if (subject) params.set('subject', subject);
        if (topic) params.set('topic', topic);
        if (country) params.set('country', country);
        if (year) params.set('year', year);
        const query = params.toString();
        return apiCall(`/api/v1/study/resources${query ? `?${query}` : ''}`);
    },

    getDailyAdvisory: async () => {
        return apiCall('/api/v1/study/advisory');
    },

    // Toggle a goal's done status
    tickGoal: async (goalType, goalId) => {
        return apiCall('/api/v1/study/goal/tick', {
            method: 'POST',
            data: { goalType, goalId }
        });
    }
};
