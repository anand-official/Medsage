const { QdrantClient } = require('@qdrant/js-client-rest');

// Default to local Qdrant instance
const apiKey = (process.env.QDRANT_API_KEY || '').trim() || undefined;

const client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey
});

module.exports = client;
