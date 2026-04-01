const COUNTRY_SUBJECTS = {
    India: {
        1: ['Anatomy', 'Physiology', 'Biochemistry'],
        2: ['Pathology', 'Pharmacology', 'Microbiology', 'Forensic Medicine'],
        3: ['PSM', 'ENT', 'Ophthalmology', 'Community Medicine'],
        4: ['Medicine', 'Surgery', 'OBGYN', 'Pediatrics'],
        5: ['Internship']
    },
    Nepal: {
        1: [
            'Anatomy',
            'Physiology',
            'Biochemistry',
            'Microbiology',
            'Pathology',
            'Pharmacology',
            'Community Medicine',
            'Introduction to Clinical Medicine',
            'Medical Informatics'
        ],
        2: [
            'Anatomy',
            'Physiology',
            'Biochemistry',
            'Microbiology',
            'Pathology',
            'Pharmacology',
            'Community Medicine',
            'Introduction to Clinical Medicine'
        ],
        3: [
            'Community Medicine',
            'Medicine',
            'Surgery',
            'OBGYN',
            'Pediatrics',
            'Forensic Medicine',
            'Ophthalmology',
            'ENT'
        ],
        4: [
            'Community Medicine',
            'Medicine',
            'Surgery',
            'OBGYN',
            'Pediatrics',
            'Forensic Medicine',
            'Ophthalmology',
            'ENT',
            'Orthopedics',
            'Psychiatry',
            'Dermatology',
            'Radiology',
            'Anesthesia',
            'Dental'
        ],
        5: ['Medicine', 'Surgery', 'Orthopedics', 'OBGYN', 'Pediatrics', 'Internship']
    }
};

