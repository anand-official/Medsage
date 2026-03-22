const { GoogleGenerativeAI } = require('@google/generative-ai');

// Pipeline services
const topicScorer = require('./topicConfidenceScorer');
const ragService = require('./ragService');
const promptBuilder = require('./promptBuilder');
const outputSchemaValidator = require('./outputSchemaValidator');
const citationVerifier = require('./citationVerifier');
const confidenceEngine = require('./confidenceEngine');
const queryCache = require('./queryCache');
const fallbackLLM = require('./fallbackLLMService');

// ─── Professor Personas by Subject ───────────────────────────────────────────
// Natural teaching voices — each persona shapes how content is structured and
// delivered, NOT a robotic "You are a professor" preamble.
const PROFESSOR_PERSONAS = {
  Anatomy: {
    voice: 'Think like a clinician who sees the body in 3D. Teach spatially — always anchor concepts to landmarks, borders, relations, and surface markings. When a nerve or vessel comes up, trace its course. Connect every structure to its clinical relevance (surgical approach, injury, referred pain). Use numbered lists for contents/boundaries.',
    flavor: 'Anatomy',
  },
  Physiology: {
    voice: 'Teach mechanisms as stories — every physiological process has a trigger, a cascade, and an outcome. Use cause-and-effect chains. Describe feedback loops in plain language. When explaining a normal mechanism, immediately show what happens when it breaks (the disease). Use analogies freely — pumps, circuits, thermostats.',
    flavor: 'Physiology',
  },
  Biochemistry: {
    voice: 'Walk through pathways step by step — enzyme by enzyme. Use mnemonics generously. For every pathway, connect it to a clinical condition (inborn error of metabolism, nutritional deficiency, drug target). Make the molecular logic intuitive — why does this reaction happen here?',
    flavor: 'Biochemistry',
  },
  Pharmacology: {
    voice: 'Always lead with mechanism of action — how the drug works at the receptor/enzyme level. Then clinical uses, then adverse effects, then important interactions. Compare and contrast related drugs in the same class. Flag classic exam traps (e.g., drugs that look similar but have opposite effects). Use mnemonics for drug lists.',
    flavor: 'Pharmacology',
  },
  Microbiology: {
    voice: 'Characterize every organism systematically: Gram stain → morphology → virulence factors → diseases caused → diagnosis → treatment. Build pattern recognition — group organisms by clinical scenario (immunocompromised host, neonatal infections, UTI pathogens). Make the bugs memorable.',
    flavor: 'Microbiology',
  },
  Pathology: {
    voice: 'Start with the mechanism — what went wrong at the cellular/tissue level. Describe the gross and microscopic picture vividly (what would you see on a slide?). Then connect to clinical presentation and lab findings. Highlight classic buzzwords that appear in exam questions (e.g., "wire-looping", "onion-skinning").',
    flavor: 'Pathology',
  },
  Surgery: {
    voice: 'Think like a surgeon — present the clinical scenario first (how does the patient walk in?), then the workup, then the decision to operate. For procedures, mention the incision, key anatomical dangers, and post-op complications. Be decisive and practical. Use classic surgical aphorisms where fitting.',
    flavor: 'Surgery',
  },
  Medicine: {
    voice: 'Approach like a ward round — start with the clinical presentation, then differential diagnosis, then targeted investigations, then management plan. Reference diagnostic criteria and guidelines by name. Highlight red flags that change management. Think in terms of real patients.',
    flavor: 'Internal Medicine',
  },
  Psychiatry: {
    voice: 'Use the biopsychosocial framework. State diagnostic criteria clearly (DSM/ICD). For treatments, cover both pharmacological and psychotherapy options. Be empathetic in tone. Distinguish between similar-sounding disorders with clear differentiating features.',
    flavor: 'Psychiatry',
  },
  'Community Medicine': {
    voice: 'Think at the population level — incidence, prevalence, risk factors, levels of prevention. Reference Indian national health programs and vaccine schedules by name. Explain biostatistics concepts (RR, OR, NNT, sensitivity/specificity) with simple numerical examples.',
    flavor: 'Community Medicine',
  },
  Radiology: {
    voice: 'Teach systematic image reading — describe findings by location, density/signal, margins, and pattern. Name classic radiological signs. Always give the differential diagnosis. Mention which modality is best for which clinical scenario.',
    flavor: 'Radiology',
  },
  'Forensic Medicine': {
    voice: 'Be precise and medico-legally rigorous. Cover postmortem changes with timelines. Describe injury patterns and their legal significance. Explain documentation requirements. Connect clinical findings to what would hold up in court.',
    flavor: 'Forensic Medicine',
  },
};

