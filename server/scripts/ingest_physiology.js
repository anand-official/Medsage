/**
 * Physiology → Qdrant Ingest
 *
 * Ingests physiology_chapters.json into the mbbs_physiology_v2 collection.
 * Run this once after starting Qdrant to enable grounded Physiology answers.
 *
 * Usage (from project root):
 *   node server/scripts/ingest_physiology.js
 *
 * Environment variables required (server/.env):
 *   HF_API_TOKEN   — HuggingFace token for bge-large-en-v1.5 embeddings
 *   QDRANT_URL     — defaults to http://localhost:6333
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');

const qdrantClient    = require('../services/qdrantClient');
const embeddingService = require('../services/embeddingService');
const { chunkText }   = require('../services/chunker');

const COLLECTION_NAME = 'mbbs_physiology_v2';
const VECTOR_SIZE     = 1024; // BAAI/bge-large-en-v1.5
const SOURCE_PATH     = path.join(__dirname, '../data/source_material/physiology_chapters.json');

// Deterministic stable integer ID from chunk_id string (matches ingest_pathology.js)
function stableId(chunkId) {
    let hash = 5381;
    for (let i = 0; i < chunkId.length; i++) {
        hash = ((hash << 5) + hash) + chunkId.charCodeAt(i);
        hash = hash & 0x7fffffff;
    }
    return hash;
}

async function setupCollection() {
    console.log(`\n[QDRANT] Checking collection: ${COLLECTION_NAME}`);
    const { collections } = await qdrantClient.getCollections();
    const exists = collections.find(c => c.name === COLLECTION_NAME);

    if (exists) {
        const info = await qdrantClient.getCollection(COLLECTION_NAME);
        console.log(`[QDRANT] Collection exists with ${info.points_count ?? 0} points.`);
        return;
    }

    console.log(`[QDRANT] Creating collection: ${COLLECTION_NAME}`);
    await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 },
    });

    const indexFields = [
        { field_name: 'topic_id',  field_schema: 'keyword' },
        { field_name: 'subject',   field_schema: 'keyword' },
        { field_name: 'country',   field_schema: 'keyword' },
        { field_name: 'chapter',   field_schema: 'keyword' },
        { field_name: 'year',      field_schema: 'integer' },
    ];
    for (const idx of indexFields) {
        await qdrantClient.createPayloadIndex(COLLECTION_NAME, idx);
        console.log(`  [INDEX] Created: ${idx.field_name}`);
    }
    console.log(`[QDRANT] Collection created.\n`);
}

async function ingest() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║    PHYSIOLOGY CHAPTERS → QDRANT INGEST                  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    if (!fs.existsSync(SOURCE_PATH)) {
        console.error(`[ERROR] Source file not found: ${SOURCE_PATH}`);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
    console.log(`[INGEST] Found ${data.length} topic(s) in source file.\n`);

    await setupCollection();

    let totalChunks = 0;

    for (const topic of data) {
        console.log(`📖 Topic: ${topic.topic_id} — ${topic.chapter}`);

        for (const section of topic.sections) {
            console.log(`  ├─ Section: "${section.title}" (HY: ${section.high_yield_score})`);

            const metadata = {
                topic_id:           topic.topic_id,
                subject:            topic.subject,
                chapter:            topic.chapter,
                book:               topic.book,
                edition:            topic.edition,
                section_heading:    section.section_heading,
                subsection_heading: section.subsection_heading,
                section_title:      section.title,
                page_start:         section.page_start,
                page_end:           section.page_end,
                high_yield_score:   section.high_yield_score,
                country:            topic.country  || 'India',
                degree:             topic.degree   || 'MBBS',
                year:               topic.year     || 2,
            };

            const chunks = chunkText(section.content, metadata, 600, 100);
            console.log(`  │   Generated ${chunks.length} chunk(s)`);

            for (let i = 0; i < chunks.length; i++) {
                const chunk    = chunks[i];
                const safeHead = section.section_heading.replace(/\s+/g, '_').toUpperCase().slice(0, 30);
                const chunk_id = `${topic.topic_id}_${safeHead}_${String(i).padStart(3, '0')}`;

                process.stdout.write(`  │   Embedding chunk [${i + 1}/${chunks.length}]...`);
                const vector = await embeddingService.getEmbedding(chunk.content);
                process.stdout.write(` ✓ (${vector.length}d)\n`);

                if (vector.length !== VECTOR_SIZE) {
                    console.error(`\n[ERROR] Vector dimension mismatch: got ${vector.length}, expected ${VECTOR_SIZE}`);
                    console.error('        Check HF_EMBEDDING_MODEL in server/.env matches what was used during prior ingestion.');
                    process.exit(1);
                }

                await qdrantClient.upsert(COLLECTION_NAME, {
                    wait: true,
                    points: [{
                        id:      stableId(chunk_id),
                        vector:  vector,
                        payload: {
                            chunk_id: chunk_id,
                            content:  chunk.content,
                            ...chunk.metadata,
                        },
                    }],
                });

                totalChunks++;
            }
        }
        console.log('');
    }

    const info = await qdrantClient.getCollection(COLLECTION_NAME);
    console.log(`✅ [INGEST] Complete.`);
    console.log(`   Chunks indexed this run : ${totalChunks}`);
    console.log(`   Total points in Qdrant  : ${info.points_count ?? totalChunks}`);
    console.log(`   Collection              : ${COLLECTION_NAME}`);
    console.log('\n   Verify with: node server/scripts/rag_probe.js\n');
}

ingest().catch(err => {
    console.error('\n[INGEST] Fatal error:', err);
    process.exit(1);
});
