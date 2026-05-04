const axios = require('axios');

class EmbeddingService {
    constructor() {
        // Strip any surrounding quotes (e.g. from .env: HF_API_TOKEN="token")
        this.apiKey = (process.env.HF_API_TOKEN || process.env.OPENAI_API_KEY || '').replace(/[\r\n\"\' ]/g, '');
        this.model = (process.env.HF_EMBEDDING_MODEL || 'BAAI/bge-large-en-v1.5').replace(/[\r\n\"\' ]/g, '');
        this.remoteUnavailable = false;
    }

    shouldUseLocalFallback(error) {
        const status = error.response?.status;
        const message = String(error.response?.data?.error || error.response?.data || error.message || '');

        return (
            !error.response ||
            status === 400 ||
            status === 401 ||
            status === 403 ||
            /invalid/i.test(message) ||
            /model not supported/i.test(message) ||
            /provider/i.test(message)
        );
    }

    describeError(error) {
        return error.response?.data?.error || error.message || 'no response from remote endpoint';
    }

    async getEmbedding(text) {
        if (this.remoteUnavailable) {
            return await this.getLocalEmbedding(text);
        }

        try {
            const response = await axios.post(
                `https://router.huggingface.co/hf-inference/pipeline/feature-extraction/${this.model}`,
                { inputs: text, options: { wait_for_model: true } },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (this.shouldUseLocalFallback(error)) {
                // Provider/token issues: use the local model so ingestion and queries still share dimensions.
                this.remoteUnavailable = true;
                console.warn('[Embedding] Remote embedding unavailable; using local fallback:', this.describeError(error));
                return await this.getLocalEmbedding(text);
            }
            console.error('Embedding Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async getEmbeddings(texts) {
        if (this.remoteUnavailable) {
            const results = [];
            for (let t of texts) {
                results.push(await this.getLocalEmbedding(t));
            }
            return results;
        }

        try {
            const response = await axios.post(
                `https://router.huggingface.co/hf-inference/pipeline/feature-extraction/${this.model}`,
                { inputs: texts, options: { wait_for_model: true } },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error) {
            if (this.shouldUseLocalFallback(error)) {
                this.remoteUnavailable = true;
                console.warn('[Embedding] Remote batch embedding unavailable; using local fallback:', this.describeError(error));
                const results = [];
                for (let t of texts) {
                    results.push(await this.getLocalEmbedding(t));
                }
                return results;
            }
            console.error('Batch Embedding Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async getLocalEmbedding(text) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Local model fallback disabled in production. Set HF_API_TOKEN.');
        }
        if (!this.extractor) {
            console.log(`\n[FALLBACK] Remote embedding unavailable. Initializing local @xenova/transformers for ${this.model}...`);
            const { pipeline } = await import('@xenova/transformers');
            // use xenova quantized namespace directly if doing bge
            const localModel = this.model.includes('bge-') ? `Xenova/${this.model.split('/').pop()}` : 'Xenova/bge-large-en-v1.5';
            this.extractor = await pipeline('feature-extraction', localModel, {
                progress_callback: (x) => {
                    if (x.status === 'progress' && x.progress % 20 === 0) {
                        process.stdout.write(`\rDownloading ${x.file}: ${Math.round(x.progress)}%`);
                    } else if (x.status === 'done') {
                        process.stdout.write(`\rLoaded ${x.file} successfully!         \n`);
                    }
                }
            });
            console.log('\n✅ Local Embedding Model Ready.\n');
        }
        const output = await this.extractor(text, { pooling: 'cls', normalize: true });
        return Array.from(output.data);
    }
}

module.exports = new EmbeddingService();
