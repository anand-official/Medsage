/**
 * Stage 3 – Step 2: Prompt Builder
 *
 * Extracted cleanly from PromptManager / GeminiService.
 * with all pipeline variables.
 *
 * Interface contract:
 *   build(options) → { prompt: string, metadata: object, version: string }
 *
 * This module is the ONLY place where prompts are assembled.
 * geminiService.js calls this; it should not construct prompts directly.
 *
 * Versioning strategy:
 *   - Prompts are stored in promptRegistry.json as versioned objects.
 *   - `latest` always resolves to the highest semver for a given mode.
 *   - Future: load prompts from a DB for live A/B testing without deploys.
 */

const path = require('path');
const citationVerifier = require('./citationVerifier');
const promptRegistry = require('../data/promptRegistry.json');

class PromptBuilder {
    constructor() {
        this.registry = promptRegistry;
    }

    /**
     * Build the final prompt string for the LLM.
     *
     * @param {object} options
     * @param {string} options.mode           - 'exam' | 'conceptual'
     * @param {object} options.syllabusContext - { regulator, country, year, subject }
     * @param {object} options.retrieval      - { chunks, chunk_payloads, metadata }
     * @param {string} options.question       - The normalized user question
     * @returns {{ prompt: string, metadata: object, version: string, prompt_id: string }}
     */
    build({ mode = 'conceptual', syllabusContext = {}, retrieval = {}, question, historyBlock = '' }) {
        const promptDef = this._getLatestPrompt(mode);

        // Assemble variables for template substitution
        const citationContext = citationVerifier.buildCitationContext(retrieval.chunk_payloads || []);
        const contextText = (retrieval.chunks || []).join('\n\n');

        const realChunkIds = (retrieval.chunk_payloads || [])
            .map(p => p.chunk_id)
            .filter(Boolean);

        const currentHour = new Date().getHours();
        const timeOfDay = currentHour < 12 ? 'morning' : (currentHour < 18 ? 'afternoon' : 'evening');

        const variables = {
            syllabus: syllabusContext.regulator || 'NMC',
            year: syllabusContext.year || '2nd',
            subject: syllabusContext.subject || 'Pathology',
            country: syllabusContext.country || 'India',
            timeOfDay: timeOfDay,
            textbook: retrieval.metadata?.book || retrieval.metadata?.source || 'Robbins',
            chapter: retrieval.metadata?.chapter || '',
            section: retrieval.metadata?.section_heading || '',
            subsection: retrieval.metadata?.subsection_heading || '',
            context: contextText,
            citation_context: citationContext,
            question: question,
            historyBlock: historyBlock,
            // Enumerate all valid chunk_ids so LLM cannot hallucinate
            chunk_ids_list: realChunkIds.length
                ? realChunkIds.map(id => `  • ${id}`).join('\n')
                : '  (no chunks available — do not cite)',
            // ── KEY FIX: Inject REAL chunk_ids into few-shot examples ──────────
            // This eliminates the mismatch between hardcoded example IDs and real DB IDs.
            // Gemini can literally copy these IDs from the example into its response.
            example_id_1: realChunkIds[0] || 'NO_ID_AVAILABLE',
            example_id_2: realChunkIds[1] || realChunkIds[0] || 'NO_ID_AVAILABLE',
            example_id_3: realChunkIds[2] || realChunkIds[0] || 'NO_ID_AVAILABLE',
        };


        const prompt = this._render(promptDef.template, variables);

        return {
            prompt,
            metadata: promptDef.metadata,
            version: promptDef.version,
            prompt_id: promptDef.id,
            mode: mode
        };
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    _getLatestPrompt(mode) {
        const matching = this.registry.filter(p => p.mode === mode);
        if (matching.length === 0) {
            console.warn(`[PROMPT BUILDER] No prompt found for mode="${mode}". Falling back to default.`);
            return this.registry[0];
        }
        // Highest semver wins (simple string sort works for 1.x.y)
        return matching.sort((a, b) => b.version.localeCompare(a.version))[0];
    }

    _render(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
        }
        return result;
    }
}

module.exports = new PromptBuilder();
