const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');

// Study plan routes
router.post('/generate', studyController.generateStudyPlan);
router.get('/today', studyController.getTodayTasks);
router.post('/tick', studyController.tickTask);
router.post('/task/add', studyController.addTask);
router.put('/task/edit', studyController.editTask);
router.get('/analytics', studyController.getAnalytics);
router.get('/plan', studyController.getStudyPlan); // Full plan for the Plan tab
router.get('/syllabus', studyController.getSyllabus); // Fetch syllabus for setup

module.exports = router;