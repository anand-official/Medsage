require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const ragService = require('../services/ragService');
const topicConfidenceScorer = require('../services/topicConfidenceScorer');
const citationVerifier = require('../services/citationVerifier');
const confidenceEngine = require('../services/confidenceEngine');
const promptBuilder = require('../services/promptBuilder');
const outputSchemaValidator = require('../services/outputSchemaValidator');
const geminiService = require('../services/geminiService');

/**
 * MedSage — Vector Layer Benchmark Runner v3 — LIVE LLM
 *
 * Gate criteria (Stage 3 approval):
 *   ✅  ≥ 85%  Topic retrieval accuracy
 *   ✅  ≥ 90%  Context validation pass rate
 *   ✅  ≥ 90%  Citation compliance rate (LIVE Gemini calls)
 *
 * Mode: LIVE — uses real Gemini 2.5 Flash API calls via promptBuilder.
 * Set BENCHMARK_MODE=simulated in env to fall back to simulation.
 */

const LIVE_MODE = process.env.BENCHMARK_MODE !== 'simulated';

const benchmarkPath = path.join(__dirname, '../data/benchmark_questions.json');
const questions = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

// ─── Statistics helpers ──────────────────────────────────────────────────────

function mean(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}
function pct(val, total) { return total ? ((val / total) * 100).toFixed(1) : '0.0'; }
function pad(str, len) { return String(str).padEnd(len); }

/**
 * LIVE: Call real Gemini 2.5 Flash. Returns parsed JSON for citation verification.
 * Falls back to simulation on API error to avoid aborting the entire benchmark.
 */
async function liveLLMCitation(question, retrieval, syllabusContext, mode = 'exam') {
    const promptResult = promptBuilder.build({ mode, syllabusContext, retrieval, question });

    let rawOutput;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            rawOutput = await geminiService.callLLM(promptResult.prompt, {
                ...promptResult.metadata,
                responseMimeType: 'application/json'
            });
            break; // success
        } catch (err) {
            console.warn(`  [BENCHMARK] Gemini attempt ${attempt}/3 failed: ${err.message}`);
            if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
            else return { mode, claims: [{ statement: 'API error after 3 retries.', chunk_ids: [] }] };
        }
    }

    const schemaResult = outputSchemaValidator.validate(rawOutput);
    if (schemaResult.is_valid) return schemaResult.parsed;

    console.warn(`  [BENCHMARK] Schema invalid: ${schemaResult.error}`);
    return { mode, claims: [{ statement: 'Schema failed.', chunk_ids: [] }] };
}

/**
 * SIMULATED: deterministic fallback (original behaviour).
 * - 80%: compliant  15%: uncited  5%: hallucinated
 */
function simulateLLMCitation(chunkPayloads, seed) {
    const r = (seed % 20) / 20;
    let payload = { mode: 'exam', claims: [] };
    if (r < 0.05 && chunkPayloads.length > 0) {
        payload.claims.push({ statement: 'Simulated claim.', chunk_ids: ['FAKE_CHUNK_999'] });
    } else if (r < 0.20 || chunkPayloads.length === 0) {
        payload.claims.push({ statement: 'Simulated claim.', chunk_ids: [] });
    } else {
        payload.claims.push({ statement: 'Simulated claim.', chunk_ids: [chunkPayloads[0].chunk_id] });
    }
    return payload;
}

// ─── Benchmark loop ──────────────────────────────────────────────────────────

