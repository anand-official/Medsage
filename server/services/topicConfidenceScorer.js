/**
 * Stage 3 – Step 1: Topic Confidence Scorer
 *
 * Extracted cleanly from CurriculumService.
 * Responsibility: given a question string, return a scored topic mapping.
 *
 * Current implementation: keyword heuristic (v1).
 * Future:  replace internals with embedding-based cosine similarity
 *          against topic anchor embeddings. The interface stays the same.
 *
 * Interface contract:
 *   scoreQuery(question: string) → TopicMapping
 *
 * TopicMapping: {
 *   topic_id:   string,    // e.g. "PATH_INF_01"
 *   subject:    string,    // e.g. "Pathology"
 *   confidence: number,    // 0.0 – 1.0
 *   method:     string,    // "keyword_v1" | "embedding_v1" | ...
 * }
 */

const curriculumData = require('../data/curriculumRegistry.json');

// ─── Topic keyword dictionary ────────────────────────────────────────────────
// Structured so tuning one topic's keywords doesn't affect others.
// Each entry: { topic_id, subject, keywords: [string], strongKeywords: [string] }
// strong keyword → confidence 0.90+, regular → 0.75
const TOPIC_RULES = [
    {
        topic_id: 'PATH_NEO_01',
        subject: 'Pathology',
        strongKeywords: [
            'neoplasia', 'hallmarks of cancer', 'oncogene', 'tumor suppressor',
            'carcinogenesis', 'philadelphia chromosome', 'two-hit hypothesis',
            'bcr-abl', 'ras mutation', 'tp53', 'brca', 'warburg', 'angiogenesis vegf'
        ],
        keywords: [
            'cancer', 'tumor', 'tumour', 'carcinoma', 'sarcoma', 'lymphoma',
            'leukemia', 'metastasis', 'angiogenesis', 'vegf', 'apoptosis resistance',
            'n-myc', 'rb gene', 'apc gene', 'mutation', 'proto-oncogene'
        ]
    },
    {
        topic_id: 'PATH_CELL_01',
        subject: 'Pathology',
        strongKeywords: [
            'cell injury', 'apoptosis', 'necrosis', 'caspase', 'atp depletion',
            'reversible injury', 'irreversible injury', 'coagulative necrosis',
            'liquefactive necrosis', 'caseous necrosis', 'mitochondrial pathway',
            'death receptor pathway', 'bcl-2', 'cytochrome c', 'fas ligand'
        ],
        keywords: [
            'cell death', 'cellular swelling', 'fatty change', 'adaptation',
            'hypertrophy', 'hyperplasia', 'atrophy', 'metaplasia', 'free radical',
            'oxidative stress', 'ischemia reperfusion', 'apoptotic body'
        ]
    },
    {
        topic_id: 'PATH_INF_01',
        subject: 'Pathology',
        strongKeywords: [
            'acute inflammation', 'chronic inflammation', 'five cardinal signs',
            'five rs of inflammation', 'leukocyte recruitment', 'selectin',
            'icam-1', 'vcam-1', 'histamine', 'bradykinin', 'leukotriene',
            'chemotaxis', 'diapedesis', 'granulomatous inflammation', 'tnf il-1'
        ],
        keywords: [
            'inflammation', 'inflammatory', 'vasodilation', 'vascular permeability',
            'neutrophil', 'macrophage', 'cytokine', 'complement', 'c5a', 'ltb4',
            'prostaglandin', 'rubor', 'calor', 'tumor', 'dolor', 'functio laesa',
            'exudate', 'edema', 'pus', 'abscess', 'fibrin'
        ]
    }
];

class TopicConfidenceScorer {
    constructor() {
        this.registry = curriculumData;
        this.topicRules = TOPIC_RULES;
    }

    /**
     * Score a question against the topic rule set.
     * Returns the best matched topic with a confidence value.
     *
     * @param {string} question
     * @returns {TopicMapping}
     */
    scoreQuery(question) {
        const q = question.toLowerCase();
        let best = null;
        let bestScore = 0;

        for (const rule of this.topicRules) {
            // Strong keyword match → 0.92 confidence
            const strongHit = rule.strongKeywords.some(kw => q.includes(kw));
            if (strongHit) {
                const score = 0.92;
                if (score > bestScore) {
                    bestScore = score;
                    best = rule;
                }
                continue; // Don't also check regular if strong matched
            }

            // Regular keyword match — count multiple hits for graduated scoring
            const hits = rule.keywords.filter(kw => q.includes(kw)).length;
            if (hits > 0) {
                // 1 hit → 0.72, 2 hits → 0.80, 3+ hits → 0.86
                const score = Math.min(0.86, 0.72 + (hits - 1) * 0.07);
                if (score > bestScore) {
                    bestScore = score;
                    best = rule;
                }
            }
        }

        if (!best || bestScore < 0.60) {
            return {
                topic_id: null,
                subject: this.registry.curriculum.subject,
                confidence: bestScore || 0.20,
                method: 'keyword_v1',
                matched: false
            };
        }

        return {
            topic_id: best.topic_id,
            subject: best.subject,
            confidence: parseFloat(bestScore.toFixed(4)),
            method: 'keyword_v1',
            matched: true
        };
    }

    /**
     * Returns full syllabus context for the given topic_id.
     * Used downstream by the Prompt Builder.
     */
    getSyllabusContext() {
        return {
            regulator: this.registry.curriculum.regulator,
            country: this.registry.curriculum.country,
            year: this.registry.curriculum.year,
            subject: this.registry.curriculum.subject
        };
    }
}

module.exports = new TopicConfidenceScorer();
