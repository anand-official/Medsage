const { differenceInDays, format, addDays, parseISO, startOfDay } = require('date-fns');
const path = require('path');
const fs = require('fs');
const StudyPlan = require('../models/StudyPlan');
const geminiService = require('./geminiService');
const syllabusScraper = require('./syllabusScraper');

// ─── SM-2 inspired review intervals (days after first learning) ───────────────
const SRS_INTERVALS = [1, 3, 7, 14, 21, 30];

// ─── Gold-standard resource per subject (the one platform every student should use) ──
// These are static — the definitive go-to for each subject.
const SUBJECT_GOLD_STANDARD = {
    'Anatomy':           { platform: 'Dr. Najeeb Lectures',  type: 'youtube', url: 'https://www.youtube.com/@DrNajeebLectures',    note: 'Most detailed anatomy lectures on the internet' },
    'Physiology':        { platform: 'Dr. Najeeb Lectures',  type: 'youtube', url: 'https://www.youtube.com/@DrNajeebLectures',    note: 'Unmatched depth for physiology mechanisms' },
    'Biochemistry':      { platform: 'Ninja Nerd Science',   type: 'youtube', url: 'https://www.youtube.com/@NinjaNerdScience',    note: 'Best visual biochemistry on YouTube' },
    'Pathology':         { platform: 'Pathoma',              type: 'website', url: 'https://www.pathoma.com',                      note: 'The #1 pathology resource worldwide — Husain Sattar' },
    'Pharmacology':      { platform: 'Sketchy',              type: 'website', url: 'https://www.sketchy.com',                      note: 'Visual mnemonics — highest retention for pharma' },
    'Microbiology':      { platform: 'Sketchy',              type: 'website', url: 'https://www.sketchy.com',                      note: 'Visual mnemonics — highest retention for micro' },
    'Forensic Medicine': { platform: 'Dr. Najeeb Lectures',  type: 'youtube', url: 'https://www.youtube.com/@DrNajeebLectures',    note: 'Comprehensive forensic medicine lectures' },
    'PSM':               { platform: 'Ninja Nerd Science',   type: 'youtube', url: 'https://www.youtube.com/@NinjaNerdScience',    note: 'Best epidemiology & biostatistics on YouTube' },
    'Community Medicine':{ platform: 'Ninja Nerd Science',   type: 'youtube', url: 'https://www.youtube.com/@NinjaNerdScience',    note: 'Best epidemiology & public health on YouTube' },
    'ENT':               { platform: 'Osmosis',              type: 'youtube', url: 'https://www.youtube.com/@osmosis',             note: 'Highest-rated ENT lectures with clinical context' },
    'Ophthalmology':     { platform: 'Osmosis',              type: 'youtube', url: 'https://www.youtube.com/@osmosis',             note: 'Highest-rated ophthalmology lectures' },
    'Medicine':          { platform: 'OnlineMedEd',          type: 'website', url: 'https://onlinemeded.org',                     note: 'The gold standard for clinical medicine — free videos' },
    'Surgery':           { platform: 'TeachMe Surgery',      type: 'website', url: 'https://teachmesurgery.com',                  note: 'Best free surgical anatomy & clinical notes' },
    'OBGYN':             { platform: 'Ninja Nerd Science',   type: 'youtube', url: 'https://www.youtube.com/@NinjaNerdScience',    note: 'Best OB/GYN deep-dive lectures on YouTube' },
    'Pediatrics':        { platform: 'Osmosis',              type: 'youtube', url: 'https://www.youtube.com/@osmosis',             note: 'Best pediatrics lectures with visual learning' },
    'Internship':        { platform: 'Geeky Medics',         type: 'website', url: 'https://geekymedics.com',                     note: 'Best clinical skills & OSCE guides — free' },
};