async function runBenchmark() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log(`║   🧪  MedSage Benchmark v3 — ${LIVE_MODE ? 'LIVE Gemini 2.5 Flash' : 'SIMULATED '}       ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    if (LIVE_MODE) {
        console.log('⚠️  Running with LIVE Gemini API calls. 50 questions ≈ 2-3 min.\n');
    }

    const results = [];
    const failures = [];
    const latencies = [];
    const allSimilarities = [];
    const allFinalScores = [];
    const allFinalConfidences = [];

    let topicMatch = 0;
    let validationPass = 0;
    let broadenedCount = 0;
    let citationCompliant = 0;

    const tierCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const topicResult = topicConfidenceScorer.scoreQuery(q.question);

        let retrieval;
        try {
            retrieval = await ragService.retrieveContext(
                topicResult.topic_id,
                { country: 'India', year: 2, subject: topicResult.subject || 'Pathology' },
                q.question,
                topicResult.confidence,
                'exam'
            );
        } catch (err) {
            retrieval = {
                chunks: [], chunk_payloads: [],
                telemetry: {
                    latency_ms: 0, validation_passed: false, similarity_scores: [],
                    high_yield_scores: [], final_scores: [], retrieval_strategy: 'error',
                    broadened: false, topic_filter_applied: false
                },
                is_valid: false
            };
        }

        const tel = retrieval.telemetry;
        const retrievedTopics = [...new Set((retrieval.chunk_payloads || []).map(p => p.topic_id).filter(Boolean))];
        const retrievedChapters = [...new Set((retrieval.chunk_payloads || []).map(p => p.chapter).filter(Boolean))];
        const topicCorrect = retrievedTopics.includes(q.expected_topic_id);
        const validPassed = retrieval.is_valid;

        // ─── Citation compliance: LIVE or SIMULATED ────────────────────
        const syllabusCtx = topicConfidenceScorer.getSyllabusContext();
        let llmPayload;
        if (LIVE_MODE && retrieval.chunk_payloads.length > 0) {
            process.stdout.write(`  [LLM] Calling Gemini for [${q.id}]... `);
            llmPayload = await liveLLMCitation(q.question, retrieval, syllabusCtx, 'exam');
            process.stdout.write('done\n');
            await new Promise(r => setTimeout(r, 1000)); // respect rate limits
        } else {
            llmPayload = simulateLLMCitation(retrieval.chunk_payloads || [], i);
        }
        const citationResult = citationVerifier.verifyStructuredClaims(
            llmPayload,
            retrieval.chunk_payloads || [],
            topicResult.confidence
        );
        const isCitationCompliant = citationResult.citation_integrity && !citationResult.uncited_claims;

        // ─── Composite confidence ─────────────────────────────────────────
        const confidenceReport = confidenceEngine.compute({
            topicResult,
            retrievalTelemetry: tel,
            citationResult
        });

        // ─── Accumulate metrics ───────────────────────────────────────────
        if (topicCorrect) topicMatch++;
        if (validPassed) validationPass++;
        if (tel.broadened) broadenedCount++;
        if (isCitationCompliant) citationCompliant++;
        tierCounts[confidenceReport.tier]++;

        latencies.push(tel.latency_ms);
        (tel.similarity_scores || []).forEach(s => allSimilarities.push(s));
        (tel.final_scores || []).forEach(s => allFinalScores.push(s));
        allFinalConfidences.push(confidenceReport.final_confidence);

        const result = {
            id: q.id,
            question: q.question,
            expected_topic_id: q.expected_topic_id,
            predicted_topic_id: topicResult.topic_id,
            topic_confidence: topicResult.confidence,
            topic_method: topicResult.method,
            retrieved_topic_ids: retrievedTopics,
            retrieved_chapters: retrievedChapters,
            retrieval_strategy: tel.retrieval_strategy,
            similarity_scores: tel.similarity_scores || [],
            high_yield_scores: tel.high_yield_scores || [],
            final_scores: tel.final_scores || [],
            latency_ms: tel.latency_ms,
            validation_passed: validPassed,
            topic_correct: topicCorrect,
            broadened: tel.broadened,
            citation_mode: LIVE_MODE ? 'live_gemini' : 'simulated',
            citation_compliant: isCitationCompliant,
            citation_count: citationResult.citation_count,
            citation_integrity: citationResult.citation_integrity,
            citation_compliance_rate: citationResult.compliance_rate,
            uncited_claims: citationResult.uncited_claims,
            hallucinated_count: citationResult.hallucinated.length,
            confidence: confidenceReport
        };

        results.push(result);

        // ─── Per-question output ──────────────────────────────────────────
        const ti = topicCorrect ? '✅' : '❌';
        const ci = isCitationCompliant ? '📎' : '⚠️';
        const conf = confidenceReport.tier_label;

        console.log(`${ti}${ci} [${q.id}] ${q.question.substring(0, 60)}...`);
        console.log(`   topic     : exp=${q.expected_topic_id} got=[${retrievedTopics.join(', ')}]`);
        console.log(`   retrieval : sim=[${(tel.similarity_scores || []).map(s => s.toFixed(3)).join(',') || 'N/A'}] strategy=${tel.retrieval_strategy}`);
        console.log(`   confidence: ${confidenceReport.final_confidence} ${conf} flags=[${confidenceReport.flags.join(',') || 'none'}]`);
        console.log(`   citation  : count=${citationResult.citation_count} hallucinated=${citationResult.hallucinated.length} uncited=${citationResult.uncited_claims}`);

        if (!topicCorrect) {
            failures.push({
                id: q.id,
                question: q.question,
                expected_topic_id: q.expected_topic_id,
                predicted_topic_id: topicResult.topic_id,
                topic_confidence: topicResult.confidence,
                retrieved_topic_ids: retrievedTopics,
                retrieved_chapters: retrievedChapters,
                similarity_scores: tel.similarity_scores || [],
                retrieval_strategy: tel.retrieval_strategy,
                confidence_flags: confidenceReport.flags,
                diagnostic: topicResult.confidence < 0.75
                    ? 'LOW_TOPIC_CONFIDENCE — topic filter not applied, retrieval too broad'
                    : 'WRONG_TOPIC — classifier error or missing keyword rule'
            });
        }
        console.log('');
    }

    // ─── Summary ─────────────────────────────────────────────────────────────
    const topicAccuracy = parseFloat(pct(topicMatch, questions.length));
    const validationRate = parseFloat(pct(validationPass, questions.length));
    const citationRate = parseFloat(pct(citationCompliant, questions.length));
    const broadeningRate = parseFloat(pct(broadenedCount, questions.length));
    const medianLatency = median(latencies);
    const avgLatency = mean(latencies);
    const meanSimilarity = parseFloat(mean(allSimilarities).toFixed(4));
    const meanFinalScore = parseFloat(mean(allFinalScores).toFixed(4));
    const meanConfidence = parseFloat(mean(allFinalConfidences).toFixed(4));

    const stage3Gate = topicAccuracy >= 85 && validationRate >= 90;
    const citationGate = citationRate >= 90;

    const W = 64;
    const row = (label, value) => `║  ${pad(label, 26)} ${pad(value, W - 32)}║`;

    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║' + pad('  📊  Benchmark Summary', W) + '║');
    console.log('╠' + '═'.repeat(W) + '╣');
    console.log(row('Total Questions', questions.length));
    console.log(row('Topic Accuracy', `${topicAccuracy}%  (gate ≥ 85%)    ${topicAccuracy >= 85 ? '✅' : '❌'}`));
    console.log(row('Validation Rate', `${validationRate}%  (gate ≥ 90%)    ${validationRate >= 90 ? '✅' : '❌'}`));
    console.log(row('Citation Compliance', `${citationRate}%  (gate ≥ 90%)    ${citationGate ? '✅' : '❌  ← TUNE PROMPT'}`));
    console.log(row('Mode', LIVE_MODE ? '🔴 LIVE Gemini 2.5 Flash' : '⚪ Simulated (80/15/5%)'));
    console.log('╠' + '═'.repeat(W) + '╣');
    console.log(row('Mean Similarity', meanSimilarity));
    console.log(row('Mean Reranked Score', meanFinalScore));
    console.log(row('Mean Confidence', `${meanConfidence}  (composite)`));
    console.log(row('Median Latency', `${medianLatency.toFixed(0)}ms`));
    console.log(row('Avg Latency', `${avgLatency.toFixed(0)}ms`));
    console.log(row('Broadening Rate', `${broadeningRate}%  (classifier signal)`));
    console.log('╠' + '═'.repeat(W) + '╣');
    console.log(row('Confidence Tiers', `🟢 ${tierCounts.HIGH}  🟡 ${tierCounts.MEDIUM}  🔴 ${tierCounts.LOW}`));
    console.log(row('Failures', failures.length));
    console.log('╠' + '═'.repeat(W) + '╣');
    console.log(row('Stage 3 Gate', stage3Gate ? '✅ PASSED — retrieval ready' : '❌ FAILED — fix retrieval first'));
    console.log(row('Citation Gate', citationGate ? '✅ PASSED — prompt stable' : '❌ FAILED — prompt regression likely'));
    console.log('╚' + '═'.repeat(W) + '╝\n');

    if (failures.length > 0) {
        console.log('══════════════════ FAILURE ANALYSIS ══════════════════════════════');
        failures.forEach(f => {
            console.log(`\n  [${f.id}] ${f.question}`);
            console.log(`    Expected   : ${f.expected_topic_id}`);
            console.log(`    Predicted  : ${f.predicted_topic_id} (conf=${f.topic_confidence})`);
            console.log(`    Retrieved  : [${f.retrieved_topic_ids.join(', ')}]`);
            console.log(`    Strategy   : ${f.retrieval_strategy}`);
            console.log(`    Sim scores : ${f.similarity_scores.map(s => s.toFixed(3)).join(', ') || 'none'}`);
            console.log(`    Conf flags : ${f.confidence_flags.join(', ') || 'none'}`);
            console.log(`    Diagnostic : ${f.diagnostic}`);
        });
        console.log('\n══════════════════ END FAILURES ═══════════════════════════════════\n');
    }

    // ─── Write results ────────────────────────────────────────────────────────
    const logPath = path.join(__dirname, '../data/benchmark_results.json');
    fs.writeFileSync(logPath, JSON.stringify({
        run_at: new Date().toISOString(),
        summary: {
            topicAccuracy, validationRate, citationRate, broadeningRate,
            meanSimilarity, meanFinalScore, meanConfidence,
            medianLatency: parseFloat(medianLatency.toFixed(2)),
            avgLatency: parseFloat(avgLatency.toFixed(2)),
            tierCounts,
            total: questions.length,
            topicMatch, validationPass, citationCompliant, broadenedCount,
            failures: failures.length,
            stage3_passed: stage3Gate,
            citation_passed: citationGate
        },
        failures,
        results
    }, null, 2));

    console.log(`  📁  Results written → ${logPath}\n`);

    const allGatesPassed = stage3Gate && citationGate;
    if (!allGatesPassed) {
        const failed = [];
        if (!stage3Gate) failed.push('retrieval');
        if (!citationGate) failed.push('citation compliance');
        console.error(`  ⛔  Gate(s) failed: [${failed.join(', ')}]. Resolve before Stage 4.\n`);
        process.exit(1);
    }
}

runBenchmark().catch(err => {
    console.error('[BENCHMARK] Fatal:', err);
    process.exit(1);
});
