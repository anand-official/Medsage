const llmClient = require('./cortexLlmClient');
const { looksLikeFollowUp } = require('./cortexRequestUtils');

function getOrchestrator() {
    return require('./cortexOrchestrator');
}

class GeminiService {
    async generateMedicalResponse(rawQuestion, userContext = {}) {
        return getOrchestrator().generateMedicalResponse(rawQuestion, userContext);
    }

    async callLLM(prompt, metadata = {}) {
        const response = metadata?.responseMimeType
            ? await llmClient.callStructured(prompt, metadata)
            : await llmClient.callText(prompt, metadata);

        return response.text;
    }

    async callVisionLLM(imageBase64, question, history = [], mode = 'conceptual') {
        const response = await llmClient.callVision(imageBase64, question, history, mode);
        return response.text;
    }

    _looksLikeFollowUp(question, historyLength = 0) {
        return looksLikeFollowUp(question, historyLength);
    }

    async *streamMedicalResponse(rawQuestion, userContext = {}) {
        for await (const chunk of getOrchestrator().streamMedicalResponse(rawQuestion, userContext)) {
            yield chunk;
        }
    }
}

module.exports = new GeminiService();