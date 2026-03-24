/**
 * Stage 3 – Step 1: Topic Confidence Scorer
 *
 * Extracted cleanly from CurriculumService.
 * Responsibility: given a question string, return a scored topic mapping.
 *
 * Current implementation: keyword heuristic (v1).
 * Future:  replace internals with embedding-based cosine similarity
 *          against topic anchor embeddings. The interface stays the same.
 *
 * Interface contract:
 *   scoreQuery(question: string) → TopicMapping
 *
 * TopicMapping: {
 *   topic_id:   string,    // e.g. "PATH_INF_01"
 *   subject:    string,    // e.g. "Pathology"
 *   confidence: number,    // 0.0 – 1.0
 *   method:     string,    // "keyword_v1" | "embedding_v1" | ...
 * }
 */

const curriculumData = require('../data/curriculumRegistry.json');
const embeddingService = require('./embeddingService');

// ─── Topic keyword dictionary ────────────────────────────────────────────────
// Structured so tuning one topic's keywords doesn't affect others.
// Each entry: { topic_id, subject, keywords: [string], strongKeywords: [string] }
// strong keyword → confidence 0.90+, regular → 0.75
const TOPIC_RULES = [
    // ── Pathology ──────────────────────────────────────────────────────────────
    {
        topic_id: 'PATH_NEO_01',
        subject: 'Pathology',
        strongKeywords: [
            'neoplasia', 'hallmarks of cancer', 'oncogene', 'tumor suppressor',
            'carcinogenesis', 'philadelphia chromosome', 'two-hit hypothesis',
            'bcr-abl', 'ras mutation', 'tp53', 'brca', 'warburg', 'angiogenesis vegf'
        ],
        keywords: [
            'cancer', 'tumor', 'tumour', 'carcinoma', 'sarcoma', 'lymphoma',
            'leukemia', 'metastasis', 'angiogenesis', 'vegf', 'apoptosis resistance',
            'n-myc', 'rb gene', 'apc gene', 'mutation', 'proto-oncogene'
        ]
    },
    {
        topic_id: 'PATH_CELL_01',
        subject: 'Pathology',
        strongKeywords: [
            'cell injury', 'apoptosis', 'necrosis', 'caspase', 'atp depletion',
            'reversible injury', 'irreversible injury', 'coagulative necrosis',
            'liquefactive necrosis', 'caseous necrosis', 'mitochondrial pathway',
            'death receptor pathway', 'bcl-2', 'cytochrome c', 'fas ligand'
        ],
        keywords: [
            'cell death', 'cellular swelling', 'fatty change', 'adaptation',
            'hypertrophy', 'hyperplasia', 'atrophy', 'metaplasia', 'free radical',
            'oxidative stress', 'ischemia reperfusion', 'apoptotic body'
        ]
    },
    {
        topic_id: 'PATH_INF_01',
        subject: 'Pathology',
        strongKeywords: [
            'acute inflammation', 'chronic inflammation', 'five cardinal signs',
            'five rs of inflammation', 'leukocyte recruitment', 'selectin',
            'icam-1', 'vcam-1', 'histamine', 'bradykinin', 'leukotriene',
            'chemotaxis', 'diapedesis', 'granulomatous inflammation', 'tnf il-1'
        ],
        keywords: [
            'inflammation', 'inflammatory', 'vasodilation', 'vascular permeability',
            'neutrophil', 'macrophage', 'cytokine', 'complement', 'c5a', 'ltb4',
            'prostaglandin', 'rubor', 'calor', 'dolor', 'functio laesa',
            'exudate', 'pus', 'abscess', 'fibrin', 'granuloma'
        ]
    },
    // ── Anatomy ────────────────────────────────────────────────────────────────
    {
        topic_id: 'ANAT_GEN_01',
        subject: 'Anatomy',
        strongKeywords: [
            'blood supply', 'nerve supply', 'lymphatic drainage', 'venous drainage',
            'boundaries of', 'contents of', 'relations of', 'attachments of',
            'tributaries of', 'branches of', 'cavernous sinus', 'femoral triangle',
            'cubital fossa', 'axilla', 'inguinal canal', 'diaphragm openings',
            'brachial plexus', 'lumbosacral plexus', 'portal circulation'
        ],
        keywords: [
            'anatomy', 'muscle', 'bone', 'artery', 'vein', 'nerve', 'ligament',
            'tendon', 'fascia', 'triangle', 'canal', 'foramen', 'fossa',
            'vertebra', 'rib', 'sternum', 'skull', 'orbit', 'meninges',
            'ventricle', 'sulcus', 'gyrus', 'plexus', 'ganglion', 'dermatome'
        ]
    },
    // ── Physiology ─────────────────────────────────────────────────────────────
    {
        topic_id: 'PHYSIO_GEN_01',
        subject: 'Physiology',
        strongKeywords: [
            'action potential', 'cardiac cycle', 'starling law', 'frank-starling',
            'regulation of gfr', 'tubular reabsorption', 'renin angiotensin',
            'juxtaglomerular', 'resting membrane potential', 'neuromuscular junction',
            'oxygen dissociation curve', 'bohr effect', 'haldane effect',
            'fick principle', 'lung compliance', 'surfactant', 'hering-breuer',
            'countercurrent multiplier', 'hypothalamic-pituitary'
        ],
        keywords: [
            'physiology', 'cardiac output', 'heart rate', 'blood pressure',
            'preload', 'afterload', 'stroke volume', 'ejection fraction',
            'glomerular filtration', 'renal clearance', 'aldosterone', 'adh',
            'ventilation', 'perfusion', 'tidal volume', 'vital capacity',
            'depolarization', 'repolarization', 'refractory period', 'synapse',
            'receptor', 'hormone', 'feedback', 'homeostasis', 'osmolarity'
        ]
    },
    // ── Biochemistry / Cell Biology ────────────────────────────────────────────
    {
        topic_id: 'BIOCHEM_GEN_01',
        subject: 'Biochemistry',
        strongKeywords: [
            'glycolysis', 'krebs cycle', 'electron transport chain', 'oxidative phosphorylation',
            'beta oxidation', 'fatty acid synthesis', 'cholesterol synthesis',
            'urea cycle', 'purine synthesis', 'pyrimidine synthesis',
            'enzyme kinetics', 'michaelis menten', 'km', 'vmax',
            'dna replication', 'transcription', 'translation', 'genetic code',
            'pcr', 'restriction enzyme', 'recombinant dna',
            // Cell biology (maps here — basic science core)
            'mitochondria', 'mitochondrion', 'inner mitochondrial membrane',
            'endoplasmic reticulum', 'golgi apparatus', 'golgi body',
            'ribosome', 'lysosome', 'peroxisome', 'proteasome',
            'cell cycle', 'g1 phase', 's phase', 'g2 phase', 'mitosis', 'meiosis',
            'cell membrane', 'plasma membrane', 'lipid bilayer', 'fluid mosaic model',
            'signal transduction', 'second messenger', 'camp', 'protein kinase',
            'cytoskeleton', 'actin', 'microtubule', 'intermediate filament',
            'nucleus', 'nucleolus', 'chromatin', 'histone', 'nucleosome',
            'organelle', 'eukaryote', 'prokaryote'
        ],
        keywords: [
            'biochemistry', 'enzyme', 'substrate', 'catalyst', 'cofactor',
            'coenzyme', 'atp', 'nadh', 'fadh2', 'metabolism', 'catabolism',
            'anabolism', 'vitamin', 'mineral', 'amino acid', 'protein structure',
            'carbohydrate', 'lipid', 'nucleotide', 'dna', 'rna', 'mrna',
            'mutation', 'inherited disorder', 'inborn error', 'pathway',
            'receptor', 'ligand', 'hormone receptor', 'ion channel',
            'membrane transport', 'sodium potassium', 'osmosis', 'diffusion',
            'protein synthesis', 'post translational', 'glycosylation',
            'cell biology', 'molecular biology', 'genetics', 'chromosome',
            'gene expression', 'transcription factor', 'epigenetics'
        ]
    },
    // ── Pharmacology ───────────────────────────────────────────────────────────
    {
        topic_id: 'PHARMA_GEN_01',
        subject: 'Pharmacology',
        strongKeywords: [
            'mechanism of action', 'pharmacokinetics', 'pharmacodynamics',
            'beta blocker', 'ace inhibitor', 'calcium channel blocker',
            'penicillin mechanism', 'aminoglycoside', 'fluoroquinolone',
            'first pass effect', 'bioavailability', 'half life', 'volume of distribution',
            'therapeutic index', 'dose response', 'agonist antagonist',
            'adverse effect', 'side effect', 'contraindication', 'drug interaction'
        ],
        keywords: [
            'drug', 'pharmacology', 'antibiotic', 'antihypertensive', 'analgesic',
            'nsaid', 'steroid', 'diuretic', 'anticoagulant', 'antidepressant',
            'antipsychotic', 'antifungal', 'antiviral', 'antiparasitic',
            'receptor', 'blocker', 'inhibitor', 'agonist', 'antagonist',
            'dose', 'toxicity', 'overdose', 'antidote', 'treatment'
        ]
    },
    // ── Microbiology ───────────────────────────────────────────────────────────
    {
        topic_id: 'MICRO_GEN_01',
        subject: 'Microbiology',
        strongKeywords: [
            'gram positive', 'gram negative', 'acid fast bacilli', 'ziehl neelsen',
            'capsule', 'spore formation', 'flagella', 'pili', 'plasmid',
            'virulence factor', 'pathogenicity island', 'exotoxin', 'endotoxin',
            'bacterial growth curve', 'antibiotic resistance', 'mrsa', 'esbl',
            'hiv replication', 'hepatitis b', 'herpes virus', 'influenza',
            'malaria lifecycle', 'plasmodium', 'amoeba', 'giardia'
        ],
        keywords: [
            'bacteria', 'virus', 'fungus', 'parasite', 'infection', 'microbiology',
            'culture', 'stain', 'microscopy', 'colony', 'pathogen', 'organism',
            'immune response', 'innate immunity', 'adaptive immunity', 'antibody',
            'antigen', 'vaccine', 'immunoglobulin', 'complement', 'opsonization',
            'sepsis', 'bacteremia', 'viremia', 'fungemia', 'meningitis', 'pneumonia'
        ]
    },
    // ── Surgery ────────────────────────────────────────────────────────────────
    {
        topic_id: 'SURG_GEN_01',
        subject: 'Surgery',
        strongKeywords: [
            'appendicitis', 'peritonitis', 'intestinal obstruction', 'hernia repair',
            'cholecystitis', 'pancreatitis', 'gastrointestinal bleed', 'hemorrhage control',
            'thyroid surgery', 'mastectomy', 'colostomy', 'anastomosis',
            'wound healing', 'surgical site infection', 'anastomotic leak',
            'flail chest', 'tension pneumothorax', 'trauma abcd', 'atls'
        ],
        keywords: [
            'surgery', 'operation', 'incision', 'excision', 'resection', 'repair',
            'laparoscopy', 'laparotomy', 'appendix', 'hernia', 'gallbladder',
            'bowel', 'colon', 'rectum', 'stomach', 'esophagus', 'thyroid',
            'breast', 'amputation', 'graft', 'flap', 'drain', 'suture',
            'anesthesia', 'postoperative', 'complication', 'hemorrhage'
        ]
    },
    // ── Internal Medicine ──────────────────────────────────────────────────────
    {
        topic_id: 'MED_GEN_01',
        subject: 'Medicine',
        strongKeywords: [
            'myocardial infarction', 'heart failure', 'atrial fibrillation',
            'diabetes mellitus', 'diabetic ketoacidosis', 'hyperosmolar state',
            'chronic kidney disease', 'nephrotic syndrome', 'nephritic syndrome',
            'rheumatoid arthritis', 'systemic lupus erythematosus', 'sle',
            'copd exacerbation', 'asthma management', 'pulmonary embolism',
            'stroke management', 'hypertensive emergency', 'thyroid storm'
        ],
        keywords: [
            'disease', 'syndrome', 'hypertension', 'diabetes', 'cardiac', 'renal',
            'hepatic', 'respiratory', 'neurological', 'endocrine', 'autoimmune',
            'chest pain', 'dyspnea', 'edema', 'jaundice', 'fever', 'anemia',
            'diagnosis', 'investigations', 'management', 'treatment', 'prognosis',
            'clinical features', 'signs', 'symptoms', 'complications'
        ]
    },
    // ── Psychiatry ─────────────────────────────────────────────────────────────
    {
        topic_id: 'PSYCH_GEN_01',
        subject: 'Psychiatry',
        strongKeywords: [
            'schizophrenia', 'bipolar disorder', 'major depressive disorder',
            'obsessive compulsive disorder', 'post traumatic stress disorder',
            'generalized anxiety disorder', 'panic disorder', 'phobia',
            'antipsychotic drugs', 'ssri', 'lithium', 'electroconvulsive therapy',
            'cognitive behavioral therapy', 'dsm criteria', 'icd classification'
        ],
        keywords: [
            'psychiatry', 'mental health', 'depression', 'anxiety', 'psychosis',
            'hallucination', 'delusion', 'mania', 'mood disorder', 'personality disorder',
            'suicide', 'self harm', 'eating disorder', 'addiction', 'substance use',
            'cognitive', 'behavior', 'emotion', 'affect', 'insight', 'judgment'
        ]
    },
    // ── Community Medicine / PSM ───────────────────────────────────────────────
    {
        topic_id: 'PSM_GEN_01',
        subject: 'Community Medicine',
        strongKeywords: [
            'epidemiology', 'incidence rate', 'prevalence rate', 'relative risk',
            'odds ratio', 'attributable risk', 'herd immunity', 'vaccine efficacy',
            'randomized controlled trial', 'cohort study', 'case control study',
            'national health mission', 'integrated child development', 'antenatal care',
            'malnutrition', 'protein energy malnutrition', 'kwashiorkor', 'marasmus'
        ],
        keywords: [
            'community', 'public health', 'epidemiology', 'vaccine', 'immunization',
            'nutrition', 'maternal health', 'child health', 'population', 'surveillance',
            'screening', 'prevention', 'primary health center', 'health policy',
            'sanitation', 'water supply', 'vector control', 'disease control',
            'mortality', 'morbidity', 'birth rate', 'death rate', 'census'
        ]
    },
    // ── Radiology ──────────────────────────────────────────────────────────────
    {
        topic_id: 'RADIO_GEN_01',
        subject: 'Radiology',
        strongKeywords: [
            'x-ray findings', 'ct scan findings', 'mri findings', 'ultrasound findings',
            'consolidation', 'ground glass opacity', 'air bronchogram',
            'haziness', 'hyperdense', 'hypodense', 'diffusion weighted imaging',
            'hounsfield unit', 'contrast enhancement', 'doppler'
        ],
        keywords: [
            'radiology', 'imaging', 'x-ray', 'xray', 'chest x-ray', 'ct scan', 'mri',
            'ultrasound', 'pet scan', 'nuclear medicine', 'angiography',
            'biopsy', 'interventional', 'radiation', 'dose', 'artifact',
            'shadow', 'opacity', 'lucency', 'calcification', 'mass', 'lesion'
        ]
    },
    // ── Forensic Medicine ──────────────────────────────────────────────────────
    {
        topic_id: 'FORENSIC_GEN_01',
        subject: 'Forensic Medicine',
        strongKeywords: [
            'rigor mortis', 'livor mortis', 'postmortem changes', 'time of death',
            'cause of death', 'manner of death', 'autopsy findings',
            'blunt force trauma', 'sharp force trauma', 'gunshot wound',
            'asphyxia', 'strangulation', 'hanging', 'drowning',
            'sexual assault examination', 'medicolegal'
        ],
        keywords: [
            'forensic', 'autopsy', 'postmortem', 'death', 'injury', 'wound',
            'trauma', 'evidence', 'court', 'legal', 'medico-legal', 'certificate',
            'toxicology', 'poison', 'DNA evidence', 'fingerprint', 'identification'
        ]
    },
    // ── Obstetrics & Gynecology ────────────────────────────────────────────────
    {
        topic_id: 'OBG_GEN_01',
        subject: 'Obstetrics & Gynecology',
        strongKeywords: [
            'preeclampsia', 'eclampsia', 'hellp syndrome', 'postpartum hemorrhage',
            'placenta previa', 'abruptio placentae', 'ectopic pregnancy',
            'gestational diabetes', 'antenatal care', 'bishop score',
            'partogram', 'stages of labor', 'mechanism of labor',
            'caesarean section', 'forceps delivery', 'vacuum extraction',
            'polycystic ovarian syndrome', 'pcos', 'endometriosis',
            'fibroid uterus', 'carcinoma cervix', 'cervical cancer',
            'ovarian cyst', 'pelvic inflammatory disease', 'pid',
            'menstrual cycle', 'amenorrhea', 'dysfunctional uterine bleeding',
            'contraception', 'intrauterine device', 'oral contraceptive pill',
            'hormone replacement therapy', 'menopause', 'infertility',
            'hyperemesis gravidarum', 'oligohydramnios', 'polyhydramnios',
            'intrauterine growth restriction', 'iugr', 'fetal distress',
            'apgar score', 'neonatal resuscitation'
        ],
        keywords: [
            'obstetrics', 'gynecology', 'gynaecology', 'pregnancy', 'labour', 'labor',
            'delivery', 'antenatal', 'postnatal', 'postpartum', 'maternal',
            'fetal', 'foetal', 'uterus', 'cervix', 'vagina', 'ovary', 'fallopian',
            'placenta', 'amniotic', 'trimester', 'gestational', 'gravida', 'para',
            'menstruation', 'menstrual', 'ovulation', 'luteal', 'follicular',
            'hormonal', 'progesterone', 'estrogen', 'hcg', 'prolactin',
            'obg', 'ob-gyn', 'midwifery', 'perinatal', 'neonatal', 'newborn',
            'breastfeeding', 'lactation', 'puerperium', 'miscarriage', 'abortion'
        ]
    },
    // ── Pediatrics ─────────────────────────────────────────────────────────────
    {
        topic_id: 'PEDS_GEN_01',
        subject: 'Pediatrics',
        strongKeywords: [
            'developmental milestones', 'growth chart', 'immunization schedule',
            'protein energy malnutrition', 'marasmus', 'kwashiorkor',
            'neonatal jaundice', 'neonatal sepsis', 'birth asphyxia',
            'congenital heart disease', 'ventricular septal defect', 'vsd',
            'atrial septal defect', 'tetralogy of fallot', 'patent ductus arteriosus',
            'kawasaki disease', 'rheumatic fever', 'jones criteria',
            'meningitis in children', 'febrile convulsion', 'acute otitis media',
            'bronchiolitis', 'croup', 'epiglottitis', 'pertussis',
            'measles', 'mumps', 'rubella', 'varicella', 'hand foot mouth',
            'nephrotic syndrome in children', 'henoch schonlein purpura',
            'intussusception', 'pyloric stenosis', 'hirschsprung disease',
            'down syndrome', 'cerebral palsy', 'autism spectrum',
            'pediatric dose calculation', 'neonatal resuscitation'
        ],
        keywords: [
            'pediatrics', 'paediatrics', 'child', 'children', 'infant', 'neonate',
            'newborn', 'toddler', 'adolescent', 'neonatal', 'congenital',
            'birth weight', 'preterm', 'premature', 'apgar', 'breastfeeding',
            'formula feeding', 'weaning', 'complementary feeding',
            'vaccination', 'immunization', 'growth', 'development',
            'milestone', 'height', 'weight', 'head circumference',
            'fever in child', 'dehydration', 'oral rehydration', 'ors',
            'pediatric emergency', 'children hospital', 'paeds'
        ]
    },
    // ── ENT ────────────────────────────────────────────────────────────────────
    {
        topic_id: 'ENT_GEN_01',
        subject: 'ENT',
        strongKeywords: [
            'chronic suppurative otitis media', 'csom', 'otosclerosis',
            'meniere disease', 'vestibular neuritis', 'acoustic neuroma',
            'tympanic membrane perforation', 'mastoiditis', 'cholesteatoma',
            'deviated nasal septum', 'sinusitis', 'nasal polyp',
            'tonsillitis', 'peritonsillar abscess', 'quinsy',
            'adenoid hypertrophy', 'laryngitis', 'vocal cord palsy',
            'carcinoma larynx', 'epistaxis', 'rhinitis', 'allergic rhinitis',
            'foreign body ear nose throat', 'tracheostomy', 'audiogram',
            'pure tone audiometry', 'rinne test', 'weber test'
        ],
        keywords: [
            'ent', 'ear', 'nose', 'throat', 'hearing', 'deafness', 'tinnitus',
            'vertigo', 'otitis', 'tympanum', 'mastoid', 'cochlea', 'vestibule',
            'nasal', 'sinus', 'pharynx', 'larynx', 'trachea', 'vocal cord',
            'tonsil', 'adenoid', 'epiglottis', 'glottis', 'otolaryngology',
            'rhinology', 'snoring', 'sleep apnea', 'hoarseness', 'dysphonia'
        ]
    },
    // ── Ophthalmology ──────────────────────────────────────────────────────────
    {
        topic_id: 'OPHTHAL_GEN_01',
        subject: 'Ophthalmology',
        strongKeywords: [
            'glaucoma', 'intraocular pressure', 'optic disc cupping',
            'cataract', 'diabetic retinopathy', 'hypertensive retinopathy',
            'central retinal artery occlusion', 'central retinal vein occlusion',
            'retinal detachment', 'macular degeneration', 'age related macular',
            'uveitis', 'iritis', 'conjunctivitis', 'corneal ulcer',
            'strabismus', 'amblyopia', 'nystagmus', 'papilledema',
            'trachoma', 'pterygium', 'chalazion', 'stye', 'hordeolum',
            'visual acuity', 'snellen chart', 'visual field defect',
            'argyll robertson pupil', 'horner syndrome'
        ],
        keywords: [
            'ophthalmology', 'eye', 'vision', 'retina', 'cornea', 'sclera',
            'conjunctiva', 'iris', 'pupil', 'lens', 'vitreous', 'optic nerve',
            'macula', 'fundus', 'fundoscopy', 'slit lamp', 'tonometry',
            'refraction', 'myopia', 'hypermetropia', 'astigmatism', 'presbyopia',
            'blindness', 'low vision', 'red eye', 'watering eye', 'photophobia'
        ]
    }
];

