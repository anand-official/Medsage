const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { verifyToken, isAdmin } = require('../middleware/auth');

const LIBRARY_PATH = path.join(__dirname, '../data/academy_library.json');

// ─── IN-MEMORY CACHE ─────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let _cache = null;     // { data: Object, expiresAt: number }

function getCached() {
    if (_cache && Date.now() < _cache.expiresAt) {
        return _cache.data;
    }
    return null;
}

function setCache(data) {
    _cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
}

function invalidateCache() {
    _cache = null;
}

/**
 * GET /api/library
 * Returns the full academy library with support for filtering and grouping by year
 *
 * Query params:
 * - year: Filter by year (1-4)
 * - category: Filter by category
 * - search: Free-text search
 * - groupByYear: true/false - Group results by year
 * - linksOnly: true/false - Return only links for each book (simplified format)
 */
router.get('/', (req, res) => {
    try {
        if (!fs.existsSync(LIBRARY_PATH)) {
            return res.json({
                lastUpdated: null,
                totalBooks: 0,
                books: [],
                message: 'Library not yet populated. Run the crawler first.'
            });
        }

        // Try cache first
        let data = getCached();
        if (!data) {
            try {
                data = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));
                setCache(data);
            } catch (parseErr) {
                return res.status(500).json({
                    success: false,
                    error: 'Library data is corrupt. Re-run the crawler.'
                });
            }
        }

        // Optional query params for filtering
        const { year, category, search, groupByYear, linksOnly, course } = req.query;
        let books = data.books || [];

        // Apply filters
        if (course && course !== 'ALL') {
            books = books.filter(b => b.course === course.toUpperCase());
        }
        if (year) {
            books = books.filter(b => b.year === parseInt(year));
        }
        if (category) {
            books = books.filter(b => b.category.toLowerCase() === category.toLowerCase());
        }
        if (search) {
            const q = search.toLowerCase();
            books = books.filter(b =>
                b.title.toLowerCase().includes(q) ||
                b.author.toLowerCase().includes(q) ||
                b.category.toLowerCase().includes(q) ||
                b.description.toLowerCase().includes(q)
            );
        }

        // If linksOnly, simplify the response to just title and links
        let response = {
            lastUpdated: data.lastUpdated,
            course: data.course || 'ALL',
            totalBooks: books.length,
            yearBreakdown: data.yearBreakdown,
        };

        if (linksOnly === 'true') {
            // Simplified format with just title and links
            if (groupByYear === 'true') {
                response.byYear = {};
                for (let y = 1; y <= 4; y++) {
                    const yearBooks = books.filter(b => b.year === y);
                    if (yearBooks.length > 0) {
                        response.byYear[`year${y}`] = yearBooks.map(b => ({
                            title: b.title,
                            author: b.author,
                            category: b.category,
                            pdfLink: b.pdfLink,
                            pdfSearch: b.pdfSearch,
                            freeLinks: b.freeLinks || [],
                        }));
                    }
                }
            } else {
                response.books = books.map(b => ({
                    title: b.title,
                    author: b.author,
                    category: b.category,
                    year: b.year,
                    pdfLink: b.pdfLink,
                    pdfSearch: b.pdfSearch,
                    freeLinks: b.freeLinks || [],
                }));
            }
        } else if (groupByYear === 'true') {
            // Full format grouped by year
            response.byYear = {};
            for (let y = 1; y <= 4; y++) {
                const yearBooks = books.filter(b => b.year === y);
                if (yearBooks.length > 0) {
                    response.byYear[`year${y}`] = yearBooks;
                }
            }
        } else {
            // Full format as array
            response.books = books;
        }

        res.json(response);
    } catch (error) {
        console.error('[Library API] Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to load library data'
        });
    }
});

/**
 * POST /api/library/refresh
 * Re-runs the crawler to update the library data
 * Optional authentication (rate limiting is applied globally)
 */
router.post('/refresh', verifyToken, isAdmin, (req, res) => {
    // Return immediately so the request doesn't timeout on Render (30s limit).
    // The crawl runs in the background.
    res.status(202).json({
        success: true,
        message: 'Library refresh started in the background. Check back in a few minutes.'
    });

    // Run crawler asynchronously after response is sent
    setImmediate(async () => {
        try {
            // Invalidate cache before starting the crawl
            invalidateCache();

            const { runCrawler } = require('../scripts/academyCrawler');
            const result = await runCrawler();
            console.log(`[Library API] Background refresh complete: ${result.totalBooks} books (MBBS: ${result.courseBreakdown.MBBS}, BDS: ${result.courseBreakdown.BDS})`);
        } catch (error) {
            console.error('[Library API] Background refresh error:', error.message);
        }
    });
});

module.exports = router;
