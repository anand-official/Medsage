jest.mock('../topicConfidenceScorer', () => ({
    scoreQuery: jest.fn(),
    scoreQueryAdvanced: jest.fn(),
    getSyllabusContext: jest.fn(),
}));

jest.mock('../ragService', () => ({
    retrieveContext: jest.fn(),
}));

jest.mock('../promptBuilder', () => ({
    build: jest.fn(),
}));

jest.mock('../outputSchemaValidator', () => ({
    validate: jest.fn(),
}));

jest.mock('../citationVerifier', () => ({
    verifyStructuredClaims: jest.fn(),
    buildRetryPrompt: jest.fn(),
}));

jest.mock('../confidenceEngine', () => ({
    compute: jest.fn(),
}));

jest.mock('../queryCache', () => ({
    get: jest.fn(),
    set: jest.fn(),
}));

jest.mock('../cortexLlmClient', () => ({
    callText: jest.fn(),
    callStructured: jest.fn(),
    callVision: jest.fn(),
    streamText: jest.fn(),
}));

jest.mock('../../middleware/monitoring', () => ({
    recordCitationCompliance: jest.fn(),
    recordConfidenceTier: jest.fn(),
    recordError: jest.fn(),
    recordRAGLatency: jest.fn(),
}));

// claimValidator is pure (no I/O) but mocking keeps tests deterministic
// and decoupled from threshold constants.
jest.mock('../claimValidator', () => ({
    buildChunkTextIndex: jest.fn().mockReturnValue({ C1: 'Acute inflammation text.' }),
    validateClaims: jest.fn().mockReturnValue({
        claim_validation: [],
        unvalidated_count: 0,
        similarity_penalty: 0,
    }),
}));

const topicScorer   = require('../topicConfidenceScorer');
const ragService    = require('../ragService');
const promptBuilder = require('../promptBuilder');
const outputSchemaValidator = require('../outputSchemaValidator');
const citationVerifier = require('../citationVerifier');
const confidenceEngine = require('../confidenceEngine');
const queryCache    = require('../queryCache');
const llmClient     = require('../cortexLlmClient');
const orchestrator  = require('../cortexOrchestrator');

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const highTopicResult = {
    topic_id: 'PATH_INF_01',
    subject: 'Pathology',
    confidence: 0.91,
    method: 'embedding_v1',
    matched: true,
};

const validParsedResponse = {
    claims: [
        { statement: 'Acute inflammation causes vasodilation.', chunk_ids: ['C1'] },
        { statement: 'Neutrophils predominate early in acute inflammation.', chunk_ids: ['C1'] },
    ],
    clinical_correlation: 'Correlate with fever and leukocytosis.',
};

const validCitationResult = {
    claims: [
        {
            statement: 'Acute inflammation causes vasodilation.',
            citations: [{ chunk_id: 'C1', book: 'Robbins', page_start: 12, page_end: 13 }],
            is_sourced: true,
            chunk_ids: ['C1'],
        },
        {
            statement: 'Neutrophils predominate early in acute inflammation.',
            citations: [{ chunk_id: 'C1', book: 'Robbins', page_start: 14, page_end: 15 }],
            is_sourced: true,
            chunk_ids: ['C1'],
        },
    ],
    hallucinated: [],
    uncited_claims: false,
    confidence_score: 0.9,
    citation_count: 2,
    compliance_rate: 1,
    needs_retry: false,
};

const validRetrieval = {
    chunks: ['Acute inflammation text.'],
    chunk_payloads: [{ chunk_id: 'C1', book: 'Robbins', page_start: 12, page_end: 15 }],
    metadata: { book: 'Robbins' },
    telemetry: {
        latency_ms: 8,
        similarity_scores: [0.91],
        retrieval_strategy: 'topic_filtered',
        broadened: false,
        high_yield_scores: [0.5],
        final_scores: [0.89],
        validation_passed: true,
    },
    is_valid: true,
};

