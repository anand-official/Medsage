const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');

// Study plan routes
router.post('/generate', studyController.generateStudyPlan);
router.get('/plan', studyController.getStudyPlan);
router.put('/plan', studyController.updateStudyPlan);

module.exports = router; 