/**
 * Google Drive / local folder -> PDF preprocess -> Qdrant RAG ingest.
 *
 * Examples:
 *   node server/scripts/rag_auto_ingest.js --drive-url "https://drive.google.com/drive/folders/..." --subject ENT --dry-run
 *   node server/scripts/rag_auto_ingest.js --drive-url "https://drive.google.com/drive/folders/..." --subject ENT
 *   node server/scripts/rag_auto_ingest.js --drive-url "https://drive.google.com/drive/folders/..." --download-dir server/data/rag_dropbox/downloads/folder_1 --download-only
 *   node server/scripts/rag_auto_ingest.js --source server/data/rag_dropbox/downloads/folder_1 --dry-run
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const pdfParse = require('pdf-parse');

const qdrantClient = require('../services/qdrantClient');
const embeddingService = require('../services/embeddingService');
const { chunkText } = require('../services/chunker');
const { SUBJECT_COLLECTION_MAP, getCollectionCandidates } = require('../services/ragCollections');

const VECTOR_SIZE = Number(process.env.RAG_VECTOR_SIZE || 1024);
const DEFAULT_COUNTRY = process.env.RAG_DEFAULT_COUNTRY || 'India';
const DEFAULT_DEGREE = process.env.RAG_DEFAULT_DEGREE || 'MBBS';
const DEFAULT_YEAR = Number(process.env.RAG_DEFAULT_YEAR || 2);
const DEFAULT_BATCH_SIZE = Number(process.env.RAG_UPSERT_BATCH_SIZE || 32);
const DEFAULT_TARGET_TOKENS = Number(process.env.RAG_PDF_CHUNK_TOKENS || 600);
const DEFAULT_OVERLAP = Number(process.env.RAG_PDF_CHUNK_OVERLAP || 100);

const RAG_DIR = path.join(__dirname, '../data/rag_dropbox');
const DOWNLOADS_DIR = path.join(RAG_DIR, 'downloads');
const COMPLETED_DIR = path.join(RAG_DIR, 'completed');
const FAILED_DIR = path.join(RAG_DIR, 'failed');

const SUBJECT_ALIASES = [
    ['Obstetrics & Gynecology', /\b(obg|obgyn|obstetrics|gynae|gynecology|gynaecology)\b/i],
    ['Community Medicine', /\b(community medicine|psm|preventive|social medicine)\b/i],
    ['Forensic Medicine', /\b(forensic|fmt)\b/i],
    ['Anatomy', /\banatomy\b/i],
    ['Physiology', /\bphysiology\b/i],
    ['Biochemistry', /\bbiochemistry\b/i],
    ['Pharmacology', /\bpharmacology|pharma\b/i],
    ['Microbiology', /\bmicrobiology|micro\b/i],
    ['Pathology', /\bpathology|robbins|muir\b/i],
    ['Surgery', /\bsurgery|surgical\b/i],
    ['Medicine', /\bmedicine|clinical medicine|internal medicine\b/i],
    ['Psychiatry', /\bpsychiatry|psych\b/i],
    ['Radiology', /\bradiology|imaging\b/i],
    ['Pediatrics', /\bpediatrics|paediatrics|pediatric|paediatric\b/i],
    ['ENT', /\b(ent|ear|nose|throat|otorhinolaryngology)\b/i],
    ['Ophthalmology', /\bophthalmology|eye\b/i],
];

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const eq = token.indexOf('=');
        if (eq !== -1) {
            args[token.slice(2, eq)] = token.slice(eq + 1);
        } else {
            const key = token.slice(2);
            const next = argv[i + 1];
            if (!next || next.startsWith('--')) {
                args[key] = true;
            } else {
                args[key] = next;
                i++;
            }
        }
    }
    return args;
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function slugify(value) {
    return String(value || 'general')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'general';
}

function titleFromFilename(filePath) {
    return path.basename(filePath, path.extname(filePath))
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function stablePointId(seed) {
    const hex = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 13);
    return Number.parseInt(hex, 16);
}

function stableShortHash(seed, length = 10) {
    return crypto.createHash('sha1').update(seed).digest('hex').slice(0, length);
}

function inferSubject(filePath, fallbackSubject) {
    if (fallbackSubject) return normalizeSubject(fallbackSubject);

    const probe = filePath.split(path.sep).join(' ');
    for (const [subject, pattern] of SUBJECT_ALIASES) {
        if (pattern.test(probe)) return subject;
    }
    return 'Medicine';
}

function normalizeSubject(subject) {
    if (!subject) return null;
    const compact = String(subject).trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    for (const key of Object.keys(SUBJECT_COLLECTION_MAP)) {
        if (key === 'default') continue;
        const keyCompact = key.toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (compact === keyCompact) return key;
    }
    for (const [key, pattern] of SUBJECT_ALIASES) {
        if (pattern.test(String(subject))) return key;
    }
    return String(subject).trim();
}

function collectionForSubject(subject, explicitCollection) {
    if (explicitCollection) return explicitCollection;
    const candidates = getCollectionCandidates(subject);
    const firstCanonical = candidates.find((name) => !name.includes('_v1')) || candidates[0];
    return firstCanonical || `mbbs_${slugify(subject)}_v2`;
}

function listPdfs(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...listPdfs(fullPath));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
            results.push(fullPath);
        }
    }
    return results;
}

function listArchives(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...listArchives(fullPath));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.zip')) {
            results.push(fullPath);
        }
    }
    return results;
}

function runChecked(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: options.cwd || process.cwd(),
        env: process.env,
        encoding: 'utf8',
        stdio: options.stdio || 'pipe',
        shell: false,
    });

    if (result.status !== 0) {
        const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
        throw new Error(`${command} ${args.join(' ')} failed${detail ? `:\n${detail}` : ''}`);
    }
    return result;
}

function downloadDriveSource(driveUrl, outputDir) {
    ensureDir(outputDir);
    const isFolder = /drive\.google\.com\/drive\/folders\//i.test(driveUrl) || /\/folders\//i.test(driveUrl);
    const args = isFolder
        ? ['-m', 'gdown', '--folder', driveUrl, '-O', outputDir, '--remaining-ok', '--continue']
        : ['-m', 'gdown', '--fuzzy', driveUrl, '-O', outputDir, '--continue'];

    console.log(`[Drive] Downloading ${isFolder ? 'folder' : 'file'} into ${outputDir}`);
    runChecked('python', args, { stdio: 'inherit' });
    return outputDir;
}

function extractZip(zipPath) {
    const outDir = path.join(path.dirname(zipPath), path.basename(zipPath, path.extname(zipPath)));
    if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) return outDir;
    ensureDir(outDir);

    console.log(`[Archive] Extracting ${path.basename(zipPath)} -> ${outDir}`);
    if (process.platform === 'win32') {
        const command = `Expand-Archive -LiteralPath ${JSON.stringify(zipPath)} -DestinationPath ${JSON.stringify(outDir)} -Force`;
        runChecked('powershell', ['-NoProfile', '-Command', command]);
    } else {
        runChecked('unzip', ['-o', zipPath, '-d', outDir]);
    }
    return outDir;
}

function extractArchives(rootDir) {
    let extracted = 0;
    for (const archive of listArchives(rootDir)) {
        extractZip(archive);
        extracted++;
    }
    return extracted;
}

function normalizePdfText(text) {
    return String(text || '')
        .replace(/\u0000/g, ' ')
        .replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, '$1$2')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

async function ensureCollection(collectionName) {
    const { collections } = await qdrantClient.getCollections();
    if (collections.some((c) => c.name === collectionName)) return;

    console.log(`[Qdrant] Creating collection ${collectionName}`);
    await qdrantClient.createCollection(collectionName, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        optimizers_config: { default_segment_number: 2 },
    });

    const indexes = [
        ['chunk_id', 'keyword'],
        ['topic_id', 'keyword'],
        ['subject', 'keyword'],
        ['country', 'keyword'],
        ['degree', 'keyword'],
        ['chapter', 'keyword'],
        ['book', 'keyword'],
        ['source_file', 'keyword'],
        ['year', 'integer'],
    ];

    for (const [field_name, field_schema] of indexes) {
        try {
            await qdrantClient.createPayloadIndex(collectionName, { field_name, field_schema });
        } catch (error) {
            if (!/already exists/i.test(error.message || '')) throw error;
        }
    }
}

async function upsertChunks(collectionName, chunks, dryRun, batchSize = DEFAULT_BATCH_SIZE) {
    if (dryRun || chunks.length === 0) return 0;

    let indexed = 0;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const points = [];

        for (const item of batch) {
            process.stdout.write(`    Embedding ${indexed + points.length + 1}/${chunks.length}\r`);
            const vector = await embeddingService.getEmbedding(item.content);
            if (!Array.isArray(vector) || vector.length !== VECTOR_SIZE) {
                throw new Error(`Vector dimension mismatch for ${item.chunk_id}: got ${vector?.length}, expected ${VECTOR_SIZE}`);
            }
            points.push({
                id: stablePointId(item.chunk_id),
                vector,
                payload: {
                    chunk_id: item.chunk_id,
                    content: item.content,
                    ...item.metadata,
                },
            });
        }

        await qdrantClient.upsert(collectionName, { wait: true, points });
        indexed += points.length;
    }

    process.stdout.write(' '.repeat(60) + '\r');
    return indexed;
}

async function preprocessPdf(pdfPath, options) {
    const subject = inferSubject(pdfPath, options.subject);
    const collectionName = collectionForSubject(subject, options.collection);
    const book = titleFromFilename(pdfPath);

    console.log(`[PDF] ${path.basename(pdfPath)} -> ${collectionName}`);
    const parsed = await pdfParse(fs.readFileSync(pdfPath));
    const text = normalizePdfText(parsed.text);

    if (text.length < 200) {
        return {
            file: path.basename(pdfPath),
            pdfPath,
            pageCount: parsed.numpages || 0,
            chunksIndexed: 0,
            pagesWithVision: 0,
            collectionName,
            subject,
            dryRun: options.dryRun,
            skipped: true,
            reason: 'PDF text extraction produced too little text',
        };
    }

    const pdfHash = stableShortHash(path.resolve(pdfPath));
    const metadata = {
        topic_id: options.topicId || `GENERAL_${slugify(subject).toUpperCase()}`,
        subject,
        chapter: options.chapter || book,
        book,
        edition: options.edition || '',
        section_heading: options.section || book,
        subsection_heading: '',
        section_title: book,
        page_start: 1,
        page_end: parsed.numpages || null,
        high_yield_score: Number(options.highYieldScore || 0.5),
        country: options.country,
        degree: options.degree,
        year: options.year,
        source_file: path.basename(pdfPath),
        source_path: path.resolve(pdfPath),
        source_kind: options.driveUrl ? 'google_drive' : 'local_folder',
    };

    const chunks = chunkText(text, metadata, options.chunkTokens, options.chunkOverlap)
        .map((chunk, index) => {
            const chunkId = `${slugify(subject).toUpperCase()}_${pdfHash}_${String(index).padStart(5, '0')}`;
            return {
                chunk_id: chunkId,
                content: chunk.content,
                metadata: {
                    ...chunk.metadata,
                    chunk_id: chunkId,
                    chunk_index: index,
                },
            };
        });

    if (!options.dryRun) {
        await ensureCollection(collectionName);
    }

    const indexed = await upsertChunks(collectionName, chunks, options.dryRun, options.batchSize);
    console.log(`    ${options.dryRun ? 'Prepared' : 'Indexed'} ${chunks.length} chunk(s)`);

    return {
        file: path.basename(pdfPath),
        pdfPath,
        pageCount: parsed.numpages || 0,
        chunksIndexed: options.dryRun ? chunks.length : indexed,
        pagesWithVision: 0,
        collectionName,
        subject,
        dryRun: options.dryRun,
    };
}

function writeReport(report, status) {
    ensureDir(COMPLETED_DIR);
    ensureDir(FAILED_DIR);

    const targetDir = status === 'failed'
        ? path.join(FAILED_DIR, report.job_id)
        : COMPLETED_DIR;
    ensureDir(targetDir);

    const filePath = status === 'failed'
        ? path.join(targetDir, 'report.json')
        : path.join(targetDir, `${report.job_id}.json`);

    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    return filePath;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const driveUrl = args['drive-url'] || args.drive || process.env.RAG_DRIVE_URL || '';
    const sourceArg = args.source || process.env.RAG_SOURCE_DIR || '';
    const dryRun = Boolean(args['dry-run'] || args.dryRun);
    const subject = normalizeSubject(args.subject || process.env.RAG_SUBJECT || '');
    const jobStem = slugify(args.name || subject || 'rag_auto');
    const jobId = `${jobStem}_${Date.now()}`;
    const downloadOnly = Boolean(args['download-only'] || args.downloadOnly);
    const downloadDir = args['download-dir'] || process.env.RAG_DOWNLOAD_DIR || '';

    ensureDir(RAG_DIR);
    ensureDir(DOWNLOADS_DIR);

    const options = {
        driveUrl,
        subject,
        collection: args.collection || process.env.RAG_COLLECTION || '',
        country: args.country || DEFAULT_COUNTRY,
        degree: args.degree || DEFAULT_DEGREE,
        year: Number(args.year || DEFAULT_YEAR),
        topicId: args['topic-id'] || '',
        chapter: args.chapter || '',
        section: args.section || '',
        edition: args.edition || '',
        highYieldScore: args['high-yield-score'] || '',
        dryRun,
        limit: args.limit ? Number(args.limit) : 0,
        batchSize: args['batch-size'] ? Number(args['batch-size']) : DEFAULT_BATCH_SIZE,
        chunkTokens: args['chunk-tokens'] ? Number(args['chunk-tokens']) : DEFAULT_TARGET_TOKENS,
        chunkOverlap: args['chunk-overlap'] ? Number(args['chunk-overlap']) : DEFAULT_OVERLAP,
    };

    let sourceDir = sourceArg ? path.resolve(sourceArg) : '';
    if (driveUrl) {
        sourceDir = downloadDir ? path.resolve(downloadDir) : path.join(DOWNLOADS_DIR, jobId);
        downloadDriveSource(driveUrl, sourceDir);
    }
    if (!sourceDir) {
        sourceDir = DOWNLOADS_DIR;
    }

    const report = {
        job_id: jobId,
        archive_name: path.basename(sourceDir),
        source_folder: sourceDir,
        drive_url: driveUrl || null,
        dry_run: dryRun,
        started_at: new Date().toISOString(),
        pdfs: [],
        registered_collections: [],
    };

    try {
        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Source folder does not exist: ${sourceDir}`);
        }

        const archivesExtracted = extractArchives(sourceDir);
        const pdfs = listPdfs(sourceDir).slice(0, options.limit || undefined);
        report.archives_extracted = archivesExtracted;

        if (downloadOnly) {
            report.pdfs = pdfs.map((pdfPath) => ({
                file: path.basename(pdfPath),
                pdfPath,
                dryRun: true,
                downloaded: true,
            }));
            report.completed_at = new Date().toISOString();
            report.status = 'downloaded';
            const reportPath = writeReport(report, 'completed');
            console.log(`[RAG] Download complete enough for ${pdfs.length} PDF(s). Report: ${reportPath}`);
            return;
        }

        if (pdfs.length === 0) {
            throw new Error(`No PDF files found under ${sourceDir}`);
        }

        console.log(`[RAG] ${dryRun ? 'Dry run' : 'Ingest'} job ${jobId}`);
        console.log(`[RAG] Found ${pdfs.length} PDF(s).`);

        for (const pdfPath of pdfs) {
            try {
                const result = await preprocessPdf(pdfPath, options);
                report.pdfs.push(result);
                if (!report.registered_collections.includes(result.collectionName)) {
                    report.registered_collections.push(result.collectionName);
                }
            } catch (error) {
                report.pdfs.push({
                    file: path.basename(pdfPath),
                    pdfPath,
                    status: 'failed',
                    error: error.stack || error.message,
                });
                console.error(`[PDF] Failed ${path.basename(pdfPath)}: ${error.message}`);
            }
        }

        const failures = report.pdfs.filter((item) => item.status === 'failed');
        report.completed_at = new Date().toISOString();
        report.status = failures.length === report.pdfs.length ? 'failed' : failures.length ? 'completed_with_errors' : 'completed';

        const reportPath = writeReport(report, report.status === 'failed' ? 'failed' : 'completed');
        console.log(`[RAG] ${report.status}. Report: ${reportPath}`);

        if (report.status === 'failed') process.exit(1);
    } catch (error) {
        report.completed_at = new Date().toISOString();
        report.status = 'failed';
        report.error = error.stack || error.message;
        const reportPath = writeReport(report, 'failed');
        console.error(`[RAG] Failed. Report: ${reportPath}`);
        console.error(error.message);
        process.exit(1);
    }
}

main();
