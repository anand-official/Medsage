import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Avatar, TextField, Button, Grid,
    Paper, Divider, CircularProgress, Alert, MenuItem,
    Stack, Chip, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Autocomplete,
} from '@mui/material';
import {
    Edit as EditIcon,
    Logout as LogoutIcon,
    LocalFireDepartment as FireIcon,
    AutoAwesome as SparkleIcon,
    Timer as TimerIcon,
    DeleteForever as DeleteIcon,
    Warning as WarningIcon,
    Insights as InsightsIcon,
    CheckCircle as CheckIcon,
    TrendingUp as TrendIcon,
    Person as PersonIcon,
    Psychology as BrainIcon,
    School as SchoolIcon,
    Email as EmailIcon,
    LocationOn as LocationIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStudyContext } from '../contexts/StudyContext';
import { differenceInDays } from 'date-fns';
import collegesData from '../data/colleges.json';
import '../animations.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const YEARS = [
    { value: 1, label: '1st Year MBBS' },
    { value: 2, label: '2nd Year MBBS' },
    { value: 3, label: '3rd Year MBBS' },
    { value: 4, label: '4th Year MBBS' },
    { value: 5, label: 'Internship / PG' },
];
const COUNTRIES = ['India', 'Nepal', 'United States', 'United Kingdom', 'Australia', 'Singapore', 'Other'];

function detectCountryFromCollege(college) {
    if (!college) return null;
    if (college.includes('NMC Nepal') || college.includes('Nepal Medical Council')) return 'Nepal';
    return null;
}

// ─── AI Insights ──────────────────────────────────────────────────────────────
function generateInsights({ streak, progressPct, daysLeft, mbbs_year, planMode }) {
    const tips = [];
    const habits = [];

    if (streak === 0) {
        habits.push({ label: 'Consistency', value: 'Inactive', color: '#ef4444' });
        tips.push({ icon: '🔥', text: 'Start a 3-day streak this week. Consistent daily study builds long-term retention 3× faster than cramming.' });
    } else if (streak < 7) {
        habits.push({ label: 'Consistency', value: `${streak}-day streak`, color: '#f59e0b' });
        tips.push({ icon: '📅', text: `You're ${7 - streak} day${7 - streak !== 1 ? 's' : ''} away from a 1-week streak. Small daily actions compound into mastery.` });
    } else if (streak < 30) {
        habits.push({ label: 'Consistency', value: `${streak}-day streak`, color: '#22c55e' });
        tips.push({ icon: '🏆', text: `Strong ${streak}-day streak! 30-day streaks correlate with 2× higher exam scores.` });
    } else {
        habits.push({ label: 'Consistency', value: `${streak}d 🔥`, color: '#22c55e' });
        tips.push({ icon: '🌟', text: `Incredible ${streak}-day streak. You're in the top tier. Now focus on weak subjects.` });
    }

    if (progressPct !== null) {
        if (daysLeft !== null && daysLeft > 0) {
            const expected = daysLeft < 30 ? 80 : daysLeft < 60 ? 60 : 40;
            if (progressPct < expected - 20) {
                habits.push({ label: 'Study Pace', value: `${progressPct}% done`, color: '#f97316' });
                tips.push({ icon: '⚡', text: `With ${daysLeft} days left, your pace needs acceleration. Add 1 extra topic per day.` });
            } else {
                habits.push({ label: 'Study Pace', value: `${progressPct}% done`, color: '#22c55e' });
                if (progressPct >= expected) tips.push({ icon: '✅', text: `Ahead of schedule at ${progressPct}%! Use extra time for timed MCQ practice.` });
            }
        } else {
            habits.push({ label: 'Study Pace', value: `${progressPct}% done`, color: '#6366f1' });
        }
    }

    if (planMode === 'self_study') {
        habits.push({ label: 'Study Mode', value: 'Self Study', color: '#6366f1' });
        tips.push({ icon: '🧭', text: 'Your planner is in self-study mode. Use it to go deep on chosen chapters and build durable recall before expanding scope.' });
    } else if (daysLeft !== null && daysLeft < 14) {
        habits.push({ label: 'Exam Countdown', value: `${daysLeft}d left`, color: '#ef4444' });
        tips.push({ icon: '🚨', text: `${daysLeft} days to exam! Shift to pure high-yield revision: past papers, flashcards, weak topics only.` });
    } else if (daysLeft !== null && daysLeft < 30) {
        habits.push({ label: 'Exam Countdown', value: `${daysLeft}d left`, color: '#f59e0b' });
        tips.push({ icon: '📋', text: `${daysLeft} days to go — consolidation phase. Do timed MCQs daily and work your weak subject list.` });
    }

    const yearTips = {
        1: { icon: '🔬', text: 'Year 1: Build anatomy spatial understanding and biochemical pathway logic — these underpin everything in later years.' },
        2: { icon: '🦠', text: 'Year 2: Pathology is king. Master the "buzzword → diagnosis" pattern early.' },
        3: { icon: '💊', text: 'Year 3: For every drug/disease think: mechanism → presentation → management.' },
        4: { icon: '🩺', text: 'Year 4: Use the AI to generate comparison tables for similar clinical presentations.' },
        5: { icon: '📝', text: 'Internship: Build your SM-2 deck aggressively — NEET-PG rewards long-term retention.' },
    };
    if (mbbs_year && yearTips[mbbs_year]) tips.push(yearTips[mbbs_year]);

    return { habits, tips: tips.slice(0, 6) };
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = {
    indigo: '#6366f1',
    purple: '#a855f7',
    pink: '#ec4899',
    indigoDim: 'rgba(99,102,241,0.12)',
    purpleDim: 'rgba(168,85,247,0.12)',
    pinkDim: 'rgba(236,72,153,0.10)',
};

const GLASS = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(16px)',
};

