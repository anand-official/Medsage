/**
 * patchCovers.js — Targeted cover-image fixer for books with coverUrl: null
 *
 * Tries extra sources not in the main crawler:
 *   1. Open Library OLID-based cover (via search JSON)
 *   2. Open Library title-based cover (higher zoom)
 *   3. LibraryThing cover API
 *   4. WorldCat thumbnail via xISBN
 *   5. Direct Google Books image URL constructed from GID
 *
 * Usage: node server/scripts/patchCovers.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
if (!process.env.GOOGLE_BOOKS_API_KEY) {
    require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
}

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '../data/academy_library.json');
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function headOk(url) {
    try {
        const r = await axios.head(url, { timeout: 6000, maxRedirects: 3, validateStatus: s => s < 400 });
        const ct = r.headers['content-type'] || '';
        const cl = parseInt(r.headers['content-length'] || '0', 10);
        return ct.includes('image') && cl > 1500;
    } catch { return false; }
}

async function getOk(url) {
    try {
        const r = await axios.get(url, { timeout: 6000, maxRedirects: 3, validateStatus: s => s < 400, responseType: 'arraybuffer' });
        const ct = r.headers['content-type'] || '';
        return ct.includes('image') && r.data.byteLength > 1500 ? url : null;
    } catch { return null; }
}

// ── Source 1: Google Books API — try a fresh search with author+title
async function tryGoogleBooks(book) {
    const q = `${book.title} ${book.author.split(/[,;]/)[0].trim()}`;
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&printType=books`;
    if (GOOGLE_API_KEY) url += `&key=${GOOGLE_API_KEY}`;

    try {
        const resp = await axios.get(url, { timeout: 10000 });
        const items = resp.data?.items || [];
        for (const item of items) {
            const il = item.volumeInfo?.imageLinks || {};
            let imgUrl = il.thumbnail || il.smallThumbnail;
            if (imgUrl) {
                // Upgrade to large
                imgUrl = imgUrl.replace(/zoom=\d/, 'zoom=2').replace(/&edge=curl/g, '').replace(/^http:/, 'https:');
                if (await headOk(imgUrl)) return imgUrl;
            }
        }
    } catch { }
    return null;
}

// ── Source 2: Open Library — get OLID then cover
async function tryOpenLibrary(book) {
    const q = encodeURIComponent(`${book.title} ${book.author.split(/[,;]/)[0].trim()}`);
    try {
        const resp = await axios.get(`https://openlibrary.org/search.json?q=${q}&limit=5`, { timeout: 8000 });
        const docs = resp.data?.docs || [];
        for (const doc of docs) {
            // Try cover_i (cover ID)
            if (doc.cover_i) {
                const imgUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
                if (await headOk(imgUrl)) return imgUrl;
            }
            // Try ISBN list
            for (const isbn of (doc.isbn || []).slice(0, 3)) {
                const imgUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
                if (await headOk(imgUrl)) return imgUrl;
            }
        }
    } catch { }
    return null;
}

// ── Source 3: WorldCat cover thumbnail via ISBN
async function tryWorldCat(book) {
    if (!book.isbn) return null;
    const isbn = book.isbn.replace(/[^0-9X]/gi, '');
    const url = `https://www.worldcat.org/isbn/${isbn}`;
    // WorldCat uses thumbnail from syndetics / amazon
    const synUrl = `https://syndetics.com/index.php?isbn=${isbn}/LC.JPG`;
    if (await headOk(synUrl)) return synUrl;
    return null;
}

// ── Source 4: LibraryThing by ISBN
async function tryLibraryThing(book) {
    if (!book.isbn) return null;
    const isbn = book.isbn.replace(/[^0-9X]/gi, '');
    const url = `https://covers.librarything.com/devkey/LibraryThing/large/isbn/${isbn}`;
    if (await headOk(url)) return url;
    return null;
}

async function patchBook(book) {
    process.stdout.write(`  Patching: "${book.title}"...\n`);

    let coverUrl = null;

    coverUrl = await tryGoogleBooks(book);
    if (coverUrl) { process.stdout.write(`    ✓ Google Books\n`); return coverUrl; }

    await sleep(300);
    coverUrl = await tryOpenLibrary(book);
    if (coverUrl) { process.stdout.write(`    ✓ Open Library\n`); return coverUrl; }

    await sleep(200);
    coverUrl = await tryLibraryThing(book);
    if (coverUrl) { process.stdout.write(`    ✓ LibraryThing\n`); return coverUrl; }

    coverUrl = await tryWorldCat(book);
    if (coverUrl) { process.stdout.write(`    ✓ WorldCat/Syndetics\n`); return coverUrl; }

    process.stdout.write(`    ✗ No cover found — gradient placeholder will be used\n`);
    return null;
}

async function main() {
    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  MEDSAGE — COVER IMAGE PATCHER            ║');
    console.log('╚═══════════════════════════════════════════╝\n');

    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    const noCoverBooks = data.books.filter(b => !b.coverUrl);

    console.log(`Books without cover: ${noCoverBooks.length}`);
    if (noCoverBooks.length === 0) {
        console.log('All books already have covers! Nothing to do.\n');
        return;
    }

    let fixed = 0;
    for (const book of noCoverBooks) {
        const coverUrl = await patchBook(book);
        if (coverUrl) {
            // Update in-place
            const idx = data.books.findIndex(b => b.id === book.id);
            if (idx !== -1) {
                data.books[idx].coverUrl = coverUrl;
                data.books[idx].source = data.books[idx].source + '_cover_patched';
                fixed++;
            }
        }
        await sleep(400);
    }

    // Save
    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');

    console.log(`\n✅ Patched ${fixed}/${noCoverBooks.length} books with real covers`);
    console.log(`📁 Saved → ${JSON_PATH}\n`);
}

main().catch(err => {
    console.error('Patcher crashed:', err);
    process.exit(1);
});
