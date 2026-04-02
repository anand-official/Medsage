import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Avatar, TextField, Button, Grid,
    Divider, CircularProgress, Alert, MenuItem,
    Stack, Chip, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Autocomplete, Paper,
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
    ArrowForward as ArrowIcon,
    MenuBook as BookIcon,
    Replay as ReviewIcon,
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

// MBBS journey phases — the macro view of a student's career
const PHASES = [
    { label: 'Pre-Clinical', years: [1, 2], color: '#6366f1' },
    { label: 'Clinical',     years: [3, 4], color: '#a855f7' },
    { label: 'Internship',   years: [5],    color: '#22c55e' },
];

function getPhase(year) {
    return PHASES.find(p => p.years.includes(year)) || PHASES[0];
}

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
const T = {
    bg:           '#07080f',
    surface:      'rgba(255,255,255,0.028)',
    surfaceHov:   'rgba(255,255,255,0.045)',
    border:       'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.13)',
    text:         'rgba(255,255,255,0.90)',
    sub:          'rgba(255,255,255,0.52)',
    muted:        'rgba(255,255,255,0.28)',
    indigo:       '#6366f1',
    purple:       '#a855f7',
    pink:         '#ec4899',
    green:        '#22c55e',
    orange:       '#f97316',
    amber:        '#f59e0b',
    red:          '#ef4444',
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1.5,
        background: 'rgba(255,255,255,0.035)',
        fontSize: '0.875rem',
        color: T.text,
        '& fieldset': { borderColor: T.border },
        '&:hover fieldset': { borderColor: T.borderStrong },
        '&.Mui-focused fieldset': { borderColor: T.indigo },
        '& .MuiSelect-select': { color: T.text },
    },
    '& .MuiInputLabel-root': { color: T.muted, fontSize: '0.83rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: T.indigo },
};

const menuProps = {
    PaperProps: {
        sx: { background: '#111220', border: `1px solid ${T.border}`, borderRadius: 2, mt: 0.5 },
    },
};

// ─── Motion ───────────────────────────────────────────────────────────────────
const rise = {
    hidden: { opacity: 0, y: 20 },
    show: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
    }),
};

