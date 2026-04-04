const { resolvePersona } = require('../personaResolver');

describe('personaResolver', () => {
    test('builds a follow-up aware persona contract for subject teaching', () => {
        const persona = resolvePersona('Pathology', {
            mode: 'exam',
            threadMode: 'follow_up',
            followUpIntent: 'challenge',
        });

        expect(persona.subject).toBe('Pathology');
        expect(persona.flavor).toBe('Pathology');
        expect(persona.response_contract).toContain('exam-relevant distinctions');
        expect(persona.response_contract).toContain('Preserve subject continuity');
        expect(persona.follow_up_policy).toContain('address the objection first');
    });

    test('falls back to the default professor for unknown subjects', () => {
        const persona = resolvePersona('Unknown Subject', {
            mode: 'conceptual',
            threadMode: 'new_topic',
            followUpIntent: 'none',
        });

        expect(persona.subject).toBe('Unknown Subject');
        expect(persona.flavor).toBe('Medical Science');
        expect(persona.voice).toContain('first principles');
        expect(persona.response_contract).toContain('fresh topic explanation');
    });
});
