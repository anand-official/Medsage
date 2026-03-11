import React, { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  Box, Typography, TextField, Button, Paper, CircularProgress,
  Chip, useTheme, IconButton, Avatar, Stack, Tooltip, Divider,
  Skeleton, Snackbar, Alert,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  LibraryBooks as LibraryIcon,
  BookmarkBorder as BookmarkIcon,
  ContentCopy as CopyIcon,
  DeleteOutline as ClearIcon,
  EmojiObjects as IdeaIcon,
  Science as ScienceIcon,
  Biotech as BiotechIcon,
  FavoriteBorder as HeartIcon,
  MedicationOutlined as MedIcon,
  HealthAndSafety as SafetyIcon,
  AttachFile as AttachIcon,
  Close as CloseIcon,
  ImageSearch as ImageIcon,
  VolumeUp as VolumeUpIcon,
  Stop as StopIcon,
  Mic as MicIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchMedicalQuery } from '../services/api';
import '../animations.css';

// ─── Professor personas by topic ─────────────────────────────────────────────
const PROFESSORS = {
  anatomy: { name: 'Anatomy Professor', specialty: '🫀 Anatomy', color: '#6366f1' },
  physiology: { name: 'Physiology Professor', specialty: '⚡ Physiology', color: '#0ea5e9' },
  biochemistry: { name: 'Biochemistry Professor', specialty: '🧬 Biochemistry', color: '#10b981' },
  pathology: { name: 'Pathology Professor', specialty: '🔬 Pathology', color: '#ef4444' },
  pharmacology: { name: 'Pharmacology Professor', specialty: '💊 Pharmacology', color: '#f59e0b' },
  microbiology: { name: 'Microbiology Professor', specialty: '🦠 Microbiology', color: '#84cc16' },
  surgery: { name: 'Surgery Professor', specialty: '🩺 Surgery', color: '#e11d48' },
  medicine: { name: 'Medicine Professor', specialty: '🏥 Medicine', color: '#f97316' },
  forensic: { name: 'Forensic Professor', specialty: '⚖️ Forensic Med', color: '#64748b' },
  community: { name: 'Community Med Professor', specialty: '🌍 Community Med', color: '#22c55e' },
  psychiatry: { name: 'Psychiatry Professor', specialty: '🧠 Psychiatry', color: '#c084fc' },
  radiology: { name: 'Radiology Professor', specialty: '📡 Radiology', color: '#38bdf8' },
  default: { name: 'Medsage AI', specialty: '🤖 AI Assistant', color: '#6366f1' },
};

function getProfessor(topicId, text = '') {
  const id = (topicId || '').toLowerCase();
  const content = text.toLowerCase();

  const matches = (keywords) => keywords.some(k => id.includes(k) || content.includes(k));

  if (matches(['anat', 'blood supply', 'triangle', 'sinus', 'nerve'])) return PROFESSORS.anatomy;
  if (matches(['physio', 'cardiac cycle', 'action potential', 'gfr', 'mechanism'])) return PROFESSORS.physiology;
  if (matches(['biochem', 'enzyme', 'metabolism', 'pathway', 'vitamin'])) return PROFESSORS.biochemistry;
  if (matches(['path', 'necrosis', 'infarction', 'oedema', 'edema', 'inflammation', 'tumor', 'cancer'])) return PROFESSORS.pathology;
  if (matches(['pharma', 'drug', 'blocker', 'penicillin', 'antibiotic', 'receptor', 'dose'])) return PROFESSORS.pharmacology;
  if (matches(['micro', 'bact', 'virus', 'infection', 'fungus', 'parasite'])) return PROFESSORS.microbiology;
  if (matches(['surg', 'appendicitis', 'hernia', 'operation', 'incision'])) return PROFESSORS.surgery;
  if (matches(['med', 'cardio', 'resp', 'gastro', 'nephro', 'diabetes', 'hypertension', 'disease', 'syndrome'])) return PROFESSORS.medicine;
  if (matches(['forensic', 'autopsy', 'injury', 'death'])) return PROFESSORS.forensic;
  if (matches(['community', 'psm', 'epidemiology', 'vaccine', 'public health'])) return PROFESSORS.community;
  if (matches(['psych', 'schizophrenia', 'depression', 'bipolar', 'anxiety'])) return PROFESSORS.psychiatry;
  if (matches(['radio', 'x-ray', 'mri', 'ct scan', 'ultrasound', 'imaging'])) return PROFESSORS.radiology;

  return PROFESSORS.default;
}

