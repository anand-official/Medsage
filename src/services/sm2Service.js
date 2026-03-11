/**
 * SM-2 API Service
 * Client-side interface to the MedSage SM-2 Intelligence Layer
 */

import api from './api';

const SM2_BASE = '/api/sm2';

// Build an Authorization header the backend's verifyToken middleware can parse.
// In DEV BYPASS MODE the server base64-decodes the JWT payload to get the uid,
// so we craft a minimal unsigned JWT on the fly. When real Firebase auth is
// wired up, swap this for the actual ID token from your auth SDK.
const userHeaders = () => {
    const uid = localStorage.getItem('userId') || 'dev-user-001';

    // Try to use a real Firebase/Supabase token if one was stored
    const storedToken = localStorage.getItem('authToken') || localStorage.getItem('idToken');
    if (storedToken) {
        return { 'Authorization': `Bearer ${storedToken}`, 'x-user-id': uid };
    }

    // Construct a minimal fake JWT for the dev bypass path:
    // header.payload.signature  (server only reads the payload section)
    const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payload = btoa(JSON.stringify({ uid, user_id: uid, email: 'dev@medsage.ai', name: 'Dev User' }))
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const devJwt = `${header}.${payload}.devbypass`;

    return { 'Authorization': `Bearer ${devJwt}`, 'x-user-id': uid };
};

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
        }, { headers: userHeaders() });
        return res.data;
    },

    /**
     * Get all due/overdue flashcards for today's session.
     */
    getDueCards: async (filters = {}, limit = 20) => {
        const params = { limit, ...filters };
        const res = await api.get(`${SM2_BASE}/due`, {
            params,
            headers: userHeaders()
        });
        return res.data;
    },

    /**
     * Submit a quality rating (0–5) for a card after reviewing it.
     * Returns updated scheduling info (next_review, interval, ease_factor).
     */
    submitReview: async (cardId, quality) => {
        const res = await api.post(`${SM2_BASE}/review`, {
            card_id: cardId,
            quality
        }, { headers: userHeaders() });
        return res.data;
    },

    /**
     * Get aggregate deck stats (total cards, due count, retention rate, etc.)
     */
    getStats: async () => {
        const res = await api.get(`${SM2_BASE}/stats`, { headers: userHeaders() });
        return res.data;
    },

    /**
     * Suspend a card (removes from daily queue).
     */
    suspendCard: async (cardId) => {
        const res = await api.patch(`${SM2_BASE}/flashcard/${cardId}/suspend`, {}, { headers: userHeaders() });
        return res.data;
    },

    /**
     * Unsuspend a card (returns it to the queue, due immediately).
     */
    unsuspendCard: async (cardId) => {
        const res = await api.patch(`${SM2_BASE}/flashcard/${cardId}/unsuspend`, {}, { headers: userHeaders() });
        return res.data;
    },

    /**
     * Delete a flashcard permanently.
     */
    deleteCard: async (cardId) => {
        const res = await api.delete(`${SM2_BASE}/flashcard/${cardId}`, { headers: userHeaders() });
        return res.data;
    }
};

export default sm2API;
