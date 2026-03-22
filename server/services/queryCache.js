/**
 * Cortex Query Cache
 *
 * Lightweight in-process TTL cache for LLM responses.
 * Avoids re-running the full 11-stage pipeline for identical queries.
 *
 * Cache key: hash(normalizedQuestion + mode + subject)
 * TTL: configurable via CACHE_TTL_SECONDS (default 3600 = 1 hour)
 *
 * No external dependencies — uses a plain Map with TTL tracking.
 * For multi-instance / Redis, swap the backing store here.
 */

const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10) * 1000;
const MAX_ENTRIES = parseInt(process.env.CACHE_MAX_ENTRIES || '500', 10);

const store = new Map(); // key → { value, expiresAt }

function _makeKey(question, mode, subject) {
    const raw = `${(question || '').trim().toLowerCase()}::${mode || 'conceptual'}::${subject || ''}`;
    // Simple djb2 hash — good enough for cache keys
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) + hash) ^ raw.charCodeAt(i);
        hash = hash >>> 0; // keep unsigned 32-bit
    }
    return `cq:${hash.toString(36)}`;
}

function get(question, mode, subject) {
    const key = _makeKey(question, mode, subject);
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
    }
    return entry.value;
}

function set(question, mode, subject, value) {
    // Evict oldest entry if at capacity
    if (store.size >= MAX_ENTRIES) {
        const oldestKey = store.keys().next().value;
        store.delete(oldestKey);
    }
    const key = _makeKey(question, mode, subject);
    store.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function size() {
    return store.size;
}

function flush() {
    store.clear();
}

module.exports = { get, set, size, flush };
