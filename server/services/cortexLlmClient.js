const { GoogleGenerativeAI } = require('@google/generative-ai');

const { GEMINI_MODEL } = require('../config');
const fallbackLLM = require('./fallbackLLMService');
const { getImageMimeType } = require('./cortexRequestUtils');
const { MODE_SYSTEM } = require('./cortexTeachingConfig');
const {
    recordError,
    recordLLMCall,
} = require('../middleware/monitoring');

class CortexLLMClient {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.modelName = GEMINI_MODEL;

        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
        }
    }

    _getModel() {
        if (!this.apiKey) {
            throw new Error('Missing Gemini API Key - set GEMINI_API_KEY in .env');
        }

        return this.genAI.getGenerativeModel({ model: this.modelName });
    }

    _isRetryableError(error) {
        return Boolean(
            (error?.status && (error.status === 429 || error.status >= 500))
            || /quota|429|rate.?limit|503|overloaded|unavailable|timeout|deadline/i.test(error?.message || '')
        );
    }

    /**
     * Retry a Gemini call up to maxRetries times with exponential backoff.
     * Only retries on transient/rate-limit errors. Falls back to fallback LLM
     * after all retries are exhausted.
     *
     * @param {function} geminiCall - async fn that calls Gemini and returns { text, provider }
     * @param {function} buildFallbackCall - async fn called if all retries fail (receives last error)
     * @param {number}   maxRetries  - defaults to 3
     */
    async _callWithRetry(geminiCall, buildFallbackCall, maxRetries = 3) {
        let lastError;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await geminiCall();
            } catch (error) {
                lastError = error;

                if (!this._isRetryableError(error)) throw error; // non-retryable — fail immediately

                if (attempt < maxRetries - 1) {
                    // Exponential backoff: 1s → 2s → 4s (capped at 8s)
                    const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
                    console.warn(`[CORTEX] Retryable error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms: ${error.message}`);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        // All retries exhausted — try fallback LLM
        console.warn(`[CORTEX] All ${maxRetries} Gemini retries failed. Attempting fallback LLM.`);
        if (fallbackLLM.isConfigured()) {
            const result = await buildFallbackCall(lastError);
            if (result) return result;
        }

        throw lastError;
    }

    async callText(prompt, metadata = {}) {
        try {
            const result = await this._callWithRetry(
                async () => {
                    const model = this._getModel();
                    const res = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: metadata.temperature ?? 0.2,
                            maxOutputTokens: metadata.max_tokens ?? 2000,
                        },
                    });
                    const response = await res.response;
                    return { text: response.text(), provider: 'gemini' };
                },
                async () => {
                    const text = await fallbackLLM.callFallback(prompt, {
                        temperature: metadata.temperature ?? 0.2,
                        max_tokens: metadata.max_tokens ?? 2000,
                    });
                    return text ? { text, provider: 'fallback' } : null;
                }
            );
            recordLLMCall(true);
            return result;
        } catch (error) {
            recordLLMCall(false);
            recordError('LLM_TEXT_FAILURE');
            console.error('[CORTEX] Gemini text call failed after retries:', error.message);
            throw error;
        }
    }

    async callStructured(prompt, metadata = {}) {
        try {
            const result = await this._callWithRetry(
                async () => {
                    const model = this._getModel();
                    const res = await model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: metadata.temperature ?? 0.2,
                            maxOutputTokens: metadata.max_tokens ?? 2000,
                            responseMimeType: metadata.responseMimeType || 'application/json',
                        },
                    });
                    const response = await res.response;
                    return { text: response.text(), provider: 'gemini' };
                },
                async () => {
                    const text = await fallbackLLM.callFallback(
                        `${prompt}\n\nIMPORTANT: Output ONLY valid JSON. Do not wrap it in markdown fences.`,
                        {
                            temperature: metadata.temperature ?? 0.15,
                            max_tokens: metadata.max_tokens ?? 2000,
                        }
                    );
                    return text ? { text, provider: 'fallback' } : null;
                }
            );
            recordLLMCall(true);
            return result;
        } catch (error) {
            recordLLMCall(false);
            recordError('LLM_STRUCTURED_FAILURE');
            console.error('[CORTEX] Gemini structured call failed after retries:', error.message);
            throw error;
        }
    }

    async callVision(imageBase64, question, history = [], mode = 'conceptual') {
        try {
            const result = await this._callWithRetry(
                async () => {
                    const model = this._getModel();
                    const modeSystem = MODE_SYSTEM[mode] || MODE_SYSTEM.conceptual;
                    const historyText = history.length > 0
                        ? `\nConversation so far:\n${history.map((item) => `[${item.role.toUpperCase()}]: ${item.content}`).join('\n')}\n`
                        : '';
                    const prompt = `${modeSystem}\n\nYou are analyzing a medical image or document.${historyText}\n\nDo NOT start with greetings. Analyze directly.\n\nQuestion: ${question || 'Describe and analyze this medical image in detail.'}`;
                    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');

                    const res = await model.generateContent({
                        contents: [{
                            role: 'user',
                            parts: [
                                { inlineData: { mimeType: getImageMimeType(imageBase64), data: base64Data } },
                                { text: prompt },
                            ],
                        }],
                        generationConfig: { temperature: 0.3, maxOutputTokens: 2500 },
                    });

                    const response = await res.response;
                    return { text: response.text(), provider: 'gemini' };
                },
                async () => null // vision requires multimodal — text-only fallback LLM cannot substitute
            );
            recordLLMCall(true);
            return result;
        } catch (error) {
            recordLLMCall(false);
            recordError('LLM_VISION_FAILURE');
            console.error('[CORTEX] Vision call failed after retries:', error.message);
            throw error;
        }
    }

    async *streamText(prompt, metadata = {}) {
        // _callWithRetry cannot wrap an async generator, so we separate stream
        // *setup* (retryable) from stream *iteration* (not retryable mid-stream).
        const setupStream = () => {
            const model = this._getModel();
            return model.generateContentStream({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: metadata.temperature ?? 0.2,
                    maxOutputTokens: metadata.max_tokens ?? 2000,
                },
            });
        };

        let streamResult;
        try {
            streamResult = await setupStream();
        } catch (firstError) {
            if (this._isRetryableError(firstError)) {
                console.warn(`[CORTEX] Stream setup failed, retrying in 1s: ${firstError.message}`);
                await new Promise((r) => setTimeout(r, 1000));
                try {
                    streamResult = await setupStream();
                } catch (retryError) {
                    recordLLMCall(false);
                    recordError('LLM_STREAM_FAILURE');
                    console.error('[CORTEX] Streaming call failed after retry:', retryError.message);
                    throw retryError;
                }
            } else {
                recordLLMCall(false);
                recordError('LLM_STREAM_FAILURE');
                console.error('[CORTEX] Streaming call failed (non-retryable):', firstError.message);
                throw firstError;
            }
        }

        // Stream established — iterate and yield tokens
        try {
            recordLLMCall(true);
            for await (const chunk of streamResult.stream) {
                const text = chunk.text();
                if (text) yield text;
            }
        } catch (error) {
            recordError('LLM_STREAM_FAILURE');
            console.error('[CORTEX] Stream interrupted mid-response:', error.message);
            throw error;
        }
    }
}

module.exports = new CortexLLMClient();
