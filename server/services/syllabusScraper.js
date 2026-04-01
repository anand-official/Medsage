const fs = require('fs');
const path = require('path');
let pdf = null;

try {
    pdf = require('pdf-parse');
} catch (error) {
    console.warn('[Syllabus Agent] pdf-parse is unavailable:', error.message);
}

const geminiService = require('./geminiService');
const {
    normalizeCountry,
    getExpectedSubjects,
    getStaticCurriculum
} = require('../data/plannerCountryConfig');

const GENERIC_FALLBACK = {
    Anatomy: ['Upper Limb Anatomy', 'Lower Limb Anatomy', 'Thorax', 'Abdomen', 'Pelvis and Perineum', 'Head and Neck', 'Neuroanatomy', 'Histology', 'Embryology', 'Surface Anatomy'],
    Physiology: ['Cell Physiology', 'Nerve and Muscle', 'Blood', 'Cardiovascular Physiology', 'Respiratory Physiology', 'Gastrointestinal Physiology', 'Renal Physiology', 'Endocrinology', 'Reproductive Physiology', 'Neurophysiology'],
    Biochemistry: ['Enzymes', 'Carbohydrate Metabolism', 'Lipid Metabolism', 'Protein Metabolism', 'Nucleotide Metabolism', 'Molecular Biology', 'Vitamins', 'Minerals', 'Liver Function Tests', 'Acid-Base Balance'],
    Microbiology: ['Bacteriology', 'Virology', 'Mycology', 'Parasitology', 'Sterilization and Disinfection', 'Immunity', 'Hospital-Acquired Infections', 'Antimicrobial Resistance', 'Laboratory Diagnosis', 'Vaccines'],
    Pathology: ['Cell Injury', 'Inflammation', 'Hemodynamic Disorders', 'Neoplasia', 'Hematology', 'Cardiovascular Pathology', 'Respiratory Pathology', 'Gastrointestinal Pathology', 'Renal Pathology', 'Endocrine Pathology'],
    Pharmacology: ['General Pharmacology', 'Autonomic Pharmacology', 'Cardiovascular Drugs', 'Respiratory Drugs', 'Gastrointestinal Drugs', 'Endocrine Drugs', 'CNS Drugs', 'Chemotherapy', 'Anti-Infectives', 'Emergency Drugs'],
    'Forensic Medicine': ['Medical Jurisprudence', 'Consent and Confidentiality', 'Identification', 'Thanatology', 'Autopsy', 'Injuries', 'Asphyxial Deaths', 'Toxicology', 'Sexual Offences', 'Forensic Psychiatry'],
    PSM: ['Concept of Health and Disease', 'Epidemiology', 'Biostatistics', 'Screening', 'Communicable Diseases', 'Non-Communicable Diseases', 'Nutrition', 'Maternal and Child Health', 'Occupational Health', 'Health Programs'],
    'Community Medicine': ['Epidemiology', 'Biostatistics', 'Communicable Diseases', 'Non-Communicable Diseases', 'Maternal and Child Health', 'Nutrition', 'Occupational Health', 'Environmental Health', 'Health Programs', 'Health Management'],
    ENT: ['Ear Anatomy', 'Otitis Media', 'Hearing Loss', 'Rhinitis', 'Sinusitis', 'Nasal Polyps', 'Tonsillitis', 'Laryngeal Disorders', 'Neck Swellings', 'ENT Emergencies'],
    Ophthalmology: ['Visual Acuity', 'Refraction', 'Conjunctivitis', 'Corneal Ulcer', 'Uveitis', 'Cataract', 'Glaucoma', 'Retinal Disorders', 'Eye Injuries', 'Community Ophthalmology'],
    Medicine: ['Cardiology', 'Respiratory Medicine', 'Gastroenterology', 'Nephrology', 'Neurology', 'Endocrinology', 'Infectious Diseases', 'Rheumatology', 'Hematology', 'Emergency Medicine'],
    Surgery: ['Wound Healing', 'Trauma', 'Acute Abdomen', 'Hernia', 'Breast Surgery', 'Thyroid Surgery', 'GI Surgery', 'Hepatobiliary Surgery', 'Urology', 'Postoperative Care'],
    OBGYN: ['Antenatal Care', 'Normal Labour', 'Obstetric Emergencies', 'Puerperium', 'Family Planning', 'Menstrual Disorders', 'Infertility', 'Gynecologic Oncology', 'STI in Gynecology', 'Operative Obstetrics'],
    Pediatrics: ['Growth and Development', 'Neonatology', 'Nutrition', 'Immunization', 'Respiratory Disorders', 'Diarrheal Disease', 'Cardiology', 'Nephrology', 'Neurology', 'Pediatric Emergencies'],
    Internship: ['IV Cannulation', 'Catheterization', 'BLS', 'ACLS', 'Suturing', 'Wound Dressing', 'ECG Interpretation', 'ABG Basics', 'Referrals', 'Documentation'],
    Orthopedics: ['Fractures', 'Trauma', 'Plaster and Splints', 'Hip Examination', 'Knee Examination', 'Spine Disorders', 'Congenital Deformities', 'Bone Tumors', 'Peripheral Nerve Lesions', 'Rehabilitation'],
    Psychiatry: ['Psychiatric Interview', 'Mental Status Examination', 'Schizophrenia', 'Mood Disorders', 'Anxiety Disorders', 'OCD', 'Substance Use Disorders', 'Child Psychiatry', 'Psychotropic Drugs', 'Counseling'],
    Dermatology: ['Skin Lesions', 'Fungal Infections', 'Bacterial Skin Infections', 'Viral Skin Diseases', 'Leprosy', 'Eczema', 'Psoriasis', 'Acne', 'Urticaria', 'Drug Eruptions'],
    Radiology: ['Chest X-Ray', 'Abdominal X-Ray', 'Skeletal Imaging', 'Ultrasound Basics', 'CT Basics', 'MRI Basics', 'Contrast Safety', 'Radiation Protection', 'Emergency Imaging', 'Line and Tube Checks'],
    Anesthesia: ['Preanesthetic Assessment', 'Airway Assessment', 'General Anesthesia', 'Local Anesthesia', 'Spinal Anesthesia', 'Pain Management', 'Fluid Therapy', 'Monitoring', 'Perioperative Emergencies', 'Resuscitation'],
    Dental: ['Oral Examination', 'Dental Caries', 'Odontogenic Infections', 'Oral Ulcers', 'Oral Hygiene', 'Maxillofacial Trauma', 'Referral Criteria'],
    'Introduction to Clinical Medicine': ['Medical Ethics', 'Communication Skills', 'History Taking', 'General Physical Examination', 'Systemic Examination', 'Clinical Reasoning', 'First Aid', 'Bedside Procedures'],
    'Medical Informatics': ['Computer Fundamentals', 'Word Processing', 'Spreadsheets', 'Presentations', 'Data Analysis', 'Internet Search', 'Medical Databases', 'Report Writing']
};

