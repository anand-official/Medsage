require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const qdrantClient = require('../services/qdrantClient');
const embeddingService = require('../services/embeddingService');
const { chunkText } = require('../services/chunker');

const COLLECTION_NAME = 'mbbs_pathology_v2';
const VECTOR_SIZE = 1024; // BAAI/bge-large-en-v1.5

// Deterministic stable point ID from chunk_id string
function stableId(chunkId) {
    let hash = 5381;
    for (let i = 0; i < chunkId.length; i++) {
        hash = ((hash << 5) + hash) + chunkId.charCodeAt(i);
        hash = hash & 0x7fffffff; // keep positive 31-bit integer
    }
    return hash;
}

async function setupCollection() {
    console.log(`\n[QDRANT] Checking collection: ${COLLECTION_NAME}`);
    const { collections } = await qdrantClient.getCollections();
    const exists = collections.find(c => c.name === COLLECTION_NAME);

    if (exists) {
        console.log(`[QDRANT] Collection already exists. Skipping creation.`);
        return;
    }

    console.log(`[QDRANT] Creating collection: ${COLLECTION_NAME}`);
    await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 }
    });

    // Enable indexed payload fields for fast metadata filtering
    const indexFields = [
        { field_name: 'topic_id', field_schema: 'keyword' },
        { field_name: 'subject', field_schema: 'keyword' },
        { field_name: 'country', field_schema: 'keyword' },
        { field_name: 'chapter', field_schema: 'keyword' },
        { field_name: 'year', field_schema: 'integer' }
    ];

    for (const idx of indexFields) {
        await qdrantClient.createPayloadIndex(COLLECTION_NAME, idx);
        console.log(`  [INDEX] Created payload index: ${idx.field_name}`);
    }
}

async function ingest() {
    try {
        await setupCollection();

        const sourcePath = path.join(__dirname, '../data/source_material/pathology_chapters.json');
        const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

        console.log(`\n[INGEST] Processing ${data.length} topics...\n`);

        let totalChunks = 0;

        for (const topic of data) {
            console.log(`📖 Topic: ${topic.topic_id} — ${topic.chapter}`);

            for (const section of topic.sections) {
                console.log(`  ├─ Section: "${section.title}" (HY: ${section.high_yield_score})`);

                const metadata = {
                    topic_id: topic.topic_id,
                    subject: topic.subject,
                    chapter: topic.chapter,
                    book: topic.book,
                    edition: topic.edition,
                    section_heading: section.section_heading,
                    subsection_heading: section.subsection_heading,
                    section_title: section.title,
                    page_start: section.page_start,
                    page_end: section.page_end,
                    high_yield_score: section.high_yield_score,
                    // Syllabus metadata (default for MVP)
                    country: 'India',
                    degree: 'MBBS',
                    year: 2
                };

                const chunks = chunkText(section.content, metadata, 600, 100);
                console.log(`  │   Generated ${chunks.length} chunk(s)`);

                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    const chunk_id = `${topic.topic_id}_${section.section_heading.replace(/\s+/g, '_').toUpperCase()}_${i.toString().padStart(3, '0')}`;

                    process.stdout.write(`  │   Embedding chunk [${i + 1}/${chunks.length}]...`);
                    const vector = await embeddingService.getEmbedding(chunk.content);
                    process.stdout.write(` ✓ (${vector.length}d)\n`);

                    const pointId = stableId(chunk_id);

                    await qdrantClient.upsert(COLLECTION_NAME, {
                        wait: true,
                        points: [{
                            id: pointId,
                            vector: vector,
                            payload: {
                                chunk_id: chunk_id,
                                content: chunk.content,
                                ...chunk.metadata
                            }
                        }]
                    });

                    totalChunks++;
                }
            }
            console.log('');
        }

        console.log(`\n✅ [INGEST] Complete. ${totalChunks} chunks indexed into "${COLLECTION_NAME}".`);
        console.log(`\n   Next step: node server/scripts/run_benchmark.js\n`);

    } catch (error) {
        console.error('\n[INGEST] Fatal Error:', error);
        process.exit(1);
    }
}

ingest();