const highConfidenceReport = {
    final_confidence: 0.9,
    tier: 'HIGH',
    tier_label: 'High confidence',
    flags: [],
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('CortexOrchestrator.generateMedicalResponse', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        queryCache.get.mockReturnValue(null);
        topicScorer.getSyllabusContext.mockReturnValue({
            regulator: 'NMC',
            country: 'India',
            year: '2nd',
            subject: 'Pathology',
            syllabus: 'Indian MBBS',
        });
        promptBuilder.build.mockReturnValue({
            prompt: 'grounded prompt with textbook chunks',
            metadata: { temperature: 0.2, max_tokens: 2000 },
            version: '2.2.0',
            prompt_id: 'prompt_v2',
        });
    });

    // ── Pre-scoring guardrails ─────────────────────────────────────────────────

    test('returns EMPTY_QUERY clarification for blank input', async () => {
        const response = await orchestrator.generateMedicalResponse('   ');

        expect(response.is_clarification_required).toBe(true);
        expect(response.meta.pipeline).toBe('clarification');
        expect(response.trust.flags).toContain('EMPTY_QUERY');
        // No LLM or DB call should be made
        expect(topicScorer.scoreQueryAdvanced).not.toHaveBeenCalled();
        expect(llmClient.callText).not.toHaveBeenCalled();
    });

    test('returns GREETING clarification for conversational openers', async () => {
        const response = await orchestrator.generateMedicalResponse('hello');

        expect(response.is_clarification_required).toBe(true);
        expect(response.meta.pipeline).toBe('greeting');
        expect(response.trust.flags).toContain('GREETING');
        expect(topicScorer.scoreQueryAdvanced).not.toHaveBeenCalled();
    });

    test('does not treat greeting-style replies as a fresh greeting when history exists', async () => {
        topicScorer.scoreQuery.mockReturnValue({ matched: true, confidence: 0.8, topic_id: null, subject: null });
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        ragService.retrieveContext.mockResolvedValue(validRetrieval);
        llmClient.callStructured.mockResolvedValue({
            text: JSON.stringify(validParsedResponse),
            provider: 'gemini',
        });
        outputSchemaValidator.validate.mockReturnValue({
            is_valid: true,
            parsed: validParsedResponse,
            error: null,
        });
        citationVerifier.verifyStructuredClaims.mockReturnValue(validCitationResult);
        confidenceEngine.compute.mockReturnValue(highConfidenceReport);

        const response = await orchestrator.generateMedicalResponse('okay', {
            history: [
                { role: 'user', content: 'Explain acute inflammation' },
                { role: 'ai', content: 'Acute inflammation is the immediate vascular response to injury.' },
            ],
        });

        expect(response.meta.pipeline).not.toBe('greeting');
        expect(ragService.retrieveContext).toHaveBeenCalled();
    });

    test('keeps the prior subject for short follow-up retrievals', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue({
            topic_id: 'MED_01',
            subject: 'Medicine',
            confidence: 0.82,
            method: 'embedding_v1',
            matched: true,
        });
        ragService.retrieveContext.mockResolvedValue(validRetrieval);
        llmClient.callText.mockResolvedValue({
            text: 'acute inflammation mechanism pathology',
            provider: 'gemini',
        });
        llmClient.callStructured.mockResolvedValue({
            text: JSON.stringify(validParsedResponse),
            provider: 'gemini',
        });
        outputSchemaValidator.validate.mockReturnValue({
            is_valid: true,
            parsed: validParsedResponse,
            error: null,
        });
        citationVerifier.verifyStructuredClaims.mockReturnValue(validCitationResult);
        confidenceEngine.compute.mockReturnValue(highConfidenceReport);

        await orchestrator.generateMedicalResponse('But are you sure?', {
            history: [
                { role: 'user', content: 'Explain acute inflammation' },
                { role: 'ai', content: 'Acute inflammation is the immediate vascular response.', subject: 'Pathology' },
            ],
        });

        expect(ragService.retrieveContext).toHaveBeenCalledWith(
            'MED_01',
            expect.objectContaining({ subject: 'Pathology', country: 'India' }),
            expect.any(String),
            0.82,
            'conceptual'
        );
    });

    test('refuses off-topic query that has no medical signal', async () => {
        // scoreQuery is called by _handleOffTopic when hasMedicalSignal is false
        topicScorer.scoreQuery.mockReturnValue({ matched: false, confidence: 0.05, topic_id: null, subject: null });

        const response = await orchestrator.generateMedicalResponse('What is the best cryptocurrency to invest in?');

        expect(response.is_clarification_required).toBe(true);
        expect(response.meta.pipeline).toBe('off_topic_refusal');
        expect(response.trust.flags).toContain('OFF_TOPIC_QUERY');
        expect(ragService.retrieveContext).not.toHaveBeenCalled();
    });

    test('returns cached response without hitting the pipeline', async () => {
        const cached = {
            answer: 'Cached inflammation answer.',
            meta: { pipeline: 'full_rag', topic_id: 'PATH_INF_01' },
            trust: { verified: true },
        };
        queryCache.get.mockReturnValue(cached);

        const response = await orchestrator.generateMedicalResponse('Explain acute inflammation');

        expect(response.meta.cache_hit).toBe(true);
        expect(response.answer).toBe('Cached inflammation answer.');
        // Pipeline should not advance past the cache check
        expect(topicScorer.scoreQueryAdvanced).not.toHaveBeenCalled();
        expect(ragService.retrieveContext).not.toHaveBeenCalled();
    });

    // ── Vision path ────────────────────────────────────────────────────────────

    test('routes image queries through the vision pipeline', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        llmClient.callVision.mockResolvedValue({
            text: 'This ECG shows ST elevation in leads II, III, aVF.',
            provider: 'gemini',
        });

        const response = await orchestrator.generateMedicalResponse(
            'What does this ECG show?',
            { imageBase64: 'data:image/jpeg;base64,abc123' }
        );

        expect(response.meta.pipeline).toBe('vision');
        expect(response.trust.flags).toContain('VISION_RESPONSE_UNVERIFIED');
        expect(llmClient.callVision).toHaveBeenCalledTimes(1);
        expect(ragService.retrieveContext).not.toHaveBeenCalled();
    });

    // ── Low-confidence paths ───────────────────────────────────────────────────

    test('returns LOW_TOPIC_CONFIDENCE clarification for short vague query', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue({
            topic_id: null,
            subject: null,
            confidence: 0.32,
            method: 'keyword_v1',
            matched: false,
        });

        // 3-word question + confidence < 0.5 → _shouldClarifyQuestion returns true
        const response = await orchestrator.generateMedicalResponse('What is it?');

        expect(response.is_clarification_required).toBe(true);
        expect(response.meta.pipeline).toBe('clarification');
        expect(response.trust.flags).toContain('LOW_TOPIC_CONFIDENCE');
        expect(ragService.retrieveContext).not.toHaveBeenCalled();
    });

    test('returns clarification when topic confidence is low but question is descriptive', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue({
            topic_id: null,
            subject: 'Medical Science',
            confidence: 0.32,
            method: 'keyword_v1',
            matched: false,
        });

        // 9-word question: _shouldClarifyQuestion → words.length > 6 → false → goes to direct
        const response = await orchestrator.generateMedicalResponse(
            'Explain the medical framework for syndromic differential diagnosis'
        );

        expect(response.meta.pipeline).toBe('clarification');
        expect(response.is_clarification_required).toBe(true);
        expect(response.trust.flags).toContain('LOW_TOPIC_CONFIDENCE');
        expect(llmClient.callText).not.toHaveBeenCalled();
    });

    // ── Post-retrieval paths ───────────────────────────────────────────────────

    test('clarifies after retrieval when chunks are empty and confidence is low', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue({
            ...highTopicResult,
            confidence: 0.65,   // passes _handleLowConfidence (>= 0.6)
        });
        ragService.retrieveContext.mockResolvedValue({
            chunks: [],
            chunk_payloads: [],
            metadata: {},
            telemetry: {
                latency_ms: 5,
                similarity_scores: [],
                retrieval_strategy: 'broadened',
                broadened: true,
                high_yield_scores: [],
                final_scores: [],
                validation_passed: false,
            },
            is_valid: false,
        });

        // Short question (≤ 8 words) + confidence < 0.72 → _shouldClarifyAfterRetrieval
        // "What causes inflammation here?" has no looksLikeFollowUp trigger words,
        // so the query-rewrite step is skipped and callText is never invoked.
        const response = await orchestrator.generateMedicalResponse('What causes inflammation here?');

        expect(response.is_clarification_required).toBe(true);
        expect(response.trust.flags).toContain('NO_GROUNDED_CONTEXT');
        expect(llmClient.callText).not.toHaveBeenCalled();
    });

    test('returns clarification when retrieval fails and question is long', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        ragService.retrieveContext.mockResolvedValue({
            chunks: [],
            chunk_payloads: [],
            metadata: {},
            telemetry: {
                latency_ms: 11,
                similarity_scores: [],
                retrieval_strategy: 'broadened',
                broadened: true,
                high_yield_scores: [],
                final_scores: [],
                validation_passed: false,
            },
            is_valid: false,
        });
        const response = await orchestrator.generateMedicalResponse('Explain acute inflammation in full detail');

        expect(response.meta.pipeline).toBe('clarification');
        expect(response.is_clarification_required).toBe(true);
        expect(response.trust.flags).toContain('NO_GROUNDED_CONTEXT');
        expect(llmClient.callText).not.toHaveBeenCalled();
    });

    // ── Full RAG success path ──────────────────────────────────────────────────

    test('returns a verified full_rag response and writes to cache on HIGH confidence', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        ragService.retrieveContext.mockResolvedValue(validRetrieval);
        llmClient.callStructured.mockResolvedValue({
            text: JSON.stringify(validParsedResponse),
            provider: 'gemini',
        });
        outputSchemaValidator.validate.mockReturnValue({
            is_valid: true,
            parsed: validParsedResponse,
            error: null,
        });
        citationVerifier.verifyStructuredClaims.mockReturnValue(validCitationResult);
        confidenceEngine.compute.mockReturnValue(highConfidenceReport);

        const response = await orchestrator.generateMedicalResponse('Explain acute inflammation');

        expect(response.meta.pipeline).toBe('full_rag');
        expect(response.trust.verified).toBe(true);
        expect(response.trust.citation_count).toBe(2);
        expect(response.confidence.tier).toBe('HIGH');
        expect(queryCache.set).toHaveBeenCalledTimes(1);
    });

    // ── Citation retry path ────────────────────────────────────────────────────

    test('retries the LLM call when citation verification requests a retry', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        ragService.retrieveContext.mockResolvedValue(validRetrieval);

        // Both structured calls return the same valid JSON
        llmClient.callStructured.mockResolvedValue({
            text: JSON.stringify(validParsedResponse),
            provider: 'gemini',
        });
        outputSchemaValidator.validate.mockReturnValue({
            is_valid: true,
            parsed: validParsedResponse,
            error: null,
        });

        // First call → needs_retry; second call (after retry) → no retry
        citationVerifier.verifyStructuredClaims
            .mockReturnValueOnce({ ...validCitationResult, needs_retry: true })
            .mockReturnValueOnce({ ...validCitationResult, needs_retry: false });
        citationVerifier.buildRetryPrompt.mockReturnValue('citation retry prompt');

        confidenceEngine.compute.mockReturnValue(highConfidenceReport);

        const response = await orchestrator.generateMedicalResponse('Explain acute inflammation');

        expect(llmClient.callStructured).toHaveBeenCalledTimes(2);
        expect(citationVerifier.buildRetryPrompt).toHaveBeenCalledTimes(1);
        expect(response.meta.pipeline).toBe('full_rag');
        expect(response.meta.citation_retry_count).toBe(1);
    });

    // ── Clarification-required from full RAG (partial_answer) ─────────────────

    test('sets partial_answer and is_clarification_required when no claims are sourced', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        ragService.retrieveContext.mockResolvedValue(validRetrieval);
        llmClient.callStructured.mockResolvedValue({
            text: JSON.stringify(validParsedResponse),
            provider: 'gemini',
        });
        outputSchemaValidator.validate.mockReturnValue({
            is_valid: true,
            parsed: validParsedResponse,
            error: null,
        });

        // All claims unsourced → sourcedClaimsCount = 0 → isClarificationRequired = true
        citationVerifier.verifyStructuredClaims.mockReturnValue({
            claims: [
                { statement: 'Some claim.', citations: [], is_sourced: false },
            ],
            needs_retry: false,
            compliance_rate: 0,
            citation_count: 0,
        });

        confidenceEngine.compute.mockReturnValue({
            final_confidence: 0.4,
            tier: 'LOW',
            tier_label: 'Needs review',
            flags: [],
        });

        const response = await orchestrator.generateMedicalResponse('Explain acute inflammation');

        expect(response.is_clarification_required).toBe(true);
        expect(response.partial_answer).toBeTruthy();
        // Cache should NOT be set for a clarification response
        expect(queryCache.set).not.toHaveBeenCalled();
    });

    // ── Schema validation failure paths ────────────────────────────────────────

    test('falls back to schema_failed pipeline when schema validation fails after retry', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        ragService.retrieveContext.mockResolvedValue(validRetrieval);

        llmClient.callStructured
            .mockResolvedValueOnce({ text: '{bad json', provider: 'gemini' })
            .mockResolvedValueOnce({ text: '{still bad', provider: 'gemini' });
        outputSchemaValidator.validate
            .mockReturnValueOnce({ is_valid: false, parsed: null, error: 'Output is not valid JSON.' })
            .mockReturnValueOnce({ is_valid: false, parsed: null, error: 'Output is not valid JSON.' });
        llmClient.callText.mockResolvedValue({
            text: 'Schema failure fallback answer.',
            provider: 'gemini',
        });

        const response = await orchestrator.generateMedicalResponse('Explain acute inflammation');

        expect(response.meta.pipeline).toBe('schema_failed');
        expect(response.trust.verification_level).toBe('degraded');
        expect(response.trust.flags).toContain('SCHEMA_VALIDATION_FAILED');
        // _buildDirectResponse uses the raw LLM output as explicitAnswer (non-null),
        // so callText is NOT invoked — the bad JSON itself is used as a fallback answer.
        expect(llmClient.callText).not.toHaveBeenCalled();
    });

    test('schema retry prompt reuses the RAG-grounded prompt, not a bare schema description', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        ragService.retrieveContext.mockResolvedValue(validRetrieval);

        llmClient.callStructured
            .mockResolvedValueOnce({ text: '{invalid}', provider: 'gemini' })
            .mockResolvedValueOnce({ text: JSON.stringify(validParsedResponse), provider: 'gemini' });
        outputSchemaValidator.validate
            .mockReturnValueOnce({ is_valid: false, parsed: null, error: 'Missing required field.' })
            .mockReturnValueOnce({ is_valid: true, parsed: validParsedResponse, error: null });
        citationVerifier.verifyStructuredClaims.mockReturnValue(validCitationResult);
        confidenceEngine.compute.mockReturnValue(highConfidenceReport);

        await orchestrator.generateMedicalResponse('Explain acute inflammation');

        // The second callStructured call (retry) must start with the original RAG prompt
        const retryCallArg = llmClient.callStructured.mock.calls[1][0];
        expect(retryCallArg).toContain('grounded prompt with textbook chunks');
        // And must append the error note
        expect(retryCallArg).toContain('Missing required field');
    });

    test('falls back to structured_fallback when structured LLM call throws', async () => {
        topicScorer.scoreQueryAdvanced.mockResolvedValue(highTopicResult);
        ragService.retrieveContext.mockResolvedValue(validRetrieval);
        llmClient.callStructured.mockRejectedValue(new Error('Gemini unavailable'));
        llmClient.callText.mockResolvedValue({
            text: 'Structured fallback answer.',
            provider: 'fallback',
        });

        const response = await orchestrator.generateMedicalResponse('Explain acute inflammation');

        expect(response.meta.pipeline).toBe('structured_fallback');
        expect(response.trust.flags).toContain('STRUCTURED_PIPELINE_FAILED');
    });

    // ── Emergency fallback ─────────────────────────────────────────────────────

    test('returns emergency_fallback response when an unexpected error crashes the pipeline', async () => {
        // Pass the off-topic check via scoreQuery, then make scoreQueryAdvanced throw
        topicScorer.scoreQuery.mockReturnValue({ matched: true, confidence: 0.8, topic_id: null, subject: null });
        topicScorer.scoreQueryAdvanced.mockRejectedValue(new Error('Unexpected DB error'));
        llmClient.callText.mockResolvedValue({
            text: 'Emergency fallback answer.',
            provider: 'gemini',
        });

        const response = await orchestrator.generateMedicalResponse('Explain acute pancreatitis in detail');

        expect(response.meta.pipeline).toBe('emergency_fallback');
        expect(response.trust.flags).toContain('PIPELINE_FATAL_ERROR');
    });

    // ── scoreQueryAdvanced fallback ────────────────────────────────────────────

    test('falls back to scoreQuery when scoreQueryAdvanced is not a function', async () => {
        // Temporarily replace scoreQueryAdvanced with a non-function
        topicScorer.scoreQueryAdvanced = undefined;
        topicScorer.scoreQuery.mockReturnValue(highTopicResult);

        ragService.retrieveContext.mockResolvedValue(validRetrieval);
        llmClient.callStructured.mockResolvedValue({
            text: JSON.stringify(validParsedResponse),
            provider: 'gemini',
        });
        outputSchemaValidator.validate.mockReturnValue({
            is_valid: true,
            parsed: validParsedResponse,
            error: null,
        });
        citationVerifier.verifyStructuredClaims.mockReturnValue(validCitationResult);
        confidenceEngine.compute.mockReturnValue(highConfidenceReport);

        const response = await orchestrator.generateMedicalResponse('Explain acute inflammation');

        expect(response.meta.pipeline).toBe('full_rag');
        // Restore for subsequent tests
        topicScorer.scoreQueryAdvanced = jest.fn();
    });
});
