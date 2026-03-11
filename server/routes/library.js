const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { verifyToken } = require('../middleware/auth');

const LIBRARY_PATH = path.join(__dirname, '../data/academy_library.json');

/**
 * GET /api/library
 * Returns the full academy library (all books across all years)
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

        const data = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));

        // Optional query params for filtering
        const { year, category, search } = req.query;
        let books = data.books || [];

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

        res.json({
            lastUpdated: data.lastUpdated,
            totalBooks: books.length,
            yearBreakdown: data.yearBreakdown,
            books
        });
    } catch (error) {
        console.error('[Library API] Error:', error.message);
        res.status(500).json({ error: 'Failed to load library data' });
    }
});

/**
 * POST /api/library/refresh
 * Re-runs the crawler to update the library data
 * Requires authentication to prevent DoS attacks
 */
router.post('/refresh', verifyToken, async (req, res) => {
    try {
        // Check if user has admin role (optional - add admin check if needed)
        // For now, any authenticated user can trigger refresh
        
        const { runCrawler } = require('../scripts/academyCrawler');
        const result = await runCrawler();
        res.json({
            success: true,
            message: `Library refreshed with ${result.totalBooks} books`,
            lastUpdated: result.lastUpdated
        });
    } catch (error) {
        console.error('[Library API] Refresh error:', error.message);
        res.status(500).json({ error: 'Failed to refresh library' });
    }
});

module.exports = router;
