import React, { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress,
  useTheme, useMediaQuery, IconButton, Avatar, Stack, Tooltip, Divider,
  Snackbar, Alert, Drawer, List, ListItem, ListItemButton, ListItemText,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  LibraryBooks as LibraryIcon,
  BookmarkBorder as BookmarkIcon,
  ContentCopy as CopyIcon,
  DeleteOutline as ClearIcon,
  AttachFile as AttachIcon,
  Close as CloseIcon,
  VolumeUp as VolumeUpIcon,
  Stop as StopIcon,
  Mic as MicIcon,
  History as HistoryIcon,
  AddComment as NewChatIcon,
  KeyboardArrowDown as ChevronIcon,
  AutoAwesome as SparkleIcon,
  ThumbUpAltOutlined as ThumbUpIcon,
  ThumbDownAltOutlined as ThumbDownIcon,
  Replay as RetryIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchMedicalQuery, submitFeedback, fetchSessionMessages } from '../services/api';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { buildHistoryForRequest } from '../utils/assistantContext';
import {
  createChatTimestamp,
  hydrateSessionMessages,
  serializeSessionMessages,
} from '../utils/chatSessions';
import {
  getSpeechRecognitionConstructor,
  getSpeechSynthesis,
  getSpeechSynthesisUtteranceConstructor,
  getStoredValue,
  safeJsonParse,
  setStoredValue,
} from '../utils/browser';
import OnboardingTour from '../components/OnboardingTour';
import '../animations.css';

// Number of messages to render per page when viewing a long session
const RENDER_PAGE_SIZE = 50;
const CHAT_SESSIONS_STORAGE_KEY = 'medsage_chat_sessions';

// ─── Professor personas by topic ─────────────────────────────────────────────
const PROFESSORS = {
  anatomy:      { name: 'Dr. Anatomy',    initials: 'AN', specialty: 'Anatomy',         color: '#818cf8' },
  physiology:   { name: 'Dr. Physiology', initials: 'PH', specialty: 'Physiology',      color: '#22d3ee' },
  biochemistry: { name: 'Dr. Biochem',    initials: 'BC', specialty: 'Biochemistry',    color: '#34d399' },
  pathology:    { name: 'Dr. Pathology',  initials: 'PA', specialty: 'Pathology',       color: '#f87171' },
  pharmacology: { name: 'Dr. Pharma',     initials: 'PX', specialty: 'Pharmacology',    color: '#fbbf24' },
  microbiology: { name: 'Dr. Micro',      initials: 'MI', specialty: 'Microbiology',    color: '#a3e635' },
  surgery:      { name: 'Dr. Surgery',    initials: 'SG', specialty: 'Surgery',         color: '#fb7185' },
  medicine:     { name: 'Dr. Medicine',   initials: 'IM', specialty: 'Internal Med',    color: '#fb923c' },
  forensic:     { name: 'Dr. Forensic',   initials: 'FM', specialty: 'Forensic Med',    color: '#94a3b8' },
  community:    { name: 'Dr. PSM',        initials: 'CM', specialty: 'Community Med',   color: '#4ade80' },
  psychiatry:   { name: 'Dr. Psychiatry', initials: 'PS', specialty: 'Psychiatry',      color: '#c084fc' },
  radiology:    { name: 'Dr. Radiology',  initials: 'RD', specialty: 'Radiology',       color: '#38bdf8' },
  obg:          { name: 'Dr. OBG',        initials: 'OB', specialty: 'Obs & Gynae',     color: '#f472b6' },
  pediatrics:   { name: 'Dr. Pediatrics', initials: 'PD', specialty: 'Pediatrics',      color: '#60a5fa' },
  ent:          { name: 'Dr. ENT',        initials: 'ET', specialty: 'ENT',             color: '#2dd4bf' },
  ophthalmology:{ name: 'Dr. Ophthalmology', initials: 'OP', specialty: 'Ophthalmology', color: '#a78bfa' },
  default:      { name: 'Cortex',         initials: 'CX', specialty: 'AI Professor',    color: '#818cf8' },
};

const SUBJECT_TO_PROFESSOR = {
  'Anatomy': 'anatomy', 'Physiology': 'physiology', 'Biochemistry': 'biochemistry',
  'Pathology': 'pathology', 'Pharmacology': 'pharmacology', 'Microbiology': 'microbiology',
  'Surgery': 'surgery', 'Medicine': 'medicine', 'Forensic Medicine': 'forensic',
  'Community Medicine': 'community', 'Psychiatry': 'psychiatry', 'Radiology': 'radiology',
  'Obstetrics & Gynecology': 'obg', 'Pediatrics': 'pediatrics',
  'ENT': 'ent', 'Ophthalmology': 'ophthalmology',
};

function getProfessor(topicId, text = '', subject = null) {
  if (subject && SUBJECT_TO_PROFESSOR[subject]) return PROFESSORS[SUBJECT_TO_PROFESSOR[subject]];
  const id = (topicId || '').toLowerCase();
  const content = text.toLowerCase();
  const matches = (kws) => kws.some(k => id.includes(k) || content.includes(k));
  if (matches(['anat', 'blood supply', 'triangle', 'sinus', 'nerve supply', 'muscle', 'ligament', 'foramen', 'fossa', 'brachial plexus'])) return PROFESSORS.anatomy;
  if (matches(['physio', 'cardiac cycle', 'action potential', 'gfr', 'starling', 'renal clearance', 'ventilation', 'tidal volume', 'homeostasis'])) return PROFESSORS.physiology;
  if (matches(['biochem', 'enzyme', 'metabolism', 'pathway', 'glycolysis', 'krebs', 'vitamin', 'amino acid', 'fatty acid'])) return PROFESSORS.biochemistry;
  if (matches(['path', 'necrosis', 'infarction', 'oedema', 'edema', 'inflammation', 'tumor', 'cancer', 'carcinoma', 'neoplasia', 'apoptosis'])) return PROFESSORS.pathology;
  if (matches(['pharma', 'drug', 'blocker', 'penicillin', 'antibiotic', 'receptor', 'dose', 'mechanism of action', 'pharmacokinetics', 'adverse effect'])) return PROFESSORS.pharmacology;
  if (matches(['micro', 'bact', 'virus', 'infection', 'fungus', 'parasite', 'gram positive', 'gram negative', 'vaccine', 'immunity'])) return PROFESSORS.microbiology;
  if (matches(['surg', 'appendicitis', 'hernia', 'operation', 'incision', 'laparoscopy', 'postoperative', 'anastomosis'])) return PROFESSORS.surgery;
  if (matches(['forensic', 'autopsy', 'postmortem', 'rigor mortis', 'injury', 'wound', 'medicolegal'])) return PROFESSORS.forensic;
  if (matches(['community', 'psm', 'epidemiology', 'vaccine schedule', 'public health', 'incidence', 'prevalence', 'odds ratio'])) return PROFESSORS.community;
  if (matches(['psych', 'schizophrenia', 'depression', 'bipolar', 'anxiety', 'hallucination', 'delusion', 'dsm'])) return PROFESSORS.psychiatry;
  if (matches(['radio', 'x-ray', 'xray', 'mri', 'ct scan', 'ultrasound', 'imaging', 'opacity', 'hyperdense'])) return PROFESSORS.radiology;
  if (matches(['obg', 'obstetric', 'gynae', 'gynecol', 'pregnancy', 'labour', 'labor', 'antenatal', 'eclampsia', 'uterus', 'cervix', 'ovary', 'placenta', 'fetal', 'pcos', 'ectopic', 'fibroid', 'menstrual', 'postpartum'])) return PROFESSORS.obg;
  if (matches(['pediatric', 'paediatric', 'child', 'infant', 'neonate', 'neonatal', 'toddler', 'milestone', 'congenital', 'kwashiorkor', 'marasmus', 'birth weight', 'preterm'])) return PROFESSORS.pediatrics;
  if (matches(['ent', 'otitis', 'tinnitus', 'vertigo', 'hearing', 'sinusitis', 'tonsil', 'mastoid', 'cholesteatoma', 'nasal polyp', 'otosclerosis'])) return PROFESSORS.ent;
  if (matches(['ophthal', 'glaucoma', 'cataract', 'retina', 'cornea', 'fundus', 'visual acuity', 'diabetic retinopathy', 'uveitis', 'conjunctivitis'])) return PROFESSORS.ophthalmology;
  if (matches(['med', 'cardio', 'resp', 'gastro', 'nephro', 'diabetes', 'hypertension', 'disease', 'syndrome', 'heart failure', 'renal'])) return PROFESSORS.medicine;
  return PROFESSORS.default;
}

