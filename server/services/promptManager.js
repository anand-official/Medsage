const promptRegistry = require('../data/promptRegistry.json');

class PromptManager {
    constructor() {
        this.registry = promptRegistry;
    }

    getPrompt(mode = 'conceptual', version = 'latest') {
        // Basic versioning logic
        const filtered = this.registry.filter(p => p.mode === mode);
        if (filtered.length === 0) return this.registry[0];

        return filtered[filtered.length - 1]; // Return latest
    }

    construct(template, variables) {
        let result = template;
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
        return result;
    }
}

module.exports = new PromptManager();