const SUBJECT_ANCHORS = {
    Anatomy: ['anatomy', 'artery', 'vein', 'nerve', 'muscle', 'ligament', 'fossa', 'triangle', 'foramen', 'plexus', 'bone', 'joint', 'tendon', 'fascia', 'dermatome', 'lymph node', 'organ relations'],
    Physiology: ['physiology', 'homeostasis', 'feedback', 'cardiac output', 'gfr', 'action potential', 'ventilation', 'hormone', 'reflex', 'membrane potential', 'cardiac cycle', 'renal function', 'respiratory', 'endocrine'],
    Biochemistry: ['biochemistry', 'enzyme', 'glycolysis', 'krebs', 'metabolism', 'amino acid', 'dna', 'rna', 'mitochondria', 'organelle', 'ribosome', 'atp', 'cell biology', 'molecular biology', 'chromosome', 'nucleus', 'membrane', 'protein', 'lipid', 'carbohydrate', 'vitamin', 'pathway', 'mitosis', 'meiosis'],
    Pharmacology: ['pharmacology', 'drug', 'mechanism', 'dose', 'toxicity', 'agonist', 'antagonist', 'half life', 'receptor', 'inhibitor', 'blocker', 'antibiotic mechanism', 'pharmacokinetics'],
    Microbiology: ['microbiology', 'bacteria', 'virus', 'fungus', 'parasite', 'gram', 'culture', 'vaccine', 'pathogen', 'infection', 'immunity', 'antibody', 'antigen'],
    Pathology: ['pathology', 'necrosis', 'inflammation', 'neoplasia', 'tumor', 'carcinoma', 'cell injury', 'infarction', 'edema', 'thrombosis', 'embolism', 'granuloma', 'apoptosis', 'hypertrophy', 'metaplasia'],
    Surgery: ['surgery', 'operation', 'incision', 'laparoscopy', 'hernia', 'anastomosis', 'postoperative', 'appendicitis', 'cholecystitis', 'surgical', 'hemorrhage control'],
    Medicine: ['medicine', 'diagnosis', 'management', 'hypertension', 'diabetes', 'heart failure', 'copd', 'clinical features', 'treatment', 'complications', 'investigations'],
    Psychiatry: ['psychiatry', 'depression', 'anxiety', 'psychosis', 'delusion', 'hallucination', 'bipolar', 'cognition', 'thought disorder', 'mental illness', 'dsm', 'mood disorder', 'schizophrenia'],
    'Community Medicine': ['community', 'epidemiology', 'incidence', 'prevalence', 'public health', 'screening', 'prevention', 'vaccine schedule', 'mortality rate', 'nutrition'],
    Radiology: ['radiology', 'x-ray', 'ct', 'mri', 'ultrasound', 'imaging', 'opacity', 'consolidation', 'hounsfield', 'contrast'],
    'Forensic Medicine': ['forensic', 'autopsy', 'postmortem', 'injury', 'medicolegal', 'toxicology', 'rigor mortis', 'cause of death'],
    'Obstetrics & Gynecology': ['obstetrics', 'gynecology', 'gynaecology', 'pregnancy', 'labour', 'delivery', 'uterus', 'cervix', 'ovary', 'menstruation', 'antenatal', 'postnatal', 'fetal', 'placenta', 'eclampsia', 'obg', 'contraception'],
    Pediatrics: ['pediatrics', 'paediatrics', 'child', 'infant', 'neonate', 'neonatal', 'congenital', 'milestone', 'vaccination', 'growth', 'development', 'preterm', 'newborn'],
    ENT: ['ent', 'ear', 'nose', 'throat', 'hearing', 'tinnitus', 'vertigo', 'otitis', 'sinusitis', 'tonsil', 'larynx', 'nasal'],
    Ophthalmology: ['ophthalmology', 'eye', 'vision', 'retina', 'cornea', 'glaucoma', 'cataract', 'fundus', 'pupil', 'conjunctiva', 'blindness']
};