function detectSubjectFromText(text) {
  const t = text.toLowerCase();
  const check = (kws) => kws.some(k => t.includes(k));
  if (check(['anatomy', 'blood supply', 'nerve supply', 'lymphatic', 'triangle', 'canal', 'foramen', 'fossa', 'muscle', 'bone', 'artery', 'vein', 'ligament', 'brachial plexus', 'dermatome', 'tendon', 'fascia'])) return 'Anatomy';
  if (check(['physiology', 'cardiac output', 'action potential', 'cardiac cycle', 'gfr', 'renal clearance', 'surfactant', 'starling', 'depolarization', 'repolarization', 'tidal volume', 'vital capacity', 'homeostasis', 'feedback loop'])) return 'Physiology';
  if (check(['biochemistry', 'enzyme', 'glycolysis', 'krebs cycle', 'fatty acid', 'amino acid', 'dna', 'rna', 'vitamin', 'metabolism', 'pathway', 'michaelis', 'mitochondria', 'organelle', 'cell biology', 'molecular'])) return 'Biochemistry';
  if (check(['pharmacology', 'drug', 'mechanism of action', 'beta blocker', 'ace inhibitor', 'penicillin', 'pharmacokinetics', 'adverse effect', 'dosage', 'antibiotic', 'antihypertensive', 'pharmacodynamics', 'bioavailability', 'half life'])) return 'Pharmacology';
  if (check(['microbiology', 'bacteria', 'virus', 'fungus', 'parasite', 'gram positive', 'gram negative', 'virulence', 'culture', 'stain', 'malaria', 'tuberculosis', 'hiv', 'pathogen', 'infection organism', 'antibiotic resistance'])) return 'Microbiology';
  if (check(['pathology', 'necrosis', 'infarction', 'inflammation', 'neoplasia', 'cancer', 'carcinoma', 'apoptosis', 'cell injury', 'edema', 'oedema', 'granuloma', 'tumor marker', 'biopsy finding', 'histopathology'])) return 'Pathology';
  if (check(['obstetrics', 'gynecology', 'gynaecology', 'pregnancy', 'labour', 'labor', 'antenatal', 'postnatal', 'eclampsia', 'preeclampsia', 'uterus', 'cervix', 'ovary', 'menstruation', 'menstrual', 'contraception', 'obg', 'pcos', 'ectopic', 'placenta', 'fetal', 'foetal', 'neonatal', 'newborn', 'trimester', 'postpartum', 'fibroid', 'endometriosis'])) return 'Obstetrics & Gynecology';
  if (check(['pediatrics', 'paediatrics', 'child', 'children', 'infant', 'neonate', 'toddler', 'adolescent', 'milestone', 'vaccination schedule', 'growth chart', 'congenital', 'kwashiorkor', 'marasmus', 'febrile convulsion', 'birth weight', 'preterm'])) return 'Pediatrics';
  if (check(['surgery', 'operation', 'incision', 'appendicitis', 'hernia', 'laparoscopy', 'laparotomy', 'anastomosis', 'cholecystitis', 'pancreatitis', 'surgical', 'postoperative', 'excision', 'resection'])) return 'Surgery';
  if (check(['psychiatry', 'schizophrenia', 'depression', 'bipolar', 'anxiety', 'hallucination', 'delusion', 'psychosis', 'dsm', 'ssri', 'antipsychotic', 'mental health', 'cognitive', 'behavioural'])) return 'Psychiatry';
  if (check(['community medicine', 'public health', 'epidemiology', 'incidence', 'prevalence', 'relative risk', 'odds ratio', 'vaccine schedule', 'psm', 'national health', 'herd immunity', 'screening program', 'attributable risk'])) return 'Community Medicine';
  if (check(['radiology', 'x-ray', 'xray', 'ct scan', 'mri', 'ultrasound', 'imaging', 'opacity', 'consolidation', 'hyperdense', 'hounsfield', 'radiograph', 'ground glass'])) return 'Radiology';
  if (check(['ent', 'ear', 'otitis', 'tinnitus', 'vertigo', 'hearing loss', 'nose', 'sinusitis', 'nasal polyp', 'throat', 'tonsil', 'larynx', 'vocal cord', 'cholesteatoma', 'mastoid', 'otosclerosis', 'rhinitis'])) return 'ENT';
  if (check(['ophthalmology', 'eye', 'retina', 'cornea', 'glaucoma', 'cataract', 'fundus', 'visual acuity', 'optic disc', 'pupil reflex', 'diabetic retinopathy', 'uveitis', 'conjunctivitis', 'strabismus'])) return 'Ophthalmology';
  if (check(['forensic', 'autopsy', 'postmortem', 'rigor mortis', 'medicolegal', 'wound', 'death certificate', 'cause of death', 'manner of death'])) return 'Forensic Medicine';
  if (check(['diabetes', 'hypertension', 'heart failure', 'myocardial infarction', 'stroke', 'copd', 'asthma', 'chronic kidney', 'nephrotic', 'rheumatoid', 'lupus', 'thyroid', 'clinical management', 'ward round', 'diagnosis and treatment'])) return 'Medicine';
  return null;
}

// ─── Quick start prompts ──────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { q: 'Cardiac cycle phases and heart sounds explained',     subject: 'Physiology' },
  { q: 'Classify types of necrosis with examples',            subject: 'Pathology' },
  { q: 'Beta blocker mechanism, uses and adverse effects',    subject: 'Pharmacology' },
  { q: 'Blood supply of the heart',                           subject: 'Anatomy' },
  { q: 'Management of preeclampsia and eclampsia',            subject: 'Obstetrics & Gynecology' },
  { q: 'Clinical features and management of DKA',             subject: 'Medicine' },
  { q: 'Developmental milestones in the first 2 years',       subject: 'Pediatrics' },
  { q: 'Gram-positive cocci — key pathogens and diseases',    subject: 'Microbiology' },
  { q: 'Krebs cycle — enzymes, products and clinical links',  subject: 'Biochemistry' },
  { q: 'Approach to a patient with acute red eye',            subject: 'Ophthalmology' },
  { q: 'Chronic suppurative otitis media — classify and manage', subject: 'ENT' },
  { q: 'Epidemiology — RR, OR, NNT explained with examples',  subject: 'Community Medicine' },
];


function getTrustVisuals(trust) {
  if (trust?.verified) {
    return {
      color: '#10b981',
      background: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.28)',
    };
  }

  if (trust?.verification_level === 'degraded' || trust?.verification_level === 'clarification') {
    return {
      color: '#f59e0b',
      background: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.28)',
    };
  }

  return {
    color: '#f97316',
    background: 'rgba(249,115,22,0.1)',
    border: 'rgba(249,115,22,0.28)',
  };
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function inlineFormat(text) {
  const fmt = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.14);padding:2px 6px;border-radius:4px;font-size:0.86em;font-family:monospace">$1</code>');
  return DOMPurify.sanitize(fmt, { ALLOWED_TAGS: ['strong', 'em', 'code'], ALLOWED_ATTR: ['style'] });
}

