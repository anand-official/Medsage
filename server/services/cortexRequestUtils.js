const {
    DEFAULT_PROFESSOR,
    MEDICAL_SENTINEL_TERMS,
    MODE_SYSTEM,
    PROFESSOR_PERSONAS,
} = require('./cortexTeachingConfig');

function getProfessorPersona(subject) {
    return PROFESSOR_PERSONAS[subject] || DEFAULT_PROFESSOR;
}

function sanitizeHistoryContent(text) {
    if (!text) return '';
    let s = String(text);
    // Neutralise template variable placeholders (prevent prompt injection via {{var}})
    s = s.replace(/\{\{[\s\S]*?\}\}/g, '[REDACTED]');
    // Convert square-bracket system-directive patterns like [SYSTEM] into harmless parens
    s = s.replace(/\[([^\]]*)\]/g, '($1)');
    // Strip HTML / XML tags
    s = s.replace(/<[^>]*>/g, '');
    // Remove residual angle brackets and control characters (tabs, carriage returns kept; true controls stripped)
    s = s.replace(/[<>]/g, '');
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return s.trim().substring(0, 2000);
}

/**
 * Sanitize a user-supplied input string before embedding in an LLM prompt.
 * Same rules as sanitizeHistoryContent but without the 500-char cap so that
 * full medical questions are not truncated.
 */
function sanitizeInput(text) {
    if (!text) return '';
    let s = String(text);
    s = s.replace(/\{\{[\s\S]*?\}\}/g, '[REDACTED]');
    s = s.replace(/\[([^\]]*)\]/g, '($1)');
    s = s.replace(/<[^>]*>/g, '');
    s = s.replace(/[<>]/g, '');
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return s.trim();
}

function truncateHistory(history = [], maxTurns = 10, charBudget = 20000) {
    const turns = (history || []).slice(-maxTurns);
    let budget = charBudget;
    const kept = [];

    for (let i = turns.length - 1; i >= 0; i--) {
        const content = sanitizeHistoryContent(turns[i].content ?? turns[i].text);
        if (budget - content.length < 0) break;

        budget -= content.length;
        kept.unshift({ role: turns[i].role, content });
    }

    return kept;
}

function buildHistoryBlock(truncatedHistory = []) {
    if (!truncatedHistory.length) return '';

    return `\n\n<CONVERSATION_HISTORY>\n${truncatedHistory
        .map((turn) => `[${turn.role.toUpperCase()}]: ${turn.content}`)
        .join('\n')}\n</CONVERSATION_HISTORY>\n\nUsing the above conversation as context, `;
}

function formatYearLabel(year) {
    if (!year || Number.isNaN(Number(year))) return null;

    const numericYear = Number(year);
    const suffix = numericYear === 1 ? 'st' : numericYear === 2 ? 'nd' : numericYear === 3 ? 'rd' : 'th';
    return `${numericYear}${suffix}`;
}

function buildLearnerContextBlock(learnerContext = {}) {
    const lines = [];
    const yearLabel = formatYearLabel(learnerContext.mbbs_year);

    if (yearLabel) lines.push(`- Student level: ${yearLabel} year MBBS`);
    if (learnerContext.country) lines.push(`- Country context: ${learnerContext.country}`);
    if (learnerContext.exam_name) lines.push(`- Target exam: ${learnerContext.exam_name}`);
    if (typeof learnerContext.days_until_exam === 'number') {
        lines.push(`- Days until exam: ${learnerContext.days_until_exam}`);
    }
    if (Array.isArray(learnerContext.subjects_selected) && learnerContext.subjects_selected.length > 0) {
        lines.push(`- Active study subjects: ${learnerContext.subjects_selected.slice(0, 6).join(', ')}`);
    }
    if (Array.isArray(learnerContext.weak_topics) && learnerContext.weak_topics.length > 0) {
        lines.push(`- Known weak topics: ${learnerContext.weak_topics.slice(0, 5).join(', ')}`);
    }
    if (Array.isArray(learnerContext.strong_topics) && learnerContext.strong_topics.length > 0) {
        lines.push(`- Strong topics: ${learnerContext.strong_topics.slice(0, 4).join(', ')}`);
    }

    if (!lines.length) return '';

    return [
        'LEARNER CONTEXT (personalize teaching style and examples, but never invent facts):',
        ...lines,
    ].join('\n');
}

function mergeSyllabusContext(syllabusContext = {}, learnerContext = {}) {
    const mergedCountry = learnerContext.country || syllabusContext.country;
    const mergedYear = formatYearLabel(learnerContext.mbbs_year) || syllabusContext.year;
    const mergedSyllabus = syllabusContext.syllabus
        || (mergedCountry ? `${mergedCountry} MBBS` : 'MBBS');

    return {
        ...syllabusContext,
        country: mergedCountry,
        year: mergedYear,
        syllabus: mergedSyllabus,
    };
}

