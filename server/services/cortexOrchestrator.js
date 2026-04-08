const topicScorer = require('./topicConfidenceScorer');
const promptBuilder = require('./promptBuilder');
const outputSchemaValidator = require('./outputSchemaValidator');
const citationVerifier = require('./citationVerifier');
const confidenceEngine = require('./confidenceEngine');
const queryCache = require('./queryCache');
const retrievalPolicy = require('./retrievalPolicy');
const llmClient = require('./cortexLlmClient');
const conversationStateService = require('./conversationStateService');
const { resolvePersona } = require('./personaResolver');
const { applyTrustMetadata } = require('./cortexResponsePolicy');
const claimValidator = require('./claimValidator');
const {
    buildDirectPrompt,
    buildHistoryBlock,
    detectFollowUpIntent,
    hasMedicalSignal,
    looksLikeFollowUp,
    truncateHistory,
} = require('./cortexRequestUtils');
const {
    recordCitationCompliance,
    recordConfidenceTier,
    recordError,
    recordRAGLatency,
    recordQueryExpansion,
} = require('../middleware/monitoring');

// Greeting pattern shared by both generateMedicalResponse and streamMedicalResponse
const GREETING_PATTERNS = /^(hi|hello|hey|hiya|howdy|sup|what's up|whats up|good morning|good afternoon|good evening|good night|how are you|how r u|thanks|thank you|ok|okay|cool|nice|great|awesome|wow|lol|haha|bye|goodbye|see you|cya|yes|no|sure|alright|got it|understood|noted)\s*[!?.]*$/i;
class CortexOrchestrator {
    constructor(options = {}) {
        this.llmClient = options.llmClient || llmClient;
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Main dispatcher. Builds a pipeline context object (ctx) and delegates to
     * private handler methods in order. Each handler either returns a final
     * response or null/undefined to allow the next stage to run.
     *
     * State is carried in ctx — never stored on `this`, because a single
     * CortexOrchestrator instance handles concurrent requests.
     */
    async generateMedicalResponse(rawQuestion, userContext = {}) {
        const ctx = conversationStateService.createInitialState(
            rawQuestion,
            userContext,
            this._buildCacheContext(userContext)
        );

        // ── Pre-scoring guardrails (run before any async work) ──────────────
        const emptyResult = this._handleEmptyQuery(ctx);
        if (emptyResult) return emptyResult;

        const greetingResult = this._handleGreeting(ctx);
        if (greetingResult) return greetingResult;

        const offTopicResult = this._handleOffTopic(ctx);
        if (offTopicResult) return offTopicResult;

        const cacheResult = this._handleCacheHit(ctx);
        if (cacheResult) return cacheResult;

        // ── Async pipeline ──────────────────────────────────────────────────
        try {
            await this._buildPipelineContext(ctx);

            const visionResult = await this._handleVision(ctx);
            if (visionResult) return visionResult;

            const lowConfResult = await this._handleLowConfidence(ctx);
            if (lowConfResult) return lowConfResult;

            return await this._handleFullRAG(ctx);

        } catch (error) {
            recordError('PIPELINE_FATAL_ERROR');
            console.error('[PIPELINE] Fatal error:', error);
            try {
                return await this._buildDirectResponse({
                    question:      ctx.sanitizedQuestion,
                    mode:          ctx.mode,
                    persona:       resolvePersona(ctx.hintSubject, {
                        mode: ctx.mode,
                        threadMode: ctx.threadMode,
                        followUpIntent: ctx.followUpIntent,
                    }),
                    historyBlock:  ctx.historyBlock || buildHistoryBlock(truncateHistory(ctx.history)),
                    learnerContext: ctx.learnerContext,
                    pipeline:      'emergency_fallback',
                    confidenceScore: 0.2,
                    topicResult:   { topic_id: null, subject: ctx.hintSubject },
                    subject:       ctx.hintSubject,
                    startTime:     ctx.startTime,
                    flags:         ['PIPELINE_FATAL_ERROR'],
                });
            } catch (secondaryError) {
                return applyTrustMetadata({
                    answer:               'I apologize, but I am unable to process your question at this time. Please try again.',
                    short_note:           'I apologize, but I am unable to process your question at this time. Please try again.',
                    high_yield_summary:   [],
                    key_bullets:          [],
                    citations:            [],
                    clinical_correlation: '',
                    exam_tips:            '',
                    error:                true,
                    confidence:           this._buildConfidenceReport(0, ['PIPELINE_FATAL_ERROR']),
                    is_clarification_required: false,
                    meta: {
                        pipeline:   'emergency_fallback',
                        latency_ms: Date.now() - ctx.startTime,
                    },
                }, {
                    pipeline: 'emergency_fallback',
                    flags:    ['PIPELINE_FATAL_ERROR'],
                });
            }
        }
    }

    async *streamMedicalResponse(rawQuestion, userContext = {}) {
        const normalizedQuestion = (rawQuestion || '').trim();
        const mode = userContext.mode || 'conceptual';
        const history = userContext.history || [];
        const hintSubject = userContext.subject || null;
        const learnerContext = userContext.learnerContext || null;

        // ── Guardrail 1: empty query ──────────────────────────────────────────
        if (!normalizedQuestion) {
            yield 'Tell me the exact medical topic you want help with.';
            return;
        }

        // ── Guardrail 2: greeting detection (mirrors main pipeline) ───────────
        if (history.length === 0 && GREETING_PATTERNS.test(normalizedQuestion)) {
            yield 'Hey! Ask me anything in medicine — anatomy, physiology, pharmacology, pathology, or any clinical topic. What would you like to study?';
            return;
        }

        // ── Guardrail 3: off-topic check (mirrors main pipeline) ─────────────
        if (!hasMedicalSignal(normalizedQuestion) && !looksLikeFollowUp(normalizedQuestion, history.length)) {
            const quickScore = topicScorer.scoreQuery(normalizedQuestion);
            if (!quickScore.matched && quickScore.confidence < 0.3) {
                yield 'Cortex is focused on medical education. Please ask a medical or health-related question.';
                return;
            }
        }

        const truncatedHistory = truncateHistory(history);
        const historyBlock = buildHistoryBlock(truncatedHistory);
        const topicResult = await this._scoreTopic(normalizedQuestion);
        const calibratedTopicConfidence = this._calibrateTopicConfidence(topicResult);
        const threadMode = (looksLikeFollowUp(normalizedQuestion, history.length) && history.length > 0) ? 'follow_up' : 'new_topic';
        const professorSubject = conversationStateService.resolveSubject({
            hintSubject,
            priorSubject: conversationStateService.inferSubjectFromHistory(history),
            topicResult,
            threadMode,
        });
        const persona = resolvePersona(professorSubject, {
            mode,
            threadMode,
            followUpIntent: detectFollowUpIntent(normalizedQuestion, history.length),
            learnerContext,
        });

        // ── Guardrail 4: low topic confidence → clarification (last resort only) ─
        // Mirror the same logic as _handleLowConfidence: only block if genuinely
        // ambiguous (no medical signal, very short, near-zero confidence).
        const streamWordCount = normalizedQuestion.trim().split(/\s+/).filter(Boolean).length;
        const streamShouldClarify =
            !hasMedicalSignal(normalizedQuestion) &&
            threadMode !== 'follow_up' &&
            calibratedTopicConfidence < 0.35 &&
            streamWordCount < 5;
        if (streamShouldClarify) {
            yield 'I can help best if you name the disease, organ system, or core concept you want explained.';
            return;
        }

        // ── Disclaimer (fast draft path is not citation-verified) ─────────────
        yield '⚠️ *Fast draft — not citation-verified. Please verify with standard textbooks before clinical use.*\n\n';

        // sanitizeInput applied inside buildDirectPrompt — normalizedQuestion is safe to pass
        const prompt = buildDirectPrompt(persona, mode, historyBlock, normalizedQuestion, learnerContext);

        for await (const chunk of this.llmClient.streamText(prompt, {
            temperature: mode === 'exam' ? 0.15 : 0.35,
            max_tokens: 2500,
        })) {
            yield chunk;
        }
    }

    // ─── Pipeline context builder ──────────────────────────────────────────────

    /**
     * Populates all async-derived fields on ctx: topic scoring, history
     * truncation, persona, and syllabus context. Called once per request
     * after the synchronous guardrails pass.
     */
    async _buildPipelineContext(ctx) {
        const topicResult = await this._scoreTopic(ctx.normalizedQuestion);
        const calibratedTopicConfidence = this._calibrateTopicConfidence(topicResult);
        const syllabusContext = topicScorer.getSyllabusContext(ctx.syllabus);
        const resolvedSubject = conversationStateService.resolveSubject({
            hintSubject: ctx.hintSubject,
            priorSubject: ctx.priorSubject,
            topicResult,
            threadMode: ctx.threadMode,
        });
        const persona = resolvePersona(resolvedSubject, {
            mode: ctx.mode,
            threadMode: ctx.threadMode,
            followUpIntent: ctx.followUpIntent,
            learnerContext: ctx.learnerContext,
        });

        Object.assign(ctx, conversationStateService.enrichState(ctx, {
            topicResult,
            calibratedTopicConfidence,
            syllabusContext,
            persona,
        }));
    }

    // ─── Pre-scoring handlers (synchronous) ────────────────────────────────────

    /** Returns a clarification response for empty queries, or null to continue. */
    _handleEmptyQuery(ctx) {
        if (ctx.normalizedQuestion || ctx.imageBase64) return null;
        return this._buildClarificationResponse({
            answer:      'Tell me the exact medical topic, organ system, or disease you want help with.',
            pipeline:    'clarification',
            topicResult: { topic_id: null, subject: ctx.hintSubject },
            subject:     ctx.hintSubject,
            flags:       ['EMPTY_QUERY'],
            startTime:   ctx.startTime,
        });
    }

    /** Returns a greeting response, or null to continue. */
    _handleGreeting(ctx) {
        if (!GREETING_PATTERNS.test(ctx.normalizedQuestion) || ctx.imageBase64 || (ctx.history && ctx.history.length > 0)) return null;
        return this._buildClarificationResponse({
            answer:      'Hey! Ask me anything in medicine — anatomy, physiology, pharmacology, pathology, or any clinical topic. What would you like to study?',
            pipeline:    'greeting',
            topicResult: { topic_id: null, subject: null },
            subject:     null,
            flags:       ['GREETING'],
            startTime:   ctx.startTime,
        });
    }

    /**
     * Runs the off-topic guard. Fast-passes if hasMedicalSignal or looksLikeFollowUp.
     * Returns a refusal response, or null to continue.
     */
    _handleOffTopic(ctx) {
        if (hasMedicalSignal(ctx.normalizedQuestion) || looksLikeFollowUp(ctx.normalizedQuestion, ctx.history.length)) {
            return null;
        }
        const quickScore = topicScorer.scoreQuery(ctx.normalizedQuestion);
        if (quickScore.matched || quickScore.confidence >= 0.3) return null;

        return this._buildClarificationResponse({
            answer:      'Cortex is focused on medical education. Please ask a medical or health-related question.',
            pipeline:    'off_topic_refusal',
            topicResult: quickScore,
            subject:     ctx.hintSubject,
            confidenceScore: 0,
            flags:       ['OFF_TOPIC_QUERY'],
            startTime:   ctx.startTime,
        });
    }

    /**
     * Returns a cached response (with cache_hit: true) if available,
     * or null to continue. Only checks cache for text-only, history-free queries.
     */
    _handleCacheHit(ctx) {
        if (ctx.imageBase64 || (ctx.history && ctx.history.length > 0)) return null;
        const cached = queryCache.get(ctx.normalizedQuestion, ctx.mode, ctx.hintSubject, ctx.cacheContext);
        if (!cached) return null;
        return {
            ...cached,
            meta: { ...(cached.meta || {}), cache_hit: true },
        };
    }

    // ─── Post-scoring handlers (async) ─────────────────────────────────────────

    /**
     * Handles image queries via the vision LLM path.
     * Returns a vision response, or null to continue.
     */
    async _handleVision(ctx) {
        if (!ctx.imageBase64) return null;

        const visionAnswer = await this.llmClient.callVision(
            ctx.imageBase64,
            ctx.sanitizedQuestion,
            ctx.truncatedHistory,
            ctx.mode,
            ctx.persona
        );
        recordCitationCompliance(false);

        return applyTrustMetadata({
            answer:               visionAnswer.text,
            short_note:           visionAnswer.text,
            high_yield_summary:   this._extractKeyBullets(visionAnswer.text),
            key_bullets:          this._extractKeyBullets(visionAnswer.text),
            citations:            [],
            clinical_correlation: '',
            exam_tips:            '',
            confidence:           this._buildConfidenceReport(this._computeVisionConfidence(visionAnswer.text), ['VISION_RESPONSE_UNVERIFIED']),
            is_clarification_required: false,
            meta: {
                pipeline:   'vision',
                topic_id:   'image',
                subject:    ctx.professorSubject,
                latency_ms: Date.now() - ctx.startTime,
            },
        }, {
            pipeline: 'vision',
            provider: visionAnswer.provider,
            flags:    ['VISION_RESPONSE_UNVERIFIED'],
        });
    }

    /**
     * Handles low topic confidence: returns a clarification response, or null
     * to continue to the full RAG pipeline.
     *
     * Clarification is the LAST resort — only fire it when the question is
     * genuinely ambiguous (no medical terms, very short, near-zero confidence).
     * Everything else should be sent to RAG and let the pipeline handle uncertainty.
     */
    async _handleLowConfidence(ctx) {
        // Topic scorer matched with sufficient confidence — proceed to RAG
        if (ctx.topicResult.matched && ctx.calibratedTopicConfidence >= 0.6) return null;

        // Follow-up questions have conversation context as their anchor — proceed
        if (ctx.threadMode === 'follow_up') return null;

        // Explicit medical term present: the student named their topic clearly.
        // Let RAG attempt an answer even if the topic scorer is uncertain.
        if (hasMedicalSignal(ctx.normalizedQuestion)) return null;

        // Moderate confidence or a reasonably long question: RAG is worth trying.
        // A 5+ word query signals the student has given enough context.
        const wordCount = (ctx.normalizedQuestion || '').trim().split(/\s+/).filter(Boolean).length;
        if (ctx.calibratedTopicConfidence >= 0.35 || wordCount >= 5) return null;

        // Genuinely ambiguous: very short, no medical signal, near-zero confidence.
        // Only now ask for clarification.
        return this._buildClarificationResponse({
            answer:      'I can help best if you name the disease, organ system, or core concept you want explained.',
            pipeline:    'clarification',
            topicResult: ctx.topicResult,
            subject:     ctx.professorSubject,
            confidenceScore: ctx.calibratedTopicConfidence,
            flags:       ['LOW_TOPIC_CONFIDENCE'],
            startTime:   ctx.startTime,
            threadMode:  ctx.threadMode,
            followUpIntent: ctx.followUpIntent,
        });
    }

    /**
     * Runs the full RAG pipeline: query rewrite → retrieval → structured LLM call
     * → schema validation (with retry) → citation verification (with retry)
     * → claim validation → confidence scoring → final response assembly.
     */
    async _handleFullRAG(ctx) {
        // ── Query rewrite for follow-up / history-aware retrieval ────────────
        const searchPhrase = await retrievalPolicy.rewriteSearchPhrase({
            normalizedQuestion: ctx.normalizedQuestion,
            sanitizedQuestion: ctx.sanitizedQuestion,
            truncatedHistory: ctx.truncatedHistory,
            llmClient: this.llmClient,
        });

        // ── Query expansion → parallel retrieval ─────────────────────────────
        // expandQuery returns [searchPhrase, ...alternatives] (or [searchPhrase] on
        // timeout/error/disabled).  retrieveWithExpansion runs all variants in
        // parallel and merges unique chunks from alt queries into the primary result.
        const retrieval = await retrievalPolicy.retrieveGroundedContext({
            topicId: ctx.topicResult.topic_id,
            subject: ctx.professorSubject || ctx.topicResult.subject || null,
            country: ctx.syllabusContext.country,
            searchPhrase,
            confidence: ctx.calibratedTopicConfidence,
            mode: ctx.mode,
            truncatedHistory: ctx.truncatedHistory,
        });
        recordRAGLatency(retrieval.telemetry?.latency_ms || 0);

        // Record expansion telemetry (only fires when alternatives were actually generated)
        const expansionTelemetry = retrieval.telemetry?.query_expansion;
        if (expansionTelemetry) {
            recordQueryExpansion(expansionTelemetry.queries_count, expansionTelemetry.expansion_added);
        }

        if (!retrieval.is_valid || retrieval.chunks.length === 0) {
            const clarificationText = ctx.threadMode === 'follow_up'
                ? 'I could not ground that follow-up in the textbook context. Ask the same point with the exact disease, mechanism, drug, or chapter so I can continue the thread accurately.'
                : 'I need one more anchor point to ground this properly. Mention the disease, organ system, drug class, or clinical scenario you mean.';

            return this._buildClarificationResponse({
                answer:      clarificationText,
                pipeline:    'clarification',
                topicResult: ctx.topicResult,
                subject:     ctx.professorSubject,
                confidenceScore: ctx.calibratedTopicConfidence,
                flags:       ['NO_GROUNDED_CONTEXT'],
                startTime:   ctx.startTime,
                threadMode:  ctx.threadMode,
                followUpIntent: ctx.followUpIntent,
            });
        }

        // ── Prompt build ─────────────────────────────────────────────────────
        const promptResult = promptBuilder.build({
            mode:           ctx.mode,
            syllabusContext: ctx.syllabusContext,
            retrieval,
            question:       ctx.sanitizedQuestion,
            historyBlock:   ctx.historyBlock,
            persona:        ctx.persona,
            learnerContext: ctx.learnerContext,
            threadMode:     ctx.threadMode,
            followUpIntent: ctx.followUpIntent,
        });

        // ── Structured LLM call ──────────────────────────────────────────────
        let structuredCall;
        try {
            structuredCall = await this.llmClient.callStructured(promptResult.prompt, {
                ...promptResult.metadata,
                responseMimeType: 'application/json',
            });
        } catch (error) {
            recordError('PIPELINE_STRUCTURED_CALL_FAILED');
            return this._buildDirectResponse({
                question:       ctx.sanitizedQuestion,
                mode:           ctx.mode,
                persona:        ctx.persona,
                historyBlock:   ctx.historyBlock,
                learnerContext: ctx.learnerContext,
                pipeline:       'structured_fallback',
                confidenceScore: 0.42,
                topicResult:    ctx.topicResult,
                subject:        ctx.professorSubject,
                startTime:      ctx.startTime,
                flags:          ['STRUCTURED_PIPELINE_FAILED'],
            });
        }

        // ── Schema validation + retry ────────────────────────────────────────
        let rawLLMOutput   = structuredCall.text;
        let activeProvider = structuredCall.provider;
        let schemaResult   = outputSchemaValidator.validate(rawLLMOutput);
        let retryCount     = 0;
        let citationRetryCount = 0;

        if (!schemaResult.is_valid && retryCount < 1) {
            const safeError = (schemaResult.error || 'Invalid JSON structure')
                .split(/[.\n]/)[0]
                .substring(0, 120);

            const schemaRetryPrompt =
                `${promptResult.prompt}\n\n` +
                `IMPORTANT: Your previous response was not valid JSON. Error: ${safeError}. ` +
                `Please generate a valid JSON response according to the schema above. ` +
                `Output ONLY the JSON object — no markdown fences, no explanation.`;

            try {
                const correctedOutput = await this.llmClient.callStructured(schemaRetryPrompt, {
                    temperature:      0.1,
                    max_tokens:       2000,
                    responseMimeType: 'application/json',
                });
                rawLLMOutput   = correctedOutput.text;
                activeProvider = correctedOutput.provider;
                schemaResult   = outputSchemaValidator.validate(rawLLMOutput);
                retryCount++;
            } catch (error) {
                recordError('SCHEMA_RETRY_FAILED');
            }
        }

        if (!schemaResult.is_valid) {
            recordError('SCHEMA_VALIDATION_FAILED');
            return this._buildDirectResponse({
                question:       ctx.sanitizedQuestion,
                mode:           ctx.mode,
                persona:        ctx.persona,
                historyBlock:   ctx.historyBlock,
                learnerContext: ctx.learnerContext,
                pipeline:       'schema_failed',
                confidenceScore: 0.55,
                topicResult:    ctx.topicResult,
                subject:        ctx.professorSubject,
                startTime:      ctx.startTime,
                flags:          ['SCHEMA_VALIDATION_FAILED'],
                explicitAnswer: this._looksStructured(rawLLMOutput) ? null : rawLLMOutput,
                provider:       activeProvider,
            });
        }

        // ── Citation verification + retry ────────────────────────────────────
        const parsedResponse  = schemaResult.parsed;
        let finalParsedResponse = parsedResponse;
        let finalCitationResult = citationVerifier.verifyStructuredClaims(
            parsedResponse,
            retrieval.chunk_payloads,
            ctx.calibratedTopicConfidence
        );

        if (finalCitationResult.needs_retry) {
            try {
                const citationRetryPrompt  = citationVerifier.buildRetryPrompt(promptResult.prompt, retrieval.chunk_payloads);
                const citationRetryOutput  = await this.llmClient.callStructured(citationRetryPrompt, {
                    ...promptResult.metadata,
                    responseMimeType: 'application/json',
                });
                activeProvider = citationRetryOutput.provider;
                const retrySchemaResult = outputSchemaValidator.validate(citationRetryOutput.text);
                if (retrySchemaResult.is_valid) {
                    finalParsedResponse = retrySchemaResult.parsed;
                    finalCitationResult = citationVerifier.verifyStructuredClaims(
                        finalParsedResponse,
                        retrieval.chunk_payloads,
                        ctx.calibratedTopicConfidence
                    );
                    citationRetryCount = 1;
                }
            } catch (error) {
                recordError('CITATION_RETRY_FAILED');
                console.warn('[PIPELINE] Citation retry failed:', error.message);
            }
        }

        // ── Claim-level lexical similarity validation ────────────────────────
        const chunkTextIndex      = claimValidator.buildChunkTextIndex(retrieval.chunks, retrieval.chunk_payloads);
        const claimValidationResult = claimValidator.validateClaims(finalCitationResult.claims, chunkTextIndex);

        // ── Confidence scoring ───────────────────────────────────────────────
        const confidenceReport = confidenceEngine.compute({
            topicResult:        ctx.topicResult,
            retrievalTelemetry: retrieval.telemetry,
            citationResult:     finalCitationResult,
            schemaFailed:       false,
        });

        if (claimValidationResult.similarity_penalty > 0) {
            confidenceReport.final_confidence = parseFloat(
                Math.max(0, confidenceReport.final_confidence - claimValidationResult.similarity_penalty).toFixed(4)
            );
            confidenceReport.flags = [...new Set([...(confidenceReport.flags || []), 'LOW_CLAIM_SIMILARITY'])];
            if (confidenceReport.final_confidence >= 0.85) {
                confidenceReport.tier = 'HIGH';  confidenceReport.tier_label = '🟢 High Confidence';
            } else if (confidenceReport.final_confidence >= 0.65) {
                confidenceReport.tier = 'MEDIUM'; confidenceReport.tier_label = '🟡 Moderate Confidence';
            } else {
                confidenceReport.tier = 'LOW';   confidenceReport.tier_label = '🔴 Needs Review';
            }
        }

        if (activeProvider !== 'gemini' && confidenceReport.final_confidence > 0.82) {
            confidenceReport.final_confidence = 0.82;
            confidenceReport.tier             = 'MEDIUM';
            confidenceReport.tier_label       = 'Needs fallback review';
            confidenceReport.flags = [...new Set([...(confidenceReport.flags || []), 'FALLBACK_LLM_USED'])];
        }

        const sourcedClaimsCount = finalCitationResult.claims.filter((c) => c.is_sourced).length;
        if (sourcedClaimsCount < 2 && confidenceReport.final_confidence > 0.7) {
            confidenceReport.final_confidence = 0.62;
            confidenceReport.tier             = 'MEDIUM';
            confidenceReport.tier_label       = 'Needs more sources';
            confidenceReport.flags = [...new Set([...(confidenceReport.flags || []), 'INSUFFICIENT_SOURCED_CLAIMS'])];
        }

        recordConfidenceTier(confidenceReport.tier);
        recordCitationCompliance(finalCitationResult.compliance_rate === 1);

        // ── Response assembly ────────────────────────────────────────────────
        const answer    = this._assembleAnswer(finalParsedResponse, finalCitationResult);
        const keyBullets = (finalParsedResponse.claims || []).map((c) => c.statement);

        const allClaimsSourced = finalCitationResult.claims.length > 0
            && sourcedClaimsCount === finalCitationResult.claims.length;

        // Only mark clarification when confidence is genuinely low AND sourcing is absent.
        // A good answer with 0 cited chunks should still be returned — just at lower confidence.
        const isClarificationRequired =
            (confidenceReport.tier === 'LOW' && confidenceReport.final_confidence < 0.5) ||
            (sourcedClaimsCount < 1 && confidenceReport.final_confidence < 0.55);

        const finalResponse = applyTrustMetadata({
            answer,
            short_note:           answer,
            partial_answer:       isClarificationRequired ? answer : null,
            claim_validation:     claimValidationResult.claim_validation,
            claims:               finalCitationResult.claims,
            allClaimsSourced,
            citations:            finalCitationResult.claims
                .filter((c) => c.is_sourced)
                .map((c) => c.citations)
                .flat(),
            high_yield_summary:   keyBullets.slice(0, 5),
            key_bullets:          keyBullets,
            clinical_correlation: finalParsedResponse.clinical_correlation || finalParsedResponse.exam_tips || '',
            exam_tips:            finalParsedResponse.exam_tips || '',
            confidence:           confidenceReport,
            is_clarification_required: isClarificationRequired,
            meta: {
                pipeline:       'full_rag',
                answer_mode:    'grounded',
                thread_mode:    ctx.threadMode,
                follow_up_intent: ctx.followUpIntent,
                topic_id:       ctx.topicResult.topic_id,
                subject:        ctx.professorSubject,
                topic_confidence: ctx.topicResult.confidence,
                prompt_id:      promptResult.prompt_id,
                prompt_version: promptResult.version,
                retrieval: {
                    latency_ms:  retrieval.telemetry.latency_ms,
                    similarity:  retrieval.telemetry.similarity_scores?.[0] || 0,
                    strategy:    retrieval.telemetry.retrieval_strategy,
                    broadened:   retrieval.telemetry.broadened,
                    expansion:   retrieval.telemetry.query_expansion || null,
                },
                high_yield:           retrieval.telemetry.high_yield_scores?.[0] || 0,
                citation_count:       finalCitationResult.citation_count,
                citation_retry_count: citationRetryCount,
                schema_retries:       retryCount,
                sourced_claims_count: sourcedClaimsCount,
                latency_ms:           Date.now() - ctx.startTime,
            },
        }, {
            pipeline:      'full_rag',
            confidence:    confidenceReport,
            citationResult: finalCitationResult,
            provider:      activeProvider,
            flags:         activeProvider !== 'gemini' ? ['FALLBACK_LLM_USED'] : [],
        });

        if (confidenceReport.tier === 'HIGH' && !ctx.imageBase64 && (!ctx.history || ctx.history.length === 0)) {
            queryCache.set(ctx.normalizedQuestion, ctx.mode, ctx.hintSubject, finalResponse, ctx.cacheContext);
        }

        return finalResponse;
    }

    // ─── Shared private helpers ────────────────────────────────────────────────

    async _scoreTopic(question) {
        if (typeof topicScorer.scoreQueryAdvanced === 'function') {
            return topicScorer.scoreQueryAdvanced(question);
        }
        return topicScorer.scoreQuery(question);
    }

    _calibrateTopicConfidence(topicResult) {
        if (!topicResult) return 0;
        if (topicResult.method === 'semantic_fallback_v1') return Math.min(topicResult.confidence, 0.62);
        return topicResult.confidence || 0;
    }

    _buildCacheContext(userContext = {}) {
        const learnerContext = userContext.learnerContext || {};
        return {
            syllabus:          userContext.syllabus || 'Indian MBBS',
            mbbs_year:         learnerContext.mbbs_year || null,
            country:           learnerContext.country || null,
            weak_topics:       learnerContext.weak_topics || [],
            subjects_selected: learnerContext.subjects_selected || [],
        };
    }

    /**
     * Derives a confidence score for vision responses from response quality signals.
     * Vision responses can never be citation-verified, so the ceiling is capped at
     * VISION_CONFIDENCE_MAX (env, default 0.75). Score is penalised for very short
     * or empty responses that suggest the model couldn't interpret the image.
     */
    _computeVisionConfidence(responseText) {
        const base = Math.min(
            0.75,
            Math.max(0.30, Number(process.env.VISION_CONFIDENCE_MAX) || 0.75)
        );
        const len = (responseText || '').trim().length;
        if (len === 0)    return 0.30;
        if (len < 120)    return Math.min(base, 0.45);
        if (len < 350)    return Math.min(base, 0.58);
        if (len < 800)    return Math.min(base, 0.67);
        return base;
    }

    _buildConfidenceReport(score, flags = []) {
        const finalScore = Number((score ?? 0).toFixed(4));
        let tier      = 'LOW';
        let tierLabel = 'Needs review';

        if (finalScore >= 0.85)      { tier = 'HIGH';   tierLabel = 'High confidence'; }
        else if (finalScore >= 0.65) { tier = 'MEDIUM'; tierLabel = 'Moderate confidence'; }

        return {
            final_confidence: finalScore,
            tier,
            tier_label: tierLabel,
            flags: [...new Set(flags.filter(Boolean))],
        };
    }

    async _buildDirectResponse({
        question, mode, persona, historyBlock, learnerContext,
        pipeline, confidenceScore, topicResult, subject, startTime,
        flags = [], explicitAnswer = null, provider = null, threadMode = 'new_topic', followUpIntent = 'none',
    }) {
        let answerText    = explicitAnswer;
        let activeProvider = provider || 'gemini';

        if (!answerText) {
            const directAnswer = await this.llmClient.callText(
                buildDirectPrompt(persona, mode, historyBlock, question, learnerContext),
                { temperature: mode === 'exam' ? 0.15 : 0.35, max_tokens: 2500 }
            );
            answerText    = directAnswer.text;
            activeProvider = directAnswer.provider;
        }

        const confidence = this._buildConfidenceReport(confidenceScore, flags);
        recordConfidenceTier(confidence.tier);
        recordCitationCompliance(false);

        return applyTrustMetadata({
            answer:               answerText,
            short_note:           answerText,
            high_yield_summary:   this._extractKeyBullets(answerText),
            key_bullets:          this._extractKeyBullets(answerText),
            citations:            [],
            clinical_correlation: '',
            exam_tips:            '',
            confidence,
            is_clarification_required: false,
            meta: {
                pipeline,
                answer_mode:   'degraded',
                thread_mode:   threadMode,
                follow_up_intent: followUpIntent,
                topic_id:   topicResult?.topic_id || null,
                subject:    subject || topicResult?.subject || null,
                latency_ms: Date.now() - startTime,
            },
        }, {
            pipeline,
            provider: activeProvider,
            flags,
        });
    }

    _buildClarificationResponse({
        answer, pipeline, topicResult, subject,
        confidenceScore = 0.35, flags = [], startTime, threadMode = 'new_topic', followUpIntent = 'none',
    }) {
        const confidence = this._buildConfidenceReport(confidenceScore, flags);
        recordConfidenceTier(confidence.tier);

        return applyTrustMetadata({
            answer,
            short_note:           answer,
            partial_answer:       null, // no partial medical content — answer IS the clarification prompt
            high_yield_summary:   [],
            key_bullets:          [],
            citations:            [],
            clinical_correlation: '',
            exam_tips:            '',
            confidence,
            is_clarification_required: true,
            meta: {
                pipeline,
                answer_mode:   'clarification',
                thread_mode:   threadMode,
                follow_up_intent: followUpIntent,
                topic_id:   topicResult?.topic_id || null,
                subject:    subject || topicResult?.subject || null,
                latency_ms: Date.now() - startTime,
            },
        }, {
            pipeline,
            flags,
        });
    }

    _extractKeyBullets(text) {
        const lines = (text || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        const bulletLines = lines
            .filter((line) => /^[-*•]\s+/.test(line))
            .map((line) => line.replace(/^[-*•]\s+/, '').trim());

        if (bulletLines.length > 0) return bulletLines.slice(0, 5);

        return lines
            .join(' ')
            .split(/[.!?]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 4);
    }

    _looksStructured(text) {
        const trimmed = (text || '').trim();
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
        try {
            JSON.parse(trimmed);
            return true;
        } catch {
            return false;
        }
    }

    _assembleAnswer(parsedJson, citationResult) {
        const claims = citationResult.claims || [];
        if (claims.length === 0) {
            return parsedJson.clinical_correlation || parsedJson.exam_tips || 'No structured claims were generated.';
        }

        let answer = parsedJson.greeting ? `${parsedJson.greeting}\n\n` : '';
        answer += claims.map((claim) => {
            let line = `- ${claim.statement}`;
            if (claim.is_sourced && claim.citations.length > 0) {
                const refs = claim.citations.map((c) =>
                    `${c.book || 'Source'} p.${c.page_start || '?'}-${c.page_end || '?'}`
                ).join('; ');
                line += ` [${refs}]`;
            }
            return line;
        }).join('\n');

        if (parsedJson.clinical_correlation) {
            answer += `\n\nClinical Correlation: ${parsedJson.clinical_correlation}`;
        }
        if (parsedJson.exam_tips) {
            answer += `\n\nExam Tips: ${parsedJson.exam_tips}`;
        }

        return answer;
    }
}

module.exports = new CortexOrchestrator();