// ─── Categorised Quick Prompts ────────────────────────────────────────────────
const PROMPT_CATEGORIES = [
  {
    label: 'Anatomy', icon: <BiotechIcon sx={{ fontSize: 14 }} />,
    prompts: ['Blood supply of the heart', 'Boundaries of the femoral triangle', 'Contents of the cavernous sinus'],
  },
  {
    label: 'Physiology', icon: <HeartIcon sx={{ fontSize: 14 }} />,
    prompts: ['Cardiac cycle phases', 'Mechanism of action potential', 'Regulation of GFR'],
  },
  {
    label: 'Pathology', icon: <ScienceIcon sx={{ fontSize: 14 }} />,
    prompts: ['Pathophysiology of myocardial infarction', 'Types of necrosis with examples', 'Mechanism of oedema formation'],
  },
  {
    label: 'Pharmacology', icon: <MedIcon sx={{ fontSize: 14 }} />,
    prompts: ['Beta blocker mechanism and uses', 'Penicillin mechanism of action', 'Drugs used in heart failure'],
  },
  {
    label: 'Clinical', icon: <SafetyIcon sx={{ fontSize: 14 }} />,
    prompts: ['Clinical features of DKA', 'Signs of raised intracranial pressure', 'Approach to chest pain'],
  },
];

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────
function inlineFormat(text) {
  // First apply markdown formatting
  const formatted = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.12);padding:1px 5px;border-radius:4px;font-size:0.88em">$1</code>');

  // Sanitize to prevent XSS from AI-generated content
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['strong', 'em', 'code'],
    ALLOWED_ATTR: ['style']
  });
}