class TopicConfidenceScorer {
    constructor() {
        this.registry = curriculumData;
        this.topicRules = TOPIC_RULES;
        this.subjectAnchorEmbeddingsPromise = null;
    }

    /**
     * Score a question against the topic rule set.
     * Returns the best matched topic with a confidence value.
     *
     * @param {string} question
     * @returns {TopicMapping}
     */
    scoreQuery(question) {
        const q = question.toLowerCase();
        let best = null;
        let bestScore = 0;

        for (const rule of this.topicRules) {
            // Strong keyword match → 0.92 confidence
            const strongHit = rule.strongKeywords.some(kw => q.includes(kw));
            if (strongHit) {
                const score = 0.92;
                if (score > bestScore) {
                    bestScore = score;
                    best = rule;
                }
                continue; // Don't also check regular if strong matched
            }

            // Regular keyword match — count multiple hits for graduated scoring
            const hits = rule.keywords.filter(kw => q.includes(kw)).length;
            if (hits > 0) {
                // 1 hit → 0.72, 2 hits → 0.80, 3+ hits → 0.86
                const score = Math.min(0.86, 0.72 + (hits - 1) * 0.07);
                if (score > bestScore) {
                    bestScore = score;
                    best = rule;
                }
            }
        }

        if (!best || bestScore < 0.60) {
            const semanticFallback = this._semanticSubjectFallback(q);
            if (semanticFallback) {
                return semanticFallback;
            }
            return {
                topic_id: null,
                subject: this.registry.curriculum.subject,
                confidence: bestScore || 0.20,
                method: 'keyword_v1',
                matched: false
            };
        }

        return {
            topic_id: best.topic_id,
            subject: best.subject,
            confidence: parseFloat(bestScore.toFixed(4)),
            method: 'keyword_v1',
            matched: true
        };
    }

