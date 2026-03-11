const { GoogleGenerativeAI } = require('@google/generative-ai');

// Pipeline services
const topicScorer = require('./topicConfidenceScorer');
const ragService = require('./ragService');
const promptBuilder = require('./promptBuilder');
const outputSchemaValidator = require('./outputSchemaValidator');
const citationVerifier = require('./citationVerifier');
const confidenceEngine = require('./confidenceEngine');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE METHOD: Full 11-Stage RAG Pipeline
  // Stages: 1.Normalize → 2.Classify → 3.Score → 4.Retrieve → 5.PromptBuild
  //         → 6.LLM Call → 7.Parse → 8.Validate → 9.Hydrate → 10.VerifyCite
  //         → 11.Confidence
  // ─────────────────────────────────────────────────────────────────────────────
  async generateMedicalResponse(rawQuestion, userContext = {}) {
    const startTime = Date.now();
    const mode = userContext.mode || 'conceptual';
    const history = userContext.history || [];
    const imageBase64 = userContext.imageBase64 || null;

    try {
      // ── Stage 1-2: Question Normalization & Classification ─────────────
      const normalizedQuestion = rawQuestion.trim();

      // ── Stage 3: Topic Confidence Scoring ──────────────────────────────
      const topicResult = topicScorer.scoreQuery(normalizedQuestion);
      const syllabusContext = topicScorer.getSyllabusContext();

      console.log(`[PIPELINE] Stage 3: topic=${topicResult.topic_id} conf=${topicResult.confidence} method=${topicResult.method}`);

      // Build conversation history block for context injection
      const historyBlock = history.length > 0
        ? `\n\n<CONVERSATION_HISTORY>\n${history.map(h => `[${h.role.toUpperCase()}]: ${h.content}`).join('\n')}\n</CONVERSATION_HISTORY>\n\nUsing the above conversation as context, `
        : '';

      // Image handling — if base64 image provided, use vision path
      if (imageBase64) {
        console.log('[PIPELINE] Image query — using Gemini Vision');
        const visionAnswer = await this.callVisionLLM(imageBase64, normalizedQuestion, history, mode);
        return {
          answer: visionAnswer,
          confidence: { final_confidence: 0.8, tier: 'HIGH', tier_label: '🟢 Vision' },
          is_clarification_required: false,
          meta: { pipeline: 'vision', topic_id: 'image', latency_ms: Date.now() - startTime }
        };
      }

      // If no topic match at all, return a mode-aware professor-quality answer
      if (!topicResult.matched || topicResult.confidence < 0.60) {
        console.log('[PIPELINE] Low topic confidence — falling back to professor-mode Gemini response');

        const professorPrompt = mode === 'exam'
          ? `You are a strict, expert medical professor teaching MBBS students in India for competitive exams (NEET PG, USMLE). Do not use conversational greetings like 'Good morning'. ${historyBlock}\n\nAnswer this question with high-yield exam-focused bullet points, mnemonics where helpful, and clinical pearls. Be structured and intensely concise:\n\n${normalizedQuestion}`
          : `You are a strict, senior medical professor with 30 years of clinical experience. Do not use conversational greetings like 'Hello' or 'Good morning class'. ${historyBlock}\n\nAnswer this question with a detailed conceptual explanation including pathophysiology, mechanisms, clinical correlation, and real-world application. Use clear headings and bullet points for structure:\n\n${normalizedQuestion}`;

        const directAnswer = await this.callLLM(professorPrompt, { temperature: 0.3, max_tokens: 2000 });
        return {
          answer: directAnswer,
          confidence: {
            final_confidence: topicResult.confidence,
            tier: 'MEDIUM',
            tier_label: '🟡 Direct Answer'
          },
          is_clarification_required: false,
          meta: {
            pipeline: 'direct_gemini',
            topic_id: topicResult.topic_id,
            latency_ms: Date.now() - startTime
          }
        };
      }

      // ── Stage 3.5: Query Rewriting for Context-Aware Retrieval ─────────
      let searchPhrase = normalizedQuestion;
      if (history.length > 0) {
        try {
          const rewritePrompt = `Given the following conversation history and the latest user question, rewrite the latest question into a single, standalone descriptive search phrase that captures the core medical topic being discussed. Do not answer the question. Only output the rewritten search phrase.\n\nHistory:\n${history.map(h => `[${h.role.toUpperCase()}]: ${h.content}`).join('\n')}\n\nLatest Question: ${normalizedQuestion}\n\nRewritten Search Phrase:`;
          searchPhrase = await this.callLLM(rewritePrompt, { temperature: 0.1, max_tokens: 50 });
          searchPhrase = searchPhrase.trim().replace(/^"|"$/g, '');
          console.log(`[PIPELINE] Query Rewritten for RAG: "${normalizedQuestion}" -> "${searchPhrase}"`);
        } catch (e) {
          console.warn('[PIPELINE] Query rewrite failed, falling back to raw question:', e.message);
        }
      }

      // ── Stage 4: RAG Retrieval (vector search + hybrid reranking) ──────
      let retrieval;
      try {
        retrieval = await ragService.retrieveContext(
          topicResult.topic_id,
          { subject: topicResult.subject, country: syllabusContext.country },
          searchPhrase,
          topicResult.confidence,
          mode
        );
        console.log(`[PIPELINE] Stage 4: chunks=${retrieval.chunks.length} valid=${retrieval.is_valid}`);
      } catch (ragError) {
        console.warn('[PIPELINE] Stage 4 RAG failed — continuing with direct LLM:', ragError.message);
        retrieval = { chunks: [], chunk_payloads: [], metadata: {}, telemetry: { final_scores: [], broadened: false, validation_passed: false }, is_valid: false };
      }

      // ── Stage 5: Prompt Construction ───────────────────────────────────
      const promptResult = promptBuilder.build({
        mode,
        syllabusContext,
        retrieval,
        question: normalizedQuestion,
        historyBlock  // pass the history context block
      });

      console.log(`[PIPELINE] Stage 5: prompt_id=${promptResult.prompt_id} version=${promptResult.version}`);

      // ── Stage 6: LLM Call (Gemini 2.5 Flash) ──────────────────────────
      let rawLLMOutput;
      try {
        rawLLMOutput = await this.callLLM(promptResult.prompt, {
          ...promptResult.metadata,
          responseMimeType: 'application/json' // Enforce structured JSON from Gemini
        });
      } catch (llmError) {
        console.error('[PIPELINE] Stage 6 LLM call failed:', llmError.message);
        // Fallback: simple answer
        const fallback = await this.callLLM(`Answer this medical question: ${normalizedQuestion}`);
        return { answer: fallback, confidence: { final_confidence: 0.3, tier: 'LOW', tier_label: '🔴 Needs Review' }, meta: { pipeline: 'fallback', error: llmError.message } };
      }

      // ── Stage 7-8: Parse & Validate Schema ─────────────────────────────
      let schemaResult = outputSchemaValidator.validate(rawLLMOutput);
      let retryCount = 0;

      // Auto-retry if schema validation fails (up to 1 retry)
      if (!schemaResult.is_valid && retryCount < 1) {
        console.warn(`[PIPELINE] Stage 8 FAILED (${schemaResult.error}) — retrying with corrective prompt...`);
        const correctedOutput = await this.callLLM(
          `Your previous response was not valid JSON. ${schemaResult.error}\n\nPlease re-answer the following question as strictly valid JSON matching this schema:\n${promptResult.prompt}`,
          { ...promptResult.metadata, responseMimeType: 'application/json' }
        );
        schemaResult = outputSchemaValidator.validate(correctedOutput);
        retryCount++;
      }

      console.log(`[PIPELINE] Stage 8: valid=${schemaResult.is_valid} retries=${retryCount}`);

      // If schema still fails, return best-effort text answer
      if (!schemaResult.is_valid) {
        console.warn(`[PIPELINE] Stage 8 FINAL FAIL: ${schemaResult.error}`);
        return {
          answer: rawLLMOutput,
          confidence: { final_confidence: 0.55, tier: 'LOW', tier_label: '🔴 Needs Review' },
          meta: { pipeline: 'schema_failed', schema_error: schemaResult.error, latency_ms: Date.now() - startTime }
        };
      }

      // ── Stage 9: Hydrate parsed response ───────────────────────────────
      const parsedResponse = schemaResult.parsed;

      // ── Stage 10: Citation Verification ────────────────────────────────
      const citationResult = citationVerifier.verifyStructuredClaims(
        parsedResponse,
        retrieval.chunk_payloads,
        topicResult.confidence
      );

      console.log(`[PIPELINE] Stage 10: citations=${citationResult.citation_count} hallucinated=${citationResult.hallucinated.length} uncited=${citationResult.uncited_claims}`);

      // ── Stage 11: Composite Confidence ─────────────────────────────────
      const confidenceReport = confidenceEngine.compute({
        topicResult,
        retrievalTelemetry: retrieval.telemetry,
        citationResult,
        schemaFailed: false
      });

      console.log(`[PIPELINE] Stage 11: final=${confidenceReport.final_confidence} tier=${confidenceReport.tier} latency=${Date.now() - startTime}ms`);

      // ── Stage 11b: Assemble final response ─────────────────────────────
      const answer = this._assembleAnswer(parsedResponse, citationResult);
      const keyBullets = (parsedResponse.claims || []).map(c => c.statement);

      return {
        answer: answer,
        short_note: answer,
        claims: citationResult.claims,
        citations: citationResult.claims.filter(c => c.is_sourced).map(c => c.citations).flat(),
        high_yield_summary: keyBullets.slice(0, 5),
        key_bullets: keyBullets,
        clinical_correlation: parsedResponse.clinical_correlation || parsedResponse.exam_tips || '',
        exam_tips: parsedResponse.exam_tips || '',
        confidence: confidenceReport,
        is_clarification_required: confidenceReport.tier === 'LOW' && confidenceReport.final_confidence < 0.50,
        meta: {
          pipeline: 'full_rag',
          topic_id: topicResult.topic_id,
          topic_confidence: topicResult.confidence,
          prompt_id: promptResult.prompt_id,
          prompt_version: promptResult.version,
          retrieval: {
            latency_ms: retrieval.telemetry.latency_ms,
            similarity: retrieval.telemetry.similarity_scores?.[0] || 0,
            strategy: retrieval.telemetry.retrieval_strategy,
            broadened: retrieval.telemetry.broadened
          },
          high_yield: retrieval.telemetry.high_yield_scores?.[0] || 0,
          citation_count: citationResult.citation_count,
          schema_retries: retryCount,
          latency_ms: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('[PIPELINE] Fatal error:', error);
      // Last-resort fallback
      try {
        const emergencyAnswer = await this.callLLM(`Answer this medical question briefly: ${rawQuestion}`);
        return { answer: emergencyAnswer, confidence: { final_confidence: 0.2, tier: 'LOW', tier_label: '🔴 Needs Review' }, meta: { pipeline: 'emergency_fallback', error: error.message } };
      } catch (e2) {
        return { answer: 'I apologize, but I am unable to process your question at this time. Please try again.', error: true, confidence: { final_confidence: 0, tier: 'LOW', tier_label: '🔴 Needs Review' } };
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Core LLM Call — supports both text and structured JSON responses
  // ─────────────────────────────────────────────────────────────────────────────
  async callLLM(prompt, metadata = {}) {
    try {
      if (!this.apiKey) throw new Error("Missing Gemini API Key — set GEMINI_API_KEY in .env");

      const modelConfig = {
        model: metadata.model || this.modelName
      };

      const model = this.genAI.getGenerativeModel(modelConfig);

      const generationConfig = {
        temperature: metadata.temperature || 0.2,
        maxOutputTokens: metadata.max_tokens || 2000,
      };

      // If structured JSON output is requested, add responseMimeType
      if (metadata.responseMimeType) {
        generationConfig.responseMimeType = metadata.responseMimeType;
      }

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      });

      const response = await result.response;
      return response.text();
    } catch (e) {
      console.error("Gemini call failed:", e.message);
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Vision LLM Call — for image + text queries (Gemini multimodal)
  // ─────────────────────────────────────────────────────────────────────────────
  async callVisionLLM(imageBase64, question, history = [], mode = 'conceptual') {
    try {
      if (!this.apiKey) throw new Error("Missing Gemini API Key — set GEMINI_API_KEY in .env");

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const modeContext = mode === 'exam'
        ? 'Focus on exam-relevant, high-yield clinical findings and differential diagnoses.'
        : 'Provide a thorough conceptual explanation with clinical correlation and pathophysiology.';

      const historyText = history.length > 0
        ? `\n\nConversation so far:\n${history.map(h => `[${h.role.toUpperCase()}]: ${h.content}`).join('\n')}\n\n`
        : '';

      const prompt = `You are an expert medical professor analyzing a medical image or document. ${historyText}${modeContext}\n\nQuestion about this image: ${question || 'Describe and analyze this medical image in detail.'}`;

      let mimeType = 'image/jpeg';
      if (imageBase64.startsWith('data:image/png')) mimeType = 'image/png';
      else if (imageBase64.startsWith('data:image/webp')) mimeType = 'image/webp';
      else if (imageBase64.startsWith('data:application/pdf')) mimeType = 'application/pdf';

      const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
      });

      const response = await result.response;
      return response.text();
    } catch (e) {
      console.error("Vision LLM call failed:", e.message);
      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Assemble a human-readable answer from structured claims
  // ─────────────────────────────────────────────────────────────────────────────
  _assembleAnswer(parsedJson, citationResult) {
    const claims = citationResult.claims || [];
    if (claims.length === 0) {
      return parsedJson.clinical_correlation || parsedJson.exam_tips || 'No structured claims were generated.';
    }

    let answer = parsedJson.greeting ? `${parsedJson.greeting}\n\n` : '';

    answer += claims.map(c => {
      let line = `• ${c.statement}`;
      if (c.is_sourced && c.citations.length > 0) {
        const refs = c.citations.map(cit =>
          `${cit.book || 'Source'} p.${cit.page_start || '?'}–${cit.page_end || '?'}`
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

module.exports = new GeminiService();