class SyllabusScraper {
    constructor() {
        this.cacheFile = path.join(__dirname, '../data/country_curriculums.json');
        this.ensureCacheFileExists();
    }

    ensureCacheFileExists() {
        if (!fs.existsSync(path.dirname(this.cacheFile))) {
            fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
        }
        if (!fs.existsSync(this.cacheFile)) {
            fs.writeFileSync(this.cacheFile, JSON.stringify({}, null, 2));
        }
    }

    getExpectedSubjects(country, year) {
        return getExpectedSubjects(country, year);
    }

    getPdfPath(country) {
        const normalizedCountry = normalizeCountry(country);
        const candidates = normalizedCountry === 'Nepal'
            ? [
                path.join(__dirname, '../../Ku_syallbus.pdf'),
                path.join(__dirname, '../controllers/Ku_syallbus.pdf')
            ]
            : [path.join(__dirname, '../../Syllabus - MBBS.pdf')];

        return candidates.find(candidate => fs.existsSync(candidate)) || null;
    }

    readCache() {
        try {
            return JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        } catch (error) {
            console.error('Error reading curriculum cache:', error);
            return {};
        }
    }

    writeCache(country, year, curriculum) {
        const cache = this.readCache();
        if (!cache[country]) cache[country] = {};
        cache[country][year] = curriculum;
        fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
    }