    /**
     * Hybrid topic scoring for the Cortex answer engine.
     * Keeps the fast keyword rules, but upgrades ambiguous questions with
     * embedding-based subject routing before the orchestrator decides how to answer.
     *
     * @param {string} question
     * @returns {Promise<TopicMapping>}
     */
    async scoreQueryAdvanced(question) {
        const heuristic = this.scoreQuery(question);

        if (heuristic.matched && heuristic.confidence >= 0.80) {
            return heuristic;
        }

        try {
            const embeddingFallback = await this._embeddingSubjectFallback(question);
            if (!embeddingFallback) {
                return heuristic;
            }

            if (heuristic.matched && heuristic.confidence >= embeddingFallback.confidence + 0.05) {
                return heuristic;
            }

            return embeddingFallback;
        } catch (error) {
            console.warn('[TOPIC] Embedding fallback failed, keeping heuristic score:', error.message);
            return heuristic;
        }
    }

    _semanticSubjectFallback(q) {
        let topSubject = null;
        let topHits = 0;

        for (const [subject, anchors] of Object.entries(SUBJECT_ANCHORS)) {
            const hits = anchors.reduce((count, kw) => count + (q.includes(kw) ? 1 : 0), 0);
            if (hits > topHits) {
                topHits = hits;
                topSubject = subject;
            }
        }

        if (!topSubject || topHits === 0) {
            return null;
        }

        const representativeRule = this.topicRules.find((rule) => rule.subject === topSubject);
        const semanticConfidence = Math.min(0.68, 0.46 + (topHits * 0.05));

        return {
            topic_id: representativeRule?.topic_id || null,
            subject: topSubject,
            confidence: parseFloat(semanticConfidence.toFixed(4)),
            method: 'semantic_fallback_v1',
            matched: semanticConfidence >= 0.55
        };
    }