function renderMarkdown(text, isDark) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;
  const flushList = () => {
    if (!listItems.length) return;
    elements.push(
      <Box key={`list-${key++}`} component="ul" sx={{ pl: 3, mt: 0.5, mb: 1.5 }}>
        {listItems.map((item, i) => (
          <Box key={i} component="li"
            sx={{ fontSize: '0.94rem', lineHeight: 1.8, color: isDark ? 'rgba(226,232,240,0.88)' : 'rgba(15,23,42,0.82)', mb: 0.5 }}
            dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
        ))}
      </Box>
    );
    listItems = [];
  };
  lines.forEach(line => {
    if (!line.trim()) { flushList(); elements.push(<Box key={`gap-${key++}`} sx={{ height: 8 }} />); return; }
    if (line.startsWith('## ') || line.startsWith('### ')) {
      flushList();
      const isH2 = line.startsWith('## ');
      const content = line.replace(/^#{2,3}\s/, '');
      elements.push(
        <Typography key={`h-${key++}`} sx={{
          fontWeight: 700, mt: 2.5, mb: 0.75, lineHeight: 1.4,
          color: isDark ? '#a5b4fc' : '#4338ca',
          fontSize: isH2 ? '0.97rem' : '0.92rem',
          letterSpacing: '0.01em',
        }} dangerouslySetInnerHTML={{ __html: inlineFormat(content) }} />
      );
      return;
    }
    if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
      listItems.push(line.replace(/^([-•*]|\d+\.)\s/, '')); return;
    }
    flushList();
    elements.push(
      <Typography key={`p-${key++}`} sx={{
        fontSize: '0.94rem', lineHeight: 1.85, mb: 0.5,
        color: isDark ? 'rgba(226,232,240,0.88)' : 'rgba(15,23,42,0.82)',
      }} dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    );
  });
  flushList();
  return elements;
}

// ─── Animated typing indicator ────────────────────────────────────────────────
function TypingDots({ color }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ py: 0.5 }}>
      {[0, 1, 2].map(i => (
        <motion.div key={i}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: color }}
        />
      ))}
    </Stack>
  );
}

