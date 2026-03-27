'use strict';

/**
 * Query Expander - improves RAG recall for poorly worded or non-standard queries.
 *
 * Generates up to MAX_ALTERNATIVES alternative phrasings of the search phrase
 * using the LLM, then returns [originalQuery, ...alternatives].
 */

const llmClient = require('./cortexLlmClient');

// Alternatives to generate (excluding the original). Keep <= 2 to control cost.
const MAX_ALTERNATIVES = 2;

// Wall-clock budget for the expansion LLM call.
const EXPANSION_TIMEOUT_MS = parseInt(process.env.QUERY_EXPANSION_TIMEOUT_MS, 10) || 1500;

/**
 * Returns an array of queries: [original, ...alternatives].
 * Falls back to [original] on any error or timeout.
 *
 * @param {string} query
 * @returns {Promise<string[]>}
 */
async function expandQuery(query) {
  const q = (query || '').trim();

  if (process.env.QUERY_EXPANSION_ENABLED === 'false') {
    return [q];
  }

  if (q.length < 12) {
    return [q];
  }

  return withTimeout(
    doExpand(q).catch(() => [q]),
    EXPANSION_TIMEOUT_MS,
    [q]
  );
}

async function doExpand(query) {
  const prompt =
    `You are a medical information retrieval assistant. ` +
    `Generate exactly ${MAX_ALTERNATIVES} alternative phrasings of the medical question below ` +
    `to improve textbook retrieval. Use clinical terminology, related pathophysiology ` +
    `concepts, and varied grammatical structures. Do NOT answer the question.\n\n` +
    `Original: "${query}"\n\n` +
    `Output exactly ${MAX_ALTERNATIVES} phrasings, one per line, ` +
    `with no numbering, bullets, or extra text:`;

  const result = await llmClient.callText(prompt, {
    temperature: 0.3,
    max_tokens: 80,
  });

  const alternatives = (result?.text || '')
    .split('\n')
    .map((line) =>
      line
        .trim()
        .replace(/^[\d]+[.)]\s*/, '')
        .replace(/^[-*]\s*/, '')
    )
    .filter((line) => line.length >= 10 && line !== query)
    .slice(0, MAX_ALTERNATIVES);

  if (alternatives.length === 0) {
    return [query];
  }

  return [query, ...alternatives];
}

function withTimeout(promise, ms, fallbackValue) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(fallbackValue), ms);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

module.exports = { expandQuery };
