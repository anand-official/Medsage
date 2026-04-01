const LEARNER_CACHE_TTL_MS = (Number(process.env.CACHE_TTL_SECONDS) || 300) * 1000;
const MAX_LEARNER_CACHE_SIZE = 1000;
const learnerContextCache = new Map();

function getCachedLearnerContext(uid) {
  const entry = learnerContextCache.get(uid);
  if (entry && entry.expires > Date.now()) return entry.data;
  if (entry) learnerContextCache.delete(uid);
  return null;
}

function setCachedLearnerContext(uid, data) {
  if (!uid) return;

  if (learnerContextCache.size >= MAX_LEARNER_CACHE_SIZE) {
    const oldestKey = learnerContextCache.keys().next().value;
    learnerContextCache.delete(oldestKey);
  }

  learnerContextCache.set(uid, { data, expires: Date.now() + LEARNER_CACHE_TTL_MS });
}

function invalidateLearnerContext(uid) {
  if (!uid) return;
  learnerContextCache.delete(uid);
}

module.exports = {
  getCachedLearnerContext,
  setCachedLearnerContext,
  invalidateLearnerContext,
};