// ─── AI Message Card ──────────────────────────────────────────────────────────
function AIMessage({ msg, mode, isDark, onCopy, onFollowUp, onFeedback }) {
  const { response, topicId, subject, streaming } = msg;
  if (!response) return null;

  const professor = getProfessor(topicId, response.text, subject);
  const effectiveMode = msg.modeUsed || mode;
  const isExam = effectiveMode === 'exam';
  const isGreeting = response.pipeline === 'greeting';
  const isClarification = response.type === 'CLARIFICATION' && !isGreeting;
  const trust = response.trust || null;
  const trustVisuals = getTrustVisuals(trust);
  const confidenceLabel = trust?.confidence_label || response.confidence?.tier_label || null;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [keyPointsExpanded, setKeyPointsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 'up' | 'down' | null
  const speechSynthesis = getSpeechSynthesis();
  const SpeechSynthesisUtteranceCtor = getSpeechSynthesisUtteranceConstructor();
  const canSpeak = Boolean(speechSynthesis && SpeechSynthesisUtteranceCtor);

  const handleFeedback = (rating) => {
    if (feedbackGiven || !response.log_id) return;
    setFeedbackGiven(rating);
    onFeedback?.(response.log_id, rating);
  };

  useEffect(() => {
    return () => {
      if (isSpeaking && speechSynthesis) {
        speechSynthesis.cancel();
      }
    };
  }, [isSpeaking, speechSynthesis]);

  const toggleSpeak = () => {
    if (!canSpeak) return;
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtteranceCtor((response.text || '').replace(/[*#`]/g, ''));
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    speechSynthesis.speak(utterance);
  };

  const handleCopy = () => {
    onCopy(response.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const c = professor.color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box sx={{ display: 'flex', gap: 2, mb: 5, alignItems: 'flex-start' }}>

        {/* Avatar with colored ring */}
        <Box sx={{ flexShrink: 0, mt: 0.25 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '50%',
            background: `linear-gradient(135deg, ${c}DD, ${c}66)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 2px ${isDark ? '#0c1222' : '#f1f5f9'}, 0 0 0 3.5px ${c}55`,
          }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: 0.5, color: '#fff', userSelect: 'none' }}>
              {professor.initials}
            </Typography>
          </Box>
        </Box>

        {/* Message content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/* Meta row */}
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.83rem', fontWeight: 700, color: isDark ? '#e2e8f0' : '#1e293b', letterSpacing: '-0.01em' }}>
              {professor.name}
            </Typography>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', height: 20, px: 1.25, borderRadius: 1.5,
              background: `${c}14`, border: `1px solid ${c}28`,
            }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: c, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                {professor.specialty}
              </Typography>
            </Box>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', height: 20, px: 1.25, borderRadius: 1.5,
              background: isExam ? 'rgba(251,191,36,0.1)' : 'rgba(99,102,241,0.1)',
              border: `1px solid ${isExam ? 'rgba(251,191,36,0.25)' : 'rgba(99,102,241,0.22)'}`,
            }}>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: isExam ? '#fbbf24' : '#818cf8' }}>
                {isExam ? 'Exam' : 'Conceptual'}
              </Typography>
            </Box>
            {confidenceLabel && (
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 20,
                px: 1.25,
                borderRadius: 1.5,
                background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(71,85,105,0.08)',
                border: `1px solid ${isDark ? 'rgba(148,163,184,0.18)' : 'rgba(71,85,105,0.14)'}`,
              }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: isDark ? '#cbd5e1' : '#475569' }}>
                  {confidenceLabel}
                </Typography>
              </Box>
            )}
            {trust?.citation_count > 0 && (
              <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                height: 20,
                px: 1.1,
                borderRadius: 1.5,
                background: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)'}`,
              }}>
                <BookmarkIcon sx={{ fontSize: 11, color: isDark ? '#a5b4fc' : '#6366f1' }} />
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: isDark ? '#a5b4fc' : '#6366f1' }}>
                  {`${trust.citation_count} citations`}
                </Typography>
              </Box>
            )}
            {isClarification && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', height: 20, px: 1.25, borderRadius: 1.5, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#fbbf24' }}>
                  Clarify
                </Typography>
              </Box>
            )}
            {streaming && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 20, px: 1.25, borderRadius: 1.5, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'cortex-pulse 1.2s ease-in-out infinite', '@keyframes cortex-pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#10b981' }}>
                  Live
                </Typography>
              </Box>
            )}
            {msg.timestamp && (
              <Typography sx={{ fontSize: '0.7rem', color: isDark ? '#334155' : '#94a3b8', ml: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                {msg.timestamp}
              </Typography>
            )}
          </Stack>

          {/* Card */}
          <Box sx={{
            borderRadius: '0 14px 14px 14px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)'}`,
            borderLeft: `3px solid ${c}88`,
            background: isDark ? 'rgba(11,18,34,0.85)' : '#ffffff',
            overflow: 'hidden',
            boxShadow: isDark
              ? '0 4px 24px rgba(0,0,0,0.35)'
              : '0 2px 16px rgba(15,23,42,0.07)',
          }}>

            {/* Main answer text */}
            <Box sx={{ px: { xs: 2.5, md: 3 }, pt: { xs: 2, md: 2.5 }, pb: 2 }}>
              {renderMarkdown(response.text, isDark)}
              {/* Blinking cursor while streaming */}
              {streaming && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1em',
                    background: c,
                    ml: '2px',
                    verticalAlign: 'text-bottom',
                    animation: 'cortex-blink 0.9s step-start infinite',
                    '@keyframes cortex-blink': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0 },
                    },
                  }}
                />
              )}
            </Box>

            {/* Key points / Claims */}
            {(response.claims?.length > 0 || response.keyPoints?.length > 0) && (() => {
              // Prefer structured claims (with sourcing data) over plain key points
              const hasClaims = response.claims?.length > 0;
              const items = hasClaims
                ? response.claims
                : (response.keyPoints || []).map(pt => ({ text: pt, is_sourced: null, sourceId: null }));
              const unsourcedCount = hasClaims ? items.filter(c => !c.is_sourced).length : 0;

              return (
                <Box sx={{
                  mx: { xs: 2.5, md: 3 }, mb: 2, borderRadius: 2,
                  background: isDark ? `${c}08` : `${c}07`,
                  border: `1px solid ${c}18`,
                  overflow: 'hidden',
                }}>
                  <Box
                    onClick={() => setKeyPointsExpanded(p => !p)}
                    sx={{
                      px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1,
                      cursor: 'pointer', userSelect: 'none',
                      '&:hover': { background: `${c}0A` },
                      transition: 'background 0.15s',
                    }}
                  >
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: c, flex: 1 }}>
                      {isExam ? 'High-Yield Points' : 'Key Takeaways'} · {items.length}
                      {hasClaims && unsourcedCount > 0 && (
                        <Box component="span" sx={{ ml: 1, color: '#94a3b8', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                          · {unsourcedCount} unverified
                        </Box>
                      )}
                    </Typography>
                    <ChevronIcon sx={{
                      fontSize: 16, color: c, opacity: 0.7,
                      transition: 'transform 0.2s',
                      transform: keyPointsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }} />
                  </Box>
                  <AnimatePresence initial={false}>
                    {keyPointsExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <Stack spacing={0.75} sx={{ px: 2, pb: 1.5 }}>
                          {items.map((item, i) => {
                            const isUnsourced = hasClaims && item.is_sourced === false;
                            return (
                              <Box key={i} sx={{
                                display: 'flex', gap: 1.5, alignItems: 'flex-start',
                                ...(isUnsourced && {
                                  background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(148,163,184,0.1)',
                                  borderRadius: 1.5, px: 1, py: 0.5, mx: -1,
                                }),
                              }}>
                                <Box sx={{ width: 5, height: 5, borderRadius: '50%', mt: 0.85, flexShrink: 0, background: isUnsourced ? '#94a3b8' : `${c}BB` }} />
                                <Box sx={{ flex: 1 }}>
                                  <Typography sx={{ fontSize: '0.875rem', lineHeight: 1.7, color: isUnsourced ? (isDark ? '#94a3b8' : '#64748b') : (isDark ? '#cbd5e1' : '#334155') }}>
                                    {item.text}
                                  </Typography>
                                  {isUnsourced && (
                                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', mt: 0.25 }}>
                                      unverified
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            );
                          })}
                        </Stack>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Box>
              );
            })()}

            {/* Clinical note / Exam pearls */}
            {response.clinicalRelevance && (
              <Box sx={{
                mx: { xs: 2.5, md: 3 }, mb: 2, px: 2, py: 1.75, borderRadius: 2,
                background: isDark ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.16)',
              }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#818cf8', mb: 0.75 }}>
                  {isExam ? 'Exam Pearls' : 'Clinical Note'}
                </Typography>
                <Box sx={{ color: isDark ? '#c7d2fe' : '#4338ca' }}>
                  {renderMarkdown(response.clinicalRelevance, isDark)}
                </Box>
              </Box>
            )}


            {/* Clarification follow-up options */}
            {response.followUpOptions?.length > 0 && (
              <Box sx={{ mx: { xs: 2.5, md: 3 }, mb: 2, px: 2, py: 1.5, borderRadius: 2, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fbbf24', mb: 0.75 }}>
                  Try clarifying with
                </Typography>
                <Stack spacing={0.6}>
                  {response.followUpOptions.map((opt, i) => (
                    <Box key={i}
                      onClick={() => onFollowUp?.(opt)}
                      sx={{
                        display: 'flex', gap: 1.25, alignItems: 'flex-start',
                        cursor: 'pointer', borderRadius: 1, px: 0.5, py: 0.25,
                        '&:hover': { background: 'rgba(251,191,36,0.1)' },
                      }}
                    >
                      <Box sx={{ width: 4, height: 4, borderRadius: '50%', mt: 0.9, flexShrink: 0, background: '#fbbf2499' }} />
                      <Typography sx={{ fontSize: '0.875rem', color: isDark ? '#fef3c7' : '#92400e' }}>{opt}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* References */}
            {response.bookReferences?.length > 0 && (
              <Box sx={{
                px: { xs: 2.5, md: 3 }, py: 1.5,
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              }}>
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.5 }}>
                  {response.bookReferences.map((ref, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <BookmarkIcon sx={{ fontSize: 11, opacity: 0.45, color: isDark ? '#64748b' : '#94a3b8', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.72rem', color: isDark ? '#475569' : '#94a3b8', lineHeight: 1.4 }}>
                        {typeof ref === 'string' ? ref : `${ref.book}${ref.chapter ? ` · Ch.${ref.chapter}` : ''}${ref.page ? ` · p.${ref.page}` : ''}`}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Action bar */}
            <Box sx={{
              px: 2, py: 0.75,
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
              display: 'flex', justifyContent: 'flex-end', gap: 0.25,
            }}>
              <Tooltip title={canSpeak ? (isSpeaking ? 'Stop reading' : 'Read aloud') : 'Text-to-speech unavailable'}>
                <span>
                <IconButton size="small" onClick={toggleSpeak} disabled={!canSpeak && !isSpeaking} sx={{
                  p: 0.75, borderRadius: 1.5,
                  color: isSpeaking ? '#f87171' : (isDark ? '#334155' : '#cbd5e1'),
                  '&:hover': { color: isDark ? '#94a3b8' : '#64748b', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                  transition: 'all 0.15s',
                }}>
                  {isSpeaking ? <StopIcon sx={{ fontSize: 14 }} /> : <VolumeUpIcon sx={{ fontSize: 14 }} />}
                </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={copied ? 'Copied!' : 'Copy answer'}>
                <IconButton size="small" onClick={handleCopy} sx={{
                  p: 0.75, borderRadius: 1.5,
                  color: copied ? '#34d399' : (isDark ? '#334155' : '#cbd5e1'),
                  '&:hover': { color: isDark ? '#94a3b8' : '#64748b', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                  transition: 'all 0.15s',
                }}>
                  <CopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              {response.log_id && !streaming && (
                <>
                  <Tooltip title={feedbackGiven === 'up' ? 'Marked helpful' : 'Helpful'}>
                    <IconButton size="small" onClick={() => handleFeedback('up')} disabled={Boolean(feedbackGiven)} sx={{
                      p: 0.75, borderRadius: 1.5,
                      color: feedbackGiven === 'up' ? '#34d399' : (isDark ? '#334155' : '#cbd5e1'),
                      '&:hover': { color: '#34d399', bgcolor: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.06)' },
                      transition: 'all 0.15s',
                    }}>
                      <ThumbUpIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={feedbackGiven === 'down' ? 'Marked unhelpful' : 'Not helpful'}>
                    <IconButton size="small" onClick={() => handleFeedback('down')} disabled={Boolean(feedbackGiven)} sx={{
                      p: 0.75, borderRadius: 1.5,
                      color: feedbackGiven === 'down' ? '#f87171' : (isDark ? '#334155' : '#cbd5e1'),
                      '&:hover': { color: '#f87171', bgcolor: isDark ? 'rgba(248,113,113,0.08)' : 'rgba(248,113,113,0.06)' },
                      transition: 'all 0.15s',
                    }}>
                      <ThumbDownIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}

// ─── User message bubble ──────────────────────────────────────────────────────
function UserMessage({ msg, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
        <Box sx={{ maxWidth: { xs: '88%', md: '72%' }, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          {msg.imageSrc && (
            <Box sx={{ mb: 1.5 }}>
              <Box component="img" src={msg.imageSrc} alt="Uploaded"
                sx={{ maxWidth: 220, maxHeight: 170, borderRadius: 2.5, objectFit: 'cover', border: '2px solid rgba(99,102,241,0.35)', boxShadow: '0 8px 24px rgba(79,70,229,0.25)' }} />
            </Box>
          )}
          <Box sx={{
            px: 2.75, py: 1.75,
            borderRadius: '20px 20px 4px 20px',
            background: isDark
              ? 'linear-gradient(145deg, #4338ca 0%, #3730a3 100%)'
              : 'linear-gradient(145deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            boxShadow: isDark
              ? '0 8px 28px rgba(67,56,202,0.38)'
              : '0 8px 28px rgba(99,102,241,0.32)',
          }}>
            <Typography sx={{ fontSize: '0.94rem', lineHeight: 1.7, fontWeight: 500, letterSpacing: '0.01em' }}>
              {msg.text}
            </Typography>
          </Box>
          {msg.timestamp && (
            <Typography sx={{ mt: 0.75, fontSize: '0.68rem', color: isDark ? '#334155' : '#94a3b8', mr: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              {msg.timestamp}
            </Typography>
          )}
        </Box>
      </Box>
    </motion.div>
  );
}

// ─── Loading row (professor typing) ──────────────────────────────────────────
function LoadingRow({ isDark }) {
  const c = '#818cf8';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'flex-start' }}>
        <motion.div
          animate={{ boxShadow: [`0 0 0 2px #0c1222, 0 0 0 3.5px ${c}30`, `0 0 0 2px #0c1222, 0 0 0 3.5px ${c}80`, `0 0 0 2px #0c1222, 0 0 0 3.5px ${c}30`] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${c}DD, ${c}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}
        >
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', userSelect: 'none' }}>CX</Typography>
        </motion.div>
        <Box sx={{ pt: 0.75 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#64748b' : '#94a3b8', mb: 0.5 }}>
            Cortex is thinking…
          </Typography>
          <TypingDots color={c} />
        </Box>
      </Box>
    </motion.div>
  );
}

// ─── Welcome / empty state ────────────────────────────────────────────────────
function WelcomeState({ isDark, onPromptClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box sx={{ textAlign: 'center', pt: { xs: 4, md: 8 }, pb: 6, px: 1 }}>

        {/* Icon */}
        <Box sx={{ position: 'relative', width: 64, height: 64, mx: 'auto', mb: 3 }}>
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 64, height: 64, borderRadius: 20,
              background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.09)',
              border: `1px solid ${isDark ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SparkleIcon sx={{ fontSize: 30, color: isDark ? '#a5b4fc' : '#6366f1' }} />
          </motion.div>
        </Box>

        {/* Heading */}
        <Typography sx={{
          fontWeight: 800, fontSize: { xs: '1.55rem', md: '1.9rem' }, letterSpacing: '-0.03em',
          color: isDark ? '#e2e8f0' : '#0f172a', mb: 1.25, lineHeight: 1.25,
        }}>
          What would you like to study?
        </Typography>
        <Typography sx={{ fontSize: '0.95rem', color: isDark ? '#475569' : '#64748b', mb: 5, maxWidth: 460, mx: 'auto', lineHeight: 1.65 }}>
          Your personal AI professor panel covers all 12 MBBS subjects — from Anatomy to Surgery.
        </Typography>

        {/* Prompt grid */}
        <Box id="tour-quick-prompts" sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 1.5, maxWidth: 820, mx: 'auto',
        }}>
          {QUICK_PROMPTS.map(({ q, subject }, i) => {
            const pKey = SUBJECT_TO_PROFESSOR[subject] || 'default';
            const p = PROFESSORS[pKey];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.045, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <Box onClick={() => onPromptClick(q)}
                  sx={{
                    p: 2, borderRadius: 2.5, cursor: 'pointer', textAlign: 'left',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.07)'}`,
                    background: isDark ? 'rgba(11,18,34,0.7)' : '#ffffff',
                    transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                    '&:hover': {
                      border: `1px solid ${p.color}44`,
                      background: isDark ? 'rgba(11,18,34,0.95)' : '#fafafa',
                      transform: 'translateY(-2px)',
                      boxShadow: isDark ? `0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px ${p.color}22` : `0 8px 24px rgba(15,23,42,0.1)`,
                      '& .subject-tag': { opacity: 1 },
                    },
                    boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.25)' : '0 1px 8px rgba(15,23,42,0.06)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${p.color}EE, ${p.color}77)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Typography sx={{ fontSize: '0.52rem', fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
                        {p.initials}
                      </Typography>
                    </Box>
                    <Typography className="subject-tag" sx={{
                      fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: p.color, opacity: 0.75,
                      transition: 'opacity 0.2s',
                    }}>
                      {subject}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.55, color: isDark ? '#cbd5e1' : '#334155' }}>
                    {q}
                  </Typography>
                </Box>
              </motion.div>
            );
          })}
        </Box>
      </Box>
    </motion.div>
  );
}

