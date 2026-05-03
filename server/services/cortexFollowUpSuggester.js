const DEFAULT_SUBJECT = 'this topic';

function titleCase(value = '') {
    return String(value || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function getTopicLabel(subject, question) {
    if (subject) return titleCase(subject);
    const normalized = String(question || '').trim();
    if (!normalized) return DEFAULT_SUBJECT;
    return normalized.length > 48 ? `${normalized.slice(0, 45).trim()}...` : normalized;
}

function dedupe(options = []) {
    const seen = new Set();
    return options.filter((option) => {
        const key = String(option || '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function buildClarificationOptions({ threadMode = 'new_topic', subject = null }) {
    const label = getTopicLabel(subject);
    if (threadMode === 'follow_up') {
        return [
            `Name the exact disease or drug in ${label}`,
            `Tell me whether you want mechanism, diagnosis, or management`,
            'Paste the exact line or finding you want me to continue from',
        ];
    }

    return [
        `Name the disease, organ system, or drug in ${label}`,
        'Add the clinical scenario, symptom, or viva angle',
        'Tell me whether you want conceptual depth or exam revision',
    ];
}

function buildGuardrailOptions() {
    return [
        'Ask a medical or MBBS study question',
        'Paste a case, drug, pathology, or anatomy topic',
        'Ask for a viva drill, explanation, or differential diagnosis',
    ];
}

function buildSubstantiveOptions({
    subject = null,
    mode = 'conceptual',
    followUpIntent = 'none',
    confidenceTier = 'MEDIUM',
}) {
    const label = getTopicLabel(subject);

    const examOptions = [
        `Give me a viva on ${label}`,
        `Differentiate the key exam points in ${label}`,
        `Give me mnemonics and common traps for ${label}`,
    ];

    const conceptualOptions = [
        `Explain the mechanism of ${label} more simply`,
        `Show the clinical application of ${label}`,
        `Compare ${label} with the closest differential`,
    ];

    if (followUpIntent === 'challenge') {
        return [
            `Show the textbook basis for your answer on ${label}`,
            `Defend the key mechanism step by step`,
            `Compare this with the alternative view in ${label}`,
        ];
    }

    if (followUpIntent === 'source_check') {
        return [
            `Show which citations support each key claim in ${label}`,
            `Summarize the textbook evidence for ${label}`,
            `Point out which part of this answer is less certain`,
        ];
    }

    if (followUpIntent === 'reframe') {
        return [
            `Explain ${label} in very simple language`,
            `Teach ${label} like a viva answer`,
            `Give me a mnemonic for ${label}`,
        ];
    }

    if (confidenceTier === 'LOW') {
        return [
            `Give me the safest exam summary of ${label}`,
            `List the most reliable textbook facts for ${label}`,
            `Show the differential diagnosis around ${label}`,
        ];
    }

    return mode === 'exam' ? examOptions : conceptualOptions;
}

function buildFollowUpOptions({
    pipeline = '',
    type = 'ANSWER',
    subject = null,
    question = '',
    mode = 'conceptual',
    threadMode = 'new_topic',
    followUpIntent = 'none',
    confidence = null,
} = {}) {
    if (pipeline === 'greeting') return [];
    if (pipeline === 'off_topic_refusal') return buildGuardrailOptions();
    if (type === 'CLARIFICATION' || pipeline === 'clarification') {
        return buildClarificationOptions({ threadMode, subject, question });
    }

    const options = buildSubstantiveOptions({
        subject,
        question,
        mode,
        followUpIntent,
        confidenceTier: confidence?.tier || 'MEDIUM',
    });

    return dedupe(options).slice(0, 3);
}

module.exports = {
    buildFollowUpOptions,
};