// ─── Clinical reference lookup per subject (the "where to look it up fast" resource) ─
const SUBJECT_REFERENCE = {
    'Anatomy':           { platform: 'TeachMe Anatomy',           type: 'website', url: 'https://teachmeanatomy.info' },
    'Physiology':        { platform: 'Khan Academy Medicine',     type: 'website', url: 'https://www.khanacademy.org/science/health-and-medicine' },
    'Biochemistry':      { platform: 'NCBI Biochemistry',         type: 'website', url: 'https://www.ncbi.nlm.nih.gov/books/NBK594393/' },
    'Pathology':         { platform: 'Libre Pathology',           type: 'website', url: 'https://librepathology.org' },
    'Pharmacology':      { platform: 'DrugBank',                  type: 'website', url: 'https://www.drugbank.ca/' },
    'Microbiology':      { platform: 'CDC A–Z Topics',            type: 'website', url: 'https://www.cdc.gov/az/' },
    'Forensic Medicine': { platform: 'MedlinePlus',               type: 'website', url: 'https://medlineplus.gov/' },
    'PSM':               { platform: 'WHO Health Topics',         type: 'website', url: 'https://www.who.int/health-topics/' },
    'Community Medicine':{ platform: 'WHO Health Topics',         type: 'website', url: 'https://www.who.int/health-topics/' },
    'ENT':               { platform: 'TeachMe Surgery – ENT',     type: 'website', url: 'https://teachmesurgery.com/ent/' },
    'Ophthalmology':     { platform: 'EyeWiki (AAO)',             type: 'website', url: 'https://eyewiki.aao.org' },
    'Medicine':          { platform: 'Merck Manual Professional', type: 'website', url: 'https://www.merckmanuals.com/professional' },
    'Surgery':           { platform: 'TeachMe Surgery',           type: 'website', url: 'https://teachmesurgery.com/' },
    'OBGYN':             { platform: 'Merck Manual Professional', type: 'website', url: 'https://www.merckmanuals.com/professional' },
    'Pediatrics':        { platform: 'Merck Manual Professional', type: 'website', url: 'https://www.merckmanuals.com/professional' },
    'Internship':        { platform: 'LITFL',                     type: 'website', url: 'https://litfl.com' },
};

// ─── Topic-specific video searches (two per subject) — curated for MBBS, not generic duplicates ──
const SUBJECT_VIDEO_SUPPLEMENTS = {
    Anatomy: [
        { platform: 'Kenhub', note: '3D anatomy & illustrations', template: 'kenhub {topic} anatomy medical student' },
        { platform: 'Osmosis', note: 'Clinical anatomy context', template: 'osmosis {topic} anatomy MBBS' },
    ],
    Physiology: [
        { platform: 'Ninja Nerd Science', note: 'Mechanisms & pathways', template: 'ninja nerd {topic} physiology' },
        { platform: 'Osmosis', note: 'Clinical integration', template: 'osmosis {topic} physiology' },
    ],
    Biochemistry: [
        { platform: 'Osmosis', note: 'Clinical biochemistry', template: 'osmosis {topic} biochemistry' },
        { platform: 'Armando Hasudungan', note: 'Diagram-heavy summaries', template: 'armando hasudungan {topic} biochemistry' },
    ],
    Pathology: [
        { platform: 'Strong Medicine', note: 'Boards-style pathology', template: 'strong medicine {topic} pathology' },
        { platform: 'Osmosis', note: 'Clinical pathology', template: 'osmosis {topic} pathology' },
    ],
    Pharmacology: [
        { platform: 'Osmosis', note: 'Clinical pharmacology', template: 'osmosis {topic} pharmacology' },
        { platform: 'Ninja Nerd Science', note: 'Mechanisms & receptors', template: 'ninja nerd {topic} pharmacology' },
    ],
    Microbiology: [
        { platform: 'Osmosis', note: 'Clinical microbiology', template: 'osmosis {topic} microbiology' },
        { platform: 'Ninja Nerd Science', note: 'Mechanisms & bugs', template: 'ninja nerd {topic} microbiology' },
    ],
    'Forensic Medicine': [
        { platform: 'Osmosis', note: 'Clinical forensics', template: 'osmosis {topic} forensic medicine' },
        { platform: 'Ninja Nerd Science', note: 'Mechanisms & review', template: 'ninja nerd {topic} forensic medicine' },
    ],
    PSM: [
        { platform: 'Osmosis', note: 'Epidemiology & public health', template: 'osmosis {topic} epidemiology biostatistics' },
        { platform: 'Khan Academy', note: 'Statistics intuition', template: 'khan academy statistics healthcare {topic}' },
    ],
    'Community Medicine': [
        { platform: 'Osmosis', note: 'Epidemiology & public health', template: 'osmosis {topic} epidemiology community medicine' },
        { platform: 'Khan Academy', note: 'Statistics intuition', template: 'khan academy statistics healthcare {topic}' },
    ],
    ENT: [
        { platform: 'Dr. Najeeb Lectures', note: 'ENT physiology & anatomy', template: 'dr najeeb {topic} ENT otolaryngology' },
        { platform: 'TeachMe Surgery', note: 'ENT clinical', template: 'teach me surgery ENT {topic}' },
    ],
    Ophthalmology: [
        { platform: 'Dr. Najeeb Lectures', note: 'Eye anatomy & physiology', template: 'dr najeeb {topic} ophthalmology eye' },
        { platform: 'Stanford Medicine', note: 'Academic lectures', template: 'ophthalmology {topic} medical student lecture' },
    ],
    Medicine: [
        { platform: 'Osmosis', note: 'Clinical vignettes', template: 'osmosis {topic} internal medicine' },
        { platform: 'Strong Medicine', note: 'Pathophysiology focus', template: 'strong medicine {topic} medicine' },
    ],
    Surgery: [
        { platform: 'Osmosis', note: 'Clinical surgery', template: 'osmosis {topic} surgery' },
        { platform: 'Geeky Medics', note: 'OSCE & clinical skills', template: 'geeky medics {topic} surgery' },
    ],
    OBGYN: [
        { platform: 'Osmosis', note: 'Clinical OBGYN', template: 'osmosis {topic} obstetrics gynecology' },
        { platform: 'OnlineMedEd', note: 'Clinical rotations', template: 'onlinemeded {topic} obgyn' },
    ],
    Pediatrics: [
        { platform: 'OnlineMedEd', note: 'Peds & development', template: 'onlinemeded {topic} pediatrics' },
        { platform: 'Ninja Nerd Science', note: 'Mechanisms & peds', template: 'ninja nerd {topic} pediatrics' },
    ],
    Internship: [
        { platform: 'Osmosis', note: 'Clinical reasoning', template: 'osmosis {topic} clinical medicine' },
        { platform: 'OnlineMedEd', note: 'High-yield review', template: 'onlinemeded {topic} internal medicine' },
    ],
};