// ─── Session history sidebar drawer ──────────────────────────────────────────
function SessionDrawer({ open, onClose, sessions, currentId, onRestore, onDelete, isDark }) {
  const grouped = sessions.reduce((acc, s) => {
    const d = new Date(s.timestamp);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    let label = d.toDateString() === today.toDateString() ? 'Today'
      : d.toDateString() === yesterday.toDateString() ? 'Yesterday'
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    if (!acc[label]) acc[label] = [];
    acc[label].push(s);
    return acc;
  }, {});

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '88vw', sm: 340 },
          bgcolor: isDark ? '#060d1a' : '#fff',
          borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        }
      }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 3, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: isDark ? '#e2e8f0' : '#0f172a' }}>
            Conversations
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: isDark ? '#475569' : '#94a3b8', mt: 0.25 }}>
            {sessions.length} saved session{sessions.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: isDark ? '#475569' : '#94a3b8', '&:hover': { color: isDark ? '#94a3b8' : '#64748b' } }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

      {sessions.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 40, opacity: 0.15, color: isDark ? '#fff' : '#000', display: 'block', mx: 'auto', mb: 1.5 }} />
          <Typography sx={{ fontSize: '0.85rem', color: isDark ? '#475569' : '#94a3b8' }}>
            No conversations yet
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: isDark ? '#334155' : '#cbd5e1', mt: 0.5 }}>
            Start asking questions and your sessions will appear here.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
          {Object.entries(grouped).map(([label, group]) => (
            <Box key={label}>
              <Typography sx={{ px: 2.5, py: 1.25, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isDark ? '#334155' : '#cbd5e1' }}>
                {label}
              </Typography>
              <List disablePadding>
                {group.map(session => (
                  <ListItem key={session.id} disablePadding
                    secondaryAction={
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(e, session.id); }}
                        sx={{ opacity: 0, mr: 0.5, '&:hover': { color: '#f87171', opacity: 1 }, '.MuiListItem-root:hover &': { opacity: 0.5 }, transition: 'opacity 0.15s' }}>
                        <ClearIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    }
                    sx={{ '&:hover .MuiIconButton-root': { opacity: 0.5 } }}
                  >
                    <ListItemButton onClick={() => onRestore(session)}
                      selected={session.id === currentId}
                      sx={{
                        mx: 1, mb: 0.25, borderRadius: 2, py: 1.25,
                        '&.Mui-selected': {
                          bgcolor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)',
                          '&:hover': { bgcolor: isDark ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.1)' },
                        },
                        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
                      }}
                    >
                      <ListItemText
                        primary={session.title}
                        secondary={new Date(session.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        primaryTypographyProps={{ fontSize: '0.83rem', fontWeight: session.id === currentId ? 700 : 500, noWrap: true, color: isDark ? '#e2e8f0' : '#1e293b' }}
                        secondaryTypographyProps={{ fontSize: '0.68rem', color: isDark ? '#334155' : '#94a3b8' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </Box>
      )}
    </Drawer>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const QuestionPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('conceptual');
  const [messages, setMessages] = useState([]);
  // renderFromIdx: index into `messages` from which we start rendering.
  // Data below this index exists in state (for buildHistory / save) but is not mounted in the DOM.
  const [renderFromIdx, setRenderFromIdx] = useState(0);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [attachedImage, setAttachedImage] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [savedSessions, setSavedSessions] = useState([]);
  const sessionIdRef = useRef(Date.now().toString());

  const bottomRef = useRef(null);
  const topSentinelRef = useRef(null); // IntersectionObserver target at top of message list
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Load sessions: try server first, fall back to localStorage
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/chat/sessions');
        const serverSessions = (res.data?.sessions || []).map(s => ({
          id: s.session_id, title: s.title, timestamp: new Date(s.updated_at).getTime()
        }));
        if (serverSessions.length > 0) {
          const localSessions = safeJsonParse(getStoredValue(CHAT_SESSIONS_STORAGE_KEY), []);
          const fallbackSessions = Array.isArray(localSessions) ? localSessions : [];
          const seenIds = new Set(serverSessions.map((session) => session.id));
          const mergedSessions = [
            ...serverSessions,
            ...fallbackSessions.filter((session) => session?.id && !seenIds.has(session.id)),
          ].slice(0, 20);
          setSavedSessions(mergedSessions);
          setStoredValue(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(mergedSessions));
          return;
        }
      } catch { /* offline or unauthenticated — fall through to localStorage */ }
      const localSessions = safeJsonParse(getStoredValue(CHAT_SESSIONS_STORAGE_KEY), []);
      if (Array.isArray(localSessions)) {
        setSavedSessions(localSessions);
      }
    };
    load();
  }, []);

  // Save sessions: write to server (async, non-blocking) and localStorage
  useEffect(() => {
    if (messages.length === 0) return;
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (!firstUserMsg) return;
    const title = firstUserMsg.text.length > 60 ? firstUserMsg.text.substring(0, 60) + '…' : firstUserMsg.text;
    const serializableMessages = serializeSessionMessages(messages);
    if (serializableMessages.length === 0) return;
    const session = { id: sessionIdRef.current, title, timestamp: Date.now(), messages: serializableMessages };

    // Update localStorage immediately (offline cache)
    try {
      const all = safeJsonParse(getStoredValue(CHAT_SESSIONS_STORAGE_KEY), []);
      const nextSessions = Array.isArray(all) ? all : [];
      const idx = nextSessions.findIndex(s => s.id === session.id);
      if (idx >= 0) nextSessions[idx] = session; else nextSessions.unshift(session);
      const trimmed = nextSessions.slice(0, 20);
      setStoredValue(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(trimmed));
      setSavedSessions(trimmed);
    } catch { /* ignore */ }

    // Sync to MongoDB in background (fire-and-forget)
    api.post('/api/chat/sessions', {
      session_id: sessionIdRef.current,
      title,
      messages: serializableMessages,
    }).catch(() => { /* silently fail — localStorage is the fallback */ });
  }, [messages]);

  useEffect(() => {
    const SR = getSpeechRecognitionConstructor();
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
      }
      if (final) setQuestion(prev => prev + (prev.endsWith(' ') ? '' : ' ') + final);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setSnackbar({ open: true, message: 'Microphone access denied.' });
      }
    };
    recognitionRef.current = recognition;
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    if (!recognitionRef.current) {
      setSnackbar({ open: true, message: 'Voice input is not supported in this browser.' });
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      setSnackbar({ open: true, message: 'Microphone is not available right now.' });
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const buildHistory = useCallback(() => buildHistoryForRequest(messages), [messages]);

  const handleSubmit = useCallback(async (queryText) => {
    const q = (typeof queryText === 'string' ? queryText : question).trim();
    if (!q && !attachedImage) return;

    const displayText = q || '(Image attached)';
    const messageClock = createChatTimestamp();
    const history = buildHistory();
    const imageDataUrl = attachedImage?.dataUrl || null;
    const detectedSubject = imageDataUrl ? null : detectSubjectFromText(q);
    const syllabusLabel = userProfile?.country ? `${userProfile.country} MBBS` : 'Indian MBBS';

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessages(prev => [...prev, {
      role: 'user',
      text: displayText,
      imageSrc: imageDataUrl,
      ...messageClock,
    }]);
    setQuestion('');
    setAttachedImage(null);
    setLoading(true);

    // ── Full pipeline ──────────────────────────────────────────────────────
    try {
      const result = await fetchMedicalQuery(
        q || 'Describe this image', mode, syllabusLabel, history, imageDataUrl, controller.signal, detectedSubject
      );
      const raw = result?.data || {};
      const responseData = {
        type: result?.type || raw?.type || 'ANSWER',
        text: raw?.text || 'No response text available.',
        keyPoints: raw?.keyPoints || [],
        clinicalRelevance: raw?.clinicalRelevance || '',
        bookReferences: raw?.bookReferences || raw?.citations || [],
        followUpOptions: raw?.followUpOptions || [],
        confidence: raw?.confidence || null,
        trust: raw?.trust || null,
        flags: raw?.flags || [],
        verified: raw?.verified || false,
        verificationLevel: raw?.verificationLevel || null,
        pipeline: raw?.pipeline || raw?.trust?.pipeline || raw?.meta?.pipeline || null,
        log_id: raw?.log_id || null,
        claims: raw?.claims || null,
        allClaimsSourced: raw?.allClaimsSourced ?? null,
      };
      setMessages(prev => [...prev, {
        role: 'ai', response: responseData,
        modeUsed: mode,
        topicId: raw?.topicId || raw?.meta?.topic_id || null,
        subject: raw?.subject || raw?.meta?.subject || detectedSubject || null,
        ...createChatTimestamp(),
      }]);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;
      setMessages(prev => [...prev, {
        role: 'error',
        text: err.message || 'Failed to get a response. Is the backend running?',
        retryable: err.retryable !== false, // default true unless explicitly false
        queryText: q,
        imageDataUrl: attachedImage?.dataUrl || null,
        ...createChatTimestamp(),
      }]);
    } finally {
      if (abortControllerRef.current === controller) setLoading(false);
      setIsListening(false);
      inputRef.current?.focus();
    }
  }, [question, mode, attachedImage, buildHistory, userProfile]);

  useEffect(() => {
    if (location.state?.initialQuery) {
      const query = location.state.initialQuery;
      navigate(location.pathname, { replace: true, state: {} });
      handleSubmit(query);
    }
  }, [location.state, navigate, location.pathname, handleSubmit]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleCopy = (text) => {
    if (!navigator?.clipboard?.writeText) {
      setSnackbar({ open: true, message: 'Copy is not supported in this browser.' });
      return;
    }
    navigator.clipboard
      .writeText(text || '')
      .then(() => setSnackbar({ open: true, message: 'Copied to clipboard' }))
      .catch(() => setSnackbar({ open: true, message: 'Failed to copy answer.' }));
  };

  const handleFeedback = async (logId, rating) => {
    try {
      await submitFeedback(logId, rating);
      setSnackbar({ open: true, message: rating === 'up' ? 'Thanks for the feedback!' : 'Got it — we\'ll review this response.' });
    } catch {
      // silent — don't distract the student with feedback errors
    }
  };

  const handleClear = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = null;
    sessionIdRef.current = Date.now().toString();
    setMessages([]);
    setRenderFromIdx(0);
    setIsLoadingOlder(false);
    setQuestion('');
    setAttachedImage(null);
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleRestoreSession = useCallback(async (session) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = null;
    sessionIdRef.current = session.id;
    setHistoryDrawerOpen(false);

    let msgs = session.messages || [];

    // Server-loaded sessions (loaded from the list endpoint) have no messages field.
    // Fetch the full session from the server in that case.
    if (msgs.length === 0) {
      try {
        const data = await fetchSessionMessages(session.id, 1, 200);
        const raw = data?.session?.messages || [];
        msgs = hydrateSessionMessages(raw);
      } catch {
        msgs = [];
      }
    } else {
      msgs = hydrateSessionMessages(msgs);
    }

    setMessages(msgs);
    // Only paginate the render window if the session is large enough to matter
    setRenderFromIdx(Math.max(0, msgs.length - RENDER_PAGE_SIZE));
  }, []);

  // ── Load older messages (render-window expansion) ─────────────────────────
  // Prepends the previous RENDER_PAGE_SIZE messages to the visible window and
  // preserves the scroll position so the viewport doesn't jump.
  const handleLoadOlderMessages = useCallback(() => {
    if (renderFromIdx === 0 || isLoadingOlder) return;
    setIsLoadingOlder(true);

    // Capture scroll metrics before the DOM update
    const prevScrollHeight = document.documentElement.scrollHeight;
    const prevScrollTop = window.scrollY;

    setRenderFromIdx(prev => Math.max(0, prev - RENDER_PAGE_SIZE));

    // After paint: restore relative scroll position so content doesn't jump
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const delta = document.documentElement.scrollHeight - prevScrollHeight;
        window.scrollTo({ top: prevScrollTop + delta, behavior: 'instant' });
        setIsLoadingOlder(false);
      });
    });
  }, [renderFromIdx, isLoadingOlder]);

  // Auto-load when the top sentinel enters the viewport
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || renderFromIdx === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) handleLoadOlderMessages(); },
      // Trigger 120px before the sentinel is fully visible so loading feels seamless
      { rootMargin: '120px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [renderFromIdx, handleLoadOlderMessages]);

  const handleDeleteSession = (e, sessionId) => {
    e.stopPropagation();
    try {
      const updated = savedSessions.filter(s => s.id !== sessionId);
      setStoredValue(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
      setSavedSessions(updated);
    } catch { /* ignore */ }
    // Delete from server in background
    api.delete(`/api/chat/sessions/${sessionId}`).catch(() => {});
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const max = 800;
        if (w > h && w > max) { h = Math.floor(h * (max / w)); w = max; }
        else if (h > max) { w = Math.floor(w * (max / h)); h = max; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        setAttachedImage({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), name: file.name });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const hasMessages = messages.length > 0;
  const canSend = !loading && (question.trim().length > 0 || !!attachedImage);
  // Slice of messages currently mounted in the DOM
  const visibleMessages = renderFromIdx > 0 ? messages.slice(renderFromIdx) : messages;
  const hasOlderMessages = renderFromIdx > 0;

  const inputBg = isDark ? 'rgba(11,18,34,0.92)' : 'rgba(255,255,255,0.96)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)';

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', display: 'flex', flexDirection: 'column', minHeight: '78vh', position: 'relative' }}>

      {/* Onboarding tour — runs once on first login */}
      <OnboardingTour />

      {/* ── Header bar ───────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 3, md: 4 }, pt: 1 }}>
        <Box>
          <Typography sx={{
            fontWeight: 800, fontSize: { xs: '1.35rem', md: '1.6rem' },
            letterSpacing: '-0.035em', lineHeight: 1.2,
            color: isDark ? '#e2e8f0' : '#0f172a',
          }}>
            Cortex
          </Typography>
          {hasMessages && (
            <Typography sx={{ fontSize: '0.78rem', color: isDark ? '#334155' : '#94a3b8', mt: 0.4 }}>
              {`${Math.ceil(messages.length / 2)} exchange${Math.ceil(messages.length / 2) !== 1 ? 's' : ''} · ${mode === 'exam' ? 'Exam mode' : 'Conceptual mode'}`}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={0.75}>
          {hasMessages && (
            <Tooltip title="New conversation">
              <IconButton onClick={handleClear} size="small" sx={{
                width: 36, height: 36, borderRadius: 2,
                border: `1px solid ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)'}`,
                color: isDark ? '#818cf8' : '#6366f1',
                bgcolor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                '&:hover': { bgcolor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)' },
              }}>
                <NewChatIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Chat history">
            <IconButton onClick={() => setHistoryDrawerOpen(true)} size="small" sx={{
              width: 36, height: 36, borderRadius: 2,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              color: isDark ? '#64748b' : '#94a3b8',
              '&:hover': { color: isDark ? '#94a3b8' : '#64748b', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
            }}>
              <HistoryIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Session drawer ───────────────────────────────────────── */}
      <SessionDrawer
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        sessions={savedSessions}
        currentId={sessionIdRef.current}
        onRestore={handleRestoreSession}
        onDelete={handleDeleteSession}
        isDark={isDark}
      />

      {/* ── Chat area ────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, mb: 2 }}>
        {!hasMessages ? (
          <WelcomeState isDark={isDark} onPromptClick={(q) => handleSubmit(q)} />
        ) : (
          <Box>
            {/* ── Scroll-up sentinel + load-older banner ────────── */}
            <div ref={topSentinelRef} style={{ height: 1 }} />
            {hasOlderMessages && (
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Button
                  size="small"
                  onClick={handleLoadOlderMessages}
                  disabled={isLoadingOlder}
                  startIcon={
                    isLoadingOlder
                      ? <CircularProgress size={12} sx={{ color: 'inherit' }} />
                      : <ChevronIcon sx={{ transform: 'rotate(180deg)', fontSize: 16 }} />
                  }
                  sx={{
                    fontSize: '0.75rem', fontWeight: 600,
                    color: isDark ? '#64748b' : '#94a3b8',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    borderRadius: 5, px: 2, py: 0.6,
                    '&:hover': {
                      color: isDark ? '#94a3b8' : '#64748b',
                      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    },
                  }}
                >
                  {isLoadingOlder ? 'Loading…' : `Load older messages (${renderFromIdx} hidden)`}
                </Button>
              </Box>
            )}

            {visibleMessages.map((msg, i) => {
              // Use renderFromIdx + i so keys are stable when the window shifts
              const key = renderFromIdx + i;
              if (msg.role === 'user') return <UserMessage key={key} msg={msg} isDark={isDark} />;
              if (msg.role === 'error') return (
                <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Box sx={{
                    mb: 4, p: 2.5, borderRadius: 2.5,
                    border: '1px solid rgba(248,113,113,0.22)',
                    borderLeft: '3px solid #f87171',
                    background: isDark ? 'rgba(248,113,113,0.06)' : 'rgba(254,242,242,0.8)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2,
                  }}>
                    <Typography sx={{ fontSize: '0.875rem', color: isDark ? '#fca5a5' : '#dc2626', fontWeight: 600, flex: 1 }}>
                      {msg.text}
                    </Typography>
                    {msg.retryable !== false && msg.queryText && (
                      <Button
                        size="small"
                        startIcon={<RetryIcon sx={{ fontSize: '14px !important' }} />}
                        onClick={() => handleSubmit(msg.queryText)}
                        disabled={loading}
                        sx={{
                          flexShrink: 0,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: isDark ? '#fca5a5' : '#dc2626',
                          borderColor: isDark ? 'rgba(248,113,113,0.35)' : 'rgba(248,113,113,0.4)',
                          border: '1px solid',
                          borderRadius: 1.5,
                          px: 1.25, py: 0.5,
                          minWidth: 0,
                          '&:hover': {
                            background: isDark ? 'rgba(248,113,113,0.1)' : 'rgba(248,113,113,0.08)',
                            borderColor: '#f87171',
                          },
                        }}
                      >
                        Retry
                      </Button>
                    )}
                  </Box>
                </motion.div>
              );
              return <AIMessage key={key} msg={msg} mode={mode} isDark={isDark} onCopy={handleCopy} onFollowUp={handleSubmit} onFeedback={handleFeedback} />;
            })}
            {loading && <LoadingRow isDark={isDark} />}
          </Box>
        )}
        {/* Scroll spacer */}
        <div style={{ height: isMobile ? 200 : 148 }} />
        <div ref={bottomRef} style={{ height: 1 }} />
      </Box>

      {/* ── Command center / input bar (fixed bottom) ─────────────── */}
      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10,
        pb: isMobile ? 'calc(env(safe-area-inset-bottom, 8px) + 72px)' : '26px',
        pt: { xs: '52px', md: '68px' },
        // Padding must match Layout.js content padding so the input box
        // edges land on the same column as the chat messages above it.
        px: { xs: 2, sm: 3, md: 4 },
        background: isDark
          ? 'linear-gradient(to top, rgba(12,14,26,1) 0%, rgba(12,14,26,0.92) 55%, transparent 100%)'
          : 'linear-gradient(to top, rgba(244,246,255,1) 0%, rgba(244,246,255,0.92) 55%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <Box sx={{
          // Same maxWidth as the page content (820) so the input aligns
          // flush with the messages — no wider, no narrower.
          maxWidth: 820,
          mx: 'auto',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
        }}>

          {/* Attached image preview */}
          <AnimatePresence>
            {attachedImage && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 1 }}>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <Box component="img" src={attachedImage.dataUrl} alt="attached"
                      sx={{ width: 52, height: 52, borderRadius: 1.5, objectFit: 'cover', border: '2px solid rgba(99,102,241,0.35)' }} />
                    <IconButton size="small" onClick={() => setAttachedImage(null)} sx={{
                      position: 'absolute', top: -7, right: -7, width: 18, height: 18,
                      bgcolor: '#f87171', color: '#fff', '&:hover': { bgcolor: '#ef4444' },
                    }}>
                      <CloseIcon sx={{ fontSize: 11 }} />
                    </IconButton>
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {attachedImage.name}
                  </Typography>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input container */}
          <Box sx={{
            borderRadius: '20px',
            border: `1.5px solid ${inputBorder}`,
            background: inputBg,
            backdropFilter: 'blur(24px)',
            boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6)' : '0 12px 40px rgba(15,23,42,0.12)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            '&:focus-within': {
              borderColor: isDark ? 'rgba(99,102,241,0.55)' : 'rgba(99,102,241,0.42)',
              boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.6), 0 0 0 3px rgba(99,102,241,0.12)' : '0 12px 40px rgba(15,23,42,0.1), 0 0 0 3px rgba(99,102,241,0.08)',
            },
          }}>

            {/* Text field row */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', px: 1.75, pt: 1.5, pb: 0.75, gap: 1 }}>
              {/* Attach + mic */}
              <Box sx={{ display: 'flex', gap: 0.25, mb: 0.5, flexShrink: 0 }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                <Tooltip title="Attach image">
                  <IconButton id="tour-image-attach" size="small" onClick={() => fileInputRef.current?.click()} sx={{
                    p: 0.75, borderRadius: 1.5, color: isDark ? '#475569' : '#94a3b8',
                    '&:hover': { color: isDark ? '#818cf8' : '#6366f1', bgcolor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)' },
                    transition: 'all 0.15s',
                  }}>
                    <AttachIcon sx={{ fontSize: 19 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={isListening ? 'Stop dictation' : 'Voice input'}>
                  <IconButton size="small" onClick={toggleListen} sx={{
                    p: 0.75, borderRadius: 1.5,
                    color: isListening ? '#f87171' : (isDark ? '#475569' : '#94a3b8'),
                    bgcolor: isListening ? 'rgba(248,113,113,0.1)' : 'transparent',
                    '&:hover': { color: isListening ? '#ef4444' : (isDark ? '#818cf8' : '#6366f1'), bgcolor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)' },
                    transition: 'all 0.15s',
                  }}>
                    {isListening ? <StopIcon sx={{ fontSize: 19 }} /> : <MicIcon sx={{ fontSize: 19 }} />}
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Text area */}
              <TextField
                id="tour-input"
                inputRef={inputRef}
                fullWidth multiline maxRows={6}
                variant="standard"
                placeholder={
                  attachedImage ? 'Ask about this image, or send to analyze…'
                    : isListening ? 'Listening…'
                    : 'Ask anything — anatomy, drugs, pathology, cases…'
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyPress}
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.6,
                    color: isDark ? '#e2e8f0' : '#0f172a',
                    '& textarea': { py: 0.5 },
                    '& textarea::placeholder': { color: isDark ? '#334155' : '#94a3b8', opacity: 1 },
                  },
                }}
              />

              {/* Send button */}
              <Tooltip title="Send">
                <span style={{ flexShrink: 0 }}>
                  <motion.div whileTap={{ scale: 0.92 }}>
                    <IconButton
                      onClick={() => handleSubmit()}
                      disabled={!canSend}
                      sx={{
                        width: 38, height: 38, borderRadius: 2.5, mb: 0.5,
                        background: canSend
                          ? 'linear-gradient(145deg, #6366f1, #7c3aed)'
                          : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                        color: canSend ? '#fff' : (isDark ? '#334155' : '#cbd5e1'),
                        boxShadow: canSend ? '0 4px 14px rgba(99,102,241,0.45)' : 'none',
                        transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                        '&:hover': canSend ? {
                          background: 'linear-gradient(145deg, #4f46e5, #6d28d9)',
                          boxShadow: '0 6px 20px rgba(99,102,241,0.55)',
                          transform: 'translateY(-1px)',
                        } : {},
                      }}
                    >
                      {loading
                        ? <CircularProgress size={16} sx={{ color: isDark ? '#475569' : '#cbd5e1' }} />
                        : <SendIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </motion.div>
                </span>
              </Tooltip>
            </Box>

            {/* Toolbar row */}
            <Box sx={{ px: 2, pb: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.25, flexWrap: 'wrap' }}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {/* Mode toggle */}
                <Box id="tour-mode-toggle" sx={{
                  display: 'inline-flex', borderRadius: '10px', overflow: 'hidden',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                }}>
                  {[
                    { val: 'conceptual', label: 'Conceptual', icon: <PsychologyIcon sx={{ fontSize: 13 }} /> },
                    { val: 'exam',       label: 'Exam',       icon: <LibraryIcon   sx={{ fontSize: 13 }} /> },
                  ].map(({ val, label, icon }) => (
                    <Button key={val} size="small" startIcon={icon} onClick={() => setMode(val)}
                      disableElevation disableRipple
                      sx={{
                        px: 1.5, py: 0.5, borderRadius: 0, textTransform: 'none',
                        fontWeight: mode === val ? 700 : 500,
                        fontSize: '0.73rem', minHeight: 28,
                        bgcolor: mode === val
                          ? (isDark ? 'rgba(99,102,241,0.22)' : 'rgba(99,102,241,0.1)')
                          : 'transparent',
                        color: mode === val
                          ? (isDark ? '#a5b4fc' : '#4f46e5')
                          : (isDark ? '#475569' : '#94a3b8'),
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.07)', color: isDark ? '#c7d2fe' : '#4338ca' },
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Box>

              </Stack>

              {/* Keyboard hint */}
              <Typography sx={{ fontSize: '0.67rem', color: isDark ? '#475569' : '#94a3b8', display: { xs: 'none', md: 'block' }, userSelect: 'none' }}>
                <kbd style={{ padding: '1px 5px', borderRadius: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, fontSize: '0.65rem', fontFamily: 'inherit', color: isDark ? '#64748b' : '#94a3b8' }}>Enter</kbd>{' '}
                <span style={{ color: isDark ? '#475569' : '#94a3b8' }}>send · </span>
                <kbd style={{ padding: '1px 5px', borderRadius: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, fontSize: '0.65rem', fontFamily: 'inherit', color: isDark ? '#64748b' : '#94a3b8' }}>⇧ Enter</kbd>{' '}
                <span style={{ color: isDark ? '#475569' : '#94a3b8' }}>new line</span>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Toast ────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2, fontWeight: 600, fontSize: '0.82rem' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QuestionPage;