// ─── Motion variants ──────────────────────────────────────────────────────────
const fadeUp = {
    hidden: { opacity: 0, y: 22 },
    visible: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.38, delay: i * 0.055, ease: [0.22, 1, 0.36, 1] },
    }),
};

const slideDown = {
    hidden: { opacity: 0, height: 0, overflow: 'hidden' },
    visible: { opacity: 1, height: 'auto', overflow: 'visible', transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, height: 0, overflow: 'hidden', transition: { duration: 0.22 } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlowBlob({ color, sx }) {
    return (
        <Box
            sx={{
                position: 'absolute',
                borderRadius: '50%',
                filter: 'blur(64px)',
                pointerEvents: 'none',
                background: color,
                ...sx,
            }}
        />
    );
}

function StatColumn({ icon, value, label, color, isLast }) {
    return (
        <Box
            sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.4,
                position: 'relative',
                '&:not(:last-child)::after': {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    top: '10%',
                    height: '80%',
                    width: '1px',
                    background: 'rgba(255,255,255,0.08)',
                },
            }}
        >
            <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
            <Typography
                sx={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    color,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {value}
            </Typography>
            <Typography
                sx={{
                    fontSize: '0.6rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.38)',
                }}
            >
                {label}
            </Typography>
        </Box>
    );
}

function FieldRow({ icon, fieldLabel, value, isLast }) {
    return (
        <Box>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1.75,
                    px: 0.5,
                    cursor: 'default',
                    transition: 'background 0.18s',
                    borderRadius: 2,
                    '&:hover': { background: 'rgba(255,255,255,0.03)' },
                }}
            >
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 1.5,
                        background: ACCENT.indigoDim,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: ACCENT.indigo,
                        flexShrink: 0,
                    }}
                >
                    {icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.3)',
                            mb: 0.3,
                        }}
                    >
                        {fieldLabel}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.925rem',
                            fontWeight: 500,
                            color: value ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.28)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {value || 'Not set'}
                    </Typography>
                </Box>
                <Box sx={{ color: 'rgba(255,255,255,0.18)', fontSize: '1rem', flexShrink: 0 }}>›</Box>
            </Box>
            {!isLast && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', ml: 6.5 }} />}
        </Box>
    );
}

function HabitRow({ habit, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.07, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    py: 1.1,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: habit.color,
                            flexShrink: 0,
                            boxShadow: `0 0 8px ${habit.color}80`,
                        }}
                    />
                    <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                        {habit.label}
                    </Typography>
                </Box>
                <Chip
                    label={habit.value}
                    size="small"
                    sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        background: `${habit.color}1a`,
                        color: habit.color,
                        border: `1px solid ${habit.color}40`,
                        '& .MuiChip-label': { px: 1.2 },
                    }}
                />
            </Box>
        </motion.div>
    );
}

