const { differenceInDays, format, addDays, parseISO, startOfDay } = require('date-fns');
const path = require('path');
const fs = require('fs');
const studyPlanRepo = require('../repositories/studyPlanRepo');
const chatSessionRepo = require('../repositories/chatSessionRepo');
const sm2Service = require('./sm2Service');
const plannerLlmClient = require('./plannerLlmClient');
const syllabusScraper = require('./syllabusScraper');
const { invalidateLearnerContext } = require('./learnerContextCache');
const { rankResources, sanitizeResource, RESOURCE_CATALOG_VERSION } = require('./resourceCatalog');
const { normalizeCountry } = require('../data/plannerCountryConfig');
const config = require('../config');

// ─── SM-2 inspired review intervals (days after first learning) ───────────────
const SRS_INTERVALS = [1, 3, 7, 14, 21, 30];

// ─── Subject → library category mapping ──────────────────────────────────────
const SUBJECT_CATEGORY_MAP = {
    'Anatomy':           ['Anatomy', 'General Anatomy'],
    'Physiology':        ['Physiology'],
    'Biochemistry':      ['Biochemistry'],
    'Pathology':         ['Pathology', 'General Pathology'],
    'Pharmacology':      ['Pharmacology'],
    'Microbiology':      ['Microbiology'],
    'Forensic Medicine': ['Forensic Medicine'],
    'PSM':               ['Community Medicine'],
    'Community Medicine':['Community Medicine'],
    'ENT':               ['ENT'],
    'Ophthalmology':     ['Ophthalmology'],
    'Medicine':          ['Medicine', 'General Medicine'],
    'Surgery':           ['Surgery', 'General Surgery'],
    'OBGYN':             ['Obstetrics', 'Gynecology'],
    'Pediatrics':        ['Pediatrics'],
    'Internship':        ['Medicine', 'Surgery', 'Anatomy'],
};

const SUBJECT_KEYWORDS = {
    'Anatomy':           ['anatomy', 'thorax', 'abdomen', 'pelvis', 'head', 'neck', 'limb', 'nerve', 'artery', 'vein', 'muscle', 'bone', 'histology', 'embryology', 'dissection'],
    'Physiology':        ['physiology', 'cardiac output', 'action potential', 'renal', 'respiratory', 'endocrine', 'neurophysiology', 'reflexes', 'ECG', 'spirometry'],
    'Biochemistry':      ['biochemistry', 'krebs', 'glycolysis', 'enzyme', 'metabolism', 'protein', 'lipid', 'nucleic acid', 'biochem', 'oxidation', 'reduction'],
    'Pathology':         ['pathology', 'neoplasia', 'inflammation', 'necrosis', 'infarction', 'pathogenesis', 'morphology', 'histopathology', 'autopsy'],
    'Pharmacology':      ['pharmacology', 'drug', 'pharmacokinetics', 'receptor', 'agonist', 'antagonist', 'antibiotic', 'antihypertensive', 'pharmacodynamics', 'pharma'],
    'Microbiology':      ['microbiology', 'bacteria', 'virus', 'fungus', 'parasite', 'gram stain', 'culture', 'infection', 'microbio', 'pathogen'],
    'Forensic Medicine': ['forensic', 'medicolegal', 'autopsy', 'poisoning', 'MLCO', 'evidence'],
    'Community Medicine':['community medicine', 'PSM', 'epidemiology', 'public health', 'prevention', 'biostatistics', 'nutrition', 'vaccine', 'immunization'],
    'ENT':               ['ENT', 'ear', 'nose', 'throat', 'otology', 'rhinology', 'laryngology', 'hearing'],
    'Ophthalmology':     ['ophthalmology', 'eye', 'retina', 'cornea', 'glaucoma', 'cataract', 'vision'],
    'Medicine':          ['medicine', 'cardiology', 'pulmonology', 'gastroenterology', 'nephrology', 'neurology', 'rheumatology', 'hematology', 'endocrinology', 'hypertension', 'diabetes', 'fever'],
    'Surgery':           ['surgery', 'surgical', 'appendicitis', 'hernia', 'trauma', 'fracture', 'orthopedics', 'urology', 'thyroid', 'breast', 'colorectal'],
    'OBGYN':             ['OBGYN', 'obstetrics', 'gynecology', 'pregnancy', 'labour', 'delivery', 'ovary', 'uterus', 'menstrual', 'contraception', 'antenatal'],
    'Pediatrics':        ['pediatrics', 'paediatrics', 'child', 'neonatal', 'infant', 'growth', 'development', 'vaccination', 'congenital'],
};

function detectSubjectFromText(text = '') {
    const lower = text.toLowerCase();
    for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw.toLowerCase()))) return subject;
    }
    return null;
}

function makeTopicKey(subject, topic) {
    return `${subject}::${topic}`;
}

function makeTaskIdPart(value) {
    return String(value || 'task')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48) || 'task';
}

function assertPlanDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) {
        throw new Error('Date must use YYYY-MM-DD format');
    }
    return dateStr;
}

function buildDayResponse(plan, dateStr) {
    const dailyPlan = Array.isArray(plan.daily_plan) ? plan.daily_plan : [];
    const dayPlan = dailyPlan.find(p => p.date === dateStr);
    return {
        plan_id: plan._id,
        date: dateStr,
        tasks: dayPlan ? dayPlan.tasks : [],
        streak: plan.streak,
        analytics: plan.analytics,
        advisory_text: plan.advisory_text,
        plan_health: plan.plan_health || null
    };
}

function getPlanDays(plan) {
    if (Array.isArray(plan.schedule_days) && plan.schedule_days.length > 0) return plan.schedule_days;
    return Array.isArray(plan.daily_plan) ? plan.daily_plan : [];
}

function defaultConstraints(config = {}) {
    const intensity = ['light', 'balanced', 'intense'].includes(config.targetIntensity)
        ? config.targetIntensity
        : 'balanced';
    return {
        daily_available_minutes: Number(config.dailyAvailableMinutes) || 120,
        target_intensity: intensity,
        preferred_study_windows: Array.isArray(config.preferredStudyWindows) && config.preferredStudyWindows.length
            ? config.preferredStudyWindows.slice(0, 3)
            : ['evening'],
        weekly_off_days: Array.isArray(config.weeklyOffDays) ? config.weeklyOffDays.slice(0, 2) : [],
        max_tasks_per_day: intensity === 'intense' ? 7 : intensity === 'light' ? 3 : 5,
        resource_policy: 'official_open_first'
    };
}

