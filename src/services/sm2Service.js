/**
 * SM-2 API Service
 * Uses the shared api.js axios instance which automatically attaches
 * the real Firebase ID token via the request interceptor.
 */

import api from './api';

const SM2_BASE = '/api/sm2';

const sm2API = {
    /**
     * Create a flashcard from a question via the full pipeline.
     * The server applies the confidence gate (≥0.80) internally.
     */
    createFlashcard: async (question, answerSummary = null, mode = 'exam') => {
        const res = await api.post(`${SM2_BASE}/flashcard`, {
            question,
            answer_summary: answerSummary,
            mode
        });
        return res.data;
    },

    /**
     * Get all due/overdue flashcards for today's session.
     */
    getDueCards: async (filters = {}, limit = 20) => {
        const res = await api.get(`${SM2_BASE}/due`, {
            params: { limit, ...filters }
        });
        return res.data;
    },

    /**
     * Submit a quality rating (0–5) for a card after reviewing it.
     */
    submitReview: async (cardId, quality) => {
        const res = await api.post(`${SM2_BASE}/review`, {
            card_id: cardId,
            quality
        });
        return res.data;
    },

    /**
     * Get aggregate deck stats (total cards, due count, retention rate, etc.)
     */
    getStats: async () => {
        const res = await api.get(`${SM2_BASE}/stats`);
        return res.data;
    },

    /**
     * Suspend a card (removes from daily queue).
     */
    suspendCard: async (cardId) => {
        const res = await api.patch(`${SM2_BASE}/flashcard/${cardId}/suspend`, {});
        return res.data;
    },

    /**
     * Unsuspend a card (returns it to the queue, due immediately).
     */
    unsuspendCard: async (cardId) => {
        const res = await api.patch(`${SM2_BASE}/flashcard/${cardId}/unsuspend`, {});
        return res.data;
    },

    /**
     * Delete a flashcard permanently.
     */
    deleteCard: async (cardId) => {
        const res = await api.delete(`${SM2_BASE}/flashcard/${cardId}`);
        return res.data;
    }
};

export default sm2API;
