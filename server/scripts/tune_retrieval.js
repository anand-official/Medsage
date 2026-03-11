require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const ragService = require('../services/ragService');
const topicConfidenceScorer = require('../services/topicConfidenceScorer');
const citationVerifier = require('../services/citationVerifier');

/**
 * MedSage — Stage 4 Hyperparameter Tuning Harness
 */

const benchmarkPath = path.join(__dirname, '../data/benchmark_questions.json');
const questions = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

// The parameter grid to search — adjusted for BAAI/bge-large-en-v1.5
// BGE cosine similarities cluster ~0.55–0.70 vs OpenAI's ~0.78–0.85
const GRID = {
    thresholds: [0.50, 0.55, 0.60, 0.65],
    weights: [
        { name: '0.7/0.3', sim: 0.70, hy: 0.30 },
        { name: '0.8/0.2', sim: 0.80, hy: 0.20 },
        { name: '0.6/0.4', sim: 0.60, hy: 0.40 }
    ]
};

// Citation simulation logic (from benchmark v2)
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

// Stats helper
function mean(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }

async function evaluateConfiguration(threshold, weights) {
    let validationPassed = 0;
    let citationCompliant = 0;
    let broadenedCount = 0;
    let topicMatch = 0;

    let allTop1Sim = [];
    let allTop3Sim = [];

    const overrides = {
        threshold: threshold,
        weights: { similarity: weights.sim, high_yield: weights.hy }
    };

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
                'exam',
                overrides // INJECT THE OVERRIDES HERE
            );
        } catch (err) {
            retrieval = { telemetry: { validation_passed: false, broadened: false, similarity_scores: [] }, chunk_payloads: [] };
        }

        const tel = retrieval.telemetry;

        // Validation + Broadening
        if (tel.validation_passed) validationPassed++;
        if (tel.broadened) broadenedCount++;

        // Topic accuracy
        const retrievedTopics = [...new Set((retrieval.chunk_payloads || []).map(p => p.topic_id).filter(Boolean))];
        if (retrievedTopics.includes(q.expected_topic_id)) topicMatch++;

        // Similarity metrics
        if (tel.similarity_scores && tel.similarity_scores.length > 0) {
            allTop1Sim.push(tel.similarity_scores[0]);
            const top3Mean = mean(tel.similarity_scores.slice(0, 3));
            allTop3Sim.push(top3Mean);
        } else {
            allTop1Sim.push(0);
            allTop3Sim.push(0);
        }

        // Citation Compliance
        const simulatedPayload = simulateLLMCitation(retrieval.chunk_payloads || [], i);
        const citationResult = citationVerifier.verifyStructuredClaims(
            simulatedPayload,
            retrieval.chunk_payloads || [],
            topicResult.confidence
        );
        const isCitationCompliant = citationResult.citation_integrity && !citationResult.uncited_claims;
        if (isCitationCompliant) citationCompliant++;
    }

    const t = questions.length;
    return {
        threshold,
        weights: weights.name,
        validation_rate: parseFloat(((validationPassed / t) * 100).toFixed(1)),
        citation_compliance: parseFloat(((citationCompliant / t) * 100).toFixed(1)),
        broadening_rate: parseFloat(((broadenedCount / t) * 100).toFixed(1)),
        topic_accuracy: parseFloat(((topicMatch / t) * 100).toFixed(1)),
        mean_top1_sim: parseFloat(mean(allTop1Sim).toFixed(4)),
        mean_top3_sim: parseFloat(mean(allTop3Sim).toFixed(4)),
        // The composite metric you asked to optimize:
        composite_score: parseFloat((((validationPassed + citationCompliant) / (t * 2)) * 100).toFixed(1))
    };
}