const DEFAULT_VIDEO_SUPPLEMENTS = [
    { platform: 'Osmosis', note: 'Clinical overview', template: 'osmosis {topic} {subject} MBBS' },
    { platform: 'Ninja Nerd Science', note: 'Mechanism-focused review', template: 'ninja nerd {topic} {subject}' },
];

function _normBrand(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Avoid repeating the same channel as gold standard (e.g. Ninja Nerd gold + Ninja Nerd search). */
function platformOverlapsGoldSupplement(gold, platform) {
    if (!gold || !platform) return false;
    const g = _normBrand(gold.platform);
    const p = _normBrand(platform);
    const gTokens = new Set(g.match(/[a-z]{4,}/g) || []);
    const pTokens = new Set(p.match(/[a-z]{4,}/g) || []);
    for (const t of gTokens) {
        if (pTokens.has(t)) return true;
    }
    if (p.length >= 6 && g.includes(p)) return true;
    if (g.length >= 6 && p.includes(g)) return true;
    return false;
}

function pickVideoSupplements(subject, gold) {
    const primary = SUBJECT_VIDEO_SUPPLEMENTS[subject] || [];
    const fallback = DEFAULT_VIDEO_SUPPLEMENTS;
    const seen = new Set();
    const out = [];
    const tryAdd = (arr) => {
        for (const v of arr) {
            if (out.length >= 2) break;
            if (platformOverlapsGoldSupplement(gold, v.platform)) continue;
            if (seen.has(v.platform)) continue;
            seen.add(v.platform);
            out.push(v);
        }
    };
    tryAdd(primary);
    tryAdd(fallback);
    return out.slice(0, 2);
}

function youtubeSearchFromTemplate(template, topic, subject) {
    const q = template
        .replace(/\{topic\}/gi, topic)
        .replace(/\{subject\}/gi, subject)
        .replace(/\s+/g, ' ')
        .trim();
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

function buildReferenceSearchUrl(ref, topic, subject) {
    const t = encodeURIComponent(topic);
    const ts = encodeURIComponent(`${topic} ${subject}`);
    let url = ref.url;

    if (ref.platform === 'TeachMe Anatomy') url = `https://teachmeanatomy.info/?s=${t}`;
    else if (ref.platform === 'Geeky Medics') url = `https://geekymedics.com/?s=${t}`;
    else if (ref.platform === 'TeachMe Surgery – ENT') url = `https://teachmesurgery.com/ent/?s=${t}`;
    else if (ref.platform === 'TeachMe Surgery') url = `https://teachmesurgery.com/?s=${t}`;
    else if (ref.platform === 'EyeWiki (AAO)') url = `https://eyewiki.aao.org/w/index.php?search=${t}`;
    else if (ref.platform === 'Strong Medicine') url = `https://www.youtube.com/results?search_query=strong+medicine+${t}`;
    else if (ref.platform === 'Ninja Nerd Science') url = `https://www.youtube.com/results?search_query=ninja+nerd+${ts}`;
    else if (ref.platform === 'Osmosis') url = `https://www.youtube.com/results?search_query=osmosis+${ts}`;
    else if (ref.platform === 'Khan Academy Medicine') url = `https://www.khanacademy.org/search?search_again=1&page_search_query=${t}`;
    else if (ref.platform === 'NCBI Biochemistry') url = `https://www.ncbi.nlm.nih.gov/books/b/?term=${t}`;
    else if (ref.platform === 'Merck Manual Professional') url = `https://www.merckmanuals.com/professional/searchresults?searchterm=${encodeURIComponent(topic)}`;
    else if (ref.platform === 'PubMed') url = `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(`${topic} ${subject}`)}`;
    else if (ref.platform === 'LITFL') url = `https://litfl.com/?s=${t}`;
    else if (ref.platform === 'Libre Pathology') url = `https://librepathology.org/wiki/Special:Search?search=${t}`;
    else if (ref.platform === 'DrugBank') url = `https://www.drugbank.ca/unearth/q?query=${t}&searcher=drugs`;
    else if (ref.platform === 'CDC A–Z Topics') url = `https://search.cdc.gov/search/?query=${t}`;
    else if (ref.platform === 'MedlinePlus') url = `https://medlineplus.gov/search.html?query=${t}`;
    else if (ref.platform === 'WHO Health Topics') url = `https://www.who.int/health-topics/#q=${t}`;

    return url;
}

/** Build the most useful URL for a gold-standard resource given the current topic.
 *  YouTube channels get a topic-specific search; website platforms get their own search page if available. */
function buildGoldStandardUrl(gold, topic, subject) {
    const t = encodeURIComponent(topic);
    if (gold.type === 'youtube') {
        const q = `${gold.platform} ${topic} ${subject}`;
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    }
    // Website platforms — use their own search where possible
    if (gold.platform === 'OnlineMedEd')   return `https://onlinemeded.org/spa/search?q=${t}`;
    if (gold.platform === 'TeachMe Surgery') return `https://teachmesurgery.com/?s=${t}`;
    if (gold.platform === 'Geeky Medics')  return `https://geekymedics.com/?s=${t}`;
    // Pathoma and Sketchy require login — homepage is the best we can do
    return gold.url;
}

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
        const resources = [];
        const gold = SUBJECT_GOLD_STANDARD[subject];

        if (gold) {
            const goldUrl = buildGoldStandardUrl(gold, topic, subject);
            const linkLabel = gold.type === 'youtube' ? `Search ${gold.platform}` : `Open ${gold.platform}`;
            resources.push({
                resourceType: 'gold_standard',
                platform: gold.platform,
                title: gold.platform,
                note: gold.note,
                type: gold.type,
                freeLinks: [{ name: linkLabel, url: goldUrl }]
            });
        }

        const supplements = pickVideoSupplements(subject, gold);
        for (const v of supplements) {
            resources.push({
                resourceType: 'video',
                platform: v.platform,
                title: topic,
                note: v.note,
                type: 'youtube',
                freeLinks: [{
                    name: `Search ${v.platform}`,
                    url: youtubeSearchFromTemplate(v.template, topic, subject)
                }]
            });
        }

        const ref = SUBJECT_REFERENCE[subject];
        if (ref) {
            const url = buildReferenceSearchUrl(ref, topic, subject);
            resources.push({
                resourceType: ref.type === 'youtube' ? 'video' : 'reference',
                platform: ref.platform,
                title: topic,
                type: ref.type,
                freeLinks: [{ name: `Open ${ref.platform}`, url }]
            });
        }

        if (cachedTextbook) {
            resources.push({
                resourceType: 'textbook', platform: 'Library',
                title: cachedTextbook.title, author: cachedTextbook.author, type: 'book',
                freeLinks: (cachedTextbook.freeLinks || []).slice(0, 1).map(l => ({ name: l.name, url: l.url }))
            });
        }

        return resources;
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
        return syllabusScraper.getExpectedSubjects(country, year);
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

        // Delete any existing plan
        await StudyPlan.findOneAndDelete({ uid });

        const allTopics = await this.getAllTopics(country || 'India', year, selectedSubjects);
        if (allTopics.length === 0) {
            throw new Error('No topics found for the selected subjects and year.');
        }

        // ── Prioritise: weak → regular → strong ─────────────────────────────
        const weak    = allTopics.filter(t => weakTopics.includes(t.topic));
        const strong  = allTopics.filter(t => strongTopics.includes(t.topic));
        const regular = allTopics.filter(t => !weakTopics.includes(t.topic) && !strongTopics.includes(t.topic));
        const sortedTopics = [...weak, ...regular, ...strong];

        const today = startOfDay(new Date());
        const daysUntilExam = differenceInDays(examDateObj, today);
        if (daysUntilExam < 1) throw new Error('Exam date is too close');

        const learningDaysCount = Math.max(1, Math.floor(daysUntilExam * 0.8));
        const topicsPerDay = Math.max(1, Math.ceil(sortedTopics.length / learningDaysCount));

        // ── Pre-cache best textbook per subject so we don't re-scan library per task ──
        const textbookCache = {};
        if (this._library?.books) {
            for (const sub of selectedSubjects) {
                const cats = SUBJECT_CATEGORY_MAP[sub] || [sub];
                const matches = this._library.books.filter(b =>
                    cats.some(c => b.category?.toLowerCase() === c.toLowerCase()) &&
                    b.freeLinks?.length > 0 && b.course === 'MBBS'
                );
                matches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                textbookCache[sub] = matches[0] || null;
            }
        }

        const daily_plan = [];
        let topicIndex = 0;
        let totalTasksGenerated = 0;

        // Map: topicName → { dayIdx, subject } for SRS scheduling
        const topicLearnDates = new Map();

        for (let i = 0; i < daysUntilExam; i++) {
            const currentDay = addDays(today, i);
            const tasks = [];

            // ── PHASE 1: LEARNING + SRS (first 80%) ─────────────────────────
            if (i < learningDaysCount) {
                // 1a. New learning tasks for today
                const topicsForToday = sortedTopics.slice(topicIndex, topicIndex + topicsPerDay);
                topicsForToday.forEach((t, idx) => {
                    tasks.push({
                        id: `task_${i}_learn_${idx}_${Date.now() + idx}`,
                        text: `Analyze & Learn: ${t.subject} — ${t.topic}`,
                        topic: t.topic,
                        type: 'learning',
                        completed: false,
                        resources: this._buildResources(t.subject, t.topic, textbookCache[t.subject])
                    });
                    topicLearnDates.set(t.topic, { dayIdx: i, subject: t.subject });
                });
                topicIndex += topicsPerDay;

                // 1b. SRS recall tasks — SM-2 style intervals
                for (const [pastTopic, info] of topicLearnDates.entries()) {
                    const daysSinceLearned = i - info.dayIdx;
                    if (SRS_INTERVALS.includes(daysSinceLearned)) {
                        const label = daysSinceLearned === 1 ? '1d'
                            : daysSinceLearned === 3 ? '3d'
                            : daysSinceLearned === 7 ? '1wk'
                            : daysSinceLearned === 14 ? '2wk'
                            : daysSinceLearned === 21 ? '3wk'
                            : '1mo';
                        tasks.push({
                            id: `task_${i}_srs_${daysSinceLearned}d_${Date.now() + i}`,
                            text: `Spaced Recall (${label}): ${pastTopic}`,
                            topic: pastTopic,
                            type: 'review',
                            completed: false,
                            resources: this._buildResources(info.subject, pastTopic, textbookCache[info.subject])
                        });
                    }
                }
            }
            // ── PHASE 2: MOCK EXAM & TARGETED REVIEW (last 20%) ─────────────
            else {
                tasks.push({
                    id: `task_${i}_mock_${Date.now()}`,
                    text: `Full Subject Mock Exam: ${selectedSubjects.slice(0, 3).join(', ')}`,
                    topic: 'Mock Exam',
                    type: 'mock_exam',
                    completed: false,
                    resources: []
                });

                // Cycle through subjects for targeted reviews
                const subjectIndex = (i - learningDaysCount) % selectedSubjects.length;
                const reviewSubject = selectedSubjects[subjectIndex];
                tasks.push({
                    id: `task_${i}_targeted_${Date.now() + 1}`,
                    text: `Targeted Mastery: ${reviewSubject}${weakTopics.length > 0 ? ' — Focus on ' + weakTopics.slice(0, 2).join(', ') : ''}`,
                    topic: reviewSubject,
                    type: 'review',
                    completed: false,
                    resources: this._buildResources(reviewSubject, reviewSubject, textbookCache[reviewSubject])
                });
            }

            if (tasks.length === 0) {
                tasks.push({
                    id: `task_${i}_pad_${Date.now()}`,
                    text: 'General Consolidation & Rest',
                    topic: 'Review',
                    type: 'learning',
                    completed: false,
                    resources: []
                });
            }

            totalTasksGenerated += tasks.length;
            daily_plan.push({
                date: format(currentDay, 'yyyy-MM-dd'),
                tasks,
                completion_rate: 0
            });
        }

        // ── AI Advisory ───────────────────────────────────────────────────────
        let advisory_text = '';
        try {
            const prompt = `Act as an expert medical study advisor. Write a 2-sentence, high-energy, personalised strategy for a Year ${year} MBBS student with ${daysUntilExam} days until exams. Subjects: ${selectedSubjects.join(', ')}. Weak areas: ${weakTopics.slice(0, 4).join(', ') || 'none specified'}. Emphasise spaced repetition and clinical integration.`;
            if (process.env.GEMINI_API_KEY) {
                advisory_text = await geminiService.callLLM(prompt, { temperature: 0.55, max_tokens: 160 });
            }
        } catch (e) {
            console.warn('[StudyService] AI advisory failed:', e.message);
        }
        if (!advisory_text) {
            advisory_text = `With ${daysUntilExam} days to go, front-load your weak topics and let spaced repetition lock them in. Stay consistent — even 2 hours daily beats weekend cramming every time.`;
        }

        // ── Milestone Goals (proper weekly + monthly + quarterly) ─────────────
        const goals = { daily: [], weekly: [], monthly: [], quarterly: [] };

        // One goal per week
        const weekCount = Math.min(Math.floor(daysUntilExam / 7), 12);
        const weeklySubjectCycle = [...selectedSubjects];
        for (let w = 1; w <= weekCount; w++) {
            const subjectFocus = weeklySubjectCycle[(w - 1) % weeklySubjectCycle.length];
            goals.weekly.push({
                id: `wg${w}`,
                text: w === 1
                    ? `Complete Week 1 — establish daily study rhythm`
                    : w === weekCount
                        ? `Final sprint — revise all subjects & complete mock exams`
                        : `Week ${w}: Master ${subjectFocus} key topics`,
                due: format(addDays(today, w * 7), 'yyyy-MM-dd'),
                done: false
            });
        }

        // Monthly goals
        const monthCount = Math.min(Math.floor(daysUntilExam / 30), 4);
        const monthMilestones = [
            'Complete first pass of all major systems',
            'Finish learning phase — start intensive SRS review',
            'Mock exams every 3 days — identify final weak areas',
            'Final month — high-yield revision and past papers only'
        ];
        for (let m = 1; m <= monthCount; m++) {
            goals.monthly.push({
                id: `mg${m}`,
                text: monthMilestones[m - 1] || `Month ${m}: Consolidation checkpoint`,
                due: format(addDays(today, m * 30), 'yyyy-MM-dd'),
                done: false
            });
        }

        // Quarterly goal if enough time
        if (daysUntilExam >= 90) {
            goals.quarterly.push({
                id: 'qg1',
                text: `First quarter complete — full curriculum coverage for ${selectedSubjects.join(' + ')}`,
                due: format(addDays(today, 90), 'yyyy-MM-dd'),
                done: false
            });
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
            analytics: { total_tasks: totalTasksGenerated, completed: 0, pace_factor: 1.0 }
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
        const doneToday  = dayPlan.tasks.filter(t => t.completed).length;
        dayPlan.completion_rate = totalToday > 0 ? (doneToday / totalToday) * 100 : 0;

        // ── Streak logic ─────────────────────────────────────────────────────
        const todayObj     = startOfDay(new Date());
        const yesterdayObj = addDays(todayObj, -1);

        if (dayPlan.completion_rate === 100) {
            let lastCheckin = plan.streak.last_checkin ? startOfDay(new Date(plan.streak.last_checkin)) : null;
            if (!lastCheckin || lastCheckin.getTime() === yesterdayObj.getTime()) {
                if (!lastCheckin || lastCheckin.getTime() !== todayObj.getTime()) {
                    plan.streak.current += 1;
                    plan.streak.last_checkin = todayObj;
                }
            } else if (lastCheckin && lastCheckin.getTime() < yesterdayObj.getTime()) {
                plan.streak.current = 1;
                plan.streak.last_checkin = todayObj;
            }
            if (plan.streak.current > plan.streak.longest) {
                plan.streak.longest = plan.streak.current;
            }
        } else if (wasCompleted && !completedStatus && dayPlan.completion_rate < 100) {
            let lastCheckin = plan.streak.last_checkin ? startOfDay(new Date(plan.streak.last_checkin)) : null;
            if (lastCheckin && lastCheckin.getTime() === todayObj.getTime()) {
                plan.streak.current = Math.max(0, plan.streak.current - 1);
                plan.streak.last_checkin = plan.streak.current > 0 ? yesterdayObj : null;
            }
        }

        await plan.save();
        return await this.getTodayTasks(uid);
    }

    // ── Tick a goal as done/undone ────────────────────────────────────────────
    async tickGoal(uid, goalType, goalId) {
        const plan = await StudyPlan.findOne({ uid });
        if (!plan) throw new Error('Plan not found');

        const goalList = plan.goals[goalType];
        if (!goalList) throw new Error(`Invalid goal type: ${goalType}`);

        const goal = goalList.find(g => g.id === goalId);
        if (!goal) throw new Error('Goal not found');

        goal.done = !goal.done;
        await plan.save();
        return { goalType, goalId, done: goal.done };
    }

    async addTask(uid, dateStr, text) {
        const plan = await StudyPlan.findOne({ uid });
        if (!plan) throw new Error('Plan not found');

        const dayPlan = plan.daily_plan.find(p => p.date === dateStr);
        if (!dayPlan) throw new Error('Daily plan not found for date');

        const newTask = {
            id: `task_${Date.now()}_custom`,
            text,
            topic: 'Custom',
            type: 'learning',
            completed: false,
            resources: []
        };

        dayPlan.tasks.push(newTask);
        plan.analytics.total_tasks += 1;

        const totalToday = dayPlan.tasks.length;
        const doneToday  = dayPlan.tasks.filter(t => t.completed).length;
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

        task.text = newText;
        await plan.save();
        return await this.getTodayTasks(uid);
    }

    async getAnalytics(uid) {
        const plan = await StudyPlan.findOne({ uid });
        if (!plan) return null;

        const today = startOfDay(new Date());
        const heatmap = [];
        for (let i = 6; i >= 0; i--) {
            const d    = addDays(today, -i);
            const dStr = format(d, 'yyyy-MM-dd');
            const dp   = plan.daily_plan.find(p => p.date === dStr);
            heatmap.push({ date: dStr, rate: dp ? Math.round(dp.completion_rate) : 0 });
        }

        return {
            streak:    plan.streak,
            analytics: plan.analytics,
            heatmap,
            goals:     plan.goals
        };
    }
}

module.exports = new StudyService();
