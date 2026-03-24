const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const geminiService = require('./geminiService');

const EXPECTED_SUBJECTS = {
    1: ['Anatomy', 'Physiology', 'Biochemistry'],
    2: ['Pathology', 'Pharmacology', 'Microbiology', 'Forensic Medicine'],
    3: ['PSM', 'ENT', 'Ophthalmology', 'Community Medicine'],
    4: ['Medicine', 'Surgery', 'OBGYN', 'Pediatrics'],
    5: ['Internship']
};

class SyllabusScraper {
    constructor() {
        this.cacheFile = path.join(__dirname, '../data/country_curriculums.json');
        this.pdfPath = path.join(__dirname, '../../Syllabus - MBBS.pdf');
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

    async getCurriculum(country, year) {
        // 1. Check local JSON cache first
        try {
            const cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
            if (cache[country] && cache[country][year]) {
                console.log(`[Syllabus Agent] Found cached curriculum for ${country} Year ${year}`);
                return cache[country][year];
            }
        } catch (e) {
            console.error("Error reading curriculum cache:", e);
        }

        console.log(`[Syllabus Agent] Generating standard curriculum for ${country} Year ${year} using AI & Syllabus PDF...`);

        let curriculum = {};
        try {
            let pdfText = '';
            // If the requested country is India and our syllabus PDF is available
            if (country === 'India' && fs.existsSync(this.pdfPath)) {
                console.log(`[Syllabus Agent] Parsing local syllabus PDF...`);
                const data = await pdf(fs.readFileSync(this.pdfPath));
                pdfText = data.text;
            }

            const subjectsToExtract = EXPECTED_SUBJECTS[year] || [];

            for (let subject of subjectsToExtract) {
                let contextBlock = '';
                if (pdfText) {
                    // Search for the subject in the PDF to provide context
                    const regex = new RegExp(`\\b${subject}\\n(?![a-z])|\\n${subject}\\b`, 'i'); // try to find as heading
                    let matchIndex = pdfText.search(regex);
                    if (matchIndex === -1) {
                        // fallback to standard keyword match
                        const regexAny = new RegExp(`\\b${subject}\\b`, 'i');
                        matchIndex = pdfText.search(regexAny);
                    }
                    if (matchIndex !== -1) {
                        // Extract a reasonable chunk (e.g. 5000 characters) following the subject heading
                        contextBlock = pdfText.substring(matchIndex, matchIndex + 5000);
                    }
                }

                const prompt = `
Act as an expert medical education registrar.
Extract 20-30 highly specific, highly granular medical subtopics/chapters for the medical subject "${subject}" for a Year ${year} student studying in ${country}. Break large systems down (e.g., instead of "Cardiovascular", use "Coronary Circulation", "Heart Failure Pathophysiology", "ECG basics", etc.).
${contextBlock ? `Base your extraction directly on the syllabus text excerpt below.\n\n"""\n${contextBlock}\n"""\n\n` : ''}
Return the output STRICTLY as a valid JSON array of strings in the format: ["Topic 1", "Topic 2", "Topic 3"].
Do not include any markdown formatting, backticks, or explanations. Just the JSON array.
                `;

                if (!process.env.GEMINI_API_KEY) {
                    throw new Error("No API Key, cannot generate syllabus dynamically.");
                }

                console.log(`[Syllabus Agent] Calling LLM for ${subject}...`);
                const responseText = await geminiService.callLLM(prompt, { temperature: 0.2, max_tokens: 300 });
                const cleanJsonStr = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
                const topicsArray = JSON.parse(cleanJsonStr);

                if (Array.isArray(topicsArray)) {
                    curriculum[subject] = topicsArray;
                }
            }

            // 3. Save to Cache
            if (Object.keys(curriculum).length > 0) {
                const cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
                if (!cache[country]) cache[country] = {};
                cache[country][year] = curriculum;
                fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
                return curriculum;
            } else {
                throw new Error("No topics extracted.");
            }

        } catch (error) {
            console.error(`[Syllabus Agent] Failed to generate curriculum for ${country}:`, error.message);
            // 4. Fallback to highly granular curriculum for Spaced Repetition — filtered by requested year
            const FULL_FALLBACK = {
                "Anatomy": ["Upper Limb Bones", "Shoulder Joint & Muscles", "Brachial Plexus", "Hand & Wrist", "Lower Limb Hip & Gluteal", "Knee & Leg", "Ankle & Foot", "Abdominal Wall", "Inguinal Canal", "Peritoneum & GI Tract", "Liver & Biliary", "Kidneys & Pelvis", "Thoracic Cage", "Heart Chambers", "Lungs & Pleura", "Head Osteology", "Neck Triangles", "Cranial Nerves (I-VI)", "Cranial Nerves (VII-XII)", "Brainstem & Cerebellum", "Cerebrum & Meninges", "Embryology 1", "Histology Epithelium"],
                "Physiology": ["Cell Membrane Dynamics", "Action Potentials", "Skeletal Muscle", "Smooth Muscle", "Cardiac Cycle", "ECG Basics", "Hemodynamics", "Microcirculation", "RBCs & Anemia", "Hemostasis & Coagulation", "WBCs & Immunity", "Pulmonary Mechanics", "Gas Exchange", "Neural Control of Breathing", "GI Motility", "Gastric Secretion", "Renal GFR", "Renal Tubular Transport", "Acid-Base Balance", "Hypothalamus & Pituitary", "Thyroid & Parathyroid", "Adrenal Gland", "Pancreatic Hormones", "Sensory Receptors", "Motor Cortex", "Basal Ganglia"],
                "Biochemistry": ["Enzyme Kinetics", "Carbohydrate Metabolism (Glycolysis)", "TCA Cycle", "Gluconeogenesis & Glycogenolysis", "Lipid Metabolism (Beta Oxidation)", "Cholesterol Synthesis", "Lipoproteins", "Amino Acid Catabolism", "Urea Cycle", "Nucleotide Metabolism", "DNA Replication", "Transcription & RNA Processing", "Translation", "Vitamins (Water Soluble)", "Vitamins (Fat Soluble)", "Minerals & Trace Elements", "Heme Synthesis & Porphyrias", "Jaundice & Bilirubin", "Extracellular Matrix", "Signal Transduction"],
                "Pathology": ["Cell Injury & Death", "Acute Inflammation", "Chronic Inflammation", "Tissue Repair", "Hemodynamics & Thrombosis", "Shock", "Genetic Disorders", "Immunopathology (Hypersensitivity)", "Autoimmune Diseases", "Neoplasia (Benign vs Malignant)", "Molecular Basis of Cancer", "Tumor Markers", "Atherosclerosis", "Ischemic Heart Disease", "Valvular Heart Disease", "Pneumonias", "COPD & Asthma", "GI Ulcers & Inflammatory Bowel", "Hepatitis & Cirrhosis", "Glomerulonephritis", "Breast Pathology", "CNS Tumors", "Leukemias & Lymphomas"],
                "Pharmacology": ["Pharmacokinetics (ADME)", "Pharmacodynamics (Receptors)", "Cholinergic Agonists", "Anticholinergics", "Adrenergic Agonists", "Alpha/Beta Blockers", "Diuretics", "Anti-hypertensives", "Anti-anginal Drugs", "Heart Failure Drugs", "Anti-arrhythmics", "Coagulation Drugs", "Lipid-lowering Drugs", "Penicillins & Cephalosporins", "Macrolides & Aminoglycosides", "Anti-TB & Anti-Fungal", "Antiviral (HIV/Hep)", "NSAIDs", "Opioids", "Glucocorticoids", "Anti-diabetics", "Anti-epileptics", "Anti-psychotics", "Anti-depressants (SSRIs/SNRIs)", "General & Local Anesthetics"],
                "Microbiology": ["Bacterial Cell Structure", "Bacterial Genetics", "Staphylococcus & Streptococcus", "Enterobacteriaceae", "Pseudomonas & Non-fermenters", "Mycobacterium Tuberculosis", "Spirochetes (Syphilis)", "Rickettsia & Chlamydia", "Basic Virology", "Herpesviruses", "Hepatitis Viruses", "HIV/AIDS", "Respiratory Viruses (Flu, Corona)", "General Mycology", "Systemic Fungal Infections", "General Parasitology", "Malaria & Toxoplasma", "Intestinal Nematodes", "Tapeworms & Flukes", "Sterilization & Disinfection", "Hospital Acquired Infections", "Immunology basics", "Antigen-Antibody Reactions"],
                "Forensic Medicine": ["Medical Jurisprudence basics", "Legal Procedures", "Identification Techniques", "Thanatology (Death & Changes)", "Autopsy Protocols", "Injuries (Mechanical)", "Firearm Injuries", "Thermal & Chemical Injuries", "Asphyxial Deaths (Hanging/Drowning)", "Sexual Offences", "Infanticide", "Forensic Psychiatry", "General Toxicology", "Corrosive Poisons", "Irritant Poisons (Metals)", "Neurotics (Opium, Alcohol)", "Cardiac Poisons", "Asphyxiants", "Agrochemicals", "Drug Dependence"],
                "PSM": ["Concept of Health & Disease", "Principles of Epidemiology", "Epidemiological Studies", "Screening for Disease", "Infectious Disease Dynamics", "Vaccine Preventable Diseases", "Vector Borne Diseases", "Zoonoses", "Non-Communicable Diseases (Heart/Cancer)", "Demography & Family Planning", "Maternal & Child Health", "Nutrition (Deficiencies)", "Environment & Health (Water/Air)", "Occupational Health", "Vital Statistics", "Health Planning in India", "National Health Programs (TB/Malaria)", "Health Care Admin", "International Health"],
                "Community Medicine": ["Epidemiology Concepts", "Study Designs", "Biostatistics & Sampling", "Screening Tests (Sens/Spec)", "Dynamics of Transmission", "Immunization & Cold Chain", "Respiratory Infections", "Intestinal Infections", "Arthropod Borne Diseases", "NCDs (Diabetes/Hypertension)", "MCH Programs", "Malnutrition & Assessment", "Dietary Advice", "Environmental Sanitation", "Biomedical Waste Management", "Occupational Hazards", "Health Economics", "National Rural Health Mission", "Health Education"],
                "ENT": ["Anatomy of Ear", "Hearing Assessment (Audiometry)", "Otitis Media (ASOM/CSOM)", "Complications of CSOM", "Deafness (Conductive/Sensorineural)", "Anatomy of Nose & Sinuses", "Epistaxis", "Allergic Rhinitis & Sinusitis", "Nasal Polyps", "Deviated Nasal Septum", "Anatomy of Pharynx & Tonsils", "Acute & Chronic Tonsillitis", "Pharyngeal Abscesses", "Anatomy of Larynx", "Stridor & Tracheostomy", "Laryngeal Tumors", "Neck Masses", "Foreign Bodies (Airway/Food)", "Dysphagia causes", "Facial Nerve Palsy"],
                "Ophthalmology": ["Ocular Anatomy", "Visual Optics & Refraction", "Myopia, Hypermetropia, Astigmatism", "Conjunctivitis (Bacterial/Viral)", "Trachoma", "Corneal Ulcers", "Scleritis & Episcleritis", "Uveitis (Anterior/Posterior)", "Cataract Types & Surgery", "Glaucoma (Open Angle)", "Glaucoma (Closed Angle)", "Retinal Detachment", "Diabetic Retinopathy", "Hypertensive Retinopathy", "Macular Degeneration", "Optic Neuritis", "Papilledema", "Strabismus (Squint)", "Ocular Injuries", "Blindness & Prevention Programs"],
                "Medicine": ["ECG Interpretation", "Heart Failure", "Ischemic Heart Disease (ACS)", "Arrhythmias (AF, VT/VF)", "Valvular Heart Disease", "Hypertension Mgmt", "Asthma & COPD", "Pneumonia & ARDS", "Tuberculosis & Pleural Effusion", "Peptic Ulcer Disease", "IBD (Crohns/UC)", "Cirrhosis & Portal HTN", "Acute & Chronic Kidney Disease", "Glomerulonephropathies", "Stroke (Ischemic/Hemorrhagic)", "Epilepsy & Seizures", "Parkinsons Disease", "Diabetes Mellitus Types & Complications", "Thyroid Disorders", "Anemias", "Leukemias", "Rheumatoid Arthritis & SLE", "HIV/AIDS & Opportunistic Infections", "Sepsis Shock"],
                "Surgery": ["Wound Healing", "Surgical Infections", "Shock & Fluid Management", "Burns Management", "Trauma Principles (ATLS)", "Neck Swellings & Thyroid", "Breast Benign Disorders", "Breast Cancer", "Hernias (Inguinal/Femoral)", "Acute Abdomen", "Appendicitis", "Intestinal Obstruction", "Gallbladder Stones & Cholecystitis", "CBD Stones & Jaundice", "Pancreatitis (Acute/Chronic)", "Peptic Ulcer Perforation", "Colon & Rectal Cancer", "Hemorrhoids & Fissures", "Urolithiasis (Kidney Stones)", "BPH & Prostate Cancer", "Varicose Veins", "Peripheral Arterial Disease", "Orthopedic Fractures", "Bone Tumors"],
                "OBGYN": ["Maternal Pelvis & Fetal Skull", "Antenatal Care", "Normal Labor Mechanism", "Management of Normal Labor", "Puerperium", "Hyperemesis Gravidarum", "Abortion (Types & Mgmt)", "Ectopic Pregnancy", "Hypertensive Disorders (Preeclampsia)", "Antepartum Hemorrhage (Placenta Previa/Abruption)", "Postpartum Hemorrhage (PPH)", "Multiple Pregnancy", "Preterm Labor", "Menstrual Cycle & Disorders", "Amenorrhea (Primary/Secondary)", "PCOS", "Endometriosis", "Fibroids (Leiomyoma)", "Pelvic Inflammatory Disease", "Cervical Cancer Screening & HPV", "Endometrial Cancer", "Ovarian Tumors", "Contraception Methods", "Infertility Evaluation"],
                "Pediatrics": ["Normal Growth & Milestones", "Developmental Delay", "Neonatal Resuscitation", "Prematurity & RDS", "Neonatal Jaundice", "Neonatal Sepsis", "SAM (Severe Acute Malnutrition)", "Vitamin Deficiencies (Rickets)", "Breastfeeding & Weaning", "Pediatric Immunization", "Acute Respiratory Infections (CROUP/Pneumonia)", "Acute Diarrheal Disease & ORS", "Congenital Heart Defects (Acyanotic)", "Cyanotic Heart Defects (Tetralogy of Fallot)", "Rheumatic Fever", "Nephrotic Syndrome", "Acute Glomerulonephritis", "Febrile Seizures", "Meningitis & Encephalitis", "Pediatric Asthma", "Bleeding Disorders (Hemophilia)", "Pediatric Leukemias (ALL)", "Childhood Tuberculosis"],
                "Internship": ["IV Cannulation & Phlebotomy", "Catheterization", "Basic Life Support (BLS)", "Advanced Cardiac Life Support (ACLS)", "Suturing Techniques", "Wound Dressing", "Nasogastric Tube Insertion", "Arterial Blood Gas Interpretation", "Chest X-Ray Interpretation", "ECG Reading in ER", "Management of Shock in ER", "Acute Poisoning Protocol", "Acute Asthma Attack Protocol", "Status Epilepticus Mgmt", "Acute MI Initial Steps", "Post-Op Ward Management", "Discharge Summary Writing", "Blood Transfusion Protocol", "Consent Taking", "Medical Ethics & Communication"]
            };
            // Only return subjects relevant to the requested year
            const yearSubjects = EXPECTED_SUBJECTS[year] || [];
            const filtered = {};
            for (const sub of yearSubjects) {
                if (FULL_FALLBACK[sub]) filtered[sub] = FULL_FALLBACK[sub];
            }
            return filtered;
        }
    }
}

module.exports = new SyllabusScraper();