function TipCard({ tip, index }) {
    const accentColors = [ACCENT.indigo, ACCENT.purple, ACCENT.pink, ACCENT.indigo, ACCENT.purple, ACCENT.pink];
    const accent = accentColors[index % accentColors.length];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, transition: { duration: 0.18 } }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    p: 1.75,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeft: `3px solid ${accent}`,
                    transition: 'box-shadow 0.2s, background 0.2s',
                    cursor: 'default',
                    '&:hover': {
                        background: 'rgba(255,255,255,0.04)',
                        boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px ${accent}22`,
                    },
                }}
            >
                <Typography sx={{ fontSize: '1.15rem', lineHeight: 1.4, flexShrink: 0, mt: 0.1 }}>
                    {tip.icon}
                </Typography>
                <Typography sx={{ fontSize: '0.835rem', color: 'rgba(255,255,255,0.68)', lineHeight: 1.65, fontWeight: 400 }}>
                    {tip.text}
                </Typography>
            </Box>
        </motion.div>
    );
}

// ─── Shared MUI sx overrides for dark inputs ──────────────────────────────────
const darkInput = {
    '& .MuiOutlinedInput-root': {
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 1.5,
        fontSize: '0.9rem',
        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
        '&.Mui-focused fieldset': { borderColor: ACCENT.indigo },
        '& input': { color: 'rgba(255,255,255,0.88)' },
        '& .MuiSelect-select': { color: 'rgba(255,255,255,0.88)' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.38)', fontSize: '0.85rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: ACCENT.indigo },
    '& .MuiAutocomplete-input': { color: 'rgba(255,255,255,0.88)' },
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { userProfile, updateOnboardingProfile, logout, deleteAccount } = useAuth();
    const { studyPlan, analyticsData, todayData, getStudyPlan, fetchAnalytics, fetchToday } = useStudyContext();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({ displayName: '', mbbs_year: '', college: '', country: 'India' });

    useEffect(() => {
        if (!userProfile || isEditing) return;
        setForm({
            displayName: userProfile.displayName || '',
            mbbs_year: userProfile.mbbs_year || '',
            college: userProfile.college || '',
            country: userProfile.country || 'India',
        });
    }, [isEditing, userProfile?.uid, userProfile?.displayName, userProfile?.mbbs_year, userProfile?.college, userProfile?.country]);

    useEffect(() => {
        if (!studyPlan) getStudyPlan();
        if (!analyticsData) fetchAnalytics();
        if (!todayData) fetchToday();
    }, []); // eslint-disable-line

    const handleField = (name) => (e) => { setForm(p => ({ ...p, [name]: e.target.value })); setError(''); setSuccess(''); };
    const handleCollege = (value) => {
        const college = value || '';
        const detected = detectCountryFromCollege(college);
        setForm(p => ({ ...p, college, country: detected ?? (p.country === 'Nepal' ? 'India' : p.country) }));
        setError(''); setSuccess('');
    };
    const cancelEdit = () => {
        setIsEditing(false);
        setForm({ displayName: userProfile?.displayName || '', mbbs_year: userProfile?.mbbs_year || '', college: userProfile?.college || '', country: userProfile?.country || 'India' });
        setError('');
    };
    const handleSave = async () => {
        try { setSaving(true); setError(''); setSuccess(''); await updateOnboardingProfile(form); setSuccess('Saved!'); setIsEditing(false); }
        catch (e) { setError(e.message || 'Failed to save'); }
        finally { setSaving(false); }
    };
    const handleLogout = async () => { try { await logout(); navigate('/signin'); } catch (e) { console.error(e); } };
    const handleDelete = async () => {
        if (deleteText !== 'DELETE') return;
        try { setDeleting(true); await deleteAccount(); navigate('/signin'); }
        catch (e) { setError(e.message || 'Failed'); setDeleteOpen(false); }
        finally { setDeleting(false); }
    };

    // Loading state
    if (!userProfile) return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
            <CircularProgress size={28} sx={{ color: ACCENT.indigo }} />
            <Typography color="text.secondary">Loading…</Typography>
        </Box>
    );

    // Computed metrics
    const streak = analyticsData?.streak?.current || 0;
    const progressTotal = studyPlan?.analytics?.total_tasks || 0;
    const progressDone = studyPlan?.analytics?.completed || 0;
    const progressPct = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : null;
    const planMode = studyPlan?.plan_mode || (studyPlan?.exam_date ? 'exam' : null);
    const daysLeft = planMode === 'exam' && studyPlan?.exam_date ? differenceInDays(new Date(studyPlan.exam_date), new Date()) : null;
    const { habits, tips } = useMemo(
        () => generateInsights({ streak, progressPct, daysLeft, mbbs_year: userProfile.mbbs_year, planMode }),
        [streak, progressPct, daysLeft, userProfile.mbbs_year, planMode]
    );
    const yearLabel = YEARS.find(y => y.value === userProfile.mbbs_year)?.label || `Year ${userProfile.mbbs_year || '?'}`;
    const STAT_ITEMS = [
        { icon: <FireIcon sx={{ fontSize: 22 }} />, value: `${streak}d`, label: 'Streak', color: '#f97316' },
        { icon: <TrendIcon sx={{ fontSize: 22 }} />, value: progressPct !== null ? `${progressPct}%` : '—', label: 'Progress', color: '#6366f1' },
        { icon: <SparkleIcon sx={{ fontSize: 22 }} />, value: progressDone > 0 ? `${progressDone}` : '—', label: 'Tasks Done', color: '#a855f7' },
        { icon: <TimerIcon sx={{ fontSize: 22 }} />, value: daysLeft !== null && daysLeft > 0 ? `${daysLeft}d` : '—', label: 'To Exam', color: daysLeft !== null && daysLeft < 14 ? '#ef4444' : daysLeft !== null && daysLeft < 30 ? '#f59e0b' : '#22c55e' },
    ];

    const collegeOptions = Array.isArray(collegesData) ? collegesData : [];
    const avatarLetter = (userProfile.displayName || userProfile.email || 'M')[0].toUpperCase();

    return (
        <Box
            component={motion.div}
            initial="hidden"
            animate="visible"
            sx={{
                minHeight: '100vh',
                background: '#080810',
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 3, md: 4 },
                maxWidth: 1200,
                mx: 'auto',
            }}
        >
            {/* ── Page heading ── */}
            <motion.div variants={fadeUp} custom={0}>
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1.5,
                            background: `linear-gradient(135deg, ${ACCENT.indigo}, ${ACCENT.purple})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <PersonIcon sx={{ fontSize: 17, color: '#fff' }} />
                    </Box>
                    <Box>
                        <Typography
                            sx={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.28)',
                            }}
                        >
                            Cortex
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: '1.25rem',
                                fontWeight: 800,
                                color: 'rgba(255,255,255,0.9)',
                                lineHeight: 1,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Command Center
                        </Typography>
                    </Box>
                </Box>
            </motion.div>

            {/* ── Hero Card ── */}
            <motion.div variants={fadeUp} custom={1}>
                <Box
                    sx={{
                        position: 'relative',
                        borderRadius: 3,
                        overflow: 'hidden',
                        mb: 3,
                        border: '1px solid rgba(255,255,255,0.07)',
                        background: 'linear-gradient(145deg, rgba(99,102,241,0.18) 0%, rgba(17,14,34,0.95) 40%, rgba(168,85,247,0.12) 100%)',
                        backdropFilter: 'blur(24px)',
                    }}
                >
                    {/* Glow blobs */}
                    <GlowBlob color={`${ACCENT.indigo}55`} sx={{ width: 320, height: 320, top: -100, left: -60, opacity: 0.7 }} />
                    <GlowBlob color={`${ACCENT.purple}40`} sx={{ width: 240, height: 240, top: -40, right: 80, opacity: 0.5 }} />
                    <GlowBlob color={`${ACCENT.pink}30`} sx={{ width: 180, height: 180, bottom: -60, right: -20, opacity: 0.45 }} />

                    <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 2.5, md: 4 }, pt: { xs: 3, md: 3.5 }, pb: 0 }}>
                        {/* Avatar + name row */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, md: 3 }, flexWrap: 'wrap' }}>
                            {/* Avatar with gradient ring */}
                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                <Box
                                    sx={{
                                        width: 108,
                                        height: 108,
                                        borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${ACCENT.indigo}, ${ACCENT.purple}, ${ACCENT.pink})`,
                                        p: '3px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Avatar
                                        src={userProfile.photoURL || undefined}
                                        sx={{
                                            width: 102,
                                            height: 102,
                                            fontSize: '2.4rem',
                                            fontWeight: 900,
                                            background: 'linear-gradient(135deg, #1e1b4b, #2e1065)',
                                            color: '#fff',
                                            border: '3px solid #080810',
                                        }}
                                    >
                                        {avatarLetter}
                                    </Avatar>
                                </Box>
                                {/* Online dot */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: 6,
                                        right: 6,
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        background: '#22c55e',
                                        border: '2.5px solid #080810',
                                        boxShadow: '0 0 8px #22c55e80',
                                    }}
                                />
                            </Box>

                            {/* Name + meta */}
                            <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.6 }}>
                                    <Typography
                                        sx={{
                                            fontSize: { xs: '1.5rem', md: '1.85rem' },
                                            fontWeight: 900,
                                            color: '#fff',
                                            letterSpacing: '-0.03em',
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        {userProfile.displayName || 'Student'}
                                    </Typography>
                                    <Chip
                                        label={yearLabel}
                                        size="small"
                                        sx={{
                                            height: 22,
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            background: `linear-gradient(90deg, ${ACCENT.indigo}33, ${ACCENT.purple}33)`,
                                            color: ACCENT.purple,
                                            border: `1px solid ${ACCENT.purple}50`,
                                            letterSpacing: '0.02em',
                                            '& .MuiChip-label': { px: 1.2 },
                                        }}
                                    />
                                </Box>

                                {/* Email / College / Country row */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0,
                                        flexWrap: 'wrap',
                                        color: 'rgba(255,255,255,0.4)',
                                        fontSize: '0.8rem',
                                        rowGap: 0.4,
                                    }}
                                >
                                    {userProfile.email && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 2 }}>
                                            <EmailIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }} />
                                            <Typography
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    color: 'rgba(255,255,255,0.42)',
                                                    maxWidth: 200,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {userProfile.email}
                                            </Typography>
                                        </Box>
                                    )}
                                    {userProfile.college && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 2 }}>
                                            <SchoolIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }} />
                                            <Typography
                                                sx={{
                                                    fontSize: '0.8rem',
                                                    color: 'rgba(255,255,255,0.42)',
                                                    maxWidth: 180,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {userProfile.college}
                                            </Typography>
                                        </Box>
                                    )}
                                    {userProfile.country && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <LocationIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }} />
                                            <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.42)' }}>
                                                {userProfile.country}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        {/* Stats row */}
                        <Box
                            sx={{
                                display: 'flex',
                                mt: 3,
                                pt: 2.5,
                                borderTop: '1px solid rgba(255,255,255,0.07)',
                            }}
                        >
                            {STAT_ITEMS.map((stat, i) => (
                                <StatColumn
                                    key={stat.label}
                                    icon={stat.icon}
                                    value={stat.value}
                                    label={stat.label}
                                    color={stat.color}
                                    isLast={i === STAT_ITEMS.length - 1}
                                />
                            ))}
                        </Box>
                    </Box>

                    {/* Bottom accent line */}
                    <Box
                        sx={{
                            height: 2,
                            background: `linear-gradient(90deg, ${ACCENT.indigo}, ${ACCENT.purple}, ${ACCENT.pink}, transparent)`,
                            opacity: 0.6,
                        }}
                    />
                </Box>
            </motion.div>

            {/* ── Two column layout ── */}
            <Grid container spacing={2.5} alignItems="flex-start">

                {/* ─── LEFT COLUMN: Profile Settings ─── */}
                <Grid item xs={12} md={5}>
                    <motion.div variants={fadeUp} custom={2}>
                        <Box
                            sx={{
                                borderRadius: 3,
                                border: GLASS.border,
                                background: GLASS.background,
                                backdropFilter: GLASS.backdropFilter,
                                overflow: 'hidden',
                            }}
                        >
                            {/* Section header */}
                            <Box
                                sx={{
                                    px: 2.5,
                                    pt: 2.5,
                                    pb: 1.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <PersonIcon sx={{ fontSize: 17, color: ACCENT.indigo }} />
                                    <Typography
                                        sx={{
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: 'rgba(255,255,255,0.5)',
                                        }}
                                    >
                                        Profile
                                    </Typography>
                                </Box>
                                {!isEditing && (
                                    <Button
                                        size="small"
                                        startIcon={<EditIcon sx={{ fontSize: '14px !important' }} />}
                                        onClick={() => setIsEditing(true)}
                                        sx={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: ACCENT.indigo,
                                            background: ACCENT.indigoDim,
                                            border: `1px solid ${ACCENT.indigo}30`,
                                            borderRadius: 1.5,
                                            px: 1.5,
                                            py: 0.5,
                                            textTransform: 'none',
                                            minWidth: 0,
                                            '&:hover': { background: `${ACCENT.indigo}25` },
                                        }}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </Box>

                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mx: 2.5 }} />

                            {/* View mode fields */}
                            <AnimatePresence mode="wait">
                                {!isEditing ? (
                                    <motion.div
                                        key="view"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        <Box sx={{ px: 2, pt: 1, pb: 1.5 }}>
                                            <FieldRow
                                                icon={<PersonIcon sx={{ fontSize: 17 }} />}
                                                fieldLabel="Full Name"
                                                value={userProfile.displayName}
                                            />
                                            <FieldRow
                                                icon={<SchoolIcon sx={{ fontSize: 17 }} />}
                                                fieldLabel="MBBS Year"
                                                value={yearLabel}
                                                isLast
                                            />
                                        </Box>
                                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mx: 2.5 }} />
                                        <Box sx={{ px: 2, pt: 1, pb: 1.5 }}>
                                            <FieldRow
                                                icon={<SchoolIcon sx={{ fontSize: 17 }} />}
                                                fieldLabel="College"
                                                value={userProfile.college}
                                            />
                                            <FieldRow
                                                icon={<LocationIcon sx={{ fontSize: 17 }} />}
                                                fieldLabel="Country"
                                                value={userProfile.country}
                                                isLast
                                            />
                                        </Box>
                                    </motion.div>
                                ) : (
                                    /* Edit mode */
                                    <motion.div
                                        key="edit"
                                        variants={slideDown}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                    >
                                        <Box sx={{ px: 2.5, pt: 2, pb: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <TextField
                                                label="Full Name"
                                                value={form.displayName}
                                                onChange={handleField('displayName')}
                                                fullWidth
                                                size="small"
                                                sx={darkInput}
                                                InputProps={{ startAdornment: <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'rgba(255,255,255,0.3)' }} /> }}
                                            />
                                            <TextField
                                                select
                                                label="MBBS Year"
                                                value={form.mbbs_year}
                                                onChange={handleField('mbbs_year')}
                                                fullWidth
                                                size="small"
                                                sx={{
                                                    ...darkInput,
                                                    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.4)' },
                                                }}
                                            >
                                                {YEARS.map(y => (
                                                    <MenuItem key={y.value} value={y.value} sx={{ fontSize: '0.88rem' }}>
                                                        {y.label}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                            <Autocomplete
                                                freeSolo
                                                options={collegeOptions}
                                                value={form.college}
                                                onInputChange={(_, v) => handleCollege(v)}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="College"
                                                        size="small"
                                                        sx={darkInput}
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            startAdornment: <SchoolIcon sx={{ fontSize: 16, mr: 1, color: 'rgba(255,255,255,0.3)' }} />,
                                                        }}
                                                    />
                                                )}
                                                PaperComponent={({ children, ...p }) => (
                                                    <Paper
                                                        {...p}
                                                        sx={{
                                                            background: '#13111f',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: 2,
                                                            mt: 0.5,
                                                            '& .MuiAutocomplete-option': {
                                                                fontSize: '0.85rem',
                                                                color: 'rgba(255,255,255,0.78)',
                                                                '&:hover': { background: ACCENT.indigoDim },
                                                            },
                                                        }}
                                                    >
                                                        {children}
                                                    </Paper>
                                                )}
                                            />
                                            <TextField
                                                select
                                                label="Country"
                                                value={form.country}
                                                onChange={handleField('country')}
                                                fullWidth
                                                size="small"
                                                sx={{
                                                    ...darkInput,
                                                    '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.4)' },
                                                }}
                                            >
                                                {COUNTRIES.map(c => (
                                                    <MenuItem key={c} value={c} sx={{ fontSize: '0.88rem' }}>
                                                        {c}
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            <AnimatePresence>
                                                {error && (
                                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                                        <Alert
                                                            severity="error"
                                                            sx={{
                                                                background: 'rgba(239,68,68,0.1)',
                                                                border: '1px solid rgba(239,68,68,0.25)',
                                                                color: '#fca5a5',
                                                                fontSize: '0.82rem',
                                                                '& .MuiAlert-icon': { color: '#ef4444' },
                                                            }}
                                                        >
                                                            {error}
                                                        </Alert>
                                                    </motion.div>
                                                )}
                                                {success && (
                                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                                        <Alert
                                                            severity="success"
                                                            sx={{
                                                                background: 'rgba(34,197,94,0.1)',
                                                                border: '1px solid rgba(34,197,94,0.25)',
                                                                color: '#86efac',
                                                                fontSize: '0.82rem',
                                                                '& .MuiAlert-icon': { color: '#22c55e' },
                                                            }}
                                                        >
                                                            {success}
                                                        </Alert>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                                <Button
                                                    variant="contained"
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    fullWidth
                                                    startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <CheckIcon sx={{ fontSize: '16px !important' }} />}
                                                    sx={{
                                                        background: `linear-gradient(90deg, ${ACCENT.indigo}, ${ACCENT.purple})`,
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        fontSize: '0.82rem',
                                                        textTransform: 'none',
                                                        borderRadius: 1.5,
                                                        py: 1,
                                                        boxShadow: `0 4px 20px ${ACCENT.indigo}50`,
                                                        '&:hover': {
                                                            background: `linear-gradient(90deg, #4f46e5, #9333ea)`,
                                                            boxShadow: `0 6px 28px ${ACCENT.indigo}70`,
                                                        },
                                                        '&:disabled': { opacity: 0.6 },
                                                    }}
                                                >
                                                    {saving ? 'Saving…' : 'Save Changes'}
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    onClick={cancelEdit}
                                                    disabled={saving}
                                                    sx={{
                                                        color: 'rgba(255,255,255,0.5)',
                                                        borderColor: 'rgba(255,255,255,0.12)',
                                                        fontWeight: 600,
                                                        fontSize: '0.82rem',
                                                        textTransform: 'none',
                                                        borderRadius: 1.5,
                                                        py: 1,
                                                        minWidth: 80,
                                                        '&:hover': {
                                                            borderColor: 'rgba(255,255,255,0.25)',
                                                            background: 'rgba(255,255,255,0.04)',
                                                        },
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </Box>
                                        </Box>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Box>
                    </motion.div>

                    {/* ── Account Actions ── */}
                    <motion.div variants={fadeUp} custom={3}>
                        <Box sx={{ mt: 2, display: 'flex', gap: 1.5 }}>
                            <Button
                                fullWidth
                                startIcon={<LogoutIcon sx={{ fontSize: '16px !important' }} />}
                                onClick={handleLogout}
                                sx={{
                                    color: 'rgba(255,255,255,0.5)',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 2,
                                    py: 1.25,
                                    fontWeight: 600,
                                    fontSize: '0.82rem',
                                    textTransform: 'none',
                                    '&:hover': {
                                        background: 'rgba(255,255,255,0.07)',
                                        color: 'rgba(255,255,255,0.75)',
                                    },
                                }}
                            >
                                Sign Out
                            </Button>
                        </Box>
                    </motion.div>

                    {/* ── Danger Zone ── */}
                    <motion.div variants={fadeUp} custom={4}>
                        <Box
                            sx={{
                                mt: 2,
                                p: 2,
                                borderRadius: 2,
                                border: '1px solid rgba(239,68,68,0.15)',
                                background: 'rgba(239,68,68,0.04)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                            }}
                        >
                            <Box>
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', mb: 0.2 }}>
                                    Delete Account
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.28)', lineHeight: 1.4 }}>
                                    Permanently removes all your data
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
                                onClick={() => setDeleteOpen(true)}
                                sx={{
                                    color: '#ef4444',
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: 1.5,
                                    px: 1.5,
                                    py: 0.75,
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    textTransform: 'none',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    '&:hover': { background: 'rgba(239,68,68,0.15)' },
                                }}
                            >
                                Delete
                            </Button>
                        </Box>
                    </motion.div>
                </Grid>

                {/* ─── RIGHT COLUMN: Study Intelligence ─── */}
                <Grid item xs={12} md={7}>

                    {/* ── Study DNA ── */}
                    <motion.div variants={fadeUp} custom={2}>
                        <Box
                            sx={{
                                borderRadius: 3,
                                border: GLASS.border,
                                background: GLASS.background,
                                backdropFilter: GLASS.backdropFilter,
                                mb: 2.5,
                                overflow: 'hidden',
                            }}
                        >
                            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <BrainIcon sx={{ fontSize: 17, color: ACCENT.purple }} />
                                    <Typography
                                        sx={{
                                            fontSize: '0.82rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: 'rgba(255,255,255,0.5)',
                                        }}
                                    >
                                        Study DNA
                                    </Typography>
                                </Box>
                                <Chip
                                    label="Live"
                                    size="small"
                                    sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.06em',
                                        background: 'rgba(34,197,94,0.12)',
                                        color: '#22c55e',
                                        border: '1px solid rgba(34,197,94,0.25)',
                                        '& .MuiChip-label': { px: 1 },
                                        '&::before': {
                                            content: '""',
                                            display: 'inline-block',
                                            width: 5,
                                            height: 5,
                                            borderRadius: '50%',
                                            background: '#22c55e',
                                            mr: 0.5,
                                        },
                                    }}
                                />
                            </Box>

                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mx: 2.5 }} />

                            <Box sx={{ px: 2.5, pt: 1.5, pb: habits.length > 0 && progressPct !== null ? 1.5 : 2.5 }}>
                                {habits.length === 0 ? (
                                    <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', py: 1 }}>
                                        Start studying to generate your DNA profile.
                                    </Typography>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        {habits.map((habit, i) => (
                                            <HabitRow key={habit.label} habit={habit} index={i} />
                                        ))}
                                    </Box>
                                )}

                                {progressPct !== null && (
                                    <Box sx={{ mt: 2, mb: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                Plan Progress
                                            </Typography>
                                            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: ACCENT.indigo }}>
                                                {progressDone} / {progressTotal} tasks
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={progressPct}
                                            sx={{
                                                height: 5,
                                                borderRadius: 99,
                                                background: 'rgba(255,255,255,0.06)',
                                                '& .MuiLinearProgress-bar': {
                                                    background: `linear-gradient(90deg, ${ACCENT.indigo}, ${ACCENT.purple})`,
                                                    borderRadius: 99,
                                                },
                                            }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </motion.div>

                    {/* ── AI Insights ── */}
                    <motion.div variants={fadeUp} custom={3}>
                        <Box
                            sx={{
                                borderRadius: 3,
                                border: GLASS.border,
                                background: GLASS.background,
                                backdropFilter: GLASS.backdropFilter,
                                overflow: 'hidden',
                            }}
                        >
                            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <InsightsIcon sx={{ fontSize: 17, color: ACCENT.pink }} />
                                <Typography
                                    sx={{
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.5)',
                                    }}
                                >
                                    AI Insights
                                </Typography>
                            </Box>

                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mx: 2.5 }} />

                            <Box sx={{ px: 2.5, pt: 2, pb: 2.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                {tips.length === 0 ? (
                                    <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>
                                        Complete your profile and start a study plan to unlock personalized insights.
                                    </Typography>
                                ) : (
                                    tips.map((tip, i) => (
                                        <TipCard key={i} tip={tip} index={i} />
                                    ))
                                )}
                            </Box>
                        </Box>
                    </motion.div>
                </Grid>
            </Grid>

            {/* ── Delete Account Dialog ── */}
            <Dialog
                open={deleteOpen}
                onClose={() => { setDeleteOpen(false); setDeleteText(''); }}
                PaperProps={{
                    sx: {
                        background: '#0e0c1a',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: { xs: '16px 16px 0 0', sm: 3 },
                        position: { xs: 'fixed', sm: 'relative' },
                        bottom: { xs: 0, sm: 'auto' },
                        left: { xs: 0, sm: 'auto' },
                        right: { xs: 0, sm: 'auto' },
                        m: { xs: 0, sm: 2 },
                        width: { xs: '100%', sm: 420 },
                        maxWidth: '100%',
                    },
                }}
                BackdropProps={{ sx: { background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' } }}
            >
                <DialogTitle sx={{ pt: 3, pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                            sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1.5,
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <WarningIcon sx={{ fontSize: 19, color: '#ef4444' }} />
                        </Box>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
                            Delete Account
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pb: 1 }}>
                    <DialogContentText sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, mb: 2.5 }}>
                        This will permanently delete your account, chat history, study plan, and all progress data. This action cannot be undone.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        label={`Type "DELETE" to confirm`}
                        value={deleteText}
                        onChange={(e) => setDeleteText(e.target.value)}
                        fullWidth
                        size="small"
                        sx={{
                            ...darkInput,
                            '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                                borderColor: '#ef4444',
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                                color: '#ef4444',
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1.5 }}>
                    <Button
                        onClick={() => { setDeleteOpen(false); setDeleteText(''); }}
                        sx={{
                            color: 'rgba(255,255,255,0.45)',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            textTransform: 'none',
                            '&:hover': { color: 'rgba(255,255,255,0.7)' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleDelete}
                        disabled={deleteText !== 'DELETE' || deleting}
                        startIcon={deleting ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <DeleteIcon sx={{ fontSize: '15px !important' }} />}
                        sx={{
                            background: '#ef4444',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            textTransform: 'none',
                            borderRadius: 1.5,
                            px: 2.5,
                            py: 1,
                            '&:hover': { background: '#dc2626', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' },
                            '&:disabled': { background: 'rgba(239,68,68,0.3)', color: 'rgba(255,255,255,0.4)' },
                        }}
                    >
                        {deleting ? 'Deleting…' : 'Delete My Account'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
