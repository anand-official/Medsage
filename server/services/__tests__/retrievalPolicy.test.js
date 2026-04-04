jest.mock('../ragService', () => ({
    retrieveContext: jest.fn(),
    retrieveWithExpansion: jest.fn(),
}));

jest.mock('../queryExpander', () => ({
    expandQuery: jest.fn(),
}));

const ragService = require('../ragService');
const queryExpander = require('../queryExpander');
const retrievalPolicy = require('../retrievalPolicy');

describe('retrievalPolicy', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ragService.retrieveWithExpansion = jest.fn();
    });

    test('rewrites follow-up questions into standalone search phrases', async () => {
        const llmClient = {
            callText: jest.fn().mockResolvedValue({
                text: 'acute inflammation vascular changes mechanism',
            }),
        };

        const searchPhrase = await retrievalPolicy.rewriteSearchPhrase({
            normalizedQuestion: 'But are you sure this is correct?',
            sanitizedQuestion: 'But are you sure this is correct?',
            truncatedHistory: [
                { role: 'user', content: 'Explain acute inflammation' },
                { role: 'ai', content: 'Acute inflammation starts with vascular changes.' },
            ],
            llmClient,
        });

        expect(searchPhrase).toBe('acute inflammation vascular changes mechanism');
        expect(llmClient.callText).toHaveBeenCalledTimes(1);
    });

    test('keeps the original query when no rewrite context exists', async () => {
        const llmClient = {
            callText: jest.fn(),
        };

        const searchPhrase = await retrievalPolicy.rewriteSearchPhrase({
            normalizedQuestion: 'Explain nephrotic syndrome',
            sanitizedQuestion: 'Explain nephrotic syndrome',
            truncatedHistory: [],
            llmClient,
        });

        expect(searchPhrase).toBe('Explain nephrotic syndrome');
        expect(llmClient.callText).not.toHaveBeenCalled();
    });

    test('uses expanded retrieval when available and keeps the resolved subject filter', async () => {
        queryExpander.expandQuery.mockResolvedValue([
            'acute inflammation mechanism',
            'vascular changes in acute inflammation',
        ]);
        ragService.retrieveWithExpansion.mockResolvedValue({ is_valid: true, chunks: ['x'], telemetry: {} });

        await retrievalPolicy.retrieveGroundedContext({
            topicId: 'PATH_INF_01',
            subject: 'Pathology',
            country: 'India',
            searchPhrase: 'acute inflammation mechanism',
            confidence: 0.7,
            mode: 'conceptual',
            truncatedHistory: [{ role: 'user', content: 'Explain inflammation' }],
        });

        expect(queryExpander.expandQuery).toHaveBeenCalledWith('acute inflammation mechanism');
        expect(ragService.retrieveWithExpansion).toHaveBeenCalledWith(
            'PATH_INF_01',
            { subject: 'Pathology', country: 'India' },
            ['acute inflammation mechanism', 'vascular changes in acute inflammation'],
            0.7,
            'conceptual'
        );
    });

    test('falls back to retrieveContext when expansion retrieval is unavailable', async () => {
        ragService.retrieveWithExpansion = undefined;
        ragService.retrieveContext.mockResolvedValue({ is_valid: true, chunks: ['x'], telemetry: {} });

        await retrievalPolicy.retrieveGroundedContext({
            topicId: 'PHYS_01',
            subject: 'Physiology',
            country: 'India',
            searchPhrase: 'starling forces',
            confidence: 0.95,
            mode: 'exam',
            truncatedHistory: [],
        });

        expect(queryExpander.expandQuery).not.toHaveBeenCalled();
        expect(ragService.retrieveContext).toHaveBeenCalledWith(
            'PHYS_01',
            { subject: 'Physiology', country: 'India' },
            'starling forces',
            0.95,
            'exam'
        );
    });
});
