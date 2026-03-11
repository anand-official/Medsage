const { QdrantClient } = require('@qdrant/js-client-rest');

// Default to local Qdrant instance
const client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY
});

module.exports = client;
