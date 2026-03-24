'use strict';

/**
 * Query Expander — improves RAG recall for poorly worded or non-standard queries.
 *
 * Generates up to MAX_ALTERNATIVES alternative phrasings of the search phrase
 * using the LLM, then returns [originalQuery, ...alternatives].
 *
 * Design principles:
 *  - The original query is ALWAYS first in the returned array and always included.
 *  - A hard timeout (QUERY_EXPANSION_TIMEOUT_MS) guarantees expansion never adds
 *    more than a bounded amount of latency; on timeout we fall back to [query].
 *  - All parse/LLM errors also fall back to [query] — never throw.
 *  - Set QUERY_EXPANSION_ENABLED=false to disable at runtime without a deploy.
 *
 * Example output for "explain nephrotic syndrome":
 *   [
 *     "explain nephrotic syndrome",
 *     "pathophysiology and clinical features of nephrotic syndrome",
 *     "heavy proteinuria hypoalbuminaemia oedema nephrotic syndrome causes"
 *   ]
 */

const llmClient = require('./cortexLlmClient');

// Alternatives to generate (excluding the original). Keep ≤ 2 to control cost.
const MAX_ALTERNATIVES = 2;

// Wall-clock budget for the expansion LLM call.
// If Gemini is slow, we fall back to the original query rather than adding latency.
const EXPANSION_TIMEOUT_MS = parseInt(process.env.QUERY_EXPANSION_TIMEOUT_MS) || 1500;

/**
 * Returns an array of queries: [original, ...alternatives].
 * Falls back to [original] on any error or timeout.
 *
 * @param {string} query - The (possibly already-rewritten) search phrase
 * @returns {Promise<string[]>}
 */
async function expandQuery(query) {
  const q = (query || '').trim();

  // Feature flag — allows zero-downtime disabling in production
  if (process.env.QUERY_EXPANSION_ENABLED === 'false') {
    return [q];
  }

  // Very short input (single keyword / abbreviation) won't benefit from expansion
  if (q.length < 12) {
    return [q];
  }

  // Race the LLM call against a timeout so we never block the pipeline
  return Promise.race([
    _doExpand(q).catch(() => [q]),          // any error → original only
    _timeout(EXPANSION_TIMEOUT_MS, q),      // deadline → original only
  ]);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function _doExpand(query) {
  const prompt =
    `You are a medical information retrieval assistant. ` +
    `Generate exactly ${MAX_ALTERNATIVES} alternative phrasings of the medical question below ` +
    `to improve textbook retrieval. Use clinical terminology, related pathophysiology ` +
    `concepts, and varied grammatical structures. Do NOT answer the question.\n\n` +
    `Original: "${query}"\n\n` +
    `Output exactly ${MAX_ALTERNATIVES} phrasings, one per line, ` +
    `with no numbering, bullets, or extra text:`;

  const result = await llmClient.callText(prompt, {
    temperature: 0.3,   // low enough for grounded clinical synonyms
    max_tokens:  80,    // two short phrases only
  });

  const alternatives = (result.text || '')
    .split('\n')
    .map(line =>
      line
        .trim()
        // Strip "1." "2)" "-" "•" prefixes the model sometimes adds despite the instructions
        .replace(/^[\d]+[.)]\s*/, '')
        .replace(/^[-•*]\s*/, '')
    )
    .filter(line => line.length >= 10 && line !== query)
    .slice(0, MAX_ALTERNATIVES);

  if (alternatives.length === 0) return [query];

  return [query, ...alternatives];
}

function _timeout(ms, fallbackValue) {
  return new Promise(resolve => setTimeout(() => resolve([fallbackValue]), ms));
}

module.exports = { expandQuery };