const DEFAULT_PROFESSOR = {
  voice: 'Explain clearly with clinical relevance. Use structured headings and bullet points. Connect basic science to bedside medicine. Provide both conceptual depth and exam-relevant highlights.',
  flavor: 'Medical Science',
};

function getProfessorPersona(subject) {
  return PROFESSOR_PERSONAS[subject] || DEFAULT_PROFESSOR;
}

// ─── Mode-specific system prompts ────────────────────────────────────────────
// These define the fundamental character of each mode's output.
const MODE_SYSTEM = {
  exam: `You are an elite medical exam coach. Your responses are built for NEET PG / USMLE / FMGE preparation.

RULES:
- Start with the **most testable fact first** — no preamble, no greetings.
- Use bullet points (•) with bold key terms.
- Include **mnemonics** when they exist for the topic.
- Add a "**High-Yield Pearls**" section at the end with 2-3 classic exam facts.
- Keep it tight — every sentence must be worth memorizing.
- If there's a classic "most common" / "most specific" / "investigation of choice" — state it prominently.
- Use markdown formatting: **bold** for key terms, ## for section headers.`,

  conceptual: `You are a brilliant medical teacher who makes complex topics genuinely understandable.

RULES:
- Explain the **why** before the **what** — build understanding from first principles.
- Use a logical flow: mechanism → clinical manifestation → diagnosis → management.
- Use analogies and real-world comparisons to make abstract concepts click.
- Include a "**Clinical Correlation**" section showing how this knowledge applies at the bedside.
- Use markdown formatting: **bold** for key terms, ## for section headers, bullet points for lists.
- Be thorough but never boring — teach like the best professor students have ever had.`,
};

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
    const hintSubject = userContext.subject || null; // Optional subject hint from frontend
    const syllabus = userContext.syllabus || 'Indian MBBS';

    // ── Non-medical guardrail ──────────────────────────────────────────────
    // Sentinel check: if question has no medical signal, refuse politely
    const MEDICAL_SENTINEL_TERMS = [
      'disease', 'syndrome', 'drug', 'anatomy', 'physiology', 'pathology',
      'diagnosis', 'treatment', 'symptom', 'clinical', 'patient', 'dose',
      'infection', 'tumor', 'cancer', 'blood', 'nerve', 'organ', 'surgery',
      'therapy', 'bacteria', 'virus', 'immune', 'cell', 'gene', 'pharmacology',
      'biochemistry', 'microbiology', 'histology', 'radiology', 'medicine',
      'mbbs', 'usmle', 'neet', 'fmge', 'medical', 'health', 'cardiac',
      'renal', 'hepatic', 'pulmonary', 'neurological', 'pediatric', 'obstetric',
    ];
    const lowerQ = (rawQuestion || '').toLowerCase();
    const hasMedicalSignal = MEDICAL_SENTINEL_TERMS.some(term => lowerQ.includes(term));
    if (!hasMedicalSignal && lowerQ.length > 20) {
      // Check topic scorer too — if it gets any match, allow through
      const quickScore = topicScorer.scoreQuery(rawQuestion);
      if (!quickScore.matched && quickScore.confidence < 0.3) {
        return {
          answer: 'Cortex is focused on medical education. Please ask a medical or health-related question.',
          confidence: { final_confidence: 0, tier: 'LOW', tier_label: '🔴 Off-topic' },
          is_clarification_required: true,
          meta: { pipeline: 'off_topic_refusal', latency_ms: 0 }
        };
      }
    }

    // ── Cache Check (skip for image queries and conversations with history) ──
    if (!userContext.imageBase64 && (!userContext.history || userContext.history.length === 0)) {
      const cached = queryCache.get(rawQuestion, mode, hintSubject);
      if (cached) {
        console.log(`[CORTEX] Cache hit for question (cache size: ${queryCache.size()})`);
        return { ...cached, meta: { ...(cached.meta || {}), cache_hit: true } };
      }
    }

    try {
      // ── Stage 1-2: Question Normalization & Classification ─────────────
      const normalizedQuestion = rawQuestion.trim();

      // ── Stage 3: Topic Confidence Scoring ──────────────────────────────
      const topicResult = topicScorer.scoreQuery(normalizedQuestion);
      const syllabusContext = topicScorer.getSyllabusContext(syllabus);
      const calibratedTopicConfidence = topicResult.method === 'semantic_fallback_v1'
        ? Math.min(topicResult.confidence, 0.62)
        : topicResult.confidence;

      // Resolve professor subject: use hint from frontend → topic result (only when matched) → default
      const professorSubject = hintSubject || (topicResult.matched ? topicResult.subject : null);
      const persona = getProfessorPersona(professorSubject);

      console.log(`[PIPELINE] Stage 3: topic=${topicResult.topic_id} conf=${topicResult.confidence} calibrated=${calibratedTopicConfidence} subject=${professorSubject} method=${topicResult.method}`);

      // Build conversation history block for context injection
      // Sanitize: strip XML tags and cap content length to prevent prompt injection
      const sanitizeHistoryContent = (text) =>
        (text || '').replace(/<\/?[^>]+>/g, '').replace(/[<>]/g, '').substring(0, 500);

      // Truncate server-side: last 10 turns, total ~600 token budget (≈2400 chars)
      const truncatedHistory = (() => {
        const turns = (history || []).slice(-10);
        let budget = 2400;
        const kept = [];
        for (let i = turns.length - 1; i >= 0; i--) {
          const content = sanitizeHistoryContent(turns[i].content);
          if (budget - content.length < 0) break;
          budget -= content.length;
          kept.unshift({ role: turns[i].role, content });
        }
        return kept;
      })();

      const historyBlock = truncatedHistory.length > 0
        ? `\n\n<CONVERSATION_HISTORY>\n${truncatedHistory.map(h => `[${h.role.toUpperCase()}]: ${h.content}`).join('\n')}\n</CONVERSATION_HISTORY>\n\nUsing the above conversation as context, `
        : '';

      // Image handling — if base64 image provided, use vision path
      if (imageBase64) {
        console.log('[PIPELINE] Image query — using Gemini Vision');
        const visionAnswer = await this.callVisionLLM(imageBase64, normalizedQuestion, truncatedHistory, mode);
        // Vision responses cannot be RAG/citation-verified — always MEDIUM confidence
        return {
          answer: visionAnswer,
          confidence: { final_confidence: 0.65, tier: 'MEDIUM', tier_label: '🟡 Vision (unverified)' },
          is_clarification_required: false,
          meta: { pipeline: 'vision', topic_id: 'image', subject: professorSubject, latency_ms: Date.now() - startTime }
        };
      }

      // If no topic match at all, return a mode-aware professor-quality answer
      if (!topicResult.matched || calibratedTopicConfidence < 0.60) {
        console.log('[PIPELINE] Low topic confidence — falling back to professor-mode Gemini response');
        const directAnswer = await this.callLLM(
          this._buildDirectPrompt(persona, mode, historyBlock, normalizedQuestion),
          { temperature: mode === 'exam' ? 0.15 : 0.35, max_tokens: 2500 }
        );
        return {
          answer: directAnswer,
          confidence: { final_confidence: calibratedTopicConfidence, tier: 'MEDIUM', tier_label: '🟡 Direct Answer' },
          is_clarification_required: false,
          meta: { pipeline: 'direct_gemini', topic_id: topicResult.topic_id, subject: professorSubject, latency_ms: Date.now() - startTime }
        };
      }

      // ── Stage 3.5: Query Rewriting for Context-Aware Retrieval ─────────
      let searchPhrase = normalizedQuestion;
      if (truncatedHistory.length > 0 || this._looksLikeFollowUp(normalizedQuestion)) {
        try {
          const rewritePrompt = `Given the following conversation history and the latest user question, rewrite the latest question into a single, standalone descriptive search phrase that captures the core medical topic being discussed. Do not answer the question. Only output the rewritten search phrase.\n\nHistory:\n${truncatedHistory.map(h => `[${h.role.toUpperCase()}]: ${h.content}`).join('\n')}\n\nLatest Question: ${normalizedQuestion}\n\nRewritten Search Phrase:`;
          const rewritten = await this.callLLM(rewritePrompt, { temperature: 0.1, max_tokens: 50 });
          const cleaned = (rewritten || '').trim().replace(/^"|"$/g, '');
          // Validate rewrite: must be non-trivial and not drastically shorter than original
          if (cleaned.length >= 10 && cleaned.length >= normalizedQuestion.length * 0.3) {
            searchPhrase = cleaned;
            console.log(`[PIPELINE] Query Rewritten for RAG: "${normalizedQuestion}" -> "${searchPhrase}"`);
          } else {
            console.warn(`[PIPELINE] Query rewrite rejected (too short/empty): "${cleaned}" — using original`);
          }
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
          calibratedTopicConfidence,
          mode
        );
        console.log(`[PIPELINE] Stage 4: chunks=${retrieval.chunks.length} valid=${retrieval.is_valid}`);
      } catch (ragError) {
        console.warn('[PIPELINE] Stage 4 RAG failed — continuing with direct LLM:', ragError.message);
        retrieval = { chunks: [], chunk_payloads: [], metadata: {}, telemetry: { final_scores: [], broadened: false, validation_passed: false }, is_valid: false };
      }

      // ── Stage 4.5: No-chunk bypass — skip structured JSON pipeline ──────
      if (!retrieval.is_valid || retrieval.chunks.length === 0) {
        console.log('[PIPELINE] Stage 4.5: No chunks — bypassing structured pipeline, using professor-mode direct answer');
        const directAnswer = await this.callLLM(
          this._buildDirectPrompt(persona, mode, historyBlock, normalizedQuestion),
          { temperature: mode === 'exam' ? 0.15 : 0.35, max_tokens: 2500 }
        );
        return {
          answer: directAnswer,
          confidence: { final_confidence: 0.65, tier: 'MEDIUM', tier_label: '🟡 Direct Answer' },
          is_clarification_required: false,
          meta: { pipeline: 'direct_no_chunks', topic_id: topicResult.topic_id, subject: professorSubject, latency_ms: Date.now() - startTime }
        };
      }

      // ── Stage 5: Prompt Construction ───────────────────────────────────
      const promptResult = promptBuilder.build({
        mode,
        syllabusContext,
        retrieval,
        question: normalizedQuestion,
        historyBlock,
        persona  // inject professor persona into prompt
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
        return { answer: fallback, confidence: { final_confidence: 0.3, tier: 'LOW', tier_label: '🔴 Needs Review' }, meta: { pipeline: 'fallback' } };
      }

      // ── Stage 7-8: Parse & Validate Schema ─────────────────────────────
      let schemaResult = outputSchemaValidator.validate(rawLLMOutput);
      let retryCount = 0;
      let citationRetryCount = 0;

      // Auto-retry if schema validation fails (up to 1 retry)
      // Use a minimal corrective prompt — do NOT re-send the full system prompt
      if (!schemaResult.is_valid && retryCount < 1) {
        console.warn(`[PIPELINE] Stage 8 FAILED (${schemaResult.error}) — retrying with corrective prompt...`);
        const schemaOnlyPrompt = `Your previous response was not valid JSON. Error: ${schemaResult.error}

Please respond with ONLY a valid JSON object matching this schema:
{
  "claims": [
    { "statement": "<string, min 12 chars>", "chunk_ids": ["<chunk_id_string>"] }
  ],
  "clinical_correlation": "<string>",
  "exam_tips": "<string>"
}

Question to answer: ${normalizedQuestion}`;
        const correctedOutput = await this.callLLM(
          schemaOnlyPrompt,
          { temperature: 0.1, max_tokens: 2000, responseMimeType: 'application/json' }
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
        calibratedTopicConfidence
      );

      console.log(`[PIPELINE] Stage 10: citations=${citationResult.citation_count} hallucinated=${citationResult.hallucinated.length} uncited=${citationResult.uncited_claims}`);

      let finalCitationResult = citationResult;
      let finalParsedResponse = parsedResponse;
      if (citationResult.needs_retry) {
        try {
          const citationRetryPrompt = citationVerifier.buildRetryPrompt(promptResult.prompt, retrieval.chunk_payloads);
          const citationRetryOutput = await this.callLLM(citationRetryPrompt, {
            ...promptResult.metadata,
            responseMimeType: 'application/json'
          });
          const retrySchemaResult = outputSchemaValidator.validate(citationRetryOutput);
          if (retrySchemaResult.is_valid) {
            finalParsedResponse = retrySchemaResult.parsed;
            finalCitationResult = citationVerifier.verifyStructuredClaims(
              finalParsedResponse,
              retrieval.chunk_payloads,
              calibratedTopicConfidence
            );
            citationRetryCount = 1;
          }
        } catch (retryError) {
          console.warn('[PIPELINE] Stage 10 citation retry failed:', retryError.message);
        }
      }

      // ── Stage 11: Composite Confidence ─────────────────────────────────
      const confidenceReport = confidenceEngine.compute({
        topicResult,
        retrievalTelemetry: retrieval.telemetry,
        citationResult: finalCitationResult,
        schemaFailed: false
      });

      const sourcedClaimsCount = finalCitationResult.claims.filter(c => c.is_sourced).length;
      if (sourcedClaimsCount < 2 && confidenceReport.final_confidence > 0.7) {
        confidenceReport.final_confidence = 0.62;
        confidenceReport.tier = 'MEDIUM';
        confidenceReport.tier_label = '🟡 Needs More Sources';
      }

      console.log(`[PIPELINE] Stage 11: final=${confidenceReport.final_confidence} tier=${confidenceReport.tier} latency=${Date.now() - startTime}ms`);

      // ── Stage 11b: Assemble final response ─────────────────────────────
      const answer = this._assembleAnswer(finalParsedResponse, finalCitationResult);
      const keyBullets = (finalParsedResponse.claims || []).map(c => c.statement);

      const finalResponse = {
        answer: answer,
        short_note: answer,
        claims: finalCitationResult.claims,
        citations: finalCitationResult.claims.filter(c => c.is_sourced).map(c => c.citations).flat(),
        high_yield_summary: keyBullets.slice(0, 5),
        key_bullets: keyBullets,
        clinical_correlation: finalParsedResponse.clinical_correlation || finalParsedResponse.exam_tips || '',
        exam_tips: finalParsedResponse.exam_tips || '',
        confidence: confidenceReport,
        is_clarification_required: (confidenceReport.tier === 'LOW' && confidenceReport.final_confidence < 0.50) || sourcedClaimsCount < 1,
        meta: {
          pipeline: 'full_rag',
          topic_id: topicResult.topic_id,
          subject: professorSubject,
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
          citation_count: finalCitationResult.citation_count,
          citation_retry_count: citationRetryCount,
          schema_retries: retryCount,
          sourced_claims_count: sourcedClaimsCount,
          latency_ms: Date.now() - startTime
        }
      };

      // Cache HIGH-confidence full-RAG responses (not image, not conversational)
      if (confidenceReport.tier === 'HIGH' && !userContext.imageBase64 &&
          (!userContext.history || userContext.history.length === 0)) {
        queryCache.set(rawQuestion, mode, hintSubject, finalResponse);
      }

      return finalResponse;

    } catch (error) {
      console.error('[PIPELINE] Fatal error:', error);
      // Last-resort fallback
      try {
        const emergencyAnswer = await this.callLLM(`Answer this medical question briefly: ${rawQuestion}`);
        return { answer: emergencyAnswer, confidence: { final_confidence: 0.2, tier: 'LOW', tier_label: '🔴 Needs Review' }, meta: { pipeline: 'emergency_fallback' } };
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

      // Always use the configured model — never accept model override from external callers
      const modelConfig = {
        model: this.modelName
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
      console.error('[CORTEX] Gemini call failed:', e.message);

      // ── Fallback LLM ──────────────────────────────────────────────────────
      // On Gemini 5xx / quota errors, attempt the configured fallback provider.
      // JSON-mode (responseMimeType) cannot be guaranteed by the fallback,
      // so only attempt fallback for plain-text calls (no responseMimeType).
      const isServerError = (e.status >= 500) ||
        /quota|503|overloaded|unavailable/i.test(e.message || '');
      if (isServerError && !metadata.responseMimeType && fallbackLLM.isConfigured()) {
        console.warn('[CORTEX] Gemini unavailable — trying fallback LLM provider');
        const fallbackText = await fallbackLLM.callFallback(prompt, {
          temperature: metadata.temperature || 0.2,
          max_tokens: metadata.max_tokens || 2000,
        });
        if (fallbackText) {
          console.log('[CORTEX] Fallback LLM response received successfully');
          return fallbackText;
        }
      }

      throw e;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Build the direct-answer prompt combining mode system prompt + persona voice
  // ─────────────────────────────────────────────────────────────────────────────
  _buildDirectPrompt(persona, mode, historyBlock, question) {
    const modeSystem = MODE_SYSTEM[mode] || MODE_SYSTEM.conceptual;
    const subjectContext = persona.flavor ? `\nYou are teaching **${persona.flavor}**.\n${persona.voice}` : '';

    return `${modeSystem}
${subjectContext}

IMPORTANT: Do NOT start with greetings like "Hello", "Good morning", "Great question" etc. Jump straight into the content.
${historyBlock}
## Question
${question}`;
  }

  _looksLikeFollowUp(question) {
    const q = (question || '').trim().toLowerCase();
    if (!q) return false;
    if (q.length < 90 && /\b(this|that|these|those|it|they|above|same)\b/.test(q)) return true;
    if (/^(and|also|then|what about|how about|why|explain further|continue)/.test(q)) return true;
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Vision LLM Call — for image + text queries (Gemini multimodal)
  // ─────────────────────────────────────────────────────────────────────────────
  async callVisionLLM(imageBase64, question, history = [], mode = 'conceptual') {
    try {
      if (!this.apiKey) throw new Error("Missing Gemini API Key — set GEMINI_API_KEY in .env");

      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const modeSystem = MODE_SYSTEM[mode] || MODE_SYSTEM.conceptual;

      const historyText = history.length > 0
        ? `\nConversation so far:\n${history.map(h => `[${h.role.toUpperCase()}]: ${h.content}`).join('\n')}\n`
        : '';

      const prompt = `${modeSystem}\n\nYou are analyzing a medical image or document.${historyText}\n\nDo NOT start with greetings. Analyze directly.\n\nQuestion: ${question || 'Describe and analyze this medical image in detail.'}`;

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
        generationConfig: { temperature: 0.3, maxOutputTokens: 2500 },
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Streaming — runs the direct-professor-mode prompt through Gemini stream API.
  // Yields text chunks via an async generator.
  //
  // Used by the /api/medical/query/stream SSE endpoint.
  // Note: Streaming bypasses the structured JSON pipeline (no RAG/citations).
  // It is designed for fast, low-latency conversational use. The full pipeline
  // is still available at /api/medical/query for citation-verified responses.
  // ─────────────────────────────────────────────────────────────────────────────
  async *streamMedicalResponse(rawQuestion, userContext = {}) {
    const mode        = userContext.mode    || 'conceptual';
    const history     = userContext.history || [];
    const hintSubject = userContext.subject || null;

    if (!this.apiKey) throw new Error('Missing Gemini API Key');

    // Sanitize history same as full pipeline
    const sanitize = (t) => (t || '').replace(/<\/?[^>]+>/g, '').replace(/[<>]/g, '').substring(0, 500);
    const truncatedHistory = (history || []).slice(-10).map(h => ({
      role: h.role, content: sanitize(h.content)
    }));

    const historyBlock = truncatedHistory.length > 0
      ? `\n\n<CONVERSATION_HISTORY>\n${truncatedHistory.map(h => `[${h.role.toUpperCase()}]: ${h.content}`).join('\n')}\n</CONVERSATION_HISTORY>\n\nUsing the above conversation as context, `
      : '';

    const topicResult = topicScorer.scoreQuery(rawQuestion);
    const professorSubject = hintSubject || (topicResult.matched ? topicResult.subject : null);
    const persona = getProfessorPersona(professorSubject);
    const prompt  = this._buildDirectPrompt(persona, mode, historyBlock, rawQuestion);

    const model = this.genAI.getGenerativeModel({ model: this.modelName });

    const streamResult = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: mode === 'exam' ? 0.15 : 0.35,
        maxOutputTokens: 2500,
      },
    });

    for await (const chunk of streamResult.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}

module.exports = new GeminiService();