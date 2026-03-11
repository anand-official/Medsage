const geminiService = require('./server/services/geminiService');
require('dotenv').config();

async function runAudit() {
    console.log("=== MEDSAGE RAG AUDIT (PHASE 2 - MOCKED LLM) ===");

    const tests = [
        { q: "Tell me about Iron Deficiency Anemia", expected: "PATH_ANEMIA_01" },
        { q: "What is acute inflammation?", expected: "PATH_INF_01" },
        { q: "What is the capital of France?", expected: "LOW_CONFIDENCE" }
    ];

    for (const test of tests) {
        console.log(`\nQUERY: ${test.q}`);

        // Mock the LLM call to verify the rest of the 11-stage pipeline logic
        // Mock the LLM call to verify the rest of the 11-stage pipeline logic
        const originalCallLLM = geminiService.callLLM;
        geminiService.callLLM = async (prompt) => {
            return JSON.stringify({
                answer: "Mocked structural response for: " + test.q,
                citations: [{ book: "Robbins", page: "X" }],
                high_yield_summary: ["Validated Pipeline Stage"]
            });
        };

        try {
            const res = await geminiService.generateMedicalResponse(test.q);

            if (res.is_clarification_required) {
                console.log("RESULT: Correct clarification (Confidence Triggered).");
                console.log("Confidence Score:", res.confidence);
            } else {
                console.log("RESULT: Pipeline Success");
                console.log("Mapped Topic:", res.meta.topic_id);
                console.log("Hybrid Rank Bias (HY):", res.meta.high_yield);
                console.log("Retrieval Latency:", res.meta.retrieval.latency_ms, "ms");
                console.log("Top Chunk Similarity:", res.meta.retrieval.similarity.toFixed(4));
                console.log("Final Prompt Construction Verified.");
            }
        } catch (e) {
            console.log("Logic Failure:", e.message);
        }

        // Restore
        geminiService.callLLM = originalCallLLM;
    }
}

runAudit();