// ─── Radial arc stat ──────────────────────────────────────────────────────────
function ArcStat({ icon, value, label, color, pct = 0 }) {
    const R = 18;
    const circ = 2 * Math.PI * R;
    const filled = Math.min(1, Math.max(0, pct)) * circ;

    return (
        <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 0.5, py: { xs: 2.5, md: 3 },
            position: 'relative',
            '&:not(:last-child)::after': {
                content: '""', position: 'absolute', right: 0,
                top: '20%', height: '60%', width: '1px',
                background: T.border,
            },
        }}>
            <Box sx={{ position: 'relative', width: 50, height: 50 }}>
                <svg width={50} height={50} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                    <circle cx={25} cy={25} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={2.5} />
                    <motion.circle
                        cx={25} cy={25} r={R} fill="none"
                        stroke={color} strokeWidth={2.5} strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${circ}` }}
                        animate={{ strokeDasharray: `${filled} ${circ}` }}
                        transition={{ duration: 1.1, delay: 0.4, ease: 'easeOut' }}
                        style={{ filter: `drop-shadow(0 0 5px ${color}70)` }}
                    />
                </svg>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    {icon}
                </Box>
            </Box>
            <Typography sx={{
                fontSize: '1.3rem', fontWeight: 900, color, lineHeight: 1,
                letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
            }}>
                {value}
            </Typography>
            <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>
                {label}
            </Typography>
        </Box>
    );
}

// ─── MBBS journey timeline ────────────────────────────────────────────────────
function JourneyTimeline({ year }) {
    const currentPhaseIdx = PHASES.findIndex(p => p.years.includes(year));
    const journeyPct = ((year || 1) / 5) * 100;

    return (
        <Box sx={{ px: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.muted }}>
                    MBBS Journey
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: T.sub }}>
                    Year {year || '?'} of 5
                </Typography>
            </Box>

            {/* Phase nodes + connecting track */}
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', mb: 1 }}>
                {/* Track */}
                <Box sx={{
                    position: 'absolute', left: 0, right: 0, top: '50%',
                    height: '2px', transform: 'translateY(-50%)',
                    background: T.border, borderRadius: 2,
                }} />
                {/* Filled track */}
                <Box sx={{
                    position: 'absolute', left: 0, top: '50%',
                    height: '2px', transform: 'translateY(-50%)',
                    width: `${journeyPct}%`,
                    background: `linear-gradient(90deg, ${T.indigo}, ${T.purple})`,
                    borderRadius: 2,
                    boxShadow: `0 0 8px ${T.purple}80`,
                    transition: 'width 1s ease',
                }} />

                {/* Phase nodes */}
                {PHASES.map((phase, i) => {
                    const isActive = i <= currentPhaseIdx;
                    const isCurrent = i === currentPhaseIdx;
                    return (
                        <Box key={phase.label} sx={{
                            flex: i < PHASES.length - 1 ? 1 : 0,
                            display: 'flex',
                            justifyContent: i === 0 ? 'flex-start' : i === PHASES.length - 1 ? 'flex-end' : 'center',
                        }}>
                            <Box sx={{
                                width: isCurrent ? 14 : 10,
                                height: isCurrent ? 14 : 10,
                                borderRadius: '50%',
                                background: isActive ? phase.color : 'transparent',
                                border: `2px solid ${isActive ? phase.color : T.border}`,
                                boxShadow: isCurrent ? `0 0 10px ${phase.color}90` : 'none',
                                zIndex: 1,
                                transition: 'all 0.3s',
                                position: 'relative',
                            }}>
                                {isCurrent && (
                                    <Box sx={{
                                        position: 'absolute', inset: -4, borderRadius: '50%',
                                        background: `${phase.color}20`,
                                        animation: 'ripple 2s ease-in-out infinite',
                                        '@keyframes ripple': {
                                            '0%': { transform: 'scale(0.8)', opacity: 1 },
                                            '100%': { transform: 'scale(1.8)', opacity: 0 },
                                        },
                                    }} />
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* Phase labels */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                {PHASES.map((phase, i) => {
                    const isCurrent = i === currentPhaseIdx;
                    return (
                        <Typography key={phase.label} sx={{
                            fontSize: '0.6rem', fontWeight: isCurrent ? 800 : 500,
                            color: isCurrent ? phase.color : T.muted,
                            textAlign: i === 0 ? 'left' : i === PHASES.length - 1 ? 'right' : 'center',
                            flex: i < PHASES.length - 1 ? 1 : 0,
                            transition: 'color 0.3s',
                        }}>
                            {phase.label}
                        </Typography>
                    );
                })}
            </Box>
        </Box>
    );
}

// ─── Quick launch button ──────────────────────────────────────────────────────
function LaunchBtn({ icon, label, onClick, primary }) {
    return (
        <Button
            size="small"
            onClick={onClick}
            endIcon={<ArrowIcon sx={{ fontSize: '13px !important' }} />}
            sx={{
                borderRadius: 2, textTransform: 'none', fontWeight: 700,
                fontSize: '0.78rem', px: 1.75, py: 0.8,
                flexShrink: 0,
                ...(primary ? {
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                    '&:hover': { boxShadow: '0 6px 22px rgba(99,102,241,0.5)', filter: 'brightness(1.08)' },
                } : {
                    color: T.sub,
                    border: `1px solid ${T.border}`,
                    '&:hover': { borderColor: T.borderStrong, color: T.text, bgcolor: T.surfaceHov },
                }),
                transition: 'all 0.18s',
                gap: 0.6,
            }}
        >
            {icon && <Box component="span" sx={{ display: 'flex', fontSize: '14px', mr: 0.25 }}>{icon}</Box>}
            {label}
        </Button>
    );
}

// ─── Profile field row (view mode) ────────────────────────────────────────────
function FieldRow({ icon, label, value, last }) {
    return (
        <>
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.75,
                py: 1.35, px: 1, borderRadius: 1.5,
                transition: 'background 0.14s',
                '&:hover': { background: T.surfaceHov },
            }}>
                <Box sx={{ color: T.muted, display: 'flex', flexShrink: 0 }}>{icon}</Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, mb: 0.18 }}>
                        {label}
                    </Typography>
                    <Typography sx={{
                        fontSize: '0.875rem', fontWeight: 500,
                        color: value ? T.text : 'rgba(255,255,255,0.2)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {value || 'Not set'}
                    </Typography>
                </Box>
            </Box>
            {!last && <Box sx={{ height: '1px', background: T.border, mx: 0.75, ml: 5 }} />}
        </>
    );
}

// ─── Habit row ────────────────────────────────────────────────────────────────
function HabitRow({ habit, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.07 + index * 0.055, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                py: 1.1, px: 1, borderRadius: 1.5,
                transition: 'background 0.14s',
                '&:hover': { background: T.surfaceHov },
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
                    <Box sx={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: habit.color, flexShrink: 0,
                        boxShadow: `0 0 7px ${habit.color}95`,
                    }} />
                    <Typography sx={{ fontSize: '0.825rem', color: T.sub, fontWeight: 500, letterSpacing: '-0.01em' }}>
                        {habit.label}
                    </Typography>
                </Box>
                <Chip label={habit.value} size="small" sx={{
                    height: 21, fontSize: '0.7rem', fontWeight: 700,
                    background: `${habit.color}16`,
                    color: habit.color,
                    border: `1px solid ${habit.color}32`,
                    '& .MuiChip-label': { px: 1.1 },
                }} />
            </Box>
        </motion.div>
    );
}

// ─── Tip card ("Cortex Recommends") ──────────────────────────────────────────
function TipCard({ tip, index }) {
    const accents = [T.indigo, T.purple, T.pink, T.indigo, T.purple, T.pink];
    const accent = accents[index];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + index * 0.065, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, transition: { duration: 0.14 } }}
        >
            <Box sx={{
                display: 'flex', gap: 1.5, p: '12px 14px',
                borderRadius: 2,
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${accent}`,
                background: T.surface,
                transition: 'background 0.16s, box-shadow 0.16s',
                '&:hover': {
                    background: `${accent}0a`,
                    boxShadow: `0 6px 24px rgba(0,0,0,0.2), inset 0 0 0 1px ${accent}18`,
                },
            }}>
                <Box sx={{
                    width: 28, height: 28, borderRadius: 1.25, flexShrink: 0,
                    background: `${accent}14`, border: `1px solid ${accent}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.95rem',
                }}>
                    {tip.icon}
                </Box>
                <Typography sx={{ fontSize: '0.82rem', lineHeight: 1.68, color: T.sub, flex: 1, pt: 0.1 }}>
                    {tip.text}
                </Typography>
            </Box>
        </motion.div>
    );
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────
function Panel({ children, sx }) {
    return (
        <Box sx={{
            borderRadius: 3, overflow: 'hidden',
            border: `1px solid ${T.border}`,
            background: T.surface,
            ...sx,
        }}>
            {children}
        </Box>
    );
}

function PanelHead({ icon, title, subtitle, badge, right }) {
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2.5, py: 1.75, borderBottom: `1px solid ${T.border}`,
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{
                    width: 28, height: 28, borderRadius: 1.25, flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(168,85,247,0.14))',
                    border: '1px solid rgba(99,102,241,0.22)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#a5b4fc',
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography sx={{ fontSize: '0.845rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography sx={{ fontSize: '0.66rem', color: T.muted, mt: 0.1 }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {badge}
            </Box>
            {right}
        </Box>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
    const [logoutError, setLogoutError] = useState('');
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

    // Auto-dismiss success banner after 3 seconds
    useEffect(() => {
        if (!success) return;
        const t = setTimeout(() => setSuccess(''), 3000);
        return () => clearTimeout(t);
    }, [success]);

    const handleField = (name) => (e) => { setForm(p => ({ ...p, [name]: e.target.value })); setError(''); setSuccess(''); };
    const handleCollege = (value) => {
        const college = value || '';
        const detected = detectCountryFromCollege(college);
        // Only override country when we positively detected one — never reset a user's manual selection
        setForm(p => ({ ...p, college, ...(detected ? { country: detected } : {}) }));
        setError(''); setSuccess('');
    };
    const cancelEdit = () => {
        setIsEditing(false);
        setForm({ displayName: userProfile?.displayName || '', mbbs_year: userProfile?.mbbs_year || '', college: userProfile?.college || '', country: userProfile?.country || 'India' });
        setError('');
        setSuccess('');
    };
    const handleSave = async () => {
        if (!form.displayName.trim()) { setError('Display name cannot be empty.'); return; }
        try { setSaving(true); setError(''); setSuccess(''); await updateOnboardingProfile(form); setSuccess('Profile saved!'); setIsEditing(false); }
        catch (e) { setError(e.message || 'Failed to save'); }
        finally { setSaving(false); }
    };
    const handleLogout = async () => {
        try { await logout(); navigate('/signin'); }
        catch (e) { setLogoutError(e.message || 'Sign-out failed. Please try again.'); }
    };
    const handleDelete = async () => {
        if (deleteText !== 'DELETE') return;
        try { setDeleting(true); await deleteAccount(); navigate('/signin'); }
        catch (e) { setError(e.message || 'Failed'); setDeleteOpen(false); }
        finally { setDeleting(false); }
    };

    if (!userProfile) return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
            <CircularProgress size={26} sx={{ color: T.indigo }} />
            <Typography sx={{ color: T.sub, fontSize: '0.9rem' }}>Loading profile…</Typography>
        </Box>
    );

    // ── Metrics ───────────────────────────────────────────────────────────────
    const streak       = analyticsData?.streak?.current || 0;
    const progressTotal = studyPlan?.analytics?.total_tasks || 0;
    const progressDone  = studyPlan?.analytics?.completed || 0;
    const progressPct   = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : null;
    const planMode      = studyPlan?.plan_mode || (studyPlan?.exam_date ? 'exam' : null);
    const daysLeft      = planMode === 'exam' && studyPlan?.exam_date
        ? differenceInDays(new Date(studyPlan.exam_date), new Date()) : null;

    const { habits, tips } = useMemo(
        () => generateInsights({ streak, progressPct, daysLeft, mbbs_year: userProfile.mbbs_year, planMode }),
        [streak, progressPct, daysLeft, userProfile.mbbs_year, planMode]
    );

    const yearLabel  = YEARS.find(y => y.value === userProfile.mbbs_year)?.label || `Year ${userProfile.mbbs_year || '?'}`;
    const phase      = getPhase(userProfile.mbbs_year);
    const initials   = (userProfile.displayName || userProfile.email || 'M')[0].toUpperCase();

    // Momentum copy — emotional, not just numeric
    const momentumMsg = streak === 0
        ? { text: 'Start your streak today — consistency is everything.', color: T.amber }
        : streak < 3
        ? { text: `${streak}-day streak. Keep going — 3 days builds the habit.`, color: T.amber }
        : streak < 7
        ? { text: `${streak}-day streak. You're building real momentum.`, color: T.orange }
        : streak < 30
        ? { text: `${streak} days strong. You're in a great study rhythm.`, color: T.green }
        : { text: `${streak} days. Elite consistency. Stay focused.`, color: T.green };

    const STATS = [
        { icon: <FireIcon   sx={{ fontSize: 17 }} />, value: `${streak}d`,                                    label: 'Streak',    color: T.orange, pct: Math.min(streak / 30, 1) },
        { icon: <TrendIcon  sx={{ fontSize: 17 }} />, value: progressPct != null ? `${progressPct}%` : '—',   label: 'Progress',  color: T.indigo, pct: (progressPct || 0) / 100 },
        { icon: <SparkleIcon sx={{ fontSize: 17 }}/>, value: progressDone > 0 ? `${progressDone}` : '—',      label: 'Tasks',     color: T.purple, pct: Math.min((progressDone || 0) / Math.max(progressTotal, 1), 1) },
        {
            icon: <TimerIcon  sx={{ fontSize: 17 }} />,
            value: daysLeft != null && daysLeft > 0 ? `${daysLeft}d` : '—',
            label: 'To Exam',
            // Color reflects urgency; muted when no exam is set
            color: daysLeft == null ? T.muted : daysLeft < 14 ? T.red : daysLeft < 30 ? T.amber : T.green,
            // Arc fills as exam approaches — more filled = more urgent
            pct: daysLeft != null ? Math.max(0, 1 - Math.min(daysLeft / 365, 1)) : 0,
        },
    ];

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1.5, sm: 2.5, md: 3.5 }, pb: { xs: 12, md: 8 } }}>

            {/* ══ TOP BAR ══════════════════════════════════════════════════════ */}
            <motion.div initial="hidden" animate="show" custom={0} variants={rise}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3, pt: 0.5 }}>
                    <Box>
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(99,102,241,0.6)' }}>
                            Your Space
                        </Typography>
                        <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.85rem' }, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1, mt: 0.2, color: T.text }}>
                            Command{' '}
                            <Box component="span" sx={{ background: 'linear-gradient(120deg, #6366f1 15%, #a855f7 55%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Center
                            </Box>
                        </Typography>
                    </Box>
                    <Button
                        size="small" onClick={handleLogout}
                        startIcon={<LogoutIcon sx={{ fontSize: '13px !important' }} />}
                        sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 600,
                            fontSize: '0.77rem', color: T.muted, px: 1.75, py: 0.8,
                            border: `1px solid ${T.border}`, mb: 0.5,
                            '&:hover': { borderColor: T.red, color: T.red, bgcolor: 'rgba(239,68,68,0.06)' },
                            transition: 'all 0.16s',
                        }}
                    >
                        Sign out
                    </Button>
                </Box>
            </motion.div>

            {userProfile?._fallback && (
                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
                    Offline mode — changes may not save until the backend is reachable.
                </Alert>
            )}
            {logoutError && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setLogoutError('')}>
                    {logoutError}
                </Alert>
            )}

            {/* ══ HERO ════════════════════════════════════════════════════════ */}
            <motion.div initial="hidden" animate="show" custom={1} variants={rise}>
                <Box sx={{
                    borderRadius: 3, overflow: 'hidden', mb: 2.5,
                    border: `1px solid ${T.border}`,
                    background: 'linear-gradient(150deg, rgba(99,102,241,0.13) 0%, rgba(8,7,18,0.98) 40%, rgba(168,85,247,0.08) 100%)',
                    position: 'relative',
                }}>
                    {/* Glows */}
                    <Box sx={{ position: 'absolute', top: -70, left: -50, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <Box sx={{ position: 'absolute', bottom: -50, right: 80, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2.5, md: 3.5 } }}>

                        {/* Identity row */}
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, md: 2.5 }, flexWrap: 'wrap' }}>
                            {/* Avatar */}
                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                <Box sx={{ borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)', p: '2.5px' }}>
                                    <Avatar src={userProfile.photoURL || undefined} sx={{
                                        width: { xs: 68, md: 84 }, height: { xs: 68, md: 84 },
                                        fontSize: { xs: '1.6rem', md: '2rem' }, fontWeight: 900,
                                        background: 'linear-gradient(135deg, #1c1a44, #2d1266)',
                                        color: '#c4b5fd', border: '3px solid #07080f',
                                    }}>
                                        {initials}
                                    </Avatar>
                                </Box>
                                <Box sx={{
                                    position: 'absolute', bottom: 4, right: 4,
                                    width: 12, height: 12, borderRadius: '50%',
                                    background: T.green, border: `2.5px solid #07080f`,
                                    boxShadow: `0 0 8px ${T.green}90`,
                                }} />
                            </Box>

                            {/* Name + meta + journey + actions */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                {/* Name row */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mb: 0.5 }}>
                                    <Typography sx={{ fontSize: { xs: '1.25rem', md: '1.6rem' }, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                                        {userProfile.displayName || 'Student'}
                                    </Typography>
                                    <Chip label={yearLabel} size="small" sx={{
                                        height: 20, fontSize: '0.66rem', fontWeight: 700,
                                        background: `${phase.color}22`,
                                        color: phase.color,
                                        border: `1px solid ${phase.color}38`,
                                        '& .MuiChip-label': { px: 1.1 },
                                    }} />
                                </Box>

                                {/* Meta */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', rowGap: 0.3, mb: 2 }}>
                                    {[
                                        userProfile.email   && { icon: <EmailIcon    sx={{ fontSize: 11 }} />, text: userProfile.email },
                                        userProfile.college && { icon: <SchoolIcon   sx={{ fontSize: 11 }} />, text: userProfile.college },
                                        userProfile.country && { icon: <LocationIcon sx={{ fontSize: 11 }} />, text: userProfile.country },
                                    ].filter(Boolean).map((m, i, arr) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mr: i < arr.length - 1 ? 2 : 0 }}>
                                            <Box sx={{ color: T.muted, display: 'flex' }}>{m.icon}</Box>
                                            <Typography sx={{
                                                fontSize: '0.76rem', color: T.sub,
                                                maxWidth: { xs: 155, sm: 210, md: 'none' },
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {m.text}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* MBBS Journey timeline */}
                                <Box sx={{ mb: 2.5, p: 1.75, borderRadius: 2, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.02)' }}>
                                    <JourneyTimeline year={userProfile.mbbs_year} />
                                </Box>

                                {/* Quick launch */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    <LaunchBtn primary icon={<BrainIcon sx={{ fontSize: 14 }} />} label="Ask Cortex" onClick={() => navigate('/question')} />
                                    <LaunchBtn icon={<SparkleIcon sx={{ fontSize: 14 }} />} label="Today's Plan" onClick={() => navigate('/planner')} />
                                    <LaunchBtn icon={<ReviewIcon sx={{ fontSize: 14 }} />} label="Review" onClick={() => navigate('/review')} />
                                    <LaunchBtn icon={<BookIcon sx={{ fontSize: 14 }} />} label="Library" onClick={() => navigate('/books')} />
                                </Box>
                            </Box>
                        </Box>

                        {/* Stats strip */}
                        <Box sx={{ display: 'flex', mt: 3, borderTop: `1px solid ${T.border}` }}>
                            {STATS.map((s) => <ArcStat key={s.label} {...s} />)}
                        </Box>
                    </Box>

                    {/* Bottom accent */}
                    <Box sx={{ height: '2px', background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899, transparent)', opacity: 0.5 }} />
                </Box>
            </motion.div>

            {/* ══ MAIN GRID ═══════════════════════════════════════════════════ */}
            <Grid container spacing={2} alignItems="flex-start">

                {/* ── LEFT: Profile + Danger ───────────────────────────────── */}
                <Grid item xs={12} md={5}>
                    <motion.div initial="hidden" animate="show" custom={2} variants={rise}>
                        <Stack spacing={2}>

                            {/* Profile settings */}
                            <Panel>
                                <PanelHead
                                    icon={<PersonIcon sx={{ fontSize: 14 }} />}
                                    title="Profile"
                                    subtitle="Your academic identity"
                                    right={
                                        <AnimatePresence mode="wait">
                                            {!isEditing ? (
                                                <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                    <Button
                                                        size="small" onClick={() => setIsEditing(true)}
                                                        startIcon={<EditIcon sx={{ fontSize: '12px !important' }} />}
                                                        sx={{
                                                            borderRadius: 1.75, textTransform: 'none', fontWeight: 700,
                                                            fontSize: '0.74rem', color: '#818cf8', px: 1.5, py: 0.6,
                                                            border: '1px solid rgba(99,102,241,0.22)',
                                                            '&:hover': { bgcolor: 'rgba(99,102,241,0.09)', borderColor: 'rgba(99,102,241,0.45)' },
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                </motion.div>
                                            ) : (
                                                <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                                                        <Button size="small" onClick={cancelEdit} sx={{ borderRadius: 1.75, textTransform: 'none', fontWeight: 600, fontSize: '0.74rem', color: T.sub, px: 1.25, py: 0.6 }}>
                                                            Cancel
                                                        </Button>
                                                        <Button size="small" variant="contained" onClick={handleSave} disabled={saving}
                                                            startIcon={saving ? <CircularProgress size={10} color="inherit" /> : <CheckIcon sx={{ fontSize: '12px !important' }} />}
                                                            sx={{ borderRadius: 1.75, textTransform: 'none', fontWeight: 700, fontSize: '0.74rem', px: 1.5, py: 0.6, background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: 'none' }}>
                                                            Save
                                                        </Button>
                                                    </Box>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    }
                                />

                                <Box sx={{ px: 1.5, py: 1.25 }}>
                                    <AnimatePresence>
                                        {(error || success) && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                                                <Alert severity={error ? 'error' : 'success'} sx={{ mb: 1.5, borderRadius: 1.5, py: 0.4 }} onClose={() => { setError(''); setSuccess(''); }}>
                                                    {error || success}
                                                </Alert>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <AnimatePresence mode="wait">
                                        {!isEditing ? (
                                            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                                                <FieldRow icon={<PersonIcon   sx={{ fontSize: 15 }} />} label="Display Name"   value={userProfile.displayName} />
                                                <FieldRow icon={<SchoolIcon   sx={{ fontSize: 15 }} />} label="Academic Stage" value={yearLabel} />
                                                <Box sx={{ height: '1px', background: T.border, my: 0.5, mx: 1 }} />
                                                <FieldRow icon={<SchoolIcon   sx={{ fontSize: 15 }} />} label="Institution"    value={userProfile.college} />
                                                <FieldRow icon={<LocationIcon sx={{ fontSize: 15 }} />} label="Country"        value={userProfile.country} last />
                                            </motion.div>
                                        ) : (
                                            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                                                <Stack spacing={2} sx={{ py: 0.5 }}>
                                                    <TextField fullWidth size="small" label="Display Name" value={form.displayName} onChange={handleField('displayName')} sx={inputSx} />
                                                    <TextField select fullWidth size="small" label="Academic Stage" value={form.mbbs_year} onChange={handleField('mbbs_year')} sx={inputSx} SelectProps={{ MenuProps: menuProps }}>
                                                        {YEARS.map(y => <MenuItem key={y.value} value={y.value} sx={{ fontSize: '0.85rem', color: T.text }}>{y.label}</MenuItem>)}
                                                    </TextField>
                                                    <Divider sx={{ borderColor: T.border }} />
                                                    <Autocomplete
                                                        freeSolo
                                                        options={Array.isArray(collegesData?.colleges) ? collegesData.colleges : []}
                                                        value={form.college}
                                                        onChange={(_, v) => handleCollege(v)}
                                                        onInputChange={(_, v) => handleCollege(v)}
                                                        size="small"
                                                        PaperComponent={({ children, ...p }) => (
                                                            <Paper {...p} sx={{ background: '#111220', border: `1px solid ${T.border}`, borderRadius: 2 }}>
                                                                {children}
                                                            </Paper>
                                                        )}
                                                        renderInput={(params) => (
                                                            <TextField {...params} fullWidth label="Institution" placeholder="e.g. AIIMS Delhi" sx={inputSx} />
                                                        )}
                                                    />
                                                    <TextField
                                                        select fullWidth size="small" label="Country"
                                                        value={form.country} onChange={handleField('country')} sx={inputSx}
                                                        SelectProps={{ MenuProps: menuProps }}
                                                        helperText={<Box component="span" sx={{ fontSize: '0.68rem', color: '#818cf8' }}>Auto-detected from institution</Box>}
                                                    >
                                                        {COUNTRIES.map(c => <MenuItem key={c} value={c} sx={{ fontSize: '0.85rem', color: T.text }}>{c}</MenuItem>)}
                                                    </TextField>
                                                </Stack>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Box>
                            </Panel>

                            {/* Danger zone */}
                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                px: 2, py: 1.4, borderRadius: 2.5,
                                border: '1px solid rgba(239,68,68,0.13)',
                                background: 'rgba(239,68,68,0.02)',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                    <WarningIcon sx={{ fontSize: 14, color: 'rgba(239,68,68,0.55)' }} />
                                    <Box>
                                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(239,68,68,0.8)', lineHeight: 1.2 }}>
                                            Danger Zone
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.66rem', color: T.muted }}>
                                            Permanently delete account &amp; all data.
                                        </Typography>
                                    </Box>
                                </Box>
                                <Button size="small" startIcon={<DeleteIcon sx={{ fontSize: '12px !important' }} />} onClick={() => setDeleteOpen(true)} sx={{
                                    borderRadius: 1.75, textTransform: 'none', fontWeight: 700,
                                    fontSize: '0.72rem', color: T.red, px: 1.4, py: 0.6, flexShrink: 0,
                                    border: '1px solid rgba(239,68,68,0.22)',
                                    '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: T.red },
                                }}>
                                    Delete
                                </Button>
                            </Box>
                        </Stack>
                    </motion.div>
                </Grid>

                {/* ── RIGHT: Study Intelligence ─────────────────────────────── */}
                <Grid item xs={12} md={7}>
                    <motion.div initial="hidden" animate="show" custom={3} variants={rise}>
                        <Stack spacing={2}>

                            {/* Study DNA */}
                            <Panel>
                                <PanelHead
                                    icon={<BrainIcon sx={{ fontSize: 14 }} />}
                                    title="Study DNA"
                                    subtitle="Live analysis of your learning patterns"
                                    badge={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, ml: 0.75 }}>
                                            <Box sx={{
                                                width: 6, height: 6, borderRadius: '50%', background: T.green,
                                                boxShadow: `0 0 7px ${T.green}`,
                                                animation: 'livePulse 2.2s ease-in-out infinite',
                                                '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
                                            }} />
                                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: T.green }}>Live</Typography>
                                        </Box>
                                    }
                                />
                                <Box sx={{ px: 1.5, py: 1.25 }}>
                                    {habits.length === 0 ? (
                                        <Box sx={{ py: 4, textAlign: 'center' }}>
                                            <BrainIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.06)', mb: 1 }} />
                                            <Typography sx={{ fontSize: '0.82rem', color: T.muted, mb: 1.5 }}>
                                                No patterns yet — start studying to unlock this.
                                            </Typography>
                                            <Button size="small" onClick={() => navigate('/question')} endIcon={<ArrowIcon sx={{ fontSize: '13px !important' }} />}
                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', color: T.indigo, border: `1px solid rgba(99,102,241,0.28)`, px: 1.75, '&:hover': { bgcolor: 'rgba(99,102,241,0.08)' } }}>
                                                Ask Cortex to begin
                                            </Button>
                                        </Box>
                                    ) : (
                                        <>
                                            {/* Momentum signal */}
                                            <Box sx={{
                                                display: 'flex', alignItems: 'center', gap: 1, mb: 1.25,
                                                px: 1.25, py: 0.9, borderRadius: 1.75,
                                                background: `${momentumMsg.color}0e`,
                                                border: `1px solid ${momentumMsg.color}22`,
                                            }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: momentumMsg.color, flexShrink: 0, boxShadow: `0 0 6px ${momentumMsg.color}` }} />
                                                <Typography sx={{ fontSize: '0.78rem', color: momentumMsg.color, fontWeight: 600, lineHeight: 1.4 }}>
                                                    {momentumMsg.text}
                                                </Typography>
                                            </Box>

                                            {habits.map((h, i) => <HabitRow key={i} habit={h} index={i} />)}

                                            {progressPct !== null && (
                                                <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px solid ${T.border}`, px: 1 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                                                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted }}>
                                                            Plan Progress
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: T.green }}>{progressPct}%</Typography>
                                                            <Typography sx={{ fontSize: '0.67rem', color: T.muted }}>{progressDone}/{progressTotal} topics</Typography>
                                                        </Box>
                                                    </Box>
                                                    <LinearProgress variant="determinate" value={progressPct} sx={{
                                                        height: 5, borderRadius: 6,
                                                        bgcolor: 'rgba(34,197,94,0.1)',
                                                        '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #10b981, #22c55e)', borderRadius: 6 },
                                                    }} />
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </Box>
                            </Panel>

                            {/* Cortex Recommends */}
                            <Panel>
                                <PanelHead
                                    icon={<InsightsIcon sx={{ fontSize: 14 }} />}
                                    title="Cortex Recommends"
                                    subtitle="Personalised to your year, habits & progress"
                                />
                                <Box sx={{ px: 1.5, py: 1.25 }}>
                                    {tips.length === 0 ? (
                                        <Box sx={{ py: 4, textAlign: 'center' }}>
                                            <InsightsIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.06)', mb: 1 }} />
                                            <Typography sx={{ fontSize: '0.82rem', color: T.muted, mb: 1.5 }}>
                                                Complete your profile to unlock Cortex recommendations.
                                            </Typography>
                                            <Button size="small" onClick={() => setIsEditing(true)} endIcon={<ArrowIcon sx={{ fontSize: '13px !important' }} />}
                                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', color: T.purple, border: `1px solid rgba(168,85,247,0.28)`, px: 1.75, '&:hover': { bgcolor: 'rgba(168,85,247,0.08)' } }}>
                                                Complete your profile
                                            </Button>
                                        </Box>
                                    ) : (
                                        <Stack spacing={1}>
                                            {tips.map((t, i) => <TipCard key={i} tip={t} index={i} />)}
                                        </Stack>
                                    )}
                                </Box>
                            </Panel>

                        </Stack>
                    </motion.div>
                </Grid>
            </Grid>

            {/* ══ DELETE DIALOG ═══════════════════════════════════════════════ */}
            <Dialog
                open={deleteOpen}
                onClose={() => { if (!deleting) { setDeleteOpen(false); setDeleteText(''); } }}
                PaperProps={{
                    sx: {
                        background: '#0d0e1c', border: `1px solid rgba(239,68,68,0.22)`,
                        borderRadius: { xs: '20px 20px 0 0', md: 2.5 }, p: 0.5,
                        width: { xs: '100%', md: 'auto' }, maxWidth: 400,
                        m: { xs: 0, md: 'auto' },
                        position: { xs: 'fixed', md: 'relative' },
                        bottom: { xs: 0, md: 'auto' },
                    },
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: T.red, fontWeight: 800, fontSize: '0.975rem' }}>
                    <WarningIcon sx={{ fontSize: 17 }} /> Delete Account
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: T.sub, mb: 2.5, lineHeight: 1.72, fontSize: '0.865rem' }}>
                        This will permanently delete your account, all study plans, Cortex history, and analytics. Type{' '}
                        <Box component="strong" sx={{ color: T.text }}>DELETE</Box> to confirm.
                    </DialogContentText>
                    <TextField
                        autoFocus fullWidth variant="outlined" placeholder="DELETE"
                        value={deleteText} onChange={(e) => setDeleteText(e.target.value)} disabled={deleting}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2, background: 'rgba(239,68,68,0.06)',
                                color: T.red, fontWeight: 800,
                                '& fieldset': { borderColor: 'rgba(239,68,68,0.28)' },
                                '&:hover fieldset': { borderColor: 'rgba(239,68,68,0.5)' },
                                '&.Mui-focused fieldset': { borderColor: T.red },
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => { setDeleteOpen(false); setDeleteText(''); }} disabled={deleting} sx={{ color: T.sub, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete} disabled={deleteText !== 'DELETE' || deleting}
                        color="error" variant="contained"
                        startIcon={deleting && <CircularProgress size={13} color="inherit" />}
                        sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', boxShadow: 'none', px: 2.5 }}
                    >
                        Confirm Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