const STATIC_CURRICULUMS = {
    Nepal: {
        1: {
            Anatomy: [
                'General Anatomy',
                'General Histology',
                'General Embryology',
                'Lymphoid Organs',
                'Autonomic Nervous System',
                'Skin and Appendages',
                'Upper Limb Gross Anatomy',
                'Lower Limb Gross Anatomy',
                'Thorax and Mediastinum',
                'Heart and Great Vessels',
                'Respiratory Tract Anatomy'
            ],
            Physiology: [
                'Cell Physiology',
                'Growth and Development',
                'Immunophysiology',
                'Autonomic Nervous System Physiology',
                'Skin and Thermoregulation',
                'Blood as a Body Fluid',
                'Hemostasis',
                'Respiratory Mechanics',
                'Gas Transport',
                'Cardiac Muscle Properties',
                'Cardiac Cycle',
                'Blood Pressure Regulation'
            ],
            Biochemistry: [
                'Biochemistry in Medicine',
                'Cell Structure and Function',
                'Carbohydrates',
                'Amino Acids and Proteins',
                'Lipids',
                'Nucleic Acids and Gene Expression',
                'Enzymes',
                'Vitamins',
                'Neurotransmitters',
                'Melanin Synthesis',
                'Hemoglobin Metabolism',
                'Iron, B12 and Folate Metabolism'
            ],
            Microbiology: [
                'Introduction to Medical Microbiology',
                'Bacteria, Viruses, Fungi and Parasites',
                'Sterilization and Disinfection',
                'Normal Flora and Infection',
                'Antimicrobial Agents',
                'Microbial Genetics',
                'Immunity and Immune Response',
                'Skin and Soft Tissue Infections',
                'Blood-Borne Infections',
                'Respiratory Tract Infections',
                'Hospital-Acquired Infection Control',
                'Biomedical Waste Management'
            ],
            Pathology: [
                'Cell Injury and Cell Death',
                'Inflammation and Repair',
                'Hemodynamic Disorders',
                'Neoplasia',
                'Amyloidosis',
                'Leprosy Pathology',
                'Anemias',
                'Hemorrhagic Disorders',
                'Leukemia and Lymphoma',
                'Respiratory Tract Pathology',
                'Tuberculosis Pathology',
                'Atherosclerosis and Myocardial Infarction'
            ],
            Pharmacology: [
                'General Pharmacology',
                'Cholinergic Agonists',
                'Muscarinic Antagonists',
                'Adrenergic Agonists',
                'Adrenergic Antagonists',
                'Immunosuppressants',
                'Antileprotic Drugs',
                'Hemostatics',
                'Antithrombotic Therapy',
                'Anti-Anemic Therapy',
                'Bronchodilators',
                'Antitubercular Drugs'
            ],
            'Community Medicine': [
                'Health, Disease and Determinants',
                'Sociology for Medicine',
                'Family Medicine Basics',
                'Epidemiology Foundations',
                'Screening and Prevention',
                'Health Promotion',
                'Environmental Sanitation',
                'Nutrition Basics',
                'Demography',
                'Community Diagnosis',
                'Nepal Health System Introduction',
                'Field and Community Posting'
            ],
            'Introduction to Clinical Medicine': [
                'Medical Ethics',
                'Nepal Medical Council and Professional Duties',
                'Communication Skills',
                'History Taking',
                'General Physical Examination',
                'First Aid and Dressings',
                'Injection Procedures',
                'Venesection and Blood Transfusion Observation',
                'Respiratory System Examination',
                'Cardiovascular System Examination',
                'Clinical Problem Solving Basics'
            ],
            'Medical Informatics': [
                'Computer Fundamentals',
                'Windows Applications',
                'Word Processing',
                'Spreadsheets and Data Tables',
                'PowerPoint and Multimedia',
                'Epi Info Basics',
                'Internet and Literature Retrieval',
                'Statistical Data Handling',
                'Report Writing',
                'Presentation Skills'
            ]
        },
        2: {
            Anatomy: [
                'Gastrointestinal Tract Anatomy',
                'Hepatobiliary Anatomy',
                'Kidney and Urinary Tract Anatomy',
                'Endocrine Organs',
                'Male Reproductive Anatomy',
                'Female Reproductive Anatomy',
                'Pelvis and Perineum',
                'Brain and Spinal Cord',
                'Cranial Nerves',
                'Special Sense Organs'
            ],
            Physiology: [
                'Gastrointestinal Physiology',
                'Liver Function Physiology',
                'Renal Physiology',
                'Acid-Base and Electrolyte Balance',
                'Endocrine Physiology',
                'Male and Female Reproductive Physiology',
                'Menstrual Cycle and Pregnancy',
                'Central Nervous System Physiology',
                'Vision',
                'Hearing and Balance'
            ],
            Biochemistry: [
                'Digestion and Absorption',
                'Liver Function Tests',
                'Urea Cycle',
                'Renal Biochemistry',
                'Acid-Base Disorders',
                'Endocrine Biochemistry',
                'Diabetes and Glucose Homeostasis',
                'Lipoproteins and Cholesterol',
                'Reproductive Endocrinology',
                'Neurochemistry'
            ],
            Microbiology: [
                'Enteric Pathogens',
                'Food and Water Microbiology',
                'Hepatitis Viruses',
                'Urinary Tract Infections',
                'Sexually Transmitted Infections',
                'HIV Laboratory Diagnosis',
                'Central Nervous System Infections',
                'Meningitis Pathogens',
                'Reproductive Tract Infections',
                'Parasitic Gastrointestinal Disease'
            ],
            Pathology: [
                'Gastritis and Peptic Ulcer',
                'Intestinal Tuberculosis',
                'Appendicitis',
                'Adenocarcinoma of Colon',
                'Fatty Liver',
                'Cirrhosis',
                'Thyroid Adenoma and Carcinoma',
                'Renal Pathology',
                'Endocrine Pathology',
                'Male Genital Pathology',
                'Female Genital Pathology',
                'Central Nervous System Pathology'
            ],
            Pharmacology: [
                'Antiulcer Drugs',
                'Antiemetics',
                'Laxatives and Antidiarrheals',
                'Diuretics',
                'Electrolyte Correction Drugs',
                'Antidiabetic Drugs',
                'Thyroid Drugs',
                'Adrenal Hormones',
                'Sex Hormones and Contraceptives',
                'Antiepileptic Drugs',
                'CNS Sedatives and Hypnotics'
            ],
            'Community Medicine': [
                'Epidemiology II',
                'Behavioral Sciences',
                'Integrated Management of Childhood Illness',
                'Communicable Diseases',
                'National Plans for Communicable Diseases',
                'Occupational Health',
                'Mental Health in the Community',
                'Non-Communicable Diseases',
                'Reproductive Health',
                'Expanded Programme on Immunization',
                'Health Delivery System in Nepal',
                'Research Methodology'
            ],
            'Introduction to Clinical Medicine': [
                'Gastrointestinal History and Examination',
                'Hepatobiliary Clinical Assessment',
                'Renal History and Examination',
                'Endocrine Examination',
                'Reproductive History Taking',
                'Neurological Examination',
                'Cranial Nerve Examination',
                'Ophthalmic Clinical Basics',
                'ENT Clinical Basics',
                'Interpreting Basic Laboratory and Radiology Findings'
            ]
        },
        3: {
            'Community Medicine': [
                'Communicable Diseases and IMCI',
                'Occupational Health',
                'Mental Health',
                'Non-Communicable Diseases',
                'Reproductive Health Programs',
                'Expanded Programme on Immunization',
                'Health Planning and Management',
                'Health Delivery System in Nepal',
                'Disaster Management',
                'International Health',
                'Research Methodology'
            ],
            Medicine: [
                'Clinical History and Examination',
                'Cardiology Basics',
                'Respiratory Medicine',
                'Gastroenterology',
                'Nephrology',
                'Endocrinology',
                'Infectious Diseases',
                'Hematology',
                'ECG Interpretation Basics',
                'Medical Emergencies'
            ],
            Surgery: [
                'Wound Healing and Infection',
                'Trauma Principles',
                'Acute Abdomen',
                'Hernia and Hydrocele',
                'Thyroid and Breast Surgery',
                'Gastrointestinal Surgery Basics',
                'Hepatobiliary Surgery',
                'Urology Basics',
                'Preoperative Care',
                'Postoperative Care'
            ],
            OBGYN: [
                'Antenatal Care',
                'Normal Labour',
                'Puerperium',
                'Abortion and Ectopic Pregnancy',
                'Hypertensive Disorders of Pregnancy',
                'Antepartum and Postpartum Hemorrhage',
                'Menstrual Disorders',
                'Family Planning',
                'Infertility Basics',
                'Gynecologic Infections'
            ],
            Pediatrics: [
                'Growth and Development',
                'Neonatology',
                'Nutrition and Immunization',
                'Common Pediatric Infections',
                'Respiratory Disease in Children',
                'Diarrheal Disease',
                'Congenital Heart Disease',
                'Pediatric Nephrology Basics',
                'Seizures in Children',
                'Pediatric Emergencies'
            ],
            'Forensic Medicine': [
                'Medical Law and Ethics in Nepal',
                'Consent and Confidentiality',
                'Identification',
                'Thanatology',
                'Medico-Legal Autopsy in Nepal',
                'Asphyxial Deaths',
                'Mechanical Injuries',
                'Thermal and Electrical Injuries',
                'Sexual Offences',
                'Infanticide',
                'Toxicology in Nepal',
                'Forensic Psychiatry'
            ],
            Ophthalmology: [
                'Visual Acuity and Optics',
                'Refractive Errors',
                'Conjunctivitis and Pterygium',
                'Corneal Disease and Scleritis',
                'Uveitis',
                'Cataract',
                'Glaucoma',
                'Retina Basics',
                'Eyelid Disorders',
                'Lacrimal Apparatus',
                'Eye Injuries',
                'Blindness in Nepal'
            ],
            ENT: [
                'Ear Anatomy and Hearing Assessment',
                'Otitis Media',
                'Deafness',
                'Nose and Paranasal Sinuses',
                'Epistaxis and Rhinitis',
                'Sinusitis and Nasal Polyps',
                'Pharynx and Tonsils',
                'Larynx and Airway Emergencies',
                'Neck Masses',
                'Facial Nerve Palsy'
            ]
        },
        4: {
            'Community Medicine': [
                'Advanced Epidemiology',
                'Biostatistics and Inferential Statistics',
                'Program Evaluation',
                'Health Management',
                'Environmental and Occupational Health',
                'Maternal and Child Health in Nepal',
                'Health Education',
                'Disaster Management',
                'International Health',
                'Community Research Project'
            ],
            Medicine: [
                'Cardiology',
                'Respiratory Medicine',
                'Gastroenterology',
                'Hepatology',
                'Nephrology',
                'Neurology',
                'Endocrinology',
                'Rheumatology',
                'Infectious Diseases and HIV',
                'Critical Care Basics'
            ],
            Surgery: [
                'Gastrointestinal Surgery',
                'Hepatobiliary and Pancreatic Surgery',
                'Endocrine Surgery',
                'Trauma and Burns',
                'Neurosurgery Basics',
                'Vascular Surgery',
                'Urology',
                'Surgical Oncology Basics',
                'Perioperative Care',
                'Common Surgical Procedures'
            ],
            OBGYN: [
                'High-Risk Pregnancy',
                'Labour Complications',
                'Gynecologic Oncology',
                'Infertility and ART Basics',
                'Menopause',
                'Urogynaecology',
                'Family Planning Procedures',
                'Obstetric Emergencies',
                'Fetal Monitoring',
                'Operative Obstetrics'
            ],
            Pediatrics: [
                'Neonatal Intensive Care',
                'Pediatric Respiratory Disorders',
                'Gastroenterology and Nutrition',
                'Pediatric Nephrology',
                'Pediatric Cardiology',
                'Pediatric Neurology',
                'Hematology and Oncology',
                'Pediatric Endocrinology',
                'Infectious Disease',
                'Developmental Pediatrics'
            ],
            'Forensic Medicine': [
                'Poisoning Laws in Nepal',
                'Injury Certification',
                'Sexual Assault Examination',
                'Custodial Torture and Reporting',
                'Autopsy Artifacts',
                'Firearm Injuries',
                'Road Traffic Injury Documentation',
                'Drug Dependence'
            ],
            Ophthalmology: [
                'Cataract Management',
                'Glaucoma Management',
                'Retina and Vitreous',
                'Squint and Amblyopia',
                'Community Ophthalmology',
                'Ocular Trauma',
                'Orbital Disease',
                'Systemic Disease with Ocular Manifestations'
            ],
            ENT: [
                'Chronic Suppurative Otitis Media',
                'Vertigo',
                'Nasal Obstruction',
                'Tumors of Pharynx and Larynx',
                'Tracheostomy',
                'Thyroid and Neck Lumps',
                'Dysphagia',
                'ENT Emergencies',
                'Endoscopy Basics'
            ],
            Orthopedics: [
                'Fracture Classification',
                'Polytrauma Management',
                'Splints and Traction',
                'Casts and Complications',
                'Hip Examination',
                'Knee Examination',
                'Spine Examination',
                'Congenital Orthopedic Disorders',
                'Bone Tumors',
                'Peripheral Nerve Lesions'
            ],
            Psychiatry: [
                'Psychiatric Interview and Mental Status Examination',
                'Schizophrenia',
                'Mood Disorders',
                'Anxiety Disorders',
                'Obsessive Compulsive Disorder',
                'Dissociative and Somatoform Disorders',
                'Substance Use Disorders',
                'Child and Adolescent Psychiatry',
                'Geriatric Psychiatry',
                'Psychotropic Drugs',
                'Counseling and ECT',
                'Legal and Ethical Issues'
            ],
            Dermatology: [
                'Skin Lesion Morphology',
                'Fungal Skin Infections',
                'Bacterial Skin Infections',
                'Viral Skin Disorders',
                'Leprosy',
                'Eczema and Dermatitis',
                'Psoriasis',
                'Acne',
                'Urticaria',
                'Drug Eruptions',
                'Pigmentary Disorders',
                'Sexually Transmitted Infections'
            ],
            Radiology: [
                'Chest X-Ray Interpretation',
                'Abdominal X-Ray Interpretation',
                'Skeletal Radiology',
                'Ultrasound Basics',
                'CT Basics',
                'MRI Basics',
                'Contrast Media Safety',
                'Radiation Protection',
                'Emergency Imaging',
                'Line and Tube Checks'
            ],
            Anesthesia: [
                'Preanesthetic Evaluation',
                'Airway Assessment',
                'General Anesthesia Basics',
                'Local Anesthesia',
                'Spinal and Epidural Anesthesia',
                'Fluid and Blood Transfusion',
                'Pain Management',
                'Intraoperative Monitoring',
                'Perioperative Emergencies',
                'Resuscitation Basics'
            ],
            Dental: [
                'Oral Examination Basics',
                'Dental Caries Overview',
                'Odontogenic Infections',
                'Oral Ulcers',
                'Oral Hygiene and Prevention',
                'Maxillofacial Trauma Basics',
                'Referral Criteria for Dental Complaints'
            ]
        },
        5: {
            Medicine: [
                'Ward Management',
                'Emergency Cardiology',
                'Respiratory Failure',
                'Sepsis and Shock',
                'Endocrine Crises',
                'Renal Failure',
                'Neurology Emergencies',
                'Infectious Disease Management',
                'Outpatient Case Approach',
                'Discharge Planning'
            ],
            Surgery: [
                'Emergency Surgery',
                'Trauma Resuscitation',
                'Acute Abdomen',
                'Wound Care and Suturing',
                'Perioperative Complications',
                'Fluid and Electrolyte Management',
                'Postoperative Ward Care',
                'Common Bedside Procedures',
                'Referral and Escalation in Surgery'
            ],
            Orthopedics: [
                'Fracture Immobilization',
                'Musculoskeletal Trauma',
                'Plaster and Splint Care',
                'Joint Examination',
                'Orthopedic Emergencies',
                'Rehabilitation Basics'
            ],
            OBGYN: [
                'Labour Room Duties',
                'Antenatal Ward Management',
                'Postnatal Ward Management',
                'Obstetric Emergencies',
                'Gynecologic Procedures',
                'Family Planning Services'
            ],
            Pediatrics: [
                'Neonatal Assessment',
                'Common Pediatric Ward Cases',
                'Fluid Management in Children',
                'Growth Monitoring',
                'Immunization Counseling',
                'Pediatric Emergencies'
            ],
            Internship: [
                'IV Cannulation and Phlebotomy',
                'Catheterization',
                'Basic Life Support',
                'Advanced Cardiac Life Support',
                'Suturing Techniques',
                'Wound Dressing',
                'Nasogastric Tube Insertion',
                'ECG Interpretation',
                'ABG Basics',
                'Referral and Handover',
                'Consent and Documentation',
                'Prescription and Discharge Summary Writing'
            ]
        }
    }
};

function normalizeCountry(country = 'India') {
    const normalized = String(country || 'India').trim().toLowerCase();
    if (normalized === 'nepal') return 'Nepal';
    if (normalized === 'india') return 'India';
    return country || 'India';
}

function getExpectedSubjects(country, year) {
    const normalizedCountry = normalizeCountry(country);
    return COUNTRY_SUBJECTS[normalizedCountry]?.[year] || COUNTRY_SUBJECTS.India?.[year] || [];
}

function getStaticCurriculum(country, year) {
    const normalizedCountry = normalizeCountry(country);
    return STATIC_CURRICULUMS[normalizedCountry]?.[year] || null;
}

module.exports = {
    COUNTRY_SUBJECTS,
    STATIC_CURRICULUMS,
    normalizeCountry,
    getExpectedSubjects,
    getStaticCurriculum
};
