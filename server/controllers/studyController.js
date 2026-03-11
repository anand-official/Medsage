const studyService = require('../services/studyService');

class StudyController {
  async generateStudyPlan(req, res, next) {
    try {
      const { year, country, examDate, selectedSubjects, weakTopics, strongTopics } = req.body;
      const uid = req.user?.uid || req.body.uid || req.headers['x-user-id'];

      if (!uid) {
        return res.status(401).json({ success: false, error: 'Unauthorized: No UID provided' });
      }

      if (!year || !examDate || !selectedSubjects || !weakTopics) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: year, examDate, selectedSubjects, weakTopics',
        });
      }

      const studyPlan = await studyService.generatePlanWithAI(
        uid,
        year,
        country,
        examDate,
        selectedSubjects,
        weakTopics,
        strongTopics || []
      );

      res.json({
        success: true,
        data: studyPlan,
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudyPlan(req, res, next) {
    try {
      const uid = req.user?.uid || req.query.uid || req.headers['x-user-id'];
      if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const studyPlan = await studyService.getStudyPlan(uid);
      res.json({
        success: true,
        data: studyPlan,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTodayTasks(req, res, next) {
    try {
      const uid = req.user?.uid || req.query.uid || req.headers['x-user-id'];
      if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const tasksData = await studyService.getTodayTasks(uid);
      res.json({
        success: true,
        data: tasksData,
      });
    } catch (error) {
      next(error);
    }
  }

  async tickTask(req, res, next) {
    try {
      const uid = req.user?.uid || req.body.uid || req.headers['x-user-id'];
      if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const { dateStr, taskId, completed } = req.body;

      const updatedDayData = await studyService.tickTask(uid, dateStr, taskId, completed);
      res.json({
        success: true,
        data: updatedDayData,
      });
    } catch (error) {
      next(error);
    }
  }

  async addTask(req, res, next) {
    try {
      const uid = req.user?.uid || req.body.uid || req.headers['x-user-id'];
      if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const { dateStr, text } = req.body;
      if (!text) return res.status(400).json({ success: false, error: 'Task text is required' });

      const updatedDayData = await studyService.addTask(uid, dateStr, text);
      res.json({ success: true, data: updatedDayData });
    } catch (error) {
      next(error);
    }
  }

  async editTask(req, res, next) {
    try {
      const uid = req.user?.uid || req.body.uid || req.headers['x-user-id'];
      if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const { dateStr, taskId, newText } = req.body;
      if (!newText || !taskId) return res.status(400).json({ success: false, error: 'Task ID and newText required' });

      const updatedDayData = await studyService.editTask(uid, dateStr, taskId, newText);
      res.json({ success: true, data: updatedDayData });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      const uid = req.user?.uid || req.query.uid || req.headers['x-user-id'];
      if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const analyticsData = await studyService.getAnalytics(uid);
      res.json({
        success: true,
        data: analyticsData,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSyllabus(req, res, next) {
    try {
      const year = parseInt(req.query.year) || 1;
      const country = req.query.country || 'India';
      const syllabusScraper = require('../services/syllabusScraper');
      const curriculum = await syllabusScraper.getCurriculum(country, year);
      res.json({ success: true, data: curriculum });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudyController();