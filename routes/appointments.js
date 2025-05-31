const express = require('express');
const router = express.Router();

// Get appointments
router.get('/', (req, res) => {
  res.json({ message: 'Get appointments endpoint' });
});

// Create appointment
router.post('/', (req, res) => {
  res.json({ message: 'Create appointment endpoint' });
});

module.exports = router; 