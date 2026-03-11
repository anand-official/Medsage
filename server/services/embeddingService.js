const axios = require('axios');

class EmbeddingService {
    constructor() {
        // Strip any surrounding quotes (e.g. from .env: HF_API_TOKEN="token")
        this.apiKey = (process.env.HF_API_TOKEN || process.env.OPENAI_API_KEY || '').replace(/[\r\n\"\' ]/g, '');
        this.model = (process.env.HF_EMBEDDING_MODEL || 'BAAI/bge-large-en-v1.5').replace(/[\r\n\"\' ]/g, '');
    }

    async getEmbedding(text) {
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
            if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 400 || error.response?.data?.error?.includes('Invalid')) {
                // Token issues - fallback to local embeddings!
                return await this.getLocalEmbedding(text);
            }
            console.error('Embedding Error:', error.response?.data || error.message);
            throw error;
        }
    }

    async getEmbeddings(texts) {
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
            if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 400 || error.response?.data?.error?.includes('Invalid')) {
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
        if (!this.extractor) {
            console.log(`\n[FALLBACK] HuggingFace API key invalid or API unreachable. Initializing local @xenova/transformers (this bypasses the API key entirely!). Downloading ONNX model ${this.model}...`);
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
