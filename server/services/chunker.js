const { getEncoding } = require("js-tiktoken");

const enc = getEncoding("cl100k_base"); // Used by text-embedding-3-large

/**
 * Chunks text into segments of targetTokenCount with a given overlap.
 * Respects section boundaries if provided.
 */
function chunkText(text, metadata, targetTokenCount = 600, overlap = 100) {
    const tokens = enc.encode(text);
    const chunks = [];

    let start = 0;
    while (start < tokens.length) {
        const end = Math.min(start + targetTokenCount, tokens.length);
        const chunkTokens = tokens.slice(start, end);
        const chunkText = enc.decode(chunkTokens);

        chunks.push({
            content: chunkText,
            token_count: chunkTokens.length,
            metadata: {
                ...metadata,
                token_range: [start, end]
            }
        });

        if (end === tokens.length) break;
        start += (targetTokenCount - overlap);
    }

    return chunks;
}

module.exports = { chunkText };