    async _embeddingSubjectFallback(question) {
        const queryEmbedding = await embeddingService.getEmbedding(question);
        const anchorEmbeddings = await this._getSubjectAnchorEmbeddings();

        let bestMatch = null;
        for (const anchor of anchorEmbeddings) {
            const similarity = this._cosineSimilarity(queryEmbedding, anchor.embedding);
            if (!bestMatch || similarity > bestMatch.similarity) {
                bestMatch = {
                    ...anchor,
                    similarity
                };
            }
        }

        if (!bestMatch) return null;

        const representativeRule = this.topicRules.find((rule) => rule.subject === bestMatch.subject);
        const confidence = Math.max(0.58, Math.min(0.84, 0.55 + ((bestMatch.similarity - 0.35) * 0.8)));

        return {
            topic_id: representativeRule?.topic_id || null,
            subject: bestMatch.subject,
            confidence: parseFloat(confidence.toFixed(4)),
            method: 'embedding_v1',
            matched: confidence >= 0.60
        };
    }

    async _getSubjectAnchorEmbeddings() {
        if (!this.subjectAnchorEmbeddingsPromise) {
            const anchorTexts = Object.entries(SUBJECT_ANCHORS).map(([subject, anchors]) => ({
                subject,
                text: `Medical subject: ${subject}. Core anchors: ${anchors.join(', ')}.`
            }));

            this.subjectAnchorEmbeddingsPromise = (async () => {
                const embeddings = await embeddingService.getEmbeddings(anchorTexts.map((item) => item.text));
                return anchorTexts.map((item, index) => ({
                    subject: item.subject,
                    embedding: embeddings[index]
                }));
            })();
        }

        return this.subjectAnchorEmbeddingsPromise;
    }

