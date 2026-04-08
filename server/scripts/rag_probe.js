/**
 * RAG Health Probe
 *
 * Checks Qdrant connectivity, lists all collections + point counts,
 * and runs a test vector search for "cardiac cycle" to confirm
 * end-to-end retrieval works.
 *
 * Usage (from project root):
 *   node server/scripts/rag_probe.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { QdrantClient } = require('@qdrant/js-client-rest');
const axios = require('axios');

const QDRANT_URL  = process.env.QDRANT_URL  || 'http://localhost:6333';
const QDRANT_KEY  = process.env.QDRANT_API_KEY;
const HF_TOKEN    = process.env.HF_API_TOKEN;
const HF_MODEL    = process.env.HF_EMBEDDING_MODEL || 'BAAI/bge-large-en-v1.5';
const EXPECTED_DIM = 1024;

const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_KEY });

const SEP = '─'.repeat(60);

async function embed(text) {
    const res = await axios.post(
        `https://router.huggingface.co/hf-inference/pipeline/feature-extraction/${HF_MODEL}`,
        { inputs: text, options: { wait_for_model: true } },
        { headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    return res.data;
}

async function main() {
    console.log('\n' + SEP);
    console.log('  RAG HEALTH PROBE');
    console.log(SEP);
    console.log(`  Qdrant: ${QDRANT_URL}`);
    console.log(`  Model:  ${HF_MODEL}`);
    console.log(SEP + '\n');

    // ── 1. Qdrant reachability ──────────────────────────────────────────────
    console.log('1. QDRANT CONNECTIVITY');
    try {
        const res = await axios.get(`${QDRANT_URL}/healthz`, { timeout: 5000 });
        console.log('   ✅ Qdrant is reachable:', JSON.stringify(res.data));
    } catch (e) {
        console.error('   ❌ Qdrant unreachable:', e.message);
        console.error('      → Run: docker-compose up -d qdrant');
        process.exit(1);
    }

    // ── 2. List collections + point counts ─────────────────────────────────
    console.log('\n2. COLLECTIONS');
    const { collections } = await client.getCollections();
    if (collections.length === 0) {
        console.log('   ⚠️  No collections found — ingestion has never been run.');
    }

    const TARGET_SUBJECTS = [
        'mbbs_pathology_v2',
        'mbbs_physiology_v2',
        'mbbs_anatomy_v2',
        'mbbs_pharmacology_v2',
        'mbbs_biochemistry_v2',
    ];

    const existing = new Set(collections.map(c => c.name));

    for (const name of TARGET_SUBJECTS) {
        if (!existing.has(name)) {
            console.log(`   ❌ ${name.padEnd(30)} — MISSING (not created)`);
        } else {
            try {
                const info = await client.getCollection(name);
                const count = info.points_count ?? 0;
                const icon  = count > 0 ? '✅' : '⚠️ ';
                const note  = count === 0 ? ' ← EMPTY (ingestion needed)' : '';
                console.log(`   ${icon} ${name.padEnd(30)} ${String(count).padStart(6)} points${note}`);
            } catch (e) {
                console.log(`   ❌ ${name.padEnd(30)} — error: ${e.message}`);
            }
        }
    }

    // Also show any other collections
    const others = collections.filter(c => !TARGET_SUBJECTS.includes(c.name));
    for (const c of others) {
        const info = await client.getCollection(c.name);
        console.log(`      ${c.name.padEnd(30)} ${String(info.points_count ?? 0).padStart(6)} points (extra)`);
    }

    // ── 3. Embedding test ───────────────────────────────────────────────────
    console.log('\n3. EMBEDDING TEST');
    let vector;
    try {
        vector = await embed('cardiac cycle phases and heart sounds');
        const dim = Array.isArray(vector) ? vector.length : '?';
        if (dim === EXPECTED_DIM) {
            console.log(`   ✅ HuggingFace embedding OK — dim=${dim}`);
        } else {
            console.error(`   ❌ Wrong vector dimension: got ${dim}, expected ${EXPECTED_DIM}`);
            console.error('      → This means ingestion and query are using different models.');
            process.exit(1);
        }
    } catch (e) {
        console.error('   ❌ Embedding failed:', e.response?.data?.error || e.message);
        if (e.response?.status === 401 || e.response?.status === 403) {
            console.error('      → HF_API_TOKEN is missing or invalid in server/.env');
        }
        process.exit(1);
    }

    // ── 4. Vector search — physiology (subject + country filter) ───────────
    console.log('\n4. VECTOR SEARCH — mbbs_physiology_v2 (with country=India filter)');
    await testSearch('mbbs_physiology_v2', vector, [
        { key: 'subject', match: { value: 'Physiology' } },
        { key: 'country', match: { value: 'India' } },
    ]);

    // ── 5. Vector search — pathology (broader, should always work) ─────────
    console.log('\n5. VECTOR SEARCH — mbbs_pathology_v2 (no subject filter)');
    await testSearch('mbbs_pathology_v2', vector, [
        { key: 'country', match: { value: 'India' } },
    ]);

    // ── 6. Bare search — pathology, no filters at all ──────────────────────
    console.log('\n6. VECTOR SEARCH — mbbs_pathology_v2 (NO filters)');
    await testSearch('mbbs_pathology_v2', vector, []);

    console.log('\n' + SEP);
    console.log('  SUMMARY');
    console.log(SEP);
    console.log('  If any subject collection is EMPTY or MISSING:');
    console.log('    node server/scripts/ingest_physiology.js   (for Physiology)');
    console.log('    node server/scripts/ingest_pathology.js    (for Pathology)');
    console.log('  If embedding is failing: check HF_API_TOKEN in server/.env');
    console.log('  If country filter blocks all: your chunks must have country="India"');
    console.log(SEP + '\n');
}

async function testSearch(collection, vector, filters) {
    try {
        const results = await client.search(collection, {
            vector,
            filter: filters.length ? { must: filters } : undefined,
            limit: 3,
            with_payload: true,
        });
        if (results.length === 0) {
            console.log(`   ⚠️  0 results`);
            if (filters.some(f => f.key === 'country')) {
                console.log('      → Try running without country filter to check if data exists with different metadata');
            }
        } else {
            results.forEach((r, i) => {
                const p = r.payload;
                console.log(`   [${i+1}] score=${r.score.toFixed(3)}  subject=${p.subject || '?'}  book=${p.book || '?'}  country=${p.country || '?'}`);
                console.log(`        chunk_id=${p.chunk_id || '?'}`);
                console.log(`        content="${(p.content || '').slice(0, 80)}..."`);
            });
        }
    } catch (e) {
        if (e.message?.includes('Not found') || e.status === 404) {
            console.log(`   ❌ Collection does not exist — needs to be created and ingested`);
        } else {
            console.log(`   ❌ Search error: ${e.message}`);
        }
    }
}

main().catch(err => {
    console.error('\n[PROBE] Fatal:', err.message);
    process.exit(1);
});
