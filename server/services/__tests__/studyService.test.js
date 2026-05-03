const { addDays, format, startOfDay } = require('date-fns');

jest.mock('../../repositories/studyPlanRepo', () => ({
    findByUid: jest.fn(),
    replaceByUid: jest.fn(),
    deleteByUid: jest.fn(),
    upsert: jest.fn(),
}));

jest.mock('../../repositories/chatSessionRepo', () => ({
    listByUser: jest.fn().mockResolvedValue([]),
}));

jest.mock('../geminiService', () => ({
    callLLM: jest.fn(),
}));

jest.mock('../sm2Service', () => ({
    getStats: jest.fn().mockResolvedValue({ due_now: 0, avg_retention: null }),
}));

jest.mock('../syllabusScraper', () => ({
    getExpectedSubjects: jest.fn(() => ['Anatomy']),
    getCurriculum: jest.fn(),
}));

jest.mock('../learnerContextCache', () => ({
    invalidateLearnerContext: jest.fn(),
}));

const studyPlanRepo = require('../../repositories/studyPlanRepo');
const syllabusScraper = require('../syllabusScraper');
const studyService = require('../studyService');
const { rankResources, isBlockedUrl } = require('../resourceCatalog');

describe('studyService planner integrity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.GEMINI_API_KEY;
    });

    test('falls back instead of deleting anything when selected scope has no matching syllabus topics', async () => {
        syllabusScraper.getCurriculum.mockResolvedValue({
            Anatomy: ['Upper Limb'],
        });
        studyPlanRepo.replaceByUid.mockResolvedValue({ _id: 'plan-fallback', uid: 'user-1' });

        const result = await studyService.generatePlanWithAI('user-1', {
            year: 1,
            country: 'India',
            planMode: 'self_study',
            studyDurationDays: 7,
            selectedSubjects: ['Anatomy'],
            selectedTopicKeys: ['Anatomy::Missing Topic'],
        });

        expect(result).toEqual({ _id: 'plan-fallback', uid: 'user-1' });
        expect(studyPlanRepo.replaceByUid).toHaveBeenCalledTimes(1);
        expect(studyPlanRepo.deleteByUid).not.toHaveBeenCalled();
    });

    test('falls back to subject-level planner generation when syllabus topics are unavailable', async () => {
        syllabusScraper.getCurriculum.mockResolvedValue({});
        studyPlanRepo.replaceByUid.mockResolvedValue({ _id: 'plan-2', uid: 'user-2' });

        const result = await studyService.generatePlanWithAI('user-2', {
            year: 2,
            country: 'India',
            planMode: 'self_study',
            studyDurationDays: 7,
            selectedSubjects: ['Pathology'],
            selectedTopicKeys: [],
        });

        expect(result).toEqual({ _id: 'plan-2', uid: 'user-2' });
        expect(studyPlanRepo.replaceByUid).toHaveBeenCalledTimes(1);
        const [, payload] = studyPlanRepo.replaceByUid.mock.calls[0];
        expect(payload.subjects_selected).toEqual(['Pathology']);
        expect(payload.daily_plan.length).toBeGreaterThan(0);
        expect(payload.daily_plan[0].tasks.length).toBeGreaterThan(0);
    });

    test('normalizes unsupported planner countries to India for generation', async () => {
        syllabusScraper.getCurriculum.mockResolvedValue({
            Anatomy: ['Upper Limb'],
        });
        studyPlanRepo.replaceByUid.mockResolvedValue({ _id: 'plan-3', uid: 'user-3' });

        await studyService.generatePlanWithAI('user-3', {
            year: 1,
            country: 'United States',
            planMode: 'self_study',
            studyDurationDays: 7,
            selectedSubjects: ['Anatomy'],
        });

        expect(syllabusScraper.getCurriculum).toHaveBeenCalledWith('India', 1);
        const [, payload] = studyPlanRepo.replaceByUid.mock.calls[0];
        expect(payload.learner_profile.country).toBe('India');
    });

    test('ticking a future calendar day returns that day without changing today streak', async () => {
        const futureStr = format(addDays(startOfDay(new Date()), 1), 'yyyy-MM-dd');
        const plan = {
            _id: 'plan-1',
            daily_plan: [
                {
                    date: futureStr,
                    completion_rate: 0,
                    tasks: [
                        { id: 'future-task', text: 'Preview tomorrow', completed: false },
                    ],
                },
            ],
            schedule_days: [
                {
                    date: futureStr,
                    completion_rate: 0,
                    tasks: [
                        { id: 'future-task', text: 'Preview tomorrow', completed: false, type: 'learn' },
                    ],
                },
            ],
            planner_version: 2,
            constraints: { daily_available_minutes: 120, max_tasks_per_day: 5 },
            weak_topics: [],
            strong_topics: [],
            streak: { current: 0, longest: 0, last_checkin: null },
            analytics: { total_tasks: 1, completed: 0 },
            advisory_text: 'Keep moving.',
            save: jest.fn(),
        };
        studyPlanRepo.findByUid.mockResolvedValue(plan);

        const result = await studyService.tickTask('user-1', futureStr, 'future-task', true);

        expect(result.date).toBe(futureStr);
        expect(result.tasks[0].completed).toBe(true);
        expect(plan.analytics.completed).toBe(1);
        expect(plan.streak.current).toBe(0);
        expect(plan.streak.last_checkin).toBeNull();
        expect(plan.save).toHaveBeenCalledTimes(1);
    });

    test('resource ranking returns legal low-cost packs and blocks known gray-market domains', () => {
        const resources = rankResources({
            subject: 'Pathology',
            topic: 'Inflammation',
            country: 'India',
            limit: 8,
        });

        expect(resources.length).toBeGreaterThan(0);
        resources.forEach(resource => {
            resource.freeLinks.forEach(link => {
                expect(isBlockedUrl(link.url)).toBe(false);
            });
        });
        expect(isBlockedUrl('https://libgen.example/pathology')).toBe(true);
        expect(resources.some(resource => ['free', 'freemium', 'paid'].includes(resource.access))).toBe(true);
    });
});
