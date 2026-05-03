const BLOCKED_RESOURCE_DOMAINS = [
    'z-library',
    'zlibrary',
    'libgen',
    'annas-archive',
    'annas archive'
];

const SUBJECT_ALIASES = {
    PSM: 'Community Medicine',
    OBGYN: 'Obstetrics & Gynecology',
    Medicine: 'Medicine',
    Surgery: 'Surgery'
};

const RESOURCE_CATALOG_VERSION = 1;

const CORE_RESOURCES = [
    {
        subjects: ['Anatomy'],
        resourceType: 'gold_standard',
        platform: 'TeachMeAnatomy',
        title: 'TeachMeAnatomy topic guide',
        access: 'free',
        type: 'website',
        url: 'https://teachmeanatomy.info/',
        why: 'High-quality anatomy explanations with clinical relevance and fast topic lookup.',
        tags: ['official_open', 'india_nepal_fit', 'clinical']
    },
    {
        subjects: ['Anatomy', 'Physiology', 'Pathology', 'Medicine', 'Surgery', 'Pediatrics', 'ENT', 'Ophthalmology'],
        resourceType: 'video',
        platform: 'Osmosis',
        title: 'Osmosis medical learning videos',
        access: 'freemium',
        type: 'video',
        url: 'https://www.osmosis.org/',
        why: 'Concise visual explanations that work well for first pass and clinical integration.',
        tags: ['global_gold', 'video', 'visual']
    },
    {
        subjects: ['Pathology'],
        resourceType: 'gold_standard',
        platform: 'Pathoma',
        title: 'Pathoma pathology lectures',
        access: 'paid',
        type: 'website',
        url: 'https://www.pathoma.com/',
        why: 'Gold-standard pathology framework for mechanisms, morphology, and exam recall.',
        tags: ['global_gold', 'paid', 'exam']
    },
    {
        subjects: ['Pathology'],
        resourceType: 'reference',
        platform: 'PathElective',
        title: 'PathElective pathology learning modules',
        access: 'free',
        type: 'website',
        url: 'https://www.pathelective.com/',
        why: 'Free pathology modules with structured explanations and practical learning flow.',
        tags: ['official_open', 'pathology']
    },
    {
        subjects: ['Pharmacology', 'Microbiology'],
        resourceType: 'gold_standard',
        platform: 'Sketchy',
        title: 'Sketchy medical visual memory resources',
        access: 'paid',
        type: 'website',
        url: 'https://www.sketchy.com/explore/medical-program',
        why: 'Excellent memory hooks for drugs and organisms when paired with active recall.',
        tags: ['global_gold', 'paid', 'visual_memory']
    },
    {
        subjects: ['Medicine', 'Surgery', 'Internship'],
        resourceType: 'reference',
        platform: 'Geeky Medics',
        title: 'Geeky Medics clinical skills',
        access: 'free',
        type: 'website',
        url: 'https://geekymedics.com/',
        why: 'Strong clinical skills, OSCE, examination, and ward-ready explanations.',
        tags: ['official_open', 'clinical', 'india_nepal_fit']
    },
    {
        subjects: ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 'Microbiology', 'Medicine', 'Surgery', 'Pediatrics', 'Obstetrics & Gynecology', 'Community Medicine'],
        resourceType: 'textbook',
        platform: 'Open Library',
        title: 'Open Library controlled digital lending search',
        access: 'free',
        type: 'library',
        url: 'https://openlibrary.org/',
        why: 'Lowest-cost legal access path for textbooks when a borrowable copy exists.',
        tags: ['legal_lending', 'low_cost', 'library']
    },
    {
        subjects: ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 'Microbiology', 'Medicine', 'Surgery', 'Pediatrics', 'Obstetrics & Gynecology', 'Community Medicine'],
        resourceType: 'textbook',
        platform: 'Internet Archive',
        title: 'Internet Archive text lending search',
        access: 'free',
        type: 'library',
        url: 'https://archive.org/',
        why: 'Legal library-style search path for borrowable/open medical texts and older editions.',
        tags: ['legal_lending', 'low_cost', 'library']
    },
    {
        subjects: ['Surgery', 'ENT'],
        resourceType: 'reference',
        platform: 'TeachMeSurgery',
        title: 'TeachMeSurgery topic guide',
        access: 'free',
        type: 'website',
        url: 'https://teachmesurgery.com/',
        why: 'Clear surgical differentials, management pathways, and anatomy-clinical links.',
        tags: ['official_open', 'clinical']
    },
    {
        subjects: ['Medicine', 'Pediatrics', 'Obstetrics & Gynecology', 'Pharmacology'],
        resourceType: 'reference',
        platform: 'Merck Manual Professional',
        title: 'Merck Manual Professional reference',
        access: 'free',
        type: 'website',
        url: 'https://www.merckmanuals.com/professional',
        why: 'Reliable clinical reference for diagnosis, management, and quick revision.',
        tags: ['official_open', 'clinical_reference']
    },
    {
        subjects: ['Community Medicine', 'PSM'],
        resourceType: 'guideline',
        platform: 'WHO Health Topics',
        title: 'WHO health topics and public health references',
        access: 'free',
        type: 'website',
        url: 'https://www.who.int/health-topics/',
        why: 'Authoritative public-health grounding for epidemiology, prevention, and programs.',
        tags: ['official_open', 'public_health']
    },
    {
        subjects: ['Biochemistry', 'Physiology'],
        resourceType: 'video',
        platform: 'Ninja Nerd',
        title: 'Ninja Nerd medical lectures',
        access: 'free',
        type: 'video',
        url: 'https://www.youtube.com/@NinjaNerdOfficial',
        why: 'Deep mechanism-focused teaching for hard physiology and biochemistry concepts.',
        tags: ['official_open', 'video', 'deep_dive']
    }
];

