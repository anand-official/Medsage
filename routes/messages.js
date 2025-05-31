const express = require('express');
const router = express.Router();

// Get messages
router.get('/', (req, res) => {
  res.json({ message: 'Get messages endpoint' });
});

// Send message
router.post('/', (req, res) => {
  res.json({ message: 'Send message endpoint' });
});

module.exports = router; 