async function runGridSweep() {
    console.log(`\n======================================================`);
    console.log(`🚀 STAGE 4: MEDSAGE RETRIEVAL TUNING HARNESS`);
    console.log(`======================================================\n`);
    console.log(`Locking parameters...`);
    console.log(`- Questions:  ${questions.length} (Expanded Archetypes)`);
    console.log(`- Mode:       exam`);
    console.log(`- Embedding:  text-embedding-3-large (locked)`);
    console.log(`- Chunk Size: 600 (locked)\n`);

    const results = [];

    // Phase 4.1: Baseline
    console.log(`[Phase 4.1] Running Baseline (0.60, 0.7/0.3) [BGE-calibrated]...`);
    const baseline = await evaluateConfiguration(0.60, { name: '0.7/0.3 (Baseline)', sim: 0.70, hy: 0.30 });
    console.table([baseline]);

    // Phase 4.2: Grid Sweep
    console.log(`\n[Phase 4.2] Executing Component Grid Sweep...`);
    for (const t of GRID.thresholds) {
        for (const w of GRID.weights) {
            console.log(`  Evaluating -> Threshold: ${t.toFixed(2)} | Weights: ${w.name}`);
            const res = await evaluateConfiguration(t, w);
            results.push(res);
        }
    }

    // Sort by stability: composite score descend, broadening penalty
    results.sort((a, b) => {
        const scoreA = a.composite_score - (a.broadening_rate * 0.5); // Add minor penalty for broadening
        const scoreB = b.composite_score - (b.broadening_rate * 0.5);
        return scoreB - scoreA;
    });

    console.log(`\n[Phase 4.2 Completed] Ranked Configurations by Stability:\n`);
    console.table(results);

    // Save to disk
    const logPath = path.join(__dirname, '../data/tuning_results.json');
    fs.writeFileSync(logPath, JSON.stringify({ baseline, sweep: results }, null, 2));

    // Analyze Archetypes using the best configuration to generate the heatmap
    const best = results[0];
    console.log(`\n======================================================`);
    console.log(`🔥 [Phase 4.3] FAILURE TAXONOMY HEATMAP (${best.threshold}, ${best.weights})`);
    console.log(`======================================================\n`);

    // Rerun best to collect exact failures
    const failures = {
        vignette: 0,
        mechanistic: 0,
        compare_contrast: 0,
        edge_case: 0,
        standard: 0
    };

    const wBest = GRID.weights.find(w => w.name === best.weights) || { sim: 0.7, hy: 0.3 };
    const overrides = { threshold: best.threshold, weights: { similarity: wBest.sim, high_yield: wBest.hy } };

    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let category = 'standard';
        if (q.question.includes('presents with') || q.question.includes('diagnosed with')) category = 'vignette';
        else if (q.question.includes('Explain the') || q.question.includes('mechanism')) category = 'mechanistic';
        else if (q.question.includes('Compare') || q.question.includes('difference between')) category = 'compare_contrast';
        else if (q.question.includes('rare') || q.question.includes('LAD type 1') || q.question.includes('Warburg')) category = 'edge_case';

        const topicResult = topicConfidenceScorer.scoreQuery(q.question);
        try {
            const retrieval = await ragService.retrieveContext(
                topicResult.topic_id,
                { country: 'India', year: 2, subject: topicResult.subject || 'Pathology' },
                q.question,
                topicResult.confidence,
                'exam',
                overrides
            );

            const retrievedTopics = [...new Set((retrieval.chunk_payloads || []).map(p => p.topic_id).filter(Boolean))];
            const isTopicAccurate = retrievedTopics.includes(q.expected_topic_id);
            const isValid = retrieval.telemetry.validation_passed;

            if (!isValid || !isTopicAccurate || retrieval.telemetry.broadened) {
                failures[category]++;
            }
        } catch {
            failures[category]++;
        }
    }

    console.log(`Clinical Vignettes:   ${failures.vignette} failures`);
    console.log(`Mechanistic:          ${failures.mechanistic} failures`);
    console.log(`Compare/Contrast:     ${failures.compare_contrast} failures`);
    console.log(`Edge Cases:           ${failures.edge_case} failures`);
    console.log(`Standard Definitions: ${failures.standard} failures\n`);
    console.log(`Logs saved to: ${logPath}`);
}

runGridSweep().catch(console.error);
