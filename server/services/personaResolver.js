const {
    DEFAULT_PROFESSOR,
    PROFESSOR_PERSONAS,
} = require('./cortexTeachingConfig');

const MODE_EMPHASIS = {
    exam: 'Lead with exam-relevant distinctions, common traps, and ranking of the most testable facts.',
    conceptual: 'Lead with first principles, mechanism, and intuitive explanation before memorization cues.',
    default: 'Balance conceptual clarity with exam usefulness.',
};

const FOLLOW_UP_POLICIES = {
    challenge: 'If the student challenges the answer, address the objection first. Defend or correct the prior explanation explicitly.',
    source_check: 'If the student asks for proof or source, explain which cited evidence supports each key claim.',
    deepen: 'Stay within the same subject and deepen the mechanism without re-explaining from zero.',
    reframe: 'Restate the same concept in simpler language while preserving the same subject framing.',
    continue: 'Continue the same thread directly and keep terminology consistent with the prior answer.',
    none: 'Treat this as a fresh teaching turn unless the history clearly requires continuity.',
};

function resolvePersona(subject, options = {}) {
    const basePersona = PROFESSOR_PERSONAS[subject] || DEFAULT_PROFESSOR;
    const mode = options.mode || 'conceptual';
    const followUpIntent = options.followUpIntent || 'none';
    const threadMode = options.threadMode || 'new_topic';

    const responseContract = [
        MODE_EMPHASIS[mode] || MODE_EMPHASIS.default,
        FOLLOW_UP_POLICIES[followUpIntent] || FOLLOW_UP_POLICIES.none,
        threadMode === 'follow_up'
            ? 'Preserve subject continuity across this follow-up unless the student explicitly changes topic.'
            : 'Treat this as a fresh topic explanation unless the student references prior context.',
    ].join(' ');

    return {
        ...basePersona,
        subject: subject || basePersona.flavor || DEFAULT_PROFESSOR.flavor,
        response_contract: responseContract,
        follow_up_policy: FOLLOW_UP_POLICIES[followUpIntent] || FOLLOW_UP_POLICIES.none,
        mode_emphasis: MODE_EMPHASIS[mode] || MODE_EMPHASIS.default,
    };
}

module.exports = {
    resolvePersona,
};
