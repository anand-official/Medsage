const express = require('express');
const router = express.Router();

// Get consultations
router.get('/', (req, res) => {
  res.json({ message: 'Get consultations endpoint' });
});

// Create consultation
router.post('/', (req, res) => {
  res.json({ message: 'Create consultation endpoint' });
});

module.exports = router; 