function calculateCompletionRate(tasks = []) {
    if (!tasks.length) return 0;
    return (tasks.filter(task => task.completed).length / tasks.length) * 100;
}

function evaluatePlanHealth(plan) {
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const days = getPlanDays(plan);
    const tasks = days.flatMap(day => day.tasks || []);
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const overdueTasks = days
        .filter(day => day.date < todayStr)
        .flatMap(day => (day.tasks || []).filter(task => !task.completed));
    const nextSeven = days
        .filter(day => day.date >= todayStr)
        .slice(0, 7);
    const weeklyMinutes = nextSeven.reduce((sum, day) => (
        sum + (day.tasks || []).reduce((taskSum, task) => taskSum + (Number(task.estimated_minutes) || 30), 0)
    ), 0);
    const availableWeekly = Math.max(1, (plan.constraints?.daily_available_minutes || 120) * Math.max(1, nextSeven.length));
    const weakTopics = new Set(plan.weak_topics || []);
    const weakExposureTotal = tasks.filter(task => weakTopics.has(task.topic)).length;
    const reviewTasks = tasks.filter(task => ['review', 'active_recall', 'flashcard_review'].includes(task.type)).length;
    const consistency = total ? Math.round((completed / total) * 100) : 0;
    const catchUpDebt = overdueTasks.reduce((sum, task) => sum + (Number(task.estimated_minutes) || 30), 0);
    const workloadPressure = Math.min(100, Math.round((weeklyMinutes / availableWeekly) * 100));
    const reviewCoverage = total ? Math.round((reviewTasks / total) * 100) : 0;
    const weakTopicExposure = weakTopics.size ? Math.min(100, Math.round((weakExposureTotal / Math.max(1, weakTopics.size * 2)) * 100)) : 100;
    const examReadiness = Math.max(0, Math.min(100, Math.round((consistency * 0.45) + (reviewCoverage * 0.25) + (weakTopicExposure * 0.2) + ((100 - workloadPressure) * 0.1))));

    return {
        workload_pressure: workloadPressure,
        catch_up_debt: catchUpDebt,
        weak_topic_exposure: weakTopicExposure,
        review_coverage: reviewCoverage,
        consistency,
        exam_readiness: examReadiness,
        status: catchUpDebt > 180 ? 'catch_up' : workloadPressure > 115 ? 'overloaded' : examReadiness >= 70 ? 'strong' : 'steady',
        last_evaluated_at: new Date()
    };
}

function normalizeTask(task, fallback = {}) {
    const typeMap = { learning: 'learn', review: 'review', mock_exam: 'mock' };
    const type = typeMap[task.type] || task.type || fallback.type || 'learn';
    return {
        id: task.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text: task.text,
        subject: task.subject || fallback.subject || null,
        topic: task.topic || fallback.topic || null,
        type,
        purpose: task.purpose || type,
        estimated_minutes: Number(task.estimated_minutes) || fallback.estimated_minutes || (type === 'mock' ? 90 : type === 'active_recall' ? 20 : 35),
        priority: Number(task.priority) || fallback.priority || 2,
        source: task.source || fallback.source || 'planner',
        completed: Boolean(task.completed),
        resources: (task.resources || []).map(sanitizeResource).filter(Boolean)
    };
}

function makePlanV2Payload(plan, config = {}) {
    const constraints = { ...defaultConstraints(config), ...(plan.constraints?.toObject?.() || plan.constraints || {}) };
    const dailyPlan = (getPlanDays(plan) || []).map(day => ({
        date: day.date,
        tasks: (day.tasks || []).map(task => normalizeTask(task)),
        completion_rate: calculateCompletionRate(day.tasks || [])
    }));
    const learnerProfile = {
        country: config.country || plan.learner_profile?.country || 'India',
        mbbs_year: config.year || plan.mbbs_year || plan.learner_profile?.mbbs_year || null,
        learning_style: config.learningStyle || plan.learner_profile?.learning_style || 'balanced',
        preferred_resource_types: plan.learner_profile?.preferred_resource_types || ['video', 'website'],
        weak_topics: plan.weak_topics || [],
        strong_topics: plan.strong_topics || [],
        signal_summary: plan.learner_profile?.signal_summary || {}
    };

    return {
        planner_version: 2,
        constraints,
        learner_profile: learnerProfile,
        daily_plan: dailyPlan,
        schedule_days: dailyPlan,
        plan_health: evaluatePlanHealth({ ...plan.toObject?.() || plan, daily_plan: dailyPlan, schedule_days: dailyPlan, constraints }),
        resource_recommendations: plan.resource_recommendations || [],
        adaptation_history: plan.adaptation_history || []
    };
}

function createPlannerTask({ dayIndex, slot, type, subject, topic, text, resources = [], completed = false, source = 'planner', priority = 2 }) {
    const minutesByType = {
        learn: 45,
        active_recall: 20,
        review: 25,
        mock: 90,
        catch_up: 35,
        resource_drill: 25,
        flashcard_review: 20
    };

    return {
        id: `task_${dayIndex}_${type}_${slot}_${makeTaskIdPart(subject)}_${makeTaskIdPart(topic)}`,
        text,
        subject,
        topic,
        type,
        purpose: type,
        estimated_minutes: minutesByType[type] || 30,
        priority,
        source,
        completed,
        resources
    };
}

function buildFallbackTopics(selectedTopicKeys = [], plannerSubjects = []) {
    const parsedTopics = selectedTopicKeys
        .map(key => String(key || '').split('::'))
        .filter(parts => parts.length >= 2 && parts[0] && parts[1])
        .map(([subject, ...topicParts]) => ({
            subject: subject.trim(),
            topic: topicParts.join('::').trim()
        }));

    if (parsedTopics.length > 0) {
        return parsedTopics;
    }

    const subjects = plannerSubjects.length > 0 ? plannerSubjects : ['General Medicine'];
    return subjects.flatMap(subject => ([
        { subject, topic: `${subject} foundations` },
        { subject, topic: `${subject} high-yield review` },
        { subject, topic: `${subject} exam recall` }
    ]));
}

