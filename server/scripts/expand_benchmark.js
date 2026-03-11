const fs = require('fs');
const path = require('path');

const benchmarkPath = path.join(__dirname, '../data/benchmark_questions.json');
const current = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));

// 1. Clinical Vignette Category (Contextual application)
// 2. Mechanistic / Deep Pathology
// 3. Compare / Contrast
// 4. Edge Cases / Rare associations

const newQuestions = [
    // --- PATH_INF_01 (Inflammation) ---
    { q: "A 45-year-old male presents with a hot, swollen joint. Aspiration reveals neutrophils. What is the dominant inflammatory mediator?", t: "PATH_INF_01" },
    { q: "How does the alternative pathway of complement activation differ from the classical pathway?", t: "PATH_INF_01" },
    { q: "Explain the role of macrophages in the transition from acute to chronic inflammation.", t: "PATH_INF_01" },
    { q: "What is the pathogenesis of a granuloma in Mycobacterium tuberculosis infection?", t: "PATH_INF_01" },
    { q: "Describe the function of inflammasomes in acute inflammation.", t: "PATH_INF_01" },
    { q: "A patient with leukocyte adhesion deficiency type 1 presents with recurrent infections. What molecule is defective?", t: "PATH_INF_01" },
    { q: "Compare exudate vs transudate in the context of vascular permeability.", t: "PATH_INF_01" },
    { q: "What is the difference between primary and secondary intention in wound healing?", t: "PATH_INF_01" },
    { q: "Explain the mechanism of fever induction by pyrogens via prostaglandin synthesis.", t: "PATH_INF_01" },
    { q: "Describe the role of TGF-beta in tissue repair and fibrosis.", t: "PATH_INF_01" },

    // --- PATH_CELL_01 (Cell Injury) ---
    { q: "A patient suffers a myocardial infarction. Explain the sequence of mitochondrial dysfunction leading to coagulative necrosis.", t: "PATH_CELL_01" },
    { q: "How does reperfusion injury exacerbate cellular damage following ischemia?", t: "PATH_CELL_01" },
    { q: "Compare dystrophic vs metastatic calcification with examples.", t: "PATH_CELL_01" },
    { q: "What is the mechanism by which carbon tetrachloride (CCl4) induces fatty change in the liver?", t: "PATH_CELL_01" },
    { q: "Explain the execution phase of apoptosis involving effector caspases.", t: "PATH_CELL_01" },
    { q: "Describe the morphological changes seen universally in apoptotic cells.", t: "PATH_CELL_01" },
    { q: "What triggers the unfolded protein response (UPR) and how does it relate to cell death?", t: "PATH_CELL_01" },
    { q: "A 60-year-old smoker's respiratory epithelium changes from ciliated columnar to stratified squamous. Name this adaptation.", t: "PATH_CELL_01" },
    { q: "Explain the role of antioxidants in scavenging reactive oxygen species (ROS).", t: "PATH_CELL_01" },
    { q: "What is the difference between physiological and pathological hypertrophy?", t: "PATH_CELL_01" },

    // --- PATH_NEO_01 (Neoplasia) ---
    { q: "A 50-year-old female is diagnosed with breast cancer. Explain the role of BRCA1/2 mutations in DNA repair.", t: "PATH_NEO_01" },
    { q: "How do tumors evade the immune system via the PD-1/PD-L1 pathway?", t: "PATH_NEO_01" },
    { q: "Explain the Warburg effect (aerobic glycolysis) in cancer metabolism.", t: "PATH_NEO_01" },
    { q: "What is the sequence of genetic mutations in the adenoma-carcinoma sequence of colon cancer?", t: "PATH_NEO_01" },
    { q: "Compare tumor staging vs grading. Which has greater prognostic value?", t: "PATH_NEO_01" },
    { q: "Describe the mechanism of metastasis: invasion of the extracellular matrix.", t: "PATH_NEO_01" },
    { q: "What is a paraneoplastic syndrome? Give two common examples.", t: "PATH_NEO_01" },
    { q: "Explain the significance of the HER2 oncogene amplification in breast cancer target therapy.", t: "PATH_NEO_01" },
    { q: "How does human papillomavirus (HPV) E6 and E7 proteins lead to cervical carcinoma?", t: "PATH_NEO_01" },
    { q: "What is the role of telomerase in cellular immortality of cancer cells?", t: "PATH_NEO_01" }
];

let nextId = current.length + 1;
for (const raw of newQuestions) {
    current.push({
        id: `BQ_${nextId.toString().padStart(2, '0')}`,
        question: raw.q,
        expected_topic_id: raw.t,
        expected_chapter: raw.t === 'PATH_INF_01' ? 'Acute and Chronic Inflammation' : (raw.t === 'PATH_CELL_01' ? 'Cell Injury, Cell Death, and Adaptations' : 'Neoplasia')
    });
    nextId++;
}

// Write the expanded 50+ question benchset back to disk
fs.writeFileSync(benchmarkPath, JSON.stringify(current, null, 4));
console.log(`Expanded Benchmark to ${current.length} questions.`);
