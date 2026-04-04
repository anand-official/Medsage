const conversationStateService = require('../conversationStateService');

describe('conversationStateService', () => {
    test('creates follow-up state and infers prior subject from history metadata', () => {
        const ctx = conversationStateService.createInitialState('But are you sure this is correct?', {
            history: [
                { role: 'user', content: 'Explain acute inflammation' },
                { role: 'ai', content: 'Acute inflammation is an immediate response.', subject: 'Pathology' },
            ],
            mode: 'conceptual',
        }, { syllabus: 'Indian MBBS' });

        expect(ctx.isFollowUp).toBe(true);
        expect(ctx.threadMode).toBe('follow_up');
        expect(ctx.followUpIntent).toBe('challenge');
        expect(ctx.priorSubject).toBe('Pathology');
    });

    test('prefers prior subject for follow-ups when no new hint is provided', () => {
        const resolved = conversationStateService.resolveSubject({
            hintSubject: null,
            priorSubject: 'Physiology',
            topicResult: { matched: true, subject: 'Medicine' },
            threadMode: 'follow_up',
        });

        expect(resolved).toBe('Physiology');
    });
});
