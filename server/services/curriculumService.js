const curriculumData = require('../data/curriculumRegistry.json');

class CurriculumService {
    constructor() {
        this.registry = curriculumData;
    }

    /**
     * REFINED STAGE 2 & 3: Curriculum Mapper + Confidence Scorer
     */
    async mapToTopic(query) {
        const q = query.toLowerCase();
        let bestMatch = null;
        let confidence = 0;

        // Search through modules and topics
        for (const module of this.registry.modules) {
            for (const topic of module.topics) {
                // Topic Name Match Logic (Semantic placeholder)
                if (q.includes(topic.name.toLowerCase()) || q.includes(topic.id.toLowerCase())) {
                    bestMatch = { ...topic, moduleName: module.name };
                    confidence = 0.95;
                    break;
                }

                // Keyword heuristic for context
                const keywords = topic.name.toLowerCase().split(' ');
                if (keywords.some(kw => kw.length > 3 && q.includes(kw))) {
                    bestMatch = { ...topic, moduleName: module.name };
                    confidence = 0.75;
                    break;
                }
            }
            if (bestMatch) break;
        }

        // Default return structure
        return {
            topic: bestMatch,
            confidence: bestMatch ? confidence : 0.2, // Low confidence if no match
            subject: this.registry.curriculum.subject,
            syllabus: this.registry.curriculum.regulator,
            country: this.registry.curriculum.country,
            year: this.registry.curriculum.year
        };
    }

    getSyllabusInfo() {
        return this.registry.curriculum;
    }
}

module.exports = new CurriculumService();