    getFallbackCurriculum(country, year) {
        const staticCurriculum = getStaticCurriculum(country, year);
        if (staticCurriculum) {
            return staticCurriculum;
        }

        const subjects = this.getExpectedSubjects(country, year);
        return subjects.reduce((acc, subject) => {
            if (GENERIC_FALLBACK[subject]) {
                acc[subject] = GENERIC_FALLBACK[subject];
            }
            return acc;
        }, {});
    }

    async getCurriculum(country, year) {
        const normalizedCountry = normalizeCountry(country);
        const staticCurriculum = getStaticCurriculum(normalizedCountry, year);

        if (staticCurriculum) {
            this.writeCache(normalizedCountry, year, staticCurriculum);
            return staticCurriculum;
        }

        const cache = this.readCache();
        if (cache[normalizedCountry] && cache[normalizedCountry][year]) {
            console.log(`[Syllabus Agent] Found cached curriculum for ${normalizedCountry} Year ${year}`);
            return cache[normalizedCountry][year];
        }

        console.log(`[Syllabus Agent] Generating curriculum for ${normalizedCountry} Year ${year}...`);

        try {
            const pdfPath = this.getPdfPath(normalizedCountry);
            let pdfText = '';

            if (pdfPath && pdf) {
                console.log(`[Syllabus Agent] Parsing syllabus PDF for ${normalizedCountry}: ${path.basename(pdfPath)}`);
                const data = await pdf(fs.readFileSync(pdfPath));
                pdfText = data.text;
            }

            const subjectsToExtract = this.getExpectedSubjects(normalizedCountry, year);
            const curriculum = {};

            for (const subject of subjectsToExtract) {
                let contextBlock = '';

                if (pdfText) {
                    const headingRegex = new RegExp(`\\b${subject}\\b`, 'i');
                    const matchIndex = pdfText.search(headingRegex);
                    if (matchIndex !== -1) {
                        contextBlock = pdfText.substring(matchIndex, matchIndex + 5000);
                    }
                }

                if (!process.env.GEMINI_API_KEY) {
                    throw new Error('No API Key, cannot generate syllabus dynamically.');
                }

                const prompt = `
Act as an expert medical education registrar.
Extract 20-30 highly specific medical subtopics for the MBBS subject "${subject}" for a Year ${year} student studying in ${normalizedCountry}.
${contextBlock ? `Use the syllabus excerpt below as the primary source.\n\n"""\n${contextBlock}\n"""\n\n` : ''}
Return the output STRICTLY as a valid JSON array of strings like ["Topic 1", "Topic 2"].
Do not include markdown, backticks, numbering, or explanations.
                `;

                console.log(`[Syllabus Agent] Calling LLM for ${normalizedCountry} ${subject}...`);
                const responseText = await geminiService.callLLM(prompt, { temperature: 0.2, max_tokens: 300 });
                const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const topicsArray = JSON.parse(cleanJsonStr);

                if (Array.isArray(topicsArray) && topicsArray.length > 0) {
                    curriculum[subject] = topicsArray;
                }
            }

            if (Object.keys(curriculum).length === 0) {
                throw new Error('No topics extracted.');
            }

            this.writeCache(normalizedCountry, year, curriculum);
            return curriculum;
        } catch (error) {
            console.error(`[Syllabus Agent] Failed to generate curriculum for ${normalizedCountry}:`, error.message);
            return this.getFallbackCurriculum(normalizedCountry, year);
        }
    }
}

module.exports = new SyllabusScraper();