function normalizePlannerCountry(country = 'India') {
    const normalized = normalizeCountry(country);
    return normalized === 'Nepal' ? 'Nepal' : 'India';
}

class StudyService {
    constructor() {
        // Load academy library once at startup
        this._library = null;
        try {
            const libPath = path.join(__dirname, '../data/academy_library.json');
            if (fs.existsSync(libPath)) {
                this._library = JSON.parse(fs.readFileSync(libPath, 'utf8'));
            }
        } catch (e) {
            console.warn('[StudyService] Could not load academy_library.json:', e.message);
        }
    }

    // ── Internal: build resources using pre-cached textbook (avoids re-scanning library) ──
    // Order: gold standard → two subject-tuned video searches (deduped vs gold) → fast reference → textbook
    _buildResources(subject, topic, cachedTextbook) {
        const resources = rankResources({ subject, topic, limit: 4 });
        if (cachedTextbook) {
            const textbookResource = sanitizeResource({
                resourceType: 'textbook', platform: 'Library',
                title: cachedTextbook.title, author: cachedTextbook.author, type: 'book',
                access: 'free',
                why: 'Lowest-cost library or preview path found in the Medsage book catalog.',
                tags: ['library', 'low_cost'],
                freeLinks: (cachedTextbook.freeLinks || []).slice(0, 1).map(l => ({ name: l.name, url: l.url }))
            });
            if (textbookResource) resources.push(textbookResource);
        }

        return resources
            .map(sanitizeResource)
            .filter(Boolean)
            .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
            .slice(0, 5);
    }

    // ── Public: same pipeline as planner tasks (library textbook resolved here) ───
    getResourcesForTopic(subject, topic) {
        let textbook = null;
        if (this._library?.books) {
            const cats = SUBJECT_CATEGORY_MAP[subject] || [subject];
            const matches = this._library.books.filter(b =>
                cats.some(c => b.category?.toLowerCase() === c.toLowerCase()) &&
                b.freeLinks?.length > 0 && b.course === 'MBBS'
            );
            matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            textbook = matches[0] || null;
        }
        return this._buildResources(subject, topic, textbook);
    }

    getSubjectsForYear(year, country = 'India') {
        return syllabusScraper.getExpectedSubjects(normalizePlannerCountry(country), year);
    }

    async getAllTopics(country, year, subjects) {
        const yearCurriculum = await syllabusScraper.getCurriculum(normalizePlannerCountry(country), year);
        let topics = [];
        for (const sub of subjects) {
            if (yearCurriculum[sub]) {
                topics.push(...yearCurriculum[sub].map(t => ({ subject: sub, topic: t })));
            }
        }
        return topics;
    }


    async getScopedTopics(country, year, subjects, selectedTopicKeys = []) {
        const allTopics = await this.getAllTopics(country, year, subjects);
        if (!selectedTopicKeys.length) {
            return allTopics;
        }

        const selectedSet = new Set(selectedTopicKeys);
        return allTopics.filter(({ subject, topic }) => selectedSet.has(makeTopicKey(subject, topic)));
    }

    buildTextbookCache(selectedSubjects) {
        const textbookCache = {};
        if (!this._library?.books) {
            return textbookCache;
        }

        for (const sub of selectedSubjects) {
            const cats = SUBJECT_CATEGORY_MAP[sub] || [sub];
            const matches = this._library.books.filter(b =>
                cats.some(c => b.category?.toLowerCase() === c.toLowerCase()) &&
                b.freeLinks?.length > 0 && b.course === 'MBBS'
            );
            matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            textbookCache[sub] = matches[0] || null;
        }

        return textbookCache;
    }

    prioritizeTopics(allTopics, weakTopics, strongTopics) {
        const weak = allTopics.filter(t => weakTopics.includes(t.topic));
        const strong = allTopics.filter(t => strongTopics.includes(t.topic));
        const regular = allTopics.filter(t => !weakTopics.includes(t.topic) && !strongTopics.includes(t.topic));
        return [...weak, ...regular, ...strong];
    }

    async collectLearnerSignals(uid) {
        const signals = {
            due_flashcards: 0,
            avg_retention: null,
            recent_chat_subjects: [],
            recent_chat_topics: []
        };

        try {
            const stats = await sm2Service.getStats(uid);
            signals.due_flashcards = stats?.due_now || 0;
            signals.avg_retention = stats?.avg_retention ?? null;
        } catch (error) {
            signals.sm2_unavailable = true;
        }

        try {
            const sessions = await chatSessionRepo.listByUser(uid, { limit: 5 });
            const subjects = [];
            const topics = [];
            sessions.forEach(session => {
                (session.messages || []).slice(-20).forEach(message => {
                    const subject = message.meta?.subject || message.response?.subject;
                    const topic = message.meta?.topic_id || message.response?.topicId;
                    if (subject) subjects.push(subject);
                    if (topic) topics.push(topic);
                });
            });
            signals.recent_chat_subjects = [...new Set(subjects)].slice(0, 6);
            signals.recent_chat_topics = [...new Set(topics)].slice(0, 8);
        } catch (error) {
            signals.chat_unavailable = true;
        }

        return signals;
    }

    buildMilestoneGoals({ today, horizonDays, selectedSubjects, planMode, weakTopics }) {
        const goals = { daily: [], weekly: [], monthly: [], quarterly: [] };
        const weekCount = Math.max(1, Math.min(Math.floor(horizonDays / 7), 12));

        for (let w = 1; w <= weekCount; w++) {
            const subjectFocus = selectedSubjects[(w - 1) % selectedSubjects.length] || 'Core study';
            goals.weekly.push({
                id: `wg${w}`,
                text: planMode === 'exam'
                    ? (w === weekCount
                        ? 'Final sprint: revise, recall, and self-test aggressively'
                        : `Week ${w}: master ${subjectFocus} and revisit your weak chapters`)
                    : (w === 1
                        ? 'Lock in a sustainable self-study rhythm'
                        : `Week ${w}: deepen ${subjectFocus} and consolidate notes`),
                due: format(addDays(today, Math.min(w * 7, horizonDays)), 'yyyy-MM-dd'),
                done: false
            });
        }

        const monthCount = Math.min(Math.floor(horizonDays / 30), 4);
        for (let m = 1; m <= monthCount; m++) {
            goals.monthly.push({
                id: `mg${m}`,
                text: planMode === 'exam'
                    ? `Month ${m}: complete a full revision pass across ${selectedSubjects.slice(0, 3).join(', ')}`
                    : `Month ${m}: turn studied chapters into long-term retention`,
                due: format(addDays(today, Math.min(m * 30, horizonDays)), 'yyyy-MM-dd'),
                done: false
            });
        }

        if (planMode === 'self_study') {
            goals.daily.push({
                id: 'dg1',
                text: weakTopics.length > 0
                    ? `Touch at least one hard chapter daily: ${weakTopics[0]}`
                    : 'Finish one deep-study block and one active-recall block every day',
                due: format(addDays(today, 1), 'yyyy-MM-dd'),
                done: false
            });
        }

        if (horizonDays >= 90) {
            goals.quarterly.push({
                id: 'qg1',
                text: planMode === 'exam'
                    ? 'Quarter milestone: complete a full exam-level revision cycle'
                    : 'Quarter milestone: build durable mastery across your chosen syllabus track',
                due: format(addDays(today, 90), 'yyyy-MM-dd'),
                done: false
            });
        }

        return goals;
    }

