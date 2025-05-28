const studyService = require('../services/studyService');

class StudyController {
  async generateStudyPlan(req, res, next) {
    try {
      const { examDate, selectedSubjects, weakSubjects } = req.body;

      if (!examDate || !selectedSubjects || !weakSubjects) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: examDate, selectedSubjects, weakSubjects',
        });
      }

      const studyPlan = await studyService.generateStudyPlan(
        examDate,
        selectedSubjects,
        weakSubjects
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
      const studyPlan = await studyService.getStudyPlan();
      res.json({
        success: true,
        data: studyPlan,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStudyPlan(req, res, next) {
    try {
      const { dailyPlan } = req.body;

      if (!dailyPlan) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: dailyPlan',
        });
      }

      const updatedPlan = await studyService.updateStudyPlan(dailyPlan);
      res.json({
        success: true,
        data: updatedPlan,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StudyController(); 