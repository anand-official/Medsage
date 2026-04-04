const {
    buildHistoryBlock,
    detectFollowUpIntent,
    looksLikeFollowUp,
    mergeSyllabusContext,
    sanitizeInput,
    truncateHistory,
} = require('./cortexRequestUtils');

function inferSubjectFromHistory(history = []) {
    for (let index = history.length - 1; index >= 0; index -= 1) {
        const turn = history[index];
        if (!turn || turn.role !== 'ai') continue;

        if (turn.subject) return turn.subject;
        if (turn.meta?.subject) return turn.meta.subject;
        if (turn.response?.subject) return turn.response.subject;
    }
    return null;
}

function createInitialState(rawQuestion, userContext = {}, cacheContext = {}) {
    const normalizedQuestion = (rawQuestion || '').trim();
    const history = userContext.history || [];
    const truncatedHistory = truncateHistory(history);
    const priorSubject = inferSubjectFromHistory(history);
    const isFollowUp = looksLikeFollowUp(normalizedQuestion, history.length);

    return {
        mode: userContext.mode || 'conceptual',
        history,
        imageBase64: userContext.imageBase64 || null,
        hintSubject: userContext.subject || null,
        priorSubject,
        syllabus: userContext.syllabus || 'Indian MBBS',
        learnerContext: userContext.learnerContext || null,
        normalizedQuestion,
        sanitizedQuestion: sanitizeInput(normalizedQuestion),
        startTime: Date.now(),
        cacheContext,
        isFollowUp,
        followUpIntent: detectFollowUpIntent(normalizedQuestion, history.length),
        threadMode: (isFollowUp && history.length > 0) ? 'follow_up' : 'new_topic',
        topicResult: null,
        calibratedTopicConfidence: 0,
        professorSubject: null,
        persona: null,
        truncatedHistory,
        historyBlock: buildHistoryBlock(truncatedHistory),
        syllabusContext: {},
    };
}

function resolveSubject({
    hintSubject = null,
    priorSubject = null,
    topicResult = null,
    threadMode = 'new_topic',
}) {
    if (hintSubject) return hintSubject;
    if (threadMode === 'follow_up' && priorSubject) return priorSubject;
    return topicResult?.matched ? topicResult.subject : null;
}

function enrichState(ctx, {
    topicResult,
    calibratedTopicConfidence,
    syllabusContext,
    persona,
}) {
    const professorSubject = resolveSubject({
        hintSubject: ctx.hintSubject,
        priorSubject: ctx.priorSubject,
        topicResult,
        threadMode: ctx.threadMode,
    });

    return {
        ...ctx,
        topicResult,
        calibratedTopicConfidence,
        professorSubject,
        persona,
        syllabusContext: mergeSyllabusContext(
            {
                ...syllabusContext,
                subject: professorSubject || syllabusContext.subject,
            },
            ctx.learnerContext || {}
        ),
    };
}

module.exports = {
    createInitialState,
    enrichState,
    inferSubjectFromHistory,
    resolveSubject,
};
