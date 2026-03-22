/**
 * Cortex Fallback LLM Service
 *
 * Provides a secondary LLM call when Gemini is unavailable (5xx / timeout).
 * Supports two providers — configure via env vars:
 *
 *   FALLBACK_LLM_PROVIDER=claude   → Anthropic Claude (claude-haiku-4-5-20251001)
 *   FALLBACK_LLM_PROVIDER=openai   → OpenAI GPT-4o-mini
 *   FALLBACK_LLM_API_KEY=<key>     → API key for the chosen provider
 *
 * If no provider is configured, fallback returns null and the caller handles it.
 */

const axios = require('axios');

const PROVIDER   = (process.env.FALLBACK_LLM_PROVIDER || '').toLowerCase().trim();
const API_KEY    = (process.env.FALLBACK_LLM_API_KEY  || '').trim();
const MAX_TOKENS = 2000;
const TIMEOUT_MS = 30000;

/**
 * Call the fallback LLM with a plain-text prompt.
 * Returns the response text string, or null if no provider is configured.
 *
 * @param {string} prompt
 * @param {object} options - { temperature, max_tokens }
 * @returns {Promise<string|null>}
 */
async function callFallback(prompt, options = {}) {
    if (!PROVIDER || !API_KEY) return null;

    const temperature = options.temperature ?? 0.2;
    const maxTokens   = options.max_tokens  ?? MAX_TOKENS;

    try {
        if (PROVIDER === 'claude') {
            return await _callClaude(prompt, temperature, maxTokens);
        }
        if (PROVIDER === 'openai') {
            return await _callOpenAI(prompt, temperature, maxTokens);
        }
        console.warn(`[FALLBACK] Unknown provider "${PROVIDER}" — skipping fallback`);
        return null;
    } catch (err) {
        console.error(`[FALLBACK] ${PROVIDER} call failed:`, err.message);
        return null;
    }
}

// ─── Anthropic Claude ─────────────────────────────────────────────────────────

async function _callClaude(prompt, temperature, maxTokens) {
    const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
            model: 'claude-haiku-4-5-20251001',
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: prompt }],
        },
        {
            headers: {
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            timeout: TIMEOUT_MS,
        }
    );

    const content = response.data?.content;
    if (!Array.isArray(content) || content.length === 0) {
        throw new Error('Empty Claude response');
    }
    return content[0]?.text || '';
}

// ─── OpenAI GPT-4o-mini ───────────────────────────────────────────────────────

async function _callOpenAI(prompt, temperature, maxTokens) {
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o-mini',
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: prompt }],
        },
        {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'content-type': 'application/json',
            },
            timeout: TIMEOUT_MS,
        }
    );

    return response.data?.choices?.[0]?.message?.content || '';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * True if a fallback provider is configured and ready.
 */
function isConfigured() {
    return Boolean(PROVIDER && API_KEY);
}

module.exports = { callFallback, isConfigured };