    async generatePlanWithAI(uid, config) {
        const {
            year,
            country = 'India',
            planMode = 'exam',
            examDate,
            studyDurationDays,
            selectedSubjects = [],
            selectedTopicKeys = [],
            weakTopics = [],
            strongTopics = [],
            dailyAvailableMinutes,
            targetIntensity,
            preferredStudyWindows,
            weeklyOffDays,
            learningStyle = 'balanced'
        } = config;
        const normalizedCountry = normalizePlannerCountry(country);

        const today = startOfDay(new Date());
        let examDateObj = null;
        let horizonDays = Number.parseInt(studyDurationDays, 10) || 21;
        const constraints = defaultConstraints({
            dailyAvailableMinutes,
            targetIntensity,
            preferredStudyWindows,
            weeklyOffDays
        });

        if (planMode === 'exam') {
            examDateObj = startOfDay(parseISO(examDate));
            if (isNaN(examDateObj.getTime()) || examDateObj < today) {
                throw new Error('Valid future exam date is required');
            }
            horizonDays = differenceInDays(examDateObj, today);
            if (horizonDays < 1) throw new Error('Exam date is too close');
        } else {
            horizonDays = Math.min(84, Math.max(7, horizonDays));
        }

        const plannerSubjects = selectedSubjects.length > 0
            ? selectedSubjects
            : this.getSubjectsForYear(year, normalizedCountry);
        let scopedTopics = await this.getScopedTopics(normalizedCountry, year, plannerSubjects, selectedTopicKeys);
        if (scopedTopics.length === 0) {
            scopedTopics = buildFallbackTopics(selectedTopicKeys, plannerSubjects);
        }

        const signals = await this.collectLearnerSignals(uid);
        const scopedSubjects = [...new Set(scopedTopics.map(t => t.subject))];
        const sortedTopics = this.prioritizeTopics(scopedTopics, [...weakTopics, ...(signals.recent_chat_topics || [])], strongTopics);
        const learningDaysCount = Math.max(1, Math.floor(horizonDays * (planMode === 'exam' ? 0.78 : 0.72)));
        const targetTopicMinutes = Math.max(45, constraints.daily_available_minutes - 25);
        const topicsPerDay = Math.max(1, Math.min(3, Math.floor(targetTopicMinutes / 55), Math.ceil(sortedTopics.length / learningDaysCount)));
        const textbookCache = this.buildTextbookCache(scopedSubjects);
        const daily_plan = [];
        let topicIndex = 0;
        const topicLearnDates = new Map();

        for (let i = 0; i < horizonDays; i++) {
            const currentDay = addDays(today, i);
            const tasks = [];
            let slot = 0;
            const dayIsOff = constraints.weekly_off_days.includes(currentDay.getDay());

            if (!dayIsOff && i < learningDaysCount) {
                const topicsForToday = sortedTopics.slice(topicIndex, topicIndex + topicsPerDay);
                topicsForToday.forEach(t => {
                    const resources = this._buildResources(t.subject, t.topic, textbookCache[t.subject]);
                    tasks.push(createPlannerTask({
                        dayIndex: i,
                        slot: slot++,
                        type: 'learn',
                        subject: t.subject,
                        topic: t.topic,
                        text: `${planMode === 'exam' ? 'Learn for exam mastery' : 'Deep study'}: ${t.subject} - ${t.topic}`,
                        resources,
                        priority: weakTopics.includes(t.topic) ? 1 : 2
                    }));
                    tasks.push(createPlannerTask({
                        dayIndex: i,
                        slot: slot++,
                        type: 'active_recall',
                        subject: t.subject,
                        topic: t.topic,
                        text: `Active recall: close-book questions for ${t.topic}`,
                        resources: resources.slice(0, 2),
                        priority: weakTopics.includes(t.topic) ? 1 : 2
                    }));
                    topicLearnDates.set(t.topic, { dayIdx: i, subject: t.subject });
                });
                topicIndex += topicsPerDay;
            }

            for (const [pastTopic, info] of topicLearnDates.entries()) {
                const daysSinceLearned = i - info.dayIdx;
                if (SRS_INTERVALS.includes(daysSinceLearned) && tasks.length < constraints.max_tasks_per_day) {
                    const label = daysSinceLearned === 1 ? '1d'
                        : daysSinceLearned === 3 ? '3d'
                            : daysSinceLearned === 7 ? '1wk'
                                : daysSinceLearned === 14 ? '2wk'
                                    : daysSinceLearned === 21 ? '3wk'
                                        : '1mo';
                    tasks.push(createPlannerTask({
                        dayIndex: i,
                        slot: slot++,
                        type: 'review',
                        subject: info.subject,
                        topic: pastTopic,
                        text: `Spaced review (${label}): ${pastTopic}`,
                        resources: this._buildResources(info.subject, pastTopic, textbookCache[info.subject]).slice(0, 2),
                        priority: 1
                    }));
                }
            }

            if (!dayIsOff && i >= learningDaysCount && tasks.length < constraints.max_tasks_per_day) {
                if (planMode === 'exam') {
                    tasks.push(createPlannerTask({
                        dayIndex: i,
                        slot: slot++,
                        type: 'mock',
                        subject: scopedSubjects[(i - learningDaysCount) % scopedSubjects.length],
                        topic: 'Mock Exam',
                        text: `Timed mock + error log: ${scopedSubjects.slice(0, 3).join(', ')}`,
                        resources: [],
                        priority: 1
                    }));
                }

                const reviewTopic = sortedTopics[(i - learningDaysCount) % sortedTopics.length];
                tasks.push(createPlannerTask({
                    dayIndex: i,
                    slot: slot++,
                    type: 'resource_drill',
                    subject: reviewTopic.subject,
                    topic: reviewTopic.topic,
                    text: `Resource drill: master weak edges in ${reviewTopic.topic}`,
                    resources: this._buildResources(reviewTopic.subject, reviewTopic.topic, textbookCache[reviewTopic.subject]),
                    priority: weakTopics.includes(reviewTopic.topic) ? 1 : 2
                }));
            }

            if (signals.due_flashcards > 0 && i % 2 === 0 && tasks.length < constraints.max_tasks_per_day) {
                tasks.push(createPlannerTask({
                    dayIndex: i,
                    slot: slot++,
                    type: 'flashcard_review',
                    subject: 'Cortex',
                    topic: 'Due cards',
                    text: `Flashcard review: clear due cards (${signals.due_flashcards} currently due)`,
                    resources: [],
                    source: 'sm2',
                    priority: 1
                }));
            }

            if (tasks.length === 0) {
                tasks.push(createPlannerTask({
                    dayIndex: i,
                    slot: slot++,
                    type: dayIsOff ? 'review' : 'active_recall',
                    subject: scopedSubjects[i % scopedSubjects.length],
                    topic: dayIsOff ? 'Recovery review' : 'General consolidation',
                    text: dayIsOff ? 'Light review day: 20 minutes of recall only' : 'General consolidation: summarize and self-test',
                    resources: [],
                    priority: 3
                }));
            }

            daily_plan.push({
                date: format(currentDay, 'yyyy-MM-dd'),
                tasks: tasks.slice(0, constraints.max_tasks_per_day),
                completion_rate: 0
            });
        }

        let advisory_text = '';
        try {
            const prompt = planMode === 'exam'
                ? `Act as an expert medical study advisor. Write a 2-sentence personalised strategy for a Year ${year} MBBS student in ${normalizedCountry} with ${horizonDays} days until exams. Subjects: ${scopedSubjects.join(', ')}. Weak areas: ${weakTopics.slice(0, 4).join(', ') || 'none specified'}. Emphasise active recall, SRS, and clinical integration.`
                : `Act as an expert medical study coach. Write a 2-sentence practical strategy for a Year ${year} MBBS student in ${normalizedCountry} building a ${horizonDays}-day self-study plan. Subjects: ${scopedSubjects.join(', ')}. Emphasise deliberate practice, notes, and recall.`;
            if (plannerLlmClient.isConfigured()) {
                advisory_text = await plannerLlmClient.callText(prompt, { temperature: 0.55, max_tokens: 160 });
            }
        } catch (e) {
            console.warn('[StudyService] AI advisory failed:', e.message);
        }
        if (!advisory_text) {
            advisory_text = planMode === 'exam'
                ? `With ${horizonDays} days to go, this plan protects your recall first: learn, test, review, then mock. Weak topics come early so your final weeks are for confidence, not panic.`
                : `This plan is built for steady mastery. Study actively, test yourself, and revisit the same chapter before it fades.`;
        }

        const resource_recommendations = rankResources({
            subject: scopedSubjects[0],
            topic: sortedTopics[0]?.topic,
            country: normalizedCountry,
            year,
            userPreferences: { learning_style: learningStyle, preferred_resource_types: [] },
            limit: 5
        });
        const goals = this.buildMilestoneGoals({ today, horizonDays, selectedSubjects: scopedSubjects, planMode, weakTopics });
        const totalTasksGenerated = daily_plan.reduce((sum, day) => sum + day.tasks.length, 0);
        const planPayload = {
            uid,
            planner_version: 2,
            mbbs_year: year,
            plan_mode: planMode,
            plan_duration_days: horizonDays,
            exam_date: examDateObj,
            subjects_selected: scopedSubjects,
            selected_topic_keys: selectedTopicKeys,
            weak_topics: weakTopics,
            strong_topics: strongTopics,
            advisory_text,
            learner_profile: {
                country: normalizedCountry,
                mbbs_year: year,
                learning_style: learningStyle,
                preferred_resource_types: [],
                weak_topics: weakTopics,
                strong_topics: strongTopics,
                signal_summary: signals
            },
            constraints,
            daily_plan,
            schedule_days: daily_plan,
            resource_recommendations,
            goals,
            streak: { current: 0, longest: 0, last_checkin: null },
            analytics: { total_tasks: totalTasksGenerated, completed: 0, pace_factor: 1.0 },
            adaptation_history: [{
                id: `system_${Date.now()}`,
                type: 'system',
                status: 'system',
                message: `Created planner v2 using resource catalog v${RESOURCE_CATALOG_VERSION}.`,
                reasons: ['Built from selected curriculum scope', 'Weak topics front-loaded', 'Reviews scheduled with SRS intervals'],
                confidence: 0.86,
                created_at: new Date()
            }]
        };
        planPayload.plan_health = evaluatePlanHealth(planPayload);

        const newPlan = await studyPlanRepo.replaceByUid(uid, planPayload);
        invalidateLearnerContext(uid);
        return newPlan;
    }

