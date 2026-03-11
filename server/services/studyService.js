const { differenceInDays, format, addDays, parseISO, startOfDay } = require('date-fns');
const StudyPlan = require('../models/StudyPlan');
const geminiService = require('./geminiService');
const syllabusScraper = require('./syllabusScraper');

class StudyService {
  constructor() {
    // Year-aware curriculum registry (simplified for MVP)
    this.curriculum = {
      1: { // Pre-Clinical
        Anatomy: ['Gross Anatomy', 'Histology', 'Embryology', 'Neuroanatomy'],
        Physiology: ['General Physiology', 'Cardiovascular', 'Respiratory', 'Nervous System'],
        Biochemistry: ['Molecular Biology', 'Metabolism', 'Genetics']
      },
      2: { // Para-Clinical
        Pathology: ['General Pathology', 'Systemic Pathology', 'Clinical Pathology'],
        Pharmacology: ['General Pharmacology', 'Autonomic', 'Cardiovascular', 'Chemotherapy'],
        Microbiology: ['Bacteriology', 'Virology', 'Parasitology']
      },
      3: { // Clinical Part 1
        PSM: ['Epidemiology', 'Public Health', 'Biostatistics'],
        ENT: ['Ear', 'Nose', 'Throat'],
        Ophthalmology: ['Anterior Segment', 'Posterior Segment', 'Neuro-ophthalmology']
      },
      4: { // Clinical Part 2
        Medicine: ['Cardiology', 'Neurology', 'Gastroenterology', 'Endocrinology'],
        Surgery: ['General Surgery', 'Orthopedics', 'Trauma'],
        OBGYN: ['Obstetrics', 'Gynecology'],
        Pediatrics: ['Neonatology', 'General Pediatrics']
      },
      5: { // Internship
        Internship: ['Clinical Posting 1', 'Clinical Posting 2', 'Electives']
      }
    };
  }

  getSubjectsForYear(year) {
    return Object.keys(this.curriculum[year] || {});
  }

  async getAllTopics(country, year, subjects) {
    const yearCurriculum = await syllabusScraper.getCurriculum(country, year);
    let topics = [];
    for (const sub of subjects) {
      if (yearCurriculum[sub]) {
        topics.push(...yearCurriculum[sub].map(t => ({ subject: sub, topic: t })));
      }
    }
    return topics;
  }

