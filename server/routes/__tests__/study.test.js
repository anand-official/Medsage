jest.mock('../../controllers/studyController', () => ({
  generateStudyPlan: jest.fn((req, res) => res.json({ success: true, data: { plan: 'generated', year: req.body.year } })),
  getStudyPlan: jest.fn((req, res) => res.json({ success: true, data: { id: 'plan-1' } })),
  getTodayTasks: jest.fn((req, res) => res.json({ success: true, data: { tasks: [] } })),
  tickTask: jest.fn((req, res) => res.json({ success: true, data: { tasks: [] } })),
  addTask: jest.fn((req, res) => res.json({ success: true, data: { tasks: [{ text: req.body.text }] } })),
  editTask: jest.fn((req, res) => res.json({ success: true, data: { tasks: [{ id: req.body.taskId, text: req.body.newText }] } })),
  getAnalytics: jest.fn((req, res) => res.json({ success: true, data: { heatmap: [] } })),
  rebalancePlan: jest.fn((req, res) => res.json({ success: true, data: { moved: [] } })),
  assistantChat: jest.fn((req, res) => res.json({ success: true, data: { message: 'ok', proposed_changes: [] } })),
  applyAssistantProposal: jest.fn((req, res) => res.json({ success: true, data: { applied_changes: [] } })),
  getResources: jest.fn((req, res) => res.json({ success: true, data: { resources: [] } })),
  getDailyAdvisory: jest.fn((req, res) => res.json({ success: true, data: { summary: 'Keep going' } })),
  tickGoal: jest.fn((req, res) => res.json({ success: true, data: { done: true } })),
  getSyllabus: jest.fn((req, res) => res.json({ success: true, data: {} })),
}));

jest.mock('../../middleware/auth', () => ({
  verifyToken: jest.fn((req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_MISSING_TOKEN',
        ...(req.id && { requestId: req.id }),
      });
    }
    req.user = { uid: 'user-1' };
    return next();
  }),
}));

const express = require('express');
const studyController = require('../../controllers/studyController');
const studyRoutes = require('../study');

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || 'rid-test';
    res.setHeader('x-request-id', req.id);
    next();
  });
  app.use('/api/v1/study', studyRoutes);

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('study routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /plan returns auth envelope when token is missing', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/study/plan`, {
        headers: { 'x-request-id': 'rid-plan-auth' },
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_MISSING_TOKEN',
        requestId: 'rid-plan-auth',
      });
      expect(studyController.getStudyPlan).not.toHaveBeenCalled();
    });
  });

  test('POST /generate rejects missing year with validation envelope', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/study/generate`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          'x-request-id': 'rid-generate-invalid',
        },
        body: JSON.stringify({
          planMode: 'exam',
          examDate: '2030-01-01',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
      expect(body.requestId).toBe('rid-generate-invalid');
      expect(studyController.generateStudyPlan).not.toHaveBeenCalled();
    });
  });

  test('POST /generate accepts the planner payload shape used by the frontend', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/study/generate`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: 2,
          country: 'India',
          planMode: 'exam',
          examDate: '2030-01-01',
          selectedSubjects: ['Pathology'],
          selectedTopicKeys: ['Pathology::Inflammation'],
          weakTopics: ['Inflammation'],
          strongTopics: [],
          dailyAvailableMinutes: 120,
          targetIntensity: 'balanced',
          learningStyle: 'visual',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true, data: { plan: 'generated', year: 2 } });
      expect(studyController.generateStudyPlan).toHaveBeenCalled();
    });
  });

  test('POST /task/add validates non-empty text', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/study/task/add`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          'x-request-id': 'rid-add-invalid',
        },
        body: JSON.stringify({ dateStr: '2030-01-01', text: '' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation failed');
      expect(body.requestId).toBe('rid-add-invalid');
      expect(studyController.addTask).not.toHaveBeenCalled();
    });
  });

  test('POST /tick validates planner date format', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/study/tick`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          'x-request-id': 'rid-tick-invalid',
        },
        body: JSON.stringify({ dateStr: 'tomorrow', taskId: 'task-1', completed: true }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation failed');
      expect(body.requestId).toBe('rid-tick-invalid');
      expect(studyController.tickTask).not.toHaveBeenCalled();
    });
  });

  test('PUT /task/edit validates required newText', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/study/task/edit`, {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
          'x-request-id': 'rid-edit-invalid',
        },
        body: JSON.stringify({ dateStr: '2030-01-01', taskId: 'task-1' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation failed');
      expect(body.requestId).toBe('rid-edit-invalid');
      expect(studyController.editTask).not.toHaveBeenCalled();
    });
  });

  test('GET /today and /analytics remain reachable with auth', async () => {
    await withServer(async (baseUrl) => {
      const headers = { Authorization: 'Bearer token' };
      const todayResponse = await fetch(`${baseUrl}/api/v1/study/today`, { headers });
      const analyticsResponse = await fetch(`${baseUrl}/api/v1/study/analytics`, { headers });

      expect(todayResponse.status).toBe(200);
      expect(await todayResponse.json()).toEqual({ success: true, data: { tasks: [] } });
      expect(analyticsResponse.status).toBe(200);
      expect(await analyticsResponse.json()).toEqual({ success: true, data: { heatmap: [] } });
      expect(studyController.getTodayTasks).toHaveBeenCalled();
      expect(studyController.getAnalytics).toHaveBeenCalled();
    });
  });

  test('new v2 planner endpoints are reachable with auth and validate payloads', async () => {
    await withServer(async (baseUrl) => {
      const headers = {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      };

      const chatResponse = await fetch(`${baseUrl}/api/v1/study/assistant/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: 'make tomorrow lighter' }),
      });
      const applyResponse = await fetch(`${baseUrl}/api/v1/study/assistant/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ proposalId: 'proposal-1' }),
      });
      const rebalanceResponse = await fetch(`${baseUrl}/api/v1/study/plan/rebalance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: 'missed days', maxMoved: 5 }),
      });
      const resourceResponse = await fetch(`${baseUrl}/api/v1/study/resources?subject=Pathology&topic=Inflammation&country=India&year=2`, {
        headers: { Authorization: 'Bearer token' },
      });

      expect(chatResponse.status).toBe(200);
      expect(applyResponse.status).toBe(200);
      expect(rebalanceResponse.status).toBe(200);
      expect(resourceResponse.status).toBe(200);
      expect(studyController.assistantChat).toHaveBeenCalled();
      expect(studyController.applyAssistantProposal).toHaveBeenCalled();
      expect(studyController.rebalancePlan).toHaveBeenCalled();
      expect(studyController.getResources).toHaveBeenCalled();
    });
  });
});
