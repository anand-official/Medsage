const ragService = require('./ragService');
const queryExpander = require('./queryExpander');
const { looksLikeFollowUp } = require('./cortexRequestUtils');

const QUERY_REWRITE_TIMEOUT_MS = parseInt(process.env.QUERY_REWRITE_TIMEOUT_MS || '700', 10);

function buildRewritePrompt({ truncatedHistory, sanitizedQuestion }) {
    return (
        `Given the following conversation history and the latest user question, ` +
        `rewrite the latest question into a single, standalone descriptive search phrase ` +
        `that captures the core medical topic being discussed. Preserve the same subject as the prior turn unless the user clearly changes topics. ` +
        `If the latest message challenges the previous answer, include the challenged concept in the search phrase. Do not answer the question. ` +
        `Only output the rewritten search phrase.\n\n` +
        `History:\n${truncatedHistory.map((t) => `[${t.role.toUpperCase()}]: ${t.content}`).join('\n')}\n\n` +
        `Latest Question: ${sanitizedQuestion}\n\nRewritten Search Phrase:`
    );
}

function shouldRewriteQuery(normalizedQuestion, truncatedHistory = []) {
    return truncatedHistory.length > 0 || looksLikeFollowUp(normalizedQuestion, truncatedHistory.length);
}

function shouldExpandQuery({ truncatedHistory = [], confidence = 0, searchPhrase = '' }) {
    return truncatedHistory.length > 0 || confidence < 0.85 || searchPhrase.length < 48;
}

async function rewriteSearchPhrase({
    normalizedQuestion,
    sanitizedQuestion,
    truncatedHistory = [],
    llmClient,
    rewriteTimeoutMs = QUERY_REWRITE_TIMEOUT_MS,
}) {
    const fallback = normalizedQuestion;

    if (!shouldRewriteQuery(normalizedQuestion, truncatedHistory)) {
        return fallback;
    }

    try {
        const rewritten = await withTimeout(
            llmClient.callText(buildRewritePrompt({ truncatedHistory, sanitizedQuestion }), {
                temperature: 0.1,
                max_tokens: 50,
            }),
            rewriteTimeoutMs,
            null
        );

        if (!rewritten?.text) {
            throw new Error('Query rewrite timed out');
        }

        const cleaned = (rewritten.text || '').trim().replace(/^"|"$/g, '');
        if (cleaned.length >= 10 && cleaned.length >= normalizedQuestion.length * 0.3) {
            return cleaned;
        }
    } catch (error) {
        if (error.message !== 'Query rewrite timed out') {
            console.warn('[PIPELINE] Query rewrite failed, using original question:', error.message);
        }
    }

    return fallback;
}

async function retrieveGroundedContext({
    topicId,
    subject,
    country,
    searchPhrase,
    confidence,
    mode,
    truncatedHistory = [],
}) {
    const filters = { subject, country };

    if (typeof ragService.retrieveWithExpansion === 'function') {
        const expandedQueries = shouldExpandQuery({
            truncatedHistory,
            confidence,
            searchPhrase,
        })
            ? await queryExpander.expandQuery(searchPhrase)
            : [searchPhrase];

        return ragService.retrieveWithExpansion(
            topicId,
            filters,
            expandedQueries,
            confidence,
            mode
        );
    }

    return ragService.retrieveContext(
        topicId,
        filters,
        searchPhrase,
        confidence,
        mode
    );
}

function withTimeout(promise, ms, fallbackValue = null) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(fallbackValue), ms);
        if (typeof timer.unref === 'function') {
            timer.unref();
        }

        Promise.resolve(promise).then(
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

module.exports = {
    buildRewritePrompt,
    retrieveGroundedContext,
    rewriteSearchPhrase,
    shouldExpandQuery,
    shouldRewriteQuery,
};