  async generatePlanWithAI(uid, year, country, examDate, selectedSubjects, weakTopics, strongTopics) {
    const examDateObj = startOfDay(parseISO(examDate));
    if (isNaN(examDateObj.getTime()) || examDateObj < startOfDay(new Date())) {
      throw new Error('Valid future exam date is required');
    }

    // Retrieve previous plan to delete/overwrite if exists
    await StudyPlan.findOneAndDelete({ uid });

    const allTopics = await this.getAllTopics(country || 'India', year, selectedSubjects);
    if (allTopics.length === 0) {
      throw new Error('No topics found for the selected subjects and year.');
    }

    // Prioritize weak topics
    let sortedTopics = [];
    const weak = allTopics.filter(t => weakTopics.includes(t.topic));
    const strong = allTopics.filter(t => strongTopics.includes(t.topic));
    const regular = allTopics.filter(t => !weakTopics.includes(t.topic) && !strongTopics.includes(t.topic));

    sortedTopics = [...weak, ...regular, ...strong];

    const today = startOfDay(new Date());
    const daysUntilExam = differenceInDays(examDateObj, today);

    if (daysUntilExam < 1) throw new Error('Exam date is too close');

    let learningDaysCount = Math.floor(daysUntilExam * 0.8); // 80% for learning
    if (learningDaysCount < 1) learningDaysCount = 1; // Prevent Infinity
    const reviewDaysCount = daysUntilExam - learningDaysCount; // 20% for pure mock exams/review
    const topicsPerDay = Math.ceil(sortedTopics.length / learningDaysCount) || 1;

    const daily_plan = [];
    let topicIndex = 0;

    // Memory map tracking when a topic was first introduced { topicName: dateIndex }
    const topicLearnDates = new Map();

    for (let i = 0; i < daysUntilExam; i++) {
      const currentDay = addDays(today, i);
      const tasks = [];

      // --- PHASE 1: LEARNING & SRS (First 80% of days) ---
      if (i < learningDaysCount) {
        // 1. Assign New Learning Topics
        const topicsForToday = sortedTopics.slice(topicIndex, topicIndex + topicsPerDay);
        topicsForToday.forEach((t, idx) => {
          tasks.push({
            id: `task_${i}_learn_${idx}_${Date.now()}`,
            text: `Analyze & Learn: ${t.subject} - ${t.topic}`,
            topic: t.topic,
            type: 'learning',
            completed: false
          });
          topicLearnDates.set(t.topic, i);
        });
        topicIndex += topicsPerDay;

        // 2. Inject SRS Active Recall Tasks
        // Check past topics for 3-day and 7-day spaced intervals
        for (const [pastTopic, learnedDayIndex] of topicLearnDates.entries()) {
          const daysSinceLearned = i - learnedDayIndex;
          if (daysSinceLearned === 3 || daysSinceLearned === 7) {
            tasks.push({
              id: `task_${i}_srs_${daysSinceLearned}d_${Date.now()}`,
              text: `Spaced Recall (${daysSinceLearned}d): ${pastTopic}`,
              topic: pastTopic,
              type: 'review',
              completed: false
            });
          }
        }
      }
      // --- PHASE 2: DEDICATED MOCK EXAM & REVIEW (Last 20% of days) ---
      else {
        tasks.push({
          id: `task_${i}_mock_${Date.now()}`,
          text: `Full Subject Mock Exam & Weakness Analysis`,
          topic: `Mock Exam Review`,
          type: 'mock_exam',
          completed: false
        });

        // Add a focused review of traditionally weak areas
        if (weakTopics.length > 0) {
          tasks.push({
            id: `task_${i}_weakness_${Date.now()}`,
            text: `Targeted Mastery: ${weakTopics.slice(0, 3).join(', ')}...`,
            topic: `Targeted Review`,
            type: 'review',
            completed: false
          });
        }
      }

      // Pad if empty
      if (tasks.length === 0) {
        tasks.push({
          id: `task_${i}_pad_${Date.now()}`,
          text: `General Consolidation`,
          topic: `Review`,
          type: 'learning',
          completed: false
        });
      }

      daily_plan.push({
        date: format(currentDay, 'yyyy-MM-dd'),
        tasks,
        completion_rate: 0
      });
    }

    // Generate AI Advisory
    let advisory_text = "";
    try {
      const prompt = `Act as an expert medical study advisor. Provide a very brief, encouraging 2-sentence study strategy for a Year ${year} medical student preparing for exams in ${daysUntilExam} days. Their weak topics are: ${weakTopics.slice(0, 5).join(',')}. Focus on spaced repetition and clinical application.`;
      if (process.env.GEMINI_API_KEY) {
        advisory_text = await geminiService.callLLM(prompt, { temperature: 0.5, max_tokens: 150 });
      } else {
        advisory_text = "Focus on active recall and prioritize your weak areas. Stay consistent with your daily tasks to ensure comprehensive coverage before your exam.";
      }
    } catch (e) {
      console.warn("AI generation failed, using fallback:", e.message);
      advisory_text = "Focus on active recall and prioritize your weak areas. Stay consistent with your daily tasks to ensure comprehensive coverage before your exam.";
    }

    // Generate Milestone Goals (Quarterly/Monthly/Weekly) rules-based
    const goals = { daily: [], weekly: [], monthly: [], quarterly: [] };
    if (daysUntilExam >= 7) {
      goals.weekly.push({ id: `wg1`, text: `Complete Week 1 topics & review weak subjects`, due: format(addDays(today, 7), 'yyyy-MM-dd'), done: false });
    }
    if (daysUntilExam >= 30) {
      goals.monthly.push({ id: `mg1`, text: `First pass of all major systems`, due: format(addDays(today, 30), 'yyyy-MM-dd'), done: false });
    }

    const newPlan = new StudyPlan({
      uid,
      mbbs_year: year,
      exam_date: examDateObj,
      subjects_selected: selectedSubjects,
      weak_topics: weakTopics,
      strong_topics: strongTopics,
      advisory_text,
      daily_plan,
      goals,
      streak: { current: 0, longest: 0, last_checkin: null },
      analytics: { total_tasks: sortedTopics.length, completed: 0, pace_factor: 1.0 }
    });

    await newPlan.save();
    return newPlan;
  }

  async getStudyPlan(uid) {
    return await StudyPlan.findOne({ uid });
  }

  async getTodayTasks(uid) {
    const plan = await StudyPlan.findOne({ uid });
    if (!plan) return null;

    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const todayPlan = plan.daily_plan.find(p => p.date === todayStr);

    return {
      plan_id: plan._id,
      date: todayStr,
      tasks: todayPlan ? todayPlan.tasks : [],
      streak: plan.streak,
      analytics: plan.analytics,
      advisory_text: plan.advisory_text
    };
  }