function renderMarkdown(text, isDark) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <Box key={`list-${key++}`} component="ul" sx={{ pl: 2.5, mt: 0.5, mb: 1.5 }}>
          {listItems.map((item, i) => (
            <Box key={i} component="li" sx={{ fontSize: '0.97rem', lineHeight: 1.75, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.82)', mb: 0.25 }}
              dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </Box>
      );
      listItems = [];
    }
  };

  lines.forEach((line) => {
    if (!line.trim()) { flushList(); elements.push(<Box key={`gap-${key++}`} sx={{ height: 6 }} />); return; }
    if (line.startsWith('## ') || line.startsWith('### ')) {
      flushList();
      const isH2 = line.startsWith('## ');
      const content = line.replace(/^#{2,3}\s/, '');
      elements.push(<Typography key={`h-${key++}`} variant={isH2 ? 'subtitle1' : 'body1'} sx={{ fontWeight: 700, mt: 2, mb: 0.5, color: isDark ? '#a5b4fc' : '#4f46e5', fontSize: isH2 ? '1rem' : '0.95rem' }} dangerouslySetInnerHTML={{ __html: inlineFormat(content) }} />);
      return;
    }
    if (line.match(/^[-•*]\s/)) { listItems.push(line.replace(/^[-•*]\s/, '')); return; }
    if (line.match(/^\d+\.\s/)) { listItems.push(line.replace(/^\d+\.\s/, '')); return; }
    flushList();
    elements.push(<Typography key={`p-${key++}`} variant="body1" sx={{ fontSize: '0.97rem', lineHeight: 1.78, mb: 0.5, color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.82)' }} dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />);
  });
  flushList();
  return elements;
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function ResponseSkeleton({ isDark }) {
  const bg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: bg }} />
        <Skeleton variant="text" width={160} height={20} sx={{ bgcolor: bg }} />
      </Stack>
      {[100, 80, 95, 60].map((w, i) => <Skeleton key={i} variant="text" width={`${w}%`} height={18} sx={{ bgcolor: bg, mb: 0.5 }} />)}
      <Skeleton variant="rounded" width="100%" height={72} sx={{ bgcolor: bg, mt: 2 }} />
    </Box>
  );
}

// ─── AI Message Card ──────────────────────────────────────────────────────────
function AIMessage({ msg, mode, isDark, onCopy }) {
  const { response, topicId } = msg;
  const professor = getProfessor(topicId, response.text);
  const sectionLabel = mode === 'exam' ? '⚡ High-Yield Points' : '🔬 Technical Pearls';
  const clinicalLabel = mode === 'exam' ? 'Exam Tips' : 'Clinical Correlation';

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (isSpeaking) window.speechSynthesis.cancel();
    }
  }, [isSpeaking]);

  const toggleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const cleanText = (response.text || '').replace(/[*#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}>
      <Paper elevation={0} sx={{
        borderRadius: 4, overflow: 'hidden', mb: 5,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        background: isDark ? 'rgba(22,28,48,0.85)' : '#ffffff',
        boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.4)' : '0 12px 36px rgba(15, 23, 42, 0.08)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header */}
        <Box sx={{
          px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
          background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
        }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 40, height: 40, background: `linear-gradient(135deg, ${professor.color}, ${professor.color}CC)`, fontSize: 17, boxShadow: `0 4px 12px ${professor.color}50` }}>
              {professor.name.charAt(0)}
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: isDark ? '#f1f5f9' : '#0f172a', fontSize: '0.95rem' }}>
                  {professor.name}
                </Typography>
                <Chip label={professor.specialty} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: isDark ? `${professor.color}25` : `${professor.color}15`, color: professor.color, border: `1px solid ${professor.color}30` }} />
              </Stack>
              {msg.timestamp && <Typography variant="caption" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>{msg.timestamp}</Typography>}
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={isSpeaking ? "Stop reading" : "Read aloud"}>
              <IconButton size="small" onClick={toggleSpeak} sx={{ color: isSpeaking ? '#ef4444' : (isDark ? '#cbd5e1' : '#64748b'), '&:hover': { background: isSpeaking ? 'rgba(239,68,68,0.1)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') } }}>
                {isSpeaking ? <StopIcon sx={{ fontSize: 18 }} /> : <VolumeUpIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy answer">
              <IconButton size="small" onClick={() => onCopy(response.text)} sx={{ color: isDark ? '#cbd5e1' : '#64748b', '&:hover': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' } }}>
                <CopyIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Body */}
        <Box sx={{ px: 3, py: 3.5 }}>
          <Box sx={{ mb: response.keyPoints?.length ? 3.5 : 0, color: isDark ? '#e2e8f0' : '#334155' }}>
            {renderMarkdown(response.text, isDark)}
          </Box>

          {response.keyPoints?.length > 0 && (
            <Box sx={{ mb: 3.5 }}>
              <Typography variant="overline" sx={{ color: professor.color, fontWeight: 800, letterSpacing: 1.5, display: 'block', mb: 2 }}>
                {sectionLabel}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                {response.keyPoints.map((point, i) => (
                  <Box key={i} sx={{ p: 2.5, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`, transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: isDark ? '0 6px 16px rgba(0,0,0,0.3)' : '0 6px 16px rgba(0,0,0,0.06)' } }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: isDark ? '#e2e8f0' : '#475569', fontSize: '0.9rem', fontWeight: 500 }}>{point}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {response.clinicalRelevance && (
            <Box sx={{ p: 3, borderRadius: 4, mb: response.bookReferences?.length ? 3.5 : 0, background: isDark ? `linear-gradient(135deg, ${professor.color}15, ${professor.color}05)` : `linear-gradient(135deg, ${professor.color}10, ${professor.color}02)`, border: `1px solid ${professor.color}25` }}>
              <Typography variant="overline" sx={{ color: professor.color, fontWeight: 800, letterSpacing: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5, fontSize: '0.75rem' }}>
                {clinicalLabel}
              </Typography>
              <Box sx={{ color: isDark ? '#e2e8f0' : '#334155' }}>{renderMarkdown(response.clinicalRelevance, isDark)}</Box>
            </Box>
          )}

          {response.bookReferences?.length > 0 && (
            <Box>
              <Divider sx={{ mb: 2, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
              <Typography variant="overline" sx={{ color: isDark ? '#64748b' : '#94a3b8', fontWeight: 800, letterSpacing: 1.5, display: 'block', mb: 1.5, fontSize: '0.68rem' }}>
                📚 Academic Citations
              </Typography>
              <Stack spacing={0.75}>
                {response.bookReferences.map((ref, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, color: isDark ? '#94a3b8' : '#64748b' }}>
                    <BookmarkIcon sx={{ fontSize: 15, mt: 0.2, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontSize: '0.82rem', lineHeight: 1.5, fontWeight: 500 }}>
                      {typeof ref === 'string' ? ref : `${ref.book}${ref.chapter ? ` · Chapter ${ref.chapter}` : ''}${ref.page ? ` · p.${ref.page}` : ''}`}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Paper>
    </motion.div>
  );
}

// ─── User Message Bubble ──────────────────────────────────────────────────────
function UserMessage({ msg, isDark }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
        <Box sx={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          {msg.imageSrc && (
            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Box component="img" src={msg.imageSrc} alt="Uploaded" sx={{ maxWidth: 240, maxHeight: 180, borderRadius: 3, border: `2px solid ${isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.3)'}`, boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 6px 16px rgba(99,102,241,0.2)', objectFit: 'cover' }} />
            </Box>
          )}
          <Box sx={{ px: 3, py: 2, borderRadius: '24px 24px 6px 24px', background: isDark ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#ffffff', boxShadow: isDark ? '0 10px 24px rgba(79, 70, 229, 0.25)' : '0 10px 24px rgba(99, 102, 241, 0.3)' }}>
            <Typography variant="body1" sx={{ fontSize: '0.98rem', lineHeight: 1.65, fontWeight: 500, letterSpacing: 0.3, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{msg.text}</Typography>
          </Box>
          {msg.timestamp && (
            <Typography variant="caption" sx={{ mt: 1, color: isDark ? '#64748b' : '#94a3b8', fontSize: '0.72rem', fontWeight: 600, mr: 1.5 }}>
              {msg.timestamp}
            </Typography>
          )}
        </Box>
      </Box>
    </motion.div>
  );
}

// ─── Welcome State ────────────────────────────────────────────────────────────
function WelcomeState({ isDark, activeCategory, setActiveCategory, setQuestion }) {
  const activePrompts = PROMPT_CATEGORIES.find(c => c.label === activeCategory)?.prompts || [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
      <Box sx={{ textAlign: 'center', pt: { xs: 4, md: 8 }, pb: 4, position: 'relative' }}>
        {/* Animated ambient glow behind hero */}
        <Box sx={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: 300, height: 300, background: isDark ? 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', zIndex: -1, pointerEvents: 'none' }} />

        <Box sx={{ width: 80, height: 80, mx: 'auto', mb: 3.5, borderRadius: '24px', background: isDark ? 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.2) 100%)' : 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`, boxShadow: isDark ? '0 12px 40px rgba(99,102,241,0.15)' : '0 12px 40px rgba(99,102,241,0.1)' }}>
          <IdeaIcon sx={{ fontSize: 40, color: isDark ? '#a5b4fc' : '#6366f1' }} />
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1.5, fontSize: { xs: '1.75rem', md: '2.25rem' }, letterSpacing: '-0.5px', background: isDark ? 'linear-gradient(180deg, #fff 0%, #a5b4fc 100%)' : 'linear-gradient(180deg, #0f172a 0%, #4f46e5 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          What would you like to study?
        </Typography>
        <Typography variant="body1" sx={{ mb: 5, maxWidth: 540, mx: 'auto', lineHeight: 1.7, color: isDark ? '#94a3b8' : '#64748b', fontSize: '1.05rem' }}>
          Ask complex medical questions, upload cases, or explore specific subjects with your personal neural professor panel.
        </Typography>

        {/* Category tabs */}
        <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" sx={{ mb: 4, gap: 1.5 }}>
          {PROMPT_CATEGORIES.map((cat) => (
            <Chip key={cat.label} label={cat.label} icon={cat.icon} onClick={() => setActiveCategory(cat.label)}
              sx={{ fontWeight: 700, fontSize: '0.85rem', px: 1, py: 2, height: 40, borderRadius: 3, bgcolor: activeCategory === cat.label ? (isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), color: activeCategory === cat.label ? (isDark ? '#a5b4fc' : '#4f46e5') : (isDark ? '#94a3b8' : '#64748b'), border: `1px solid ${activeCategory === cat.label ? (isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)') : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { bgcolor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', transform: 'translateY(-1px)', color: isDark ? '#c7d2fe' : '#4338ca' } }}
            />
          ))}
        </Stack>

        <AnimatePresence mode="wait">
          <motion.div key={activeCategory} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, staggerChildren: 0.1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, px: 2, maxWidth: 860, mx: 'auto' }}>
              {activePrompts.map((prompt, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.4, ease: 'easeOut' }}>
                  <Paper onClick={() => setQuestion(prompt)} elevation={0}
                    sx={{ p: 2.5, borderRadius: 4, cursor: 'pointer', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, background: isDark ? 'rgba(30,41,59,0.5)' : '#ffffff', minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', '&:hover': { background: isDark ? 'rgba(30,41,59,0.9)' : '#f8fafc', transform: 'translateY(-4px)', border: `1px solid ${isDark ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.4)'}`, boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)' : '0 12px 30px rgba(99,102,241,0.1), 0 0 0 1px rgba(99,102,241,0.1)', '& .arrow-icon': { opacity: 1, transform: 'translateX(0)' } } }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: isDark ? '#e2e8f0' : '#334155', lineHeight: 1.6, textAlign: 'left', pr: 2 }}>
                      {prompt}
                    </Typography>
                    <Box className="arrow-icon" sx={{ opacity: 0, transform: 'translateX(-10px)', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', color: isDark ? '#818cf8' : '#4f46e5', display: 'flex' }}>
                      <SendIcon sx={{ fontSize: 16 }} />
                    </Box>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </motion.div>
        </AnimatePresence>
      </Box>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const QuestionPage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const location = useLocation();
  const navigate = useNavigate();

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('conceptual');
  const [messages, setMessages] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Anatomy');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [attachedImage, setAttachedImage] = useState(null); // { dataUrl, name }
  const [isListening, setIsListening] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTrans += event.results[i][0].transcript;
        }
        if (finalTrans) {
          setQuestion(prev => prev + (prev.endsWith(' ') ? '' : ' ') + finalTrans);
        }
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSnackbar({ open: true, message: 'Microphone access denied. Please allow mic permissions.' });
        }
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try { recognitionRef.current?.start(); setIsListening(true); } catch (e) { }
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Build history array from current messages for context
  const buildHistory = useCallback(() => {
    return messages
      .filter(m => m.role === 'user' || m.role === 'ai')
      .slice(-10) // last 10 turns max (5 exchanges)
      .map(m => ({
        role: m.role,
        content: m.role === 'user' ? m.text : (m.response?.text || ''),
      }))
      .filter(m => m.content.trim());
  }, [messages]);

  const handleSubmit = useCallback(async (queryText) => {
    const q = (typeof queryText === 'string' ? queryText : question).trim();
    if (!q && !attachedImage) return;

    const displayText = q || '(Image attached)';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const history = buildHistory();
    const imageDataUrl = attachedImage?.dataUrl || null;

    setMessages(prev => [...prev, { role: 'user', text: displayText, imageSrc: imageDataUrl, timestamp }]);
    setQuestion('');
    setAttachedImage(null);
    setLoading(true);

    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      const result = await fetchMedicalQuery(
        q || 'Describe this image', mode, 'Indian MBBS', history, imageDataUrl, abortControllerRef.current.signal
      );

      const raw = result?.data ?? result;
      const responseData = {
        text: raw?.text || raw?.answer || raw?.short_note || 'No response text available.',
        keyPoints: raw?.keyPoints || raw?.high_yield_summary || raw?.key_bullets || [],
        clinicalRelevance: raw?.clinicalRelevance || raw?.clinical_correlation || raw?.exam_tips || '',
        bookReferences: raw?.bookReferences || raw?.citations || [],
      };

      setMessages(prev => [...prev, {
        role: 'ai',
        response: responseData,
        topicId: raw?.topicId || raw?.meta?.topic_id || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        console.log('Query aborted via New Chat');
        return;
      }
      setMessages(prev => [...prev, {
        role: 'error',
        text: err.message || 'Failed to get a response. Is the backend running?',
        timestamp,
      }]);
    } finally {
      setIsListening(false);
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [question, mode, attachedImage, buildHistory, activeCategory]);

  useEffect(() => {
    if (location.state?.initialQuery) {
      const query = location.state.initialQuery;
      // Clear the state so it doesn't fire again on reload
      navigate(location.pathname, { replace: true, state: {} });
      // Fire the query immediately
      handleSubmit(query);
    }
  }, [location.state, navigate, location.pathname, handleSubmit]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text || '').then(() => setSnackbar({ open: true, message: 'Answer copied to clipboard!' }));
  };

  const handleClear = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([]);
    setQuestion('');
    setAttachedImage(null);
    inputRef.current?.focus();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side image compression via Canvas
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800; // Safe threshold for LLM Vision API limits and latency

        if (width > height && width > maxDim) {
          height = Math.floor(height * (maxDim / width));
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.floor(width * (maxDim / height));
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85); // 85% JPEG quality
        setAttachedImage({ dataUrl: compressedDataUrl, name: file.name });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const hasMessages = messages.length > 0;

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>

      {/* ── Page Header ──────────────────────────────────────────── */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, pt: 2 }} className="reveal-down">
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-1px', background: 'linear-gradient(90deg, #6366f1, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            Neural Consultation
          </Typography>
          <Typography variant="body2" color="text.secondary">Query your personal professor panel for instant medical insights.</Typography>
        </Box>
      </Box>

      {/* Floating New Chat FAB */}
      <AnimatePresence>
        {hasMessages && (
          <motion.div initial={{ opacity: 0, scale: 0.8, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} style={{ position: 'fixed', bottom: 120, right: 32, zIndex: 100 }}>
            <Tooltip title="Clear session & start new chat" placement="left">
              <Button onClick={handleClear} variant="contained"
                sx={{ borderRadius: '50%', minWidth: 0, width: 56, height: 56, p: 0, background: isDark ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'linear-gradient(135deg, #f87171, #dc2626)', color: '#fff', boxShadow: '0 8px 32px rgba(239,68,68,0.4)', '&:hover': { background: isDark ? '#dc2626' : '#b91c1c', transform: 'translateY(-4px) scale(1.05)', boxShadow: '0 12px 40px rgba(239,68,68,0.5)' }, transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
                <ClearIcon sx={{ fontSize: 24 }} />
              </Button>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat history / Welcome ────────────────────────────────── */}
      <Box sx={{ flex: 1, mb: 3 }}>
        {!hasMessages ? (
          <WelcomeState isDark={isDark} activeCategory={activeCategory} setActiveCategory={setActiveCategory} setQuestion={setQuestion} />
        ) : (
          <Box>
            {messages.map((msg, i) => {
              if (msg.role === 'user') return <UserMessage key={i} msg={msg} isDark={isDark} />;
              if (msg.role === 'error') return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(239,68,68,0.2)', background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.05)', borderLeft: '4px solid #ef4444' }}>
                    <Typography color="error" variant="body2" fontWeight={600}>{msg.text}</Typography>
                  </Paper>
                </motion.div>
              );
              return <AIMessage key={i} msg={msg} mode={mode} isDark={isDark} onCopy={handleCopy} />;
            })}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.15)'}`, background: isDark ? 'rgba(22,28,48,0.7)' : 'rgba(248,249,255,0.95)', mb: 3 }}>
                  <ResponseSkeleton isDark={isDark} />
                </Paper>
              </motion.div>
            )}
          </Box>
        )}
        <div style={{ height: 160 }} /> {/* Spacer to ensure scroll padding */}
        <div ref={bottomRef} style={{ height: 1 }} /> {/* Actual target for scrollIntoView */}
      </Box>
      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, pb: 4, pt: 8, px: 2, zIndex: 10, pointerEvents: 'none', background: isDark ? 'linear-gradient(to top, rgba(15,23,42,1) 0%, rgba(15,23,42,0.8) 50%, rgba(15,23,42,0) 100%)' : 'linear-gradient(to top, rgba(248,250,252,1) 0%, rgba(248,250,252,0.8) 50%, rgba(248,250,252,0) 100%)' }} className="reveal-up stagger-2">
        <Box sx={{ maxWidth: 860, mx: 'auto', pointerEvents: 'auto' }}>

          {/* Image preview strip */}
          {attachedImage && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 1 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <Box component="img" src={attachedImage.dataUrl} alt="attached" sx={{ width: 64, height: 64, borderRadius: 2, objectFit: 'cover', border: `2px solid rgba(99,102,241,0.4)` }} />
                  <IconButton size="small" onClick={() => setAttachedImage(null)} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#ef4444', color: '#fff', width: 20, height: 20, '&:hover': { bgcolor: '#dc2626' } }}>
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {attachedImage.name}
                </Typography>
              </Box>
            </motion.div>
          )}

          <Paper elevation={0} sx={{
            borderRadius: 6,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`,
            background: isDark ? 'rgba(30,41,59,0.85)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px)',
            boxShadow: isDark ? '0 20px 48px rgba(0,0,0,0.6)' : '0 20px 48px rgba(15,23,42,0.12)',
            transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            '&:focus-within': { borderColor: isDark ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.5)', boxShadow: isDark ? '0 20px 48px rgba(99,102,241,0.2)' : '0 20px 48px rgba(99,102,241,0.2)' },
          }}>
            {/* Text row */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', px: 2, pt: 1.5, pb: 0.5, gap: 1.5 }}>
              {/* File attach & Mic */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, flexShrink: 0 }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                <Tooltip title="Attach image">
                  <IconButton size="small" onClick={() => fileInputRef.current?.click()}
                    sx={{ color: isDark ? '#64748b' : '#94a3b8', '&:hover': { color: isDark ? '#a5b4fc' : '#6366f1' } }}>
                    <AttachIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={isListening ? "Stop listening" : "Voice dictation"}>
                  <IconButton size="small" onClick={toggleListen}
                    sx={{ color: isListening ? '#ef4444' : (isDark ? '#64748b' : '#94a3b8'), '&:hover': { color: isListening ? '#dc2626' : (isDark ? '#a5b4fc' : '#6366f1') } }}>
                    {isListening ? <StopIcon sx={{ fontSize: 20 }} /> : <MicIcon sx={{ fontSize: 20 }} />}
                  </IconButton>
                </Tooltip>
              </Box>

              <TextField
                inputRef={inputRef}
                fullWidth multiline maxRows={5}
                variant="standard"
                placeholder={attachedImage ? 'Ask about this image, or just send it…' : 'Ask your professor anything…'}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyPress}
                InputProps={{
                  disableUnderline: true,
                  sx: { fontSize: '1rem', fontWeight: 500, py: 0.5, lineHeight: 1.6, color: 'text.primary' },
                }}
              />

              {/* Send */}
              <Tooltip title="Send (Enter)">
                <span>
                  <IconButton onClick={() => handleSubmit()} disabled={loading || (!question.trim() && !attachedImage)}
                    sx={{ width: 42, height: 42, borderRadius: 2.5, flexShrink: 0, mb: 0.25, background: loading || (!question.trim() && !attachedImage) ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', transition: 'all 0.2s', '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' } }}>
                    {loading ? <CircularProgress size={17} sx={{ color: isDark ? '#64748b' : '#94a3b8' }} /> : <SendIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            {/* Toolbar row — mode toggle + hints */}
            <Box sx={{ px: 2, pb: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              {/* Mode toggle inline */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ display: 'flex', borderRadius: 2, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                  {[{ val: 'conceptual', label: 'Conceptual', icon: <PsychologyIcon sx={{ fontSize: 14 }} /> }, { val: 'exam', label: 'Exam', icon: <LibraryIcon sx={{ fontSize: 14 }} /> }].map(({ val, label, icon }) => (
                    <Button key={val} size="small" startIcon={icon} onClick={() => setMode(val)}
                      disableElevation disableRipple
                      sx={{ px: 1.5, py: 0.5, borderRadius: 0, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', minHeight: 28, bgcolor: mode === val ? (isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.12)') : 'transparent', color: mode === val ? (isDark ? '#a5b4fc' : '#4f46e5') : 'text.secondary', transition: 'all 0.15s' }}>
                      {label}
                    </Button>
                  ))}
                </Box>
                {attachedImage && (
                  <Chip icon={<ImageIcon sx={{ fontSize: 12 }} />} label="Image attached" size="small" sx={{ height: 22, fontSize: '0.7rem', bgcolor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', color: isDark ? '#a5b4fc' : '#4f46e5' }} />
                )}
              </Box>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                <kbd style={{ padding: '1px 4px', borderRadius: 3, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, fontSize: '0.68rem' }}>Enter</kbd> send ·{' '}
                <kbd style={{ padding: '1px 4px', borderRadius: 3, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`, fontSize: '0.68rem' }}>⇧ Enter</kbd> new line
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Hidden file input */}
      <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ open: false, message: '' })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default QuestionPage;
