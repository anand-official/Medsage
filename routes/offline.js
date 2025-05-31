const express = require('express');
const router = express.Router();

// Sync offline data
router.post('/sync', (req, res) => {
  res.json({ message: 'Sync offline data endpoint' });
});

// Get offline data
router.get('/data', (req, res) => {
  res.json({ message: 'Get offline data endpoint' });
});

module.exports = router; 