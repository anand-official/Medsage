const qdrantClient = require('./qdrantClient');
const embeddingService = require('./embeddingService');
const {
    DEFAULT_COLLECTION_NAME,
    getCollectionCandidates,
} = require('./ragCollections');

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
            collection: null,
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
                { key: 'country', match: { value: filters.country || 'India' } }
            ];

            if (filters.subject) {
                mustFilters.unshift({ key: 'subject', match: { value: filters.subject } });
            }

            // Apply topic_id filter only if confidence is high (> 0.75)
            if (topicId && topicId !== 'GENERAL' && confidence >= 0.75) {
                mustFilters.push({ key: 'topic_id', match: { value: topicId } });
                telemetry.topic_filter_applied = true;
            }

            // 3. Initial Vector Search (retrieve more candidates for re-ranking)
            const initialCandidates = this._getCollectionCandidates(filters.subject);
            if (initialCandidates.length === 0) {
                telemetry.error = `No vector collections configured for subject: ${filters.subject}`;
                telemetry.latency_ms = Date.now() - startTime;
                return {
                    chunks: [],
                    chunk_payloads: [],
                    metadata: { source: 'Error', page: 'N/A' },
                    telemetry,
                    is_valid: false
                };
            }
            let searchPack = await this._searchAcrossCollections(queryVector, mustFilters, 15, initialCandidates);
            let searchResults = searchPack.results;
            telemetry.collection = searchPack.collection;
            telemetry.retrieval_count = searchResults.length;

            // 4. Mode-aware Hybrid Re-ranking
            let rankedResults = this._rerank(searchResults, activeWeights);

            // 5. Context Validator — fallback broadening
            let topChunks = rankedResults.slice(0, 5);
            const isValid = this._validateContext(topChunks, activeThreshold, telemetry);

            if (!isValid) {
                // If all top chunks fail threshold: broaden by removing topic_id constraint
                const broadFilters = mustFilters.filter(f => f.key !== 'topic_id');
                console.warn(`[RAG] Threshold fail for topic=${topicId}. Broadening retrieval...`);
                const broadSearchPack = await this._searchAcrossCollections(queryVector, broadFilters, 15, initialCandidates);
                let broadResults = broadSearchPack.results;
                telemetry.collection = telemetry.collection || broadSearchPack.collection;

                // If still weak, broaden across subjects in default collection(s)
                if (!broadResults.length && !filters.subject) {
                    const widestFilters = broadFilters.filter(f => f.key !== 'subject');
                    const globalCandidates = this._getCollectionCandidates('default');
                    const globalSearchPack = await this._searchAcrossCollections(queryVector, widestFilters, 15, globalCandidates);
                    broadResults = globalSearchPack.results;
                    telemetry.collection = telemetry.collection || globalSearchPack.collection;
                }
                const broadRanked = this._rerank(broadResults, activeWeights);
                topChunks = broadRanked.slice(0, 5);
                telemetry.broadened = true;
                telemetry.retrieval_strategy = 'broadened';
            }

            telemetry.validation_passed = this._validateContext(topChunks, activeThreshold, telemetry);
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

    /**
     * Retrieves context using query expansion: runs retrieveContext for each
     * expanded query in parallel, then merges unique chunks into one result set.
     *
     * Strategy:
     *  - queries[0] is the primary (original or rewritten) query. It drives the
     *    full validation / broadening logic and its result is used as the base.
     *  - queries[1..n] are alternatives from the query expander. They contribute
     *    only chunks whose chunk_id is NOT already in the primary result, so the
     *    primary ranking is never disturbed.
     *  - All queries run in parallel via Promise.allSettled — a failed alternative
     *    never cancels the primary or sibling searches.
     *  - Total chunks are capped at 8 to avoid overwhelming the prompt context.
     *
     * Telemetry: adds a `query_expansion` block to retrieval.telemetry with counts
     * for how many extra chunks expansion contributed.
     *
     * @param {string}   topicId    - Predicted topic_id from CurriculumMapper
     * @param {object}   filters    - { subject, country }
     * @param {string[]} queries    - [primaryQuery, ...alternatives]
     * @param {number}   confidence - Topic classifier confidence (0–1)
     * @param {string}   mode       - 'exam' | 'conceptual'
     * @param {object}   overrides  - { threshold, weights }
     */
    async retrieveWithExpansion(topicId, filters, queries, confidence, mode, overrides = {}) {
        // Single query — delegate directly to avoid any overhead
        if (!queries || queries.length <= 1) {
            return this.retrieveContext(topicId, filters, queries?.[0] || '', confidence, mode, overrides);
        }

        const expansionStart = Date.now();

        // Run all queries concurrently; allSettled ensures one failure doesn't abort others
        const settled = await Promise.allSettled(
            queries.map(q => this.retrieveContext(topicId, filters, q, confidence, mode, overrides))
        );

        // Primary result (queries[0]) — must succeed for the pipeline to continue
        const primaryOutcome = settled[0];
        if (primaryOutcome.status !== 'fulfilled') {
            // Primary failed hard — return an empty invalid result (orchestrator handles fallback)
            console.error('[RAG:expansion] Primary query failed:', primaryOutcome.reason?.message);
            return { chunks: [], chunk_payloads: [], metadata: {}, telemetry: {}, is_valid: false };
        }
        const primaryResult = primaryOutcome.value;

        // If the primary result itself is invalid, return it — no point merging alt results
        if (!primaryResult.is_valid || primaryResult.chunks.length === 0) {
            return primaryResult;
        }

        // Merge: start with primary chunks, then add unique chunks from alternatives
        const seenIds = new Set(
            primaryResult.chunk_payloads.map(p => p.chunk_id).filter(Boolean)
        );
        const mergedChunks   = [...primaryResult.chunks];
        const mergedPayloads = [...primaryResult.chunk_payloads];
        let addedByExpansion = 0;

        for (const outcome of settled.slice(1)) {
            if (outcome.status !== 'fulfilled' || !outcome.value.is_valid) continue;
            const { chunks, chunk_payloads } = outcome.value;

            for (let i = 0; i < chunks.length && mergedChunks.length < 8; i++) {
                const id = chunk_payloads[i]?.chunk_id;
                if (id && !seenIds.has(id)) {
                    mergedChunks.push(chunks[i]);
                    mergedPayloads.push(chunk_payloads[i]);
                    seenIds.add(id);
                    addedByExpansion++;
                }
            }
        }

        const expansionMs = Date.now() - expansionStart;

        console.log(
            `[RAG:expansion] queries=${queries.length} base=${primaryResult.chunks.length} ` +
            `merged=${mergedChunks.length} added=${addedByExpansion} latency=${expansionMs}ms`
        );

        return {
            ...primaryResult,
            chunks:        mergedChunks,
            chunk_payloads: mergedPayloads,
            // metadata stays as primary's top-chunk metadata (used for source attribution)
            metadata: primaryResult.metadata,
            telemetry: {
                ...primaryResult.telemetry,
                query_expansion: {
                    queries_count:        queries.length,
                    base_chunks:          primaryResult.chunks.length,
                    merged_unique_chunks: mergedChunks.length,
                    expansion_added:      addedByExpansion,
                    latency_ms:           expansionMs,
                },
            },
        };
    }

    // ─── Private Helpers ────────────────────────────────────────────────────────

    async _search(vector, mustFilters, limit) {
        return qdrantClient.search(DEFAULT_COLLECTION_NAME, {
            vector,
            filter: { must: mustFilters },
            limit,
            with_payload: true
        });
    }

    _getCollectionCandidates(subject) {
        return getCollectionCandidates(subject);
    }

    async _searchAcrossCollections(vector, mustFilters, limit, candidates) {
        const searches = candidates.map((collectionName, index) =>
            qdrantClient.search(collectionName, {
                vector,
                filter: { must: mustFilters },
                limit,
                with_payload: true
            }).then((results) => ({ collectionName, index, results }))
        );

        const settled = await Promise.allSettled(searches);
        let lastError = null;
        const fulfilled = [];

        for (const outcome of settled) {
            if (outcome.status === 'fulfilled') {
                fulfilled.push(outcome.value);
            } else {
                lastError = outcome.reason;
            }
        }

        const nonEmpty = fulfilled.filter(({ results }) => Array.isArray(results) && results.length > 0);
        if (nonEmpty.length > 0) {
            nonEmpty.sort((a, b) => {
                const scoreDiff = (b.results[0]?.score || 0) - (a.results[0]?.score || 0);
                return scoreDiff !== 0 ? scoreDiff : a.index - b.index;
            });
            const best = nonEmpty[0];
            return { collection: best.collectionName, results: best.results };
        }

        if (lastError) {
            console.warn('[RAG] Collection fallback exhausted:', lastError.message);
        }

        const firstFulfilled = fulfilled.sort((a, b) => a.index - b.index)[0];
        if (firstFulfilled) {
            return { collection: firstFulfilled.collectionName, results: firstFulfilled.results || [] };
        }

        return { collection: candidates[0] || DEFAULT_COLLECTION_NAME, results: [] };
    }

    _rerank(searchResults, weights) {
        return searchResults
            .map(hit => {
                const vectorSim = hit.score;
                const hyScore = hit.payload.high_yield_score ?? 0.0; // null/undefined → 0, not 0.5
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

    _validateContext(chunks, activeThreshold, telemetry = {}) {
        if (!chunks || chunks.length === 0) return false;

        // Rule 1: Primary similarity threshold
        if (chunks[0].score < activeThreshold) {
            console.warn(`[RAG] Low similarity: ${chunks[0].score.toFixed(4)} < ${activeThreshold}`);
            return false;
        }

        // Rule 2: Topic consistency — at least 2 chunks from same chapter
        // Fragmented context (all chunks from different chapters) requires a higher similarity bar
        if (chunks.length >= 2) {
            const chapterCounts = {};
            chunks.forEach(c => {
                const key = c.metadata.chapter || 'unknown';
                chapterCounts[key] = (chapterCounts[key] || 0) + 1;
            });
            const maxCount = Math.max(...Object.values(chapterCounts));
            if (maxCount < 2) {
                console.warn('[RAG] Fragmented context: no chapter has ≥ 2 chunks');
                telemetry.fragmented = true;
                // Fragmented context requires stronger similarity signal to be trusted
                const fragmentedThreshold = Math.max(activeThreshold, 0.70);
                if (chunks[0].score < fragmentedThreshold) {
                    console.warn(`[RAG] Fragmented context rejected: similarity ${chunks[0].score.toFixed(4)} < fragmented threshold ${fragmentedThreshold}`);
                    return false;
                }
            }
        }

        return true;
    }
}

module.exports = new RAGService();