    _cosineSimilarity(vectorA = [], vectorB = []) {
        if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length === 0 || vectorB.length === 0) {
            return 0;
        }

        const length = Math.min(vectorA.length, vectorB.length);
        let dot = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;

        for (let i = 0; i < length; i++) {
            const valueA = Number(vectorA[i]) || 0;
            const valueB = Number(vectorB[i]) || 0;
            dot += valueA * valueB;
            magnitudeA += valueA * valueA;
            magnitudeB += valueB * valueB;
        }

        if (!magnitudeA || !magnitudeB) return 0;

        return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
    }

    /**
     * Detect subject from free text (used for professor persona selection).
     * Returns the subject string or null.
     */
    detectSubject(text) {
        const result = this.scoreQuery(text);
        return result.matched ? result.subject : null;
    }

    /**
     * Returns full syllabus context for the given topic_id.
     * Used downstream by the Prompt Builder.
     */
    getSyllabusContext(syllabusLabel = null) {
        return {
            regulator: this.registry.curriculum.regulator,
            country: this.registry.curriculum.country,
            year: this.registry.curriculum.year,
            subject: this.registry.curriculum.subject,
            syllabus: syllabusLabel || `${this.registry.curriculum.country} ${this.registry.curriculum.degree}`
        };
    }
}

module.exports = new TopicConfidenceScorer();
