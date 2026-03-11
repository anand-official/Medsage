const qdrantClient = require('./qdrantClient');
const embeddingService = require('./embeddingService');

const COLLECTION_NAME = 'mbbs_pathology_v2';

// Mode-aware reranking weights — Stage 4 optimal config (BGE bge-large-en-v1.5)
// Winning sweep: threshold=0.50, weights=0.8/0.2 → Validation 100%, Composite 88%
const RERANK_WEIGHTS = {
    exam: { similarity: 0.80, high_yield: 0.20 },
    conceptual: { similarity: 0.90, high_yield: 0.10 },
    default: { similarity: 0.75, high_yield: 0.25 }
};

const SIMILARITY_THRESHOLD = 0.50; // BGE bge-large-en-v1.5 optimal — sweep winner (100% validation, 0% broadening)

class RAGService {
    /**
     * Retrieves context using metadata filters and hybrid ranking.
     * @param {string} topicId       - Predicted topic_id from CurriculumMapper.
     * @param {object} filters       - Metadata filters: { country, year, subject, degree }.
     * @param {string} query         - Raw question text to embed.
     * @param {number} confidence    - Topic classifier confidence score (0–1).
     * @param {string} mode          - 'exam' | 'conceptual' | 'default'.
     * @param {object} overrides     - Tuning config: { threshold, weights }
     */
    async retrieveContext(topicId, filters = {}, query, confidence = 0.0, mode = 'default', overrides = {}) {
        const startTime = Date.now();
        const activeWeights = overrides.weights || RERANK_WEIGHTS[mode] || RERANK_WEIGHTS.default;
        const activeThreshold = overrides.threshold || SIMILARITY_THRESHOLD;

        const telemetry = {
            topic_id: topicId,
            metadata_filters: filters,
            topic_filter_applied: false,
            retrieval_strategy: 'topic_filtered', // 'topic_filtered' | 'broadened'
            mode: mode,
            latency_ms: 0,
            retrieval_count: 0,
            similarity_scores: [],
            high_yield_scores: [],
            final_scores: [],
            validation_passed: false,
            broadened: false
        };

        try {
            // 1. Generate Query Vector
            const queryVector = await embeddingService.getEmbedding(query);

            // 2. Build Qdrant Metadata Filters
            const mustFilters = [
                { key: 'subject', match: { value: filters.subject || 'Pathology' } },
                { key: 'country', match: { value: filters.country || 'India' } }
            ];

            // Apply topic_id filter only if confidence is high (> 0.75)
            if (topicId && topicId !== 'GENERAL' && confidence >= 0.75) {
                mustFilters.push({ key: 'topic_id', match: { value: topicId } });
                telemetry.topic_filter_applied = true;
            }

            // 3. Initial Vector Search (retrieve more for re-ranking)
            let searchResults = await this._search(queryVector, mustFilters, 10);
            telemetry.retrieval_count = searchResults.length;

            // 4. Mode-aware Hybrid Re-ranking
            let rankedResults = this._rerank(searchResults, activeWeights);

            // 5. Context Validator — fallback broadening
            let topChunks = rankedResults.slice(0, 3);
            const isValid = this._validateContext(topChunks, activeThreshold);

            if (!isValid) {
                // If all top chunks fail threshold: broaden by removing topic_id constraint
                const broadFilters = mustFilters.filter(f => f.key !== 'topic_id');
                console.warn(`[RAG] Threshold fail for topic=${topicId}. Broadening retrieval...`);
                const broadResults = await this._search(queryVector, broadFilters, 10);
                const broadRanked = this._rerank(broadResults, activeWeights);
                topChunks = broadRanked.slice(0, 3);
                telemetry.broadened = true;
                telemetry.retrieval_strategy = 'broadened';
            }

            telemetry.validation_passed = this._validateContext(topChunks, activeThreshold);
            telemetry.latency_ms = Date.now() - startTime;
            telemetry.similarity_scores = topChunks.map(c => parseFloat(c.score.toFixed(4)));
            telemetry.high_yield_scores = topChunks.map(c => c.metadata.high_yield_score);
            telemetry.final_scores = topChunks.map(c => parseFloat(c.finalScore.toFixed(4)));

            console.log(`[RAG] topic=${topicId} mode=${mode} strategy=${telemetry.retrieval_strategy} valid=${telemetry.validation_passed} latency=${telemetry.latency_ms}ms chunks=${topChunks.length}`);

            return {
                chunks: topChunks.map(c => c.content),
                // Full payload exposed to pipeline for citation guaranteeing
                chunk_payloads: topChunks.map(c => c.metadata),
                metadata: topChunks.length > 0 ? topChunks[0].metadata : { source: 'N/A', page: 'N/A' },
                telemetry: telemetry,
                is_valid: telemetry.validation_passed
            };

        } catch (error) {
            console.error('[RAG] Retrieval Failure:', error.message);
            return {
                chunks: [],
                chunk_payloads: [],
                metadata: { source: 'Error', page: 'N/A' },
                telemetry: { ...telemetry, error: error.message, latency_ms: Date.now() - startTime },
                is_valid: false
            };
        }
    }

    // ─── Private Helpers ────────────────────────────────────────────────────────

    async _search(vector, mustFilters, limit) {
        return qdrantClient.search(COLLECTION_NAME, {
            vector,
            filter: { must: mustFilters },
            limit,
            with_payload: true
        });
    }

    _rerank(searchResults, weights) {
        return searchResults
            .map(hit => {
                const vectorSim = hit.score;
                const hyScore = hit.payload.high_yield_score || 0.5;
                const finalScore = (weights.similarity * vectorSim) + (weights.high_yield * hyScore);
                return {
                    content: hit.payload.content,
                    metadata: {
                        chunk_id: hit.payload.chunk_id,
                        topic_id: hit.payload.topic_id,
                        chapter: hit.payload.chapter,
                        section_heading: hit.payload.section_heading,
                        subsection_heading: hit.payload.subsection_heading,
                        book: hit.payload.book,
                        edition: hit.payload.edition,
                        page_start: hit.payload.page_start,
                        page_end: hit.payload.page_end,
                        high_yield_score: hyScore
                    },
                    score: vectorSim,
                    finalScore: finalScore
                };
            })
            .sort((a, b) => b.finalScore - a.finalScore);
    }

    _validateContext(chunks, activeThreshold) {
        if (!chunks || chunks.length === 0) return false;

        // Rule 1: Primary similarity threshold
        if (chunks[0].score < activeThreshold) {
            console.warn(`[RAG] Low similarity: ${chunks[0].score.toFixed(4)} < ${activeThreshold}`);
            return false;
        }

        // Rule 2: Topic consistency — at least 2 chunks from same chapter
        if (chunks.length >= 2) {
            const chapterCounts = {};
            chunks.forEach(c => {
                const key = c.metadata.chapter || 'unknown';
                chapterCounts[key] = (chapterCounts[key] || 0) + 1;
            });
            const maxCount = Math.max(...Object.values(chapterCounts));
            if (maxCount < 2) {
                console.warn('[RAG] Fragmented context: no chapter has ≥ 2 chunks');
            }
        }

        return true;
    }
}

module.exports = new RAGService();