function normalizeSubject(subject = '') {
    return SUBJECT_ALIASES[subject] || subject;
}

function isBlockedUrl(url = '') {
    const normalized = String(url).toLowerCase();
    return BLOCKED_RESOURCE_DOMAINS.some(domain => normalized.includes(domain));
}

function topicSearchUrl(baseUrl, platform, topic, subject) {
    const q = encodeURIComponent([topic, subject].filter(Boolean).join(' '));
    const t = encodeURIComponent(topic || subject || '');

    if (platform === 'TeachMeAnatomy') return `https://teachmeanatomy.info/?s=${t}`;
    if (platform === 'TeachMeSurgery') return `https://teachmesurgery.com/?s=${t}`;
    if (platform === 'Geeky Medics') return `https://geekymedics.com/?s=${t}`;
    if (platform === 'Merck Manual Professional') return `https://www.merckmanuals.com/professional/searchresults?searchterm=${t}`;
    if (platform === 'WHO Health Topics') return `https://www.who.int/health-topics/#q=${t}`;
    if (platform === 'Open Library') return `https://openlibrary.org/search?q=${encodeURIComponent(`${topic} ${subject} textbook`)}`;
    if (platform === 'Internet Archive') return `https://archive.org/search?query=${encodeURIComponent(`${topic} ${subject} medical textbook`)}&and[]=mediatype%3A%22texts%22`;
    if (platform === 'Ninja Nerd') return `https://www.youtube.com/results?search_query=${encodeURIComponent(`Ninja Nerd ${topic} ${subject}`)}`;
    if (platform === 'Osmosis') return `https://www.youtube.com/results?search_query=${encodeURIComponent(`Osmosis ${topic} ${subject}`)}`;
    if (platform === 'PathElective') return `https://www.pathelective.com/search?q=${t}`;
    if (platform === 'Pathoma') return baseUrl;
    if (platform === 'Sketchy') return baseUrl;
    return q ? `${baseUrl}?q=${q}` : baseUrl;
}

function buildResource(entry, { subject, topic, country = 'India', userPreferences = {} } = {}) {
    const link = topicSearchUrl(entry.url, entry.platform, topic, subject);
    if (isBlockedUrl(link)) return null;

    const subjectFit = entry.subjects.includes(normalizeSubject(subject)) || entry.subjects.includes(subject) ? 35 : 0;
    const openFit = entry.access === 'free' ? 25 : entry.access === 'freemium' ? 14 : 8;
    const lowCostFit = entry.tags.includes('low_cost') || entry.tags.includes('legal_lending') ? 10 : 0;
    const localFit = entry.tags.includes('india_nepal_fit') || ['India', 'Nepal'].includes(country) ? 12 : 0;
    const formatFit = userPreferences.preferred_resource_types?.includes(entry.type) ? 8 : 0;
    const goldFit = entry.tags.includes('global_gold') || entry.tags.includes('official_open') ? 15 : 0;
    const quality_score = subjectFit + openFit + lowCostFit + localFit + formatFit + goldFit;

    return {
        resourceType: entry.resourceType,
        platform: entry.platform,
        title: topic ? `${entry.title}: ${topic}` : entry.title,
        note: entry.why,
        why: entry.why,
        type: entry.type,
        access: entry.access,
        estimated_minutes: entry.type === 'video' ? 25 : 18,
        quality_score,
        tags: entry.tags,
        freeLinks: [{ name: entry.access === 'paid' ? `Open official ${entry.platform}` : `Open ${entry.platform}`, url: link }],
        alternatives: []
    };
}

function sanitizeResource(resource) {
    if (!resource || typeof resource !== 'object') return null;
    const links = (resource.freeLinks || []).filter(link => link?.url && !isBlockedUrl(link.url));
    if (links.length === 0 && resource.freeLinks?.length > 0) return null;
    return {
        ...resource,
        freeLinks: links,
        access: resource.access || 'free',
        why: resource.why || resource.note || 'Selected for topic fit and medical learning quality.',
        tags: resource.tags || []
    };
}

function rankResources({ subject, topic, country = 'India', year = null, userPreferences = {}, limit = 5 } = {}) {
    const normalizedSubject = normalizeSubject(subject);
    const candidates = CORE_RESOURCES
        .filter(entry => entry.subjects.includes(normalizedSubject) || entry.subjects.includes(subject))
        .map(entry => buildResource(entry, { subject: normalizedSubject, topic, country, year, userPreferences }))
        .filter(Boolean)
        .sort((a, b) => b.quality_score - a.quality_score);

    const fallback = CORE_RESOURCES
        .filter(entry => entry.tags.includes('official_open') || entry.tags.includes('global_gold'))
        .map(entry => buildResource(entry, { subject: normalizedSubject, topic, country, year, userPreferences }))
        .filter(Boolean)
        .sort((a, b) => b.quality_score - a.quality_score);

    const seen = new Set();
    return [...candidates, ...fallback]
        .filter(resource => {
            const key = `${resource.platform}:${resource.freeLinks?.[0]?.url}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, limit);
}

module.exports = {
    RESOURCE_CATALOG_VERSION,
    BLOCKED_RESOURCE_DOMAINS,
    rankResources,
    sanitizeResource,
    isBlockedUrl,
};
