jest.mock('../geminiService', () => ({
    callLLM: jest.fn()
}));

const syllabusScraper = require('../syllabusScraper');

describe('syllabusScraper', () => {
    test('returns Nepal first-year static curriculum for the planner', async () => {
        const curriculum = await syllabusScraper.getCurriculum('Nepal', 1);

        expect(curriculum).toHaveProperty('Medical Informatics');
        expect(curriculum).toHaveProperty('Introduction to Clinical Medicine');
        expect(curriculum).toHaveProperty('Microbiology');
        expect(curriculum['Medical Informatics']).toContain('Computer Fundamentals');
    });

    test('returns Nepal clinical subject map for year four', () => {
        expect(syllabusScraper.getExpectedSubjects('Nepal', 4)).toEqual(
            expect.arrayContaining(['Orthopedics', 'Psychiatry', 'Dermatology', 'Radiology', 'Anesthesia'])
        );
    });

    test('keeps India year-two planner subjects aligned with backend expectations', () => {
        expect(syllabusScraper.getExpectedSubjects('India', 2)).toEqual(
            expect.arrayContaining(['Pathology', 'Pharmacology', 'Microbiology', 'Forensic Medicine'])
        );
    });
});
