const { addDays, differenceInDays, format } = require('date-fns');

class StudyService {
  constructor() {
    this.topicsBySubject = {
      Anatomy: [
        'Gross Anatomy',
        'Histology',
        'Embryology',
        'Neuroanatomy',
        'Radiological Anatomy',
      ],
      Physiology: [
        'General Physiology',
        'Cardiovascular Physiology',
        'Respiratory Physiology',
        'Gastrointestinal Physiology',
        'Endocrine Physiology',
      ],
      Biochemistry: [
        'Molecular Biology',
        'Metabolism',
        'Enzymology',
        'Clinical Biochemistry',
        'Nutrition',
      ],
      Pharmacology: [
        'General Pharmacology',
        'Autonomic Pharmacology',
        'Cardiovascular Pharmacology',
        'Central Nervous System Pharmacology',
        'Chemotherapy',
      ],
      Pathology: [
        'General Pathology',
        'Systemic Pathology',
        'Clinical Pathology',
        'Hematology',
        'Immunology',
      ],
    };
  }

  async generateStudyPlan(examDate, selectedSubjects, weakSubjects) {
    // Validate exam date
    const examDateObj = new Date(examDate);
    if (isNaN(examDateObj.getTime())) {
      throw new Error('Invalid exam date');
    }

    // Calculate days until exam
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilExam = Math.ceil(
      (examDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExam <= 0) {
      throw new Error('Exam date must be in the future');
    }

    // Validate subjects
    const validSubjects = Object.keys(this.topicsBySubject);
    const invalidSubjects = selectedSubjects.filter(
      (subject) => !validSubjects.includes(subject)
    );
    if (invalidSubjects.length > 0) {
      throw new Error(`Invalid subjects: ${invalidSubjects.join(', ')}`);
    }

    // Get all topics for selected subjects
    const allTopics = this.getAllTopics(selectedSubjects);
    const weakSubjectTopics = this.getTopicsForSubjects(weakSubjects);
    const regularTopics = allTopics.filter(
      (topic) => !weakSubjectTopics.includes(topic)
    );

    // Calculate topics per day
    const totalTopics = allTopics.length;
    const topicsPerDay = Math.ceil(totalTopics / daysUntilExam);

    // Generate daily plan
    const dailyPlan = [];
    let currentDate = new Date(today);
    let remainingTopics = [...weakSubjectTopics, ...regularTopics];

    while (remainingTopics.length > 0 && currentDate < examDateObj) {
      const dayTopics = remainingTopics.splice(0, topicsPerDay);
      dailyPlan.push({
        date: currentDate.toISOString().split('T')[0],
        topics: dayTopics,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      examDate: examDateObj.toISOString(),
      daysRemaining: daysUntilExam,
      totalTopics,
      dailyPlan,
    };
  }

  async getStudyPlan() {
    // In a real application, this would fetch from a database
    return {
      examDate: new Date().toISOString(),
      daysRemaining: 30,
      totalTopics: 100,
      dailyPlan: [],
    };
  }

  async updateStudyPlan(dailyPlan) {
    // In a real application, this would update a database
    return {
      dailyPlan,
      updatedAt: new Date().toISOString(),
    };
  }

  getAllTopics(subjects) {
    return subjects.flatMap((subject) => this.topicsBySubject[subject] || []);
  }

  getTopicsForSubjects(subjects) {
    return this.getAllTopics(subjects);
  }
}

module.exports = new StudyService(); 