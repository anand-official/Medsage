const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PLANNER_GEMINI_API_KEY, PLANNER_GEMINI_MODEL } = require('../config');

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [800, 2000, 4000];

class PlannerLlmClient {
    constructor() {
        this.apiKey = PLANNER_GEMINI_API_KEY;
        this.modelName = PLANNER_GEMINI_MODEL;
        this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    }

    isConfigured() {
        return Boolean(this.apiKey && this.genAI);
    }

    _getModel(generationConfig = {}) {
        if (!this.isConfigured()) {
            throw new Error('Missing planner Gemini API key - set PLANNER_GEMINI_API_KEY in server/.env');
        }
        return this.genAI.getGenerativeModel({ model: this.modelName, generationConfig });
    }

    async _callWithRetry(fn) {
        let lastErr;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastErr = err;
                const isRetryable = err.status === 429 || err.status >= 500 || err.code === 'ECONNRESET';
                if (!isRetryable || attempt === MAX_RETRIES - 1) throw err;
                await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt] ?? 4000));
            }
        }
        throw lastErr;
    }

    async callText(prompt, metadata = {}) {
        return this._callWithRetry(async () => {
            const model = this._getModel({
                temperature: metadata.temperature ?? 0.3,
                maxOutputTokens: metadata.max_tokens ?? 300,
            });
            const res = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            const response = await res.response;
            return response.text();
        });
    }

    async callJSON(prompt, metadata = {}) {
        return this._callWithRetry(async () => {
            const model = this._getModel({
                temperature: metadata.temperature ?? 0.2,
                maxOutputTokens: metadata.max_tokens ?? 1200,
                responseMimeType: 'application/json',
            });
            const res = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            const response = await res.response;
            return JSON.parse(response.text());
        });
    }
}

module.exports = new PlannerLlmClient();
