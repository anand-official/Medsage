/**
 * Academy Library → Qdrant Ingest
 * 
 * Ingests the 35 MBBS textbook summaries from academy_library.json into Qdrant,
 * tagged as source_type: "textbook" so RAGService can retrieve them alongside
 * existing pathology chunks.
 * 
 * Each book becomes 1 chunk per subject/description block.
 * The embedding text = title + author + description for semantic search.
 * 
 * Usage: node server/scripts/ingestLibraryToQdrant.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const qdrantClient = require('../services/qdrantClient');
const embeddingService = require('../services/embeddingService');

const LIBRARY_PATH = path.join(__dirname, '../data/academy_library.json');
const COLLECTION_NAME = 'mbbs_pathology_v2'; // Re-use existing collection, add textbook chunks alongside
const VECTOR_SIZE = 1024; // BGE bge-large-en-v1.5

// Map MBBS year to subject label
const YEAR_SUBJECT_MAP = {
    1: 'Pre-Clinical',
    2: 'Para-Clinical',
    3: 'Clinical I',
    4: 'Clinical II',
    5: 'Internship'
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ensureCollectionExists() {
    try {
        const info = await qdrantClient.getCollection(COLLECTION_NAME);
        console.log(`[Qdrant] Collection '${COLLECTION_NAME}' exists with ${info.points_count || 0} points.`);
    } catch (e) {
        console.log(`[Qdrant] Creating collection '${COLLECTION_NAME}'...`);
        await qdrantClient.createCollection(COLLECTION_NAME, {
            vectors: { size: VECTOR_SIZE, distance: 'Cosine' }
        });
        console.log(`[Qdrant] Collection created.`);
    }
}

async function ingestLibrary() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║    ACADEMY LIBRARY → QDRANT INGEST                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    if (!fs.existsSync(LIBRARY_PATH)) {
        console.error(`[ERROR] Library file not found: ${LIBRARY_PATH}`);
        console.error('Run: node server/scripts/academyCrawler.js first');
        process.exit(1);
    }

    const libraryData = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));
    const books = libraryData.books || [];
    console.log(`[Ingest] Found ${books.length} books to ingest.\n`);

    await ensureCollectionExists();

    let ingested = 0;
    let failed = 0;

    for (const book of books) {
        try {
            // Build a rich semantic embedding text combining all searchable fields
            const embeddingText = [
                `Title: ${book.title}`,
                `Author: ${book.author}`,
                `Edition: ${book.edition || 'Latest'}`,
                `Category: ${book.category}`,
                `Year of Study: Year ${book.year} — ${YEAR_SUBJECT_MAP[book.year] || 'MBBS'}`,
                `Subjects: ${(book.subjects || [book.category]).join(', ')}`,
                `Description: ${book.description}`,
            ].join('\n');

            console.log(`[Embed] "${book.title}"...`);
            const vector = await embeddingService.getEmbedding(embeddingText);

            // Create a flat vector if HF returns nested array
            const flatVector = Array.isArray(vector[0]) ? vector[0] : vector;

            // Use a deterministic ID based on the book id
            const pointId = Math.abs(
                book.id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
            ) % 2147483647; // Qdrant requires unsigned 32-bit int or UUID

            await qdrantClient.upsert(COLLECTION_NAME, {
                wait: true,
                points: [{
                    id: pointId,
                    vector: flatVector,
                    payload: {
                        // Source typing for retrieval routing
                        source_type: 'textbook',
                        chunk_id: `TEXTBOOK_${book.id.toUpperCase()}`,

                        // Required fields matching existing RAG schema
                        topic_id: `TEXTBOOK_${book.category.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
                        subject: book.category,
                        country: 'India',

                        // Textbook-specific metadata
                        book: book.title,
                        author: book.author,
                        edition: book.edition || 'Latest',
                        mbbs_year: book.year,
                        year_label: YEAR_SUBJECT_MAP[book.year] || 'MBBS',
                        category: book.category,
                        subjects: book.subjects || [book.category],
                        pdf_link: book.pdfLink || null,
                        cover_url: book.coverUrl || null,
                        rating: book.rating || 4.5,

                        // Content for retrieval — the full description
                        content: embeddingText,
                        description: book.description,

                        // Required fields for citation display
                        chapter: `${book.category} Reference`,
                        section_heading: book.title,
                        subsection_heading: `${book.author} — ${book.edition || 'Latest'}`,
                        page_start: 1,
                        page_end: book.pages || 999,

                        // High yield score — reference books are always high yield
                        high_yield_score: 0.90
                    }
                }]
            });

            console.log(`  ✅ Ingested: "${book.title}" → ID:${pointId}`);
            ingested++;

            // Small delay to respect HF API rate limits
            await sleep(300);

        } catch (err) {
            console.error(`  ❌ Failed: "${book.title}" — ${err.message}`);
            failed++;
        }
    }

    console.log('\n══════════════════════════════════════════════════════════');
    console.log(`✅ Ingest complete! ${ingested} books added, ${failed} failed.`);
    console.log('══════════════════════════════════════════════════════════\n');
}

ingestLibrary().catch(err => {
    console.error('[FATAL]', err.message);
    process.exit(1);
});
