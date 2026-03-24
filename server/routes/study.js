const express = require('express');
const router = express.Router();
const studyController = require('../controllers/studyController');
const { verifyToken } = require('../middleware/auth');

// Public routes (no auth required)
router.get('/syllabus', studyController.getSyllabus);

// Authenticated study plan routes — uid always comes from req.user.uid (decoded token)
router.post('/generate', verifyToken, studyController.generateStudyPlan);
router.get('/today', verifyToken, studyController.getTodayTasks);
router.post('/tick', verifyToken, studyController.tickTask);
router.post('/task/add', verifyToken, studyController.addTask);
router.put('/task/edit', verifyToken, studyController.editTask);
router.get('/analytics', verifyToken, studyController.getAnalytics);
router.get('/plan', verifyToken, studyController.getStudyPlan);
router.post('/goal/tick', verifyToken, studyController.tickGoal);

module.exports = router;