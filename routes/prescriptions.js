const express = require('express');
const router = express.Router();

// Get prescriptions
router.get('/', (req, res) => {
  res.json({ message: 'Get prescriptions endpoint' });
});

// Create prescription
router.post('/', (req, res) => {
  res.json({ message: 'Create prescription endpoint' });
});

module.exports = router; 