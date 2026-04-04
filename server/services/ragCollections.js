const DEFAULT_COLLECTION_NAME = process.env.QDRANT_DEFAULT_COLLECTION || 'mbbs_pathology_v2';

const SUBJECT_COLLECTION_MAP = {
    Anatomy: ['mbbs_anatomy_v2', 'mbbs_anatomy_v1'],
    Physiology: ['mbbs_physiology_v2', 'mbbs_physiology_v1'],
    Biochemistry: ['mbbs_biochemistry_v2', 'mbbs_biochemistry_v1'],
    Pharmacology: ['mbbs_pharmacology_v2', 'mbbs_pharmacology_v1'],
    Microbiology: ['mbbs_microbiology_v2', 'mbbs_microbiology_v1'],
    Pathology: ['mbbs_pathology_v2', 'mbbs_pathology_v1'],
    Surgery: ['mbbs_surgery_v2', 'mbbs_surgery_v1'],
    Medicine: ['mbbs_medicine_v2', 'mbbs_medicine_v1'],
    Psychiatry: ['mbbs_psychiatry_v2', 'mbbs_psychiatry_v1'],
    'Community Medicine': ['mbbs_community_medicine_v2', 'mbbs_psm_v2', 'mbbs_psm_v1'],
    Radiology: ['mbbs_radiology_v2', 'mbbs_radiology_v1'],
    'Forensic Medicine': ['mbbs_forensic_medicine_v2', 'mbbs_forensic_medicine_v1'],
    'Obstetrics & Gynecology': ['mbbs_obg_v2', 'mbbs_obstetrics_gynecology_v2', 'mbbs_obgyn_v2'],
    Pediatrics: ['mbbs_pediatrics_v2', 'mbbs_pediatrics_v1'],
    ENT: ['mbbs_ent_v2', 'mbbs_ent_v1'],
    Ophthalmology: ['mbbs_ophthalmology_v2', 'mbbs_ophthalmology_v1'],
    default: [DEFAULT_COLLECTION_NAME],
};

function getCollectionCandidates(subject) {
    if (!subject) {
        return [...new Set(SUBJECT_COLLECTION_MAP.default || [])];
    }
    const requested = SUBJECT_COLLECTION_MAP[subject];
    if (!requested) return [];
    const defaults = SUBJECT_COLLECTION_MAP.default || [];
    return [...new Set([...requested, ...defaults.filter(Boolean)])];
}

module.exports = {
    DEFAULT_COLLECTION_NAME,
    SUBJECT_COLLECTION_MAP,
    getCollectionCandidates,
};