    async migratePlanIfNeeded(plan, config = {}) {
        if (!plan) return null;
        const needsMigration = plan.planner_version !== 2 || !plan.schedule_days?.length || !plan.constraints;
        if (needsMigration) {
            Object.assign(plan, makePlanV2Payload(plan, config));
            plan.markModified?.('daily_plan');
            plan.markModified?.('schedule_days');
            plan.markModified?.('learner_profile');
            plan.markModified?.('constraints');
            await plan.save();
            invalidateLearnerContext(plan.uid);
            return plan;
        }

        plan.plan_health = evaluatePlanHealth(plan);
        return plan;
    }

    recalculatePlan(plan) {
        const days = getPlanDays(plan);
        days.forEach(day => {
            day.tasks = (day.tasks || []).map(task => normalizeTask(task));
            day.completion_rate = calculateCompletionRate(day.tasks || []);
        });
        plan.daily_plan = days;
        plan.schedule_days = days;
        const tasks = days.flatMap(day => day.tasks || []);
        plan.analytics = {
            ...(plan.analytics?.toObject?.() || plan.analytics || {}),
            total_tasks: tasks.length,
            completed: tasks.filter(task => task.completed).length,
            pace_factor: plan.analytics?.pace_factor || 1.0
        };
        plan.plan_health = evaluatePlanHealth(plan);
    }