function buildDirectPrompt(persona, mode, historyBlock, question, learnerContext = null) {
    const modeSystem = MODE_SYSTEM[mode] || MODE_SYSTEM.conceptual;
    const subjectContext = persona?.flavor
        ? `\n## Subject Professor: ${persona.flavor}\n${persona.voice}\n\nApply the above teaching approach throughout your entire answer.`
        : '';
    const learnerBlock = learnerContext ? buildLearnerContextBlock(learnerContext) : '';
    const learnerSection = learnerBlock ? `\n${learnerBlock}\n` : '\n';

    // Sanitize before any prompt interpolation to prevent injection
    const sanitizedQuestion = sanitizeInput(question);

    // Detect MBBS question command style to give format hints
    const q = (question || '').toLowerCase();
    let formatHint = '';
    if (/^enumerate\b/.test(q)) {
        formatHint = '\nFORMAT HINT: This is an "enumerate" question — give a clean numbered list with brief one-line explanations for each item.\n';
    } else if (/^classify\b/.test(q)) {
        formatHint = '\nFORMAT HINT: This is a "classify" question — present a clear classification scheme with headings/subheadings and examples.\n';
    } else if (/^(discuss|write (a )?(short |brief )?note|describe)\b/.test(q)) {
        formatHint = '\nFORMAT HINT: This is a descriptive/note question — use structured headings: Definition → Classification → Pathophysiology/Mechanism → Clinical Features → Diagnosis → Management → Complications/Prognosis.\n';
    } else if (/^(compare|differentiate|distinguish|contrast)\b/.test(q)) {
        formatHint = '\nFORMAT HINT: This is a comparison question — use a markdown table with clear column headers to compare the two entities side by side.\n';
    } else if (/^(what is|define|explain)\b/.test(q)) {
        formatHint = '\nFORMAT HINT: Start with a crisp one-sentence definition, then explain the concept, then give clinical relevance.\n';
    }

    return `${modeSystem}
${subjectContext}${learnerSection}${formatHint}
IMPORTANT: Do NOT start with greetings like "Hello", "Good morning", "Great question", or "Certainly!". Jump straight into the content.
IMPORTANT: If you are uncertain about a fact, say so explicitly — never bluff or hallucinate.
IMPORTANT: You are answering for an MBBS student. Assume basic science knowledge but explain clinical connections clearly.
${historyBlock}
## Question
${sanitizedQuestion}`;
}

function looksLikeFollowUp(question, historyLength = 0) {
    const normalized = (question || '').trim().toLowerCase();
    if (!normalized) return false;
    // Pronoun references to the previous answer — unambiguous regardless of history
    if (/\b(this|that|these|those|it|they|above|same|previous|last|mentioned)\b/.test(normalized)) return true;
    // Common follow-up starters — only meaningful when there is prior history
    if (historyLength > 0 && /^(and|also|then|what about|how about|why|explain further|continue|elaborate|tell me more|give (me )?(an )?example|can you|could you|more (on|about)|what (else|more)|how (about|does)|so (what|how)|in that case|regarding|speaking of)/.test(normalized)) return true;
    // Bare wh- questions — only treat as follow-up when there is prior context;
    // on a fresh session these are likely standalone questions (e.g. "What stocks should I buy?")
    // that should go through the off-topic guard instead of being exempted.
    if (historyLength > 0 && /^(why|how|when|where|what|which|who)\b/.test(normalized)) return true;
    return false;
}

function hasMedicalSignal(question) {
    const lowerQuestion = (question || '').toLowerCase();
    return MEDICAL_SENTINEL_TERMS.some((term) => {
        // Multi-word phrases: use indexOf (word boundaries not reliable across spaces)
        if (term.includes(' ')) return lowerQuestion.includes(term);
        // Single words: require word boundary to avoid false substring matches
        return new RegExp(`\\b${term}\\b`).test(lowerQuestion);
    });
}

function getImageMimeType(imageBase64 = '') {
    if (imageBase64.startsWith('data:image/png')) return 'image/png';
    if (imageBase64.startsWith('data:image/webp')) return 'image/webp';
    if (imageBase64.startsWith('data:application/pdf')) return 'application/pdf';
    return 'image/jpeg';
}

module.exports = {
    buildDirectPrompt,
    buildHistoryBlock,
    buildLearnerContextBlock,
    formatYearLabel,
    getImageMimeType,
    getProfessorPersona,
    hasMedicalSignal,
    looksLikeFollowUp,
    mergeSyllabusContext,
    sanitizeHistoryContent,
    sanitizeInput,
    truncateHistory,
};
