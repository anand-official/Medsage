'use strict';

const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const studyController = require('../controllers/studyController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

// ── GET /api/v1/study/syllabus ────────────────────────────────────────────────
router.get('/syllabus',
    query('year').optional().isInt({ min: 1, max: 6 }).toInt(),
    query('country').optional().isString().trim().isLength({ max: 100 }),
    validate,
    studyController.getSyllabus
);

// ── POST /api/v1/study/generate ───────────────────────────────────────────────
router.post('/generate',
    verifyToken,
    body('year').exists().isInt({ min: 1, max: 6 }).toInt(),
    body('country').optional().isString().trim().isLength({ max: 100 }),
    body('planMode').optional().isIn(['exam', 'self_study']),
    body('examDate').optional({ nullable: true }).isISO8601(),
    body('studyDurationDays').optional({ nullable: true }).isInt({ min: 7, max: 84 }).toInt(),
    body('selectedSubjects').optional().isArray(),
    body('selectedTopicKeys').optional().isArray(),
    body('weakTopics').optional().isArray(),
    body('strongTopics').optional().isArray(),
    validate,
    studyController.generateStudyPlan
);

// ── GET /api/v1/study/plan ────────────────────────────────────────────────────
router.get('/plan', verifyToken, studyController.getStudyPlan);

// ── GET /api/v1/study/today ───────────────────────────────────────────────────
router.get('/today', verifyToken, studyController.getTodayTasks);

// ── POST /api/v1/study/tick ───────────────────────────────────────────────────
router.post('/tick',
    verifyToken,
    body('dateStr').notEmpty().isString().trim().isLength({ max: 20 }),
    body('taskId').notEmpty().isString().trim().isLength({ max: 100 }),
    body('completed').isBoolean().toBoolean(),
    validate,
    studyController.tickTask
);

// ── POST /api/v1/study/task/add ───────────────────────────────────────────────
router.post('/task/add',
    verifyToken,
    body('dateStr').notEmpty().isString().trim().isLength({ max: 20 }),
    body('text').notEmpty().isString().trim().isLength({ min: 1, max: 500 }),
    validate,
    studyController.addTask
);

// ── PUT /api/v1/study/task/edit ───────────────────────────────────────────────
router.put('/task/edit',
    verifyToken,
    body('dateStr').notEmpty().isString().trim().isLength({ max: 20 }),
    body('taskId').notEmpty().isString().trim().isLength({ max: 100 }),
    body('newText').notEmpty().isString().trim().isLength({ min: 1, max: 500 }),
    validate,
    studyController.editTask
);

// ── GET /api/v1/study/analytics ───────────────────────────────────────────────
router.get('/analytics', verifyToken, studyController.getAnalytics);

// ── POST /api/v1/study/goal/tick ──────────────────────────────────────────────
router.post('/goal/tick',
    verifyToken,
    body('goalType').notEmpty().isString().trim().isLength({ max: 50 }),
    body('goalId').notEmpty().isString().trim().isLength({ max: 100 }),
    validate,
    studyController.tickGoal
);

module.exports = router;