  async tickTask(uid, dateStr, taskId, completedStatus) {
    const plan = await StudyPlan.findOne({ uid });
    if (!plan) throw new Error('Plan not found');

    const dayPlan = plan.daily_plan.find(p => p.date === dateStr);
    if (!dayPlan) throw new Error('Daily plan not found for date');

    const task = dayPlan.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');

    const wasCompleted = task.completed;
    task.completed = completedStatus;

    if (!wasCompleted && completedStatus) {
      plan.analytics.completed += 1;
    } else if (wasCompleted && !completedStatus) {
      plan.analytics.completed = Math.max(0, plan.analytics.completed - 1);
    }

    // Recompute daily completion rate
    const totalToday = dayPlan.tasks.length;
    const doneToday = dayPlan.tasks.filter(t => t.completed).length;
    dayPlan.completion_rate = totalToday > 0 ? (doneToday / totalToday) * 100 : 0;

    // Update Streak logic
    const todayObj = startOfDay(new Date());
    const yesterdayObj = addDays(todayObj, -1);

    // If day was fully completed today
    if (dayPlan.completion_rate === 100) {
      let lastCheckin = plan.streak.last_checkin ? startOfDay(new Date(plan.streak.last_checkin)) : null;

      if (!lastCheckin || lastCheckin.getTime() === yesterdayObj.getTime()) {
        if (!lastCheckin || lastCheckin.getTime() !== todayObj.getTime()) {
          plan.streak.current += 1;
          plan.streak.last_checkin = todayObj;
        }
      } else if (lastCheckin && lastCheckin.getTime() < yesterdayObj.getTime()) {
        // Streak broken
        plan.streak.current = 1;
        plan.streak.last_checkin = todayObj;
      }
      if (plan.streak.current > plan.streak.longest) {
        plan.streak.longest = plan.streak.current;
      }
    } else if (wasCompleted && !completedStatus && dayPlan.completion_rate < 100) {
      // Handle streak logic if a task is UN-CHECKED on the same day it was finalized
      let lastCheckin = plan.streak.last_checkin ? startOfDay(new Date(plan.streak.last_checkin)) : null;
      if (lastCheckin && lastCheckin.getTime() === todayObj.getTime()) {
        plan.streak.current = Math.max(0, plan.streak.current - 1);
        // Revert last checkin to yesterday to ensure streak logic doesn't break
        plan.streak.last_checkin = plan.streak.current > 0 ? yesterdayObj : null;
      }
    }

    await plan.save();
    return await this.getTodayTasks(uid);
  }

  async addTask(uid, dateStr, text) {
    const plan = await StudyPlan.findOne({ uid });
    if (!plan) throw new Error('Plan not found');

    const dayPlan = plan.daily_plan.find(p => p.date === dateStr);
    if (!dayPlan) throw new Error('Daily plan not found for date');

    // Create custom task
    const newTask = {
      id: `task_${Date.now()}_custom`,
      text: text,
      topic: 'Custom Goal',
      type: 'learning',
      completed: false
    };

    dayPlan.tasks.push(newTask);
    plan.analytics.total_tasks += 1; // Update total tracked tasks

    // Recompute daily completion metric
    const totalToday = dayPlan.tasks.length;
    const doneToday = dayPlan.tasks.filter(t => t.completed).length;
    dayPlan.completion_rate = totalToday > 0 ? (doneToday / totalToday) * 100 : 0;

    await plan.save();
    return await this.getTodayTasks(uid);
  }

  async editTask(uid, dateStr, taskId, newText) {
    const plan = await StudyPlan.findOne({ uid });
    if (!plan) throw new Error('Plan not found');

    const dayPlan = plan.daily_plan.find(p => p.date === dateStr);
    if (!dayPlan) throw new Error('Daily plan not found for date');

    const task = dayPlan.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');

    task.text = newText; // Update only the description
    await plan.save();
    return await this.getTodayTasks(uid);
  }

  async getAnalytics(uid) {
    const plan = await StudyPlan.findOne({ uid });
    if (!plan) return null;

    // Build weekly heatmap (last 7 days)
    const heatmap = [];
    const today = startOfDay(new Date());
    for (let i = 6; i >= 0; i--) {
      const d = addDays(today, -i);
      const dStr = format(d, 'yyyy-MM-dd');
      const dp = plan.daily_plan.find(p => p.date === dStr);
      heatmap.push({
        date: dStr,
        rate: dp ? dp.completion_rate : 0
      });
    }

    return {
      streak: plan.streak,
      analytics: plan.analytics,
      heatmap,
      goals: plan.goals
    };
  }

}

module.exports = new StudyService();