    async getStudyPlan(uid) {
        const plan = await studyPlanRepo.findByUid(uid);
        return this.migratePlanIfNeeded(plan);
    }

    async getTodayTasks(uid) {
        const plan = await this.getStudyPlan(uid);
        if (!plan) return null;
        const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
        return buildDayResponse(plan, todayStr);
    }

    async tickTask(uid, dateStr, taskId, completedStatus) {
        const requestedDateStr = assertPlanDate(dateStr);
        const plan = await this.getStudyPlan(uid);
        if (!plan) throw new Error('Plan not found');

        const dayPlan = getPlanDays(plan).find(p => p.date === requestedDateStr);
        if (!dayPlan) throw new Error('Daily plan not found for date');
        const task = dayPlan.tasks.find(t => t.id === taskId);
        if (!task) throw new Error('Task not found');

        const wasCompleted = task.completed;
        task.completed = completedStatus;
        dayPlan.completion_rate = calculateCompletionRate(dayPlan.tasks || []);

        const todayObj = startOfDay(new Date());
        const todayStr = format(todayObj, 'yyyy-MM-dd');
        const yesterdayObj = addDays(todayObj, -1);
        if (requestedDateStr === todayStr) {
            if (dayPlan.completion_rate === 100) {
                const lastCheckin = plan.streak.last_checkin ? startOfDay(new Date(plan.streak.last_checkin)) : null;
                if (!lastCheckin || lastCheckin.getTime() === yesterdayObj.getTime()) {
                    if (!lastCheckin || lastCheckin.getTime() !== todayObj.getTime()) {
                        plan.streak.current += 1;
                        plan.streak.last_checkin = todayObj;
                    }
                } else if (lastCheckin && lastCheckin.getTime() < yesterdayObj.getTime()) {
                    plan.streak.current = 1;
                    plan.streak.last_checkin = todayObj;
                }
                if (plan.streak.current > plan.streak.longest) plan.streak.longest = plan.streak.current;
            } else if (wasCompleted && !completedStatus && dayPlan.completion_rate < 100) {
                const lastCheckin = plan.streak.last_checkin ? startOfDay(new Date(plan.streak.last_checkin)) : null;
                if (lastCheckin && lastCheckin.getTime() === todayObj.getTime()) {
                    plan.streak.current = Math.max(0, plan.streak.current - 1);
                    plan.streak.last_checkin = plan.streak.current > 0 ? yesterdayObj : null;
                }
            }
        }

        this.recalculatePlan(plan);
        await plan.save();
        invalidateLearnerContext(uid);
        return buildDayResponse(plan, requestedDateStr);
    }

    async tickGoal(uid, goalType, goalId) {
        const plan = await this.getStudyPlan(uid);
        if (!plan) throw new Error('Plan not found');
        const goalList = plan.goals?.[goalType];
        if (!goalList) throw new Error(`Invalid goal type: ${goalType}`);
        const goal = goalList.find(g => g.id === goalId);
        if (!goal) throw new Error('Goal not found');
        goal.done = !goal.done;
        await plan.save();
        return { goalType, goalId, done: goal.done };
    }

    async addTask(uid, dateStr, text) {
        const requestedDateStr = assertPlanDate(dateStr);
        const plan = await this.getStudyPlan(uid);
        if (!plan) throw new Error('Plan not found');
        const dayPlan = getPlanDays(plan).find(p => p.date === requestedDateStr);
        if (!dayPlan) throw new Error('Daily plan not found for date');

        const detectedSubject = detectSubjectFromText(text);
        const topicLabel = text.length <= 80 ? text : text.slice(0, 80);
        dayPlan.tasks.push(createPlannerTask({
            dayIndex: Date.now(),
            slot: dayPlan.tasks.length,
            type: 'learn',
            subject: detectedSubject || 'Custom',
            topic: topicLabel,
            text,
            resources: detectedSubject ? this._buildResources(detectedSubject, topicLabel, null) : [],
            source: 'manual',
            priority: 2
        }));

        this.recalculatePlan(plan);
        await plan.save();
        invalidateLearnerContext(uid);
        return buildDayResponse(plan, requestedDateStr);
    }

    async editTask(uid, dateStr, taskId, newText) {
        const requestedDateStr = assertPlanDate(dateStr);
        const plan = await this.getStudyPlan(uid);
        if (!plan) throw new Error('Plan not found');
        const dayPlan = getPlanDays(plan).find(p => p.date === requestedDateStr);
        if (!dayPlan) throw new Error('Daily plan not found for date');
        const task = dayPlan.tasks.find(t => t.id === taskId);
        if (!task) throw new Error('Task not found');
        task.text = newText;
        this.recalculatePlan(plan);
        await plan.save();
        invalidateLearnerContext(uid);
        return buildDayResponse(plan, requestedDateStr);
    }

    async getAnalytics(uid) {
        const plan = await this.getStudyPlan(uid);
        if (!plan) return null;
        const today = startOfDay(new Date());
        const days = getPlanDays(plan);
        const heatmap = [];
        for (let i = 6; i >= 0; i--) {
            const d = addDays(today, -i);
            const dStr = format(d, 'yyyy-MM-dd');
            const dp = days.find(p => p.date === dStr);
            heatmap.push({ date: dStr, rate: dp ? Math.round(dp.completion_rate) : 0 });
        }
        return {
            streak: plan.streak,
            analytics: plan.analytics,
            heatmap,
            goals: plan.goals,
            plan_health: plan.plan_health
        };
    }

    async getResources({ uid, subject, topic, country = 'India', year = null }) {
        let userPreferences = {};
        if (uid) {
            const plan = await this.getStudyPlan(uid);
            userPreferences = plan?.learner_profile || {};
        }
        return {
            catalog_version: RESOURCE_CATALOG_VERSION,
            policy: 'Best legal low-cost resources only: official, open, freemium, paid official, institutional, or controlled digital lending.',
            resources: rankResources({ subject, topic, country, year, userPreferences, limit: 8 })
        };
    }

    async getDailyAdvisory(uid) {
        const plan = await this.getStudyPlan(uid);
        if (!plan) return null;

        const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');

        if (plan.daily_advisory_cache?.date === todayStr && plan.daily_advisory_cache?.text) {
            return { text: plan.daily_advisory_cache.text, cached: true };
        }

        const days = getPlanDays(plan);
        const recentDays = days.filter(d => d.date < todayStr).slice(-7);
        const completionRates = recentDays.map(d => calculateCompletionRate(d.tasks || []));
        const avgCompletion = completionRates.length
            ? Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length)
            : 0;

        const todayDay = days.find(d => d.date === todayStr);
        const todayTopics = (todayDay?.tasks || []).slice(0, 3).map(t => t.topic).filter(t => t && t !== 'Custom');
        const weakTopics = (plan.weak_topics || []).slice(0, 3);
        const catchUpCount = (todayDay?.tasks || []).filter(t => t.type === 'catch_up').length;

        let daysUntilExam = null;
        if (plan.exam_date) {
            daysUntilExam = Math.max(0, differenceInDays(
                typeof plan.exam_date === 'string' ? parseISO(plan.exam_date) : plan.exam_date,
                startOfDay(new Date())
            ));
        }

        const prompt = `You are a personal medical study coach for an MBBS student. Write exactly 2 sentences of personalized coaching advice for today. Be specific, encouraging, and actionable — reference the actual performance data and topics.

Student data:
- 7-day average task completion: ${avgCompletion}%
- Current streak: ${plan.streak?.current || 0} days
${weakTopics.length ? `- Weak areas needing attention: ${weakTopics.join(', ')}` : ''}
${todayTopics.length ? `- Today's study topics: ${todayTopics.join(', ')}` : ''}
${catchUpCount > 0 ? `- Catch-up tasks today: ${catchUpCount}` : ''}
${daysUntilExam !== null ? `- Days until exam: ${daysUntilExam}` : ''}

Write exactly 2 sentences. First sentence: acknowledge current performance and one specific action. Second sentence: motivational insight tied to the exam timeline or weak areas.`;

        try {
            const text = await plannerLlmClient.callText(prompt, { temperature: 0.75, max_tokens: 130 });
            plan.daily_advisory_cache = { date: todayStr, text: text.trim() };
            await plan.save();
            return { text: text.trim(), cached: false };
        } catch {
            const fallback = plan.advisory_text || 'Stay consistent with today\'s plan and focus on active recall for your weak topics.';
            return { text: fallback, cached: true };
        }
    }

    findNextCapacityDay(days, fromDate, constraints) {
        const start = startOfDay(parseISO(fromDate));
        return days.find(day => {
            const dayDate = startOfDay(parseISO(day.date));
            const usedMinutes = (day.tasks || []).reduce((sum, task) => sum + (Number(task.estimated_minutes) || 30), 0);
            return dayDate >= start
                && (day.tasks || []).length < (constraints.max_tasks_per_day || 5)
                && usedMinutes < (constraints.daily_available_minutes || 120);
        });
    }

    performRebalance(plan, { maxMoved = 12, reason = 'manual' } = {}) {
        const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const days = getPlanDays(plan);
        const moved = [];
        for (const day of days.filter(d => d.date < todayStr)) {
            const remaining = [];
            for (const task of day.tasks || []) {
                if (task.completed || moved.length >= maxMoved) {
                    remaining.push(task);
                    continue;
                }
                const target = this.findNextCapacityDay(days, todayStr, plan.constraints || defaultConstraints());
                if (!target) {
                    remaining.push(task);
                    continue;
                }
                const movedTask = normalizeTask(task, { type: 'catch_up', source: 'rebalance' });
                movedTask.id = `task_${Date.now()}_catchup_${moved.length}_${makeTaskIdPart(movedTask.topic)}`;
                movedTask.type = movedTask.type === 'mock' ? 'mock' : 'catch_up';
                movedTask.source = 'rebalance';
                movedTask.text = movedTask.text.startsWith('Catch up:') ? movedTask.text : `Catch up: ${movedTask.text}`;
                target.tasks.push(movedTask);
                moved.push({ task_id: task.id, from: day.date, to: target.date, topic: task.topic });
            }
            day.tasks = remaining;
            day.completion_rate = calculateCompletionRate(day.tasks || []);
        }

        this.recalculatePlan(plan);
        plan.adaptation_history.push({
            id: `rebalance_${Date.now()}`,
            type: 'rebalance',
            status: 'system',
            message: moved.length ? `Moved ${moved.length} overdue tasks into upcoming catch-up slots.` : 'Rebalance checked the plan; no overdue movable tasks were found.',
            proposed_changes: moved,
            reasons: [reason, 'Preserved completed work and moved only unfinished overdue tasks'],
            confidence: 0.9,
            created_at: new Date()
        });
        return moved;
    }

    async rebalancePlan(uid, options = {}) {
        const plan = await this.getStudyPlan(uid);
        if (!plan) throw new Error('Plan not found');
        const moved = this.performRebalance(plan, options);
        await plan.save();
        invalidateLearnerContext(uid);
        return { plan, moved };
    }

    buildAssistantProposal(plan, message) {
        const text = String(message || '').toLowerCase();
        const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const tomorrowStr = format(addDays(startOfDay(new Date()), 1), 'yyyy-MM-dd');
        const proposed_changes = [];
        const reasons = [];

        const missedMatch = text.match(/missed\s+(\d+)/);
        if (missedMatch || text.includes('catch up') || text.includes('rebalance')) {
            proposed_changes.push({ type: 'rebalance', reason: missedMatch ? `Student missed ${missedMatch[1]} days` : 'Student asked for catch-up' });
            reasons.push('Catch-up should move overdue incomplete tasks instead of piling everything into today.');
        }
        if (text.includes('lighter tomorrow') || text.includes('make tomorrow lighter') || text.includes('reduce tomorrow')) {
            proposed_changes.push({ type: 'lighten_day', date: tomorrowStr, keep_tasks: 2 });
            reasons.push('Tomorrow should keep the highest-priority tasks and move the rest forward.');
        } else if (text.includes('lighter today') || text.includes('reduce today')) {
            proposed_changes.push({ type: 'lighten_day', date: todayStr, keep_tasks: 2 });
            reasons.push('Today should become a lighter execution day without deleting work.');
        }

        const focusMatch = text.match(/focus (?:more )?(?:on )?([a-zA-Z &]+)/);
        if (focusMatch) {
            const focus = focusMatch[1].replace(/tomorrow|today|please|more/g, '').trim();
            if (focus) {
                proposed_changes.push({ type: 'add_focus_review', focus, days: 3 });
                reasons.push(`Added extra exposure for ${focus} across the next few study days.`);
            }
        }
        if (text.includes('resource') || text.includes('resources')) {
            proposed_changes.push({ type: 'refresh_resources' });
            reasons.push('Resource packs should be refreshed from the ranked legal low-cost catalog.');
        }
        if (proposed_changes.length === 0) {
            proposed_changes.push({ type: 'rebalance', reason: 'General plan tune-up' });
            reasons.push('A low-risk tune-up checks overdue work and workload pressure first.');
        }

        return {
            id: `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: 'assistant',
            status: 'pending',
            message: 'I can adjust your plan with these changes. Review them first, then apply if it feels right.',
            proposed_changes,
            reasons,
            confidence: proposed_changes.length > 1 ? 0.82 : 0.72,
            created_at: new Date()
        };
    }

    async chatWithPlannerAssistant(uid, message) {
        const plan = await this.getStudyPlan(uid);
        if (!plan) throw new Error('Plan not found');
        const proposal = this.buildAssistantProposal(plan, message);
        plan.adaptation_history.push(proposal);
        await plan.save();
        return {
            message: proposal.message,
            proposed_changes: proposal.proposed_changes,
            confidence: proposal.confidence,
            reasons: proposal.reasons,
            proposal_id: proposal.id,
            plan_health: plan.plan_health
        };
    }

    applyProposalChange(plan, change) {
        const days = getPlanDays(plan);
        const today = startOfDay(new Date());
        if (change.type === 'rebalance') {
            return this.performRebalance(plan, { reason: change.reason || 'assistant proposal' });
        }
        if (change.type === 'lighten_day') {
            const day = days.find(d => d.date === change.date);
            if (!day || (day.tasks || []).length <= change.keep_tasks) return [];
            const sorted = [...day.tasks].sort((a, b) => (a.priority || 2) - (b.priority || 2));
            const keepIds = new Set(sorted.slice(0, change.keep_tasks || 2).map(task => task.id));
            const moving = day.tasks.filter(task => !keepIds.has(task.id) && !task.completed);
            day.tasks = day.tasks.filter(task => keepIds.has(task.id) || task.completed);
            const moved = [];
            moving.forEach(task => {
                const target = this.findNextCapacityDay(days, format(addDays(parseISO(change.date), 1), 'yyyy-MM-dd'), plan.constraints || defaultConstraints());
                if (!target) {
                    day.tasks.push(task);
                    return;
                }
                const movedTask = normalizeTask(task, { source: 'assistant' });
                movedTask.id = `task_${Date.now()}_moved_${moved.length}_${makeTaskIdPart(movedTask.topic)}`;
                movedTask.source = 'assistant';
                target.tasks.push(movedTask);
                moved.push({ task_id: task.id, from: day.date, to: target.date, topic: task.topic });
            });
            return moved;
        }
        if (change.type === 'add_focus_review') {
            const focus = change.focus;
            const created = [];
            const subject = (plan.subjects_selected || []).find(s => focus.toLowerCase().includes(s.toLowerCase())) || focus;
            for (let i = 0; i < Math.min(3, change.days || 3); i++) {
                const date = format(addDays(today, i), 'yyyy-MM-dd');
                const target = days.find(d => d.date === date) || this.findNextCapacityDay(days, date, plan.constraints || defaultConstraints());
                if (!target || (target.tasks || []).length >= (plan.constraints?.max_tasks_per_day || 5)) continue;
                const task = createPlannerTask({
                    dayIndex: Date.now() + i,
                    slot: target.tasks.length,
                    type: i === 0 ? 'active_recall' : 'review',
                    subject,
                    topic: focus,
                    text: `${i === 0 ? 'Active recall' : 'Focused review'}: ${focus}`,
                    resources: this._buildResources(subject, focus, null),
                    source: 'assistant',
                    priority: 1
                });
                target.tasks.push(task);
                created.push({ task_id: task.id, date: target.date, topic: focus });
            }
            return created;
        }
        if (change.type === 'refresh_resources') {
            const refreshed = [];
            days.slice(0, 7).forEach(day => {
                (day.tasks || []).forEach(task => {
                    if (!task.subject || !task.topic || task.topic === 'Mock Exam') return;
                    task.resources = this._buildResources(task.subject, task.topic, null);
                    refreshed.push({ task_id: task.id, date: day.date, topic: task.topic });
                });
            });
            plan.resource_recommendations = rankResources({
                subject: plan.subjects_selected?.[0],
                topic: plan.weak_topics?.[0],
                country: plan.learner_profile?.country || 'India',
                userPreferences: plan.learner_profile || {},
                limit: 5
            });
            return refreshed;
        }
        throw new Error(`Unsupported assistant change type: ${change.type}`);
    }

    async applyAssistantProposal(uid, proposalId) {
        const plan = await this.getStudyPlan(uid);
        if (!plan) throw new Error('Plan not found');
        const proposal = (plan.adaptation_history || []).find(item => item.id === proposalId && item.status === 'pending');
        if (!proposal) throw new Error('Pending proposal not found');

        const allowedTypes = new Set(['rebalance', 'lighten_day', 'add_focus_review', 'refresh_resources']);
        const applied_changes = [];
        for (const change of proposal.proposed_changes || []) {
            if (!allowedTypes.has(change.type)) {
                throw new Error(`Unsupported assistant change type: ${change.type}`);
            }
            applied_changes.push({ type: change.type, result: this.applyProposalChange(plan, change) });
        }

        proposal.status = 'applied';
        proposal.applied_at = new Date();
        this.recalculatePlan(plan);
        await plan.save();
        invalidateLearnerContext(uid);
        return { plan, applied_changes };
    }
}

module.exports = new StudyService();
