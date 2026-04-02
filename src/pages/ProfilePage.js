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
const C = {
    bg:             '#07080f',
    surface:        'rgba(255,255,255,0.025)',
    surfaceHover:   'rgba(255,255,255,0.042)',
    border:         'rgba(255,255,255,0.07)',
    borderStrong:   'rgba(255,255,255,0.13)',
    text:           'rgba(255,255,255,0.88)',
    textSub:        'rgba(255,255,255,0.50)',
    textMuted:      'rgba(255,255,255,0.28)',
    indigo:         '#6366f1',
    purple:         '#a855f7',
    pink:           '#ec4899',
    green:          '#22c55e',
    orange:         '#f97316',
    amber:          '#f59e0b',
    red:            '#ef4444',
};

// ─── Input sx ─────────────────────────────────────────────────────────────────
const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 1.5,
        background: 'rgba(255,255,255,0.035)',
        fontSize: '0.88rem',
        color: C.text,
        '& fieldset': { borderColor: C.border },
        '&:hover fieldset': { borderColor: C.borderStrong },
        '&.Mui-focused fieldset': { borderColor: C.indigo },
        '& .MuiSelect-select': { color: C.text },
    },
    '& .MuiInputLabel-root': { color: C.textMuted, fontSize: '0.83rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: C.indigo },
};

// ─── Radial arc stat ──────────────────────────────────────────────────────────
function RadialStat({ value, label, icon, color, pct }) {
    const R = 19;
    const circ = 2 * Math.PI * R;
    const filled = Math.max(0, Math.min(1, pct || 0)) * circ;

    return (
        <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 0.5, py: { xs: 2, md: 2.5 }, px: 1,
            position: 'relative',
            '&:not(:last-child)::after': {
                content: '""', position: 'absolute', right: 0, top: '18%',
                height: '64%', width: '1px', background: C.border,
            },
        }}>
            {/* Arc */}
            <Box sx={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
                <svg width={54} height={54} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                    <circle cx={27} cy={27} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={2.5} />
                    <motion.circle
                        cx={27} cy={27} r={R} fill="none" stroke={color} strokeWidth={2.5}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: `0 ${circ}` }}
                        animate={{ strokeDasharray: `${filled} ${circ}` }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                        style={{ filter: `drop-shadow(0 0 5px ${color}70)` }}
                    />
                </svg>
                <Box sx={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color,
                }}>
                    {icon}
                </Box>
            </Box>

            {/* Number */}
            <Typography sx={{
                fontSize: '1.35rem', fontWeight: 900, color, lineHeight: 1,
                letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
            }}>
                {value}
            </Typography>

            {/* Label */}
            <Typography sx={{
                fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: C.textMuted,
            }}>
                {label}
            </Typography>
        </Box>
    );
}

// ─── Profile field row (view mode) ────────────────────────────────────────────
function FieldRow({ icon, label, value, noBorder }) {
    return (
        <>
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 2,
                py: 1.4, px: 1, borderRadius: 1.5,
                transition: 'background 0.15s',
                '&:hover': { background: C.surfaceHover },
            }}>
                <Box sx={{ color: C.textMuted, display: 'flex', flexShrink: 0, fontSize: 15 }}>
                    {icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                        fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em',
                        textTransform: 'uppercase', color: C.textMuted, mb: 0.2,
                    }}>
                        {label}
                    </Typography>
                    <Typography sx={{
                        fontSize: '0.875rem', fontWeight: 500,
                        color: value ? C.text : 'rgba(255,255,255,0.2)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {value || 'Not set'}
                    </Typography>
                </Box>
            </Box>
            {!noBorder && <Box sx={{ height: '1px', background: C.border, mx: 1, ml: 5.5 }} />}
        </>
    );
}

// ─── Habit row ────────────────────────────────────────────────────────────────
function HabitRow({ habit, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + index * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
            <Box sx={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.1, px: 1, borderRadius: 1.5,
                transition: 'background 0.15s',
                '&:hover': { background: C.surfaceHover },
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: habit.color, flexShrink: 0,
                        boxShadow: `0 0 6px ${habit.color}90`,
                    }} />
                    <Typography sx={{ fontSize: '0.83rem', color: C.textSub, fontWeight: 500 }}>
                        {habit.label}
                    </Typography>
                </Box>
                <Chip label={habit.value} size="small" sx={{
                    height: 21, fontSize: '0.7rem', fontWeight: 700,
                    background: `${habit.color}18`,
                    color: habit.color,
                    border: `1px solid ${habit.color}35`,
                    '& .MuiChip-label': { px: 1.1 },
                }} />
            </Box>
        </motion.div>
    );
}

// ─── Tip card ─────────────────────────────────────────────────────────────────
function TipCard({ tip, index }) {
    const accents = [C.indigo, C.purple, C.pink];
    const accent = accents[index % 3];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.07, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
        >
            <Box sx={{
                display: 'flex', gap: 1.5, p: '13px 14px',
                borderRadius: 2,
                border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${accent}`,
                background: C.surface,
                cursor: 'default',
                transition: 'background 0.18s, box-shadow 0.18s',
                '&:hover': {
                    background: `${accent}0c`,
                    boxShadow: `0 6px 28px rgba(0,0,0,0.22), inset 0 0 0 1px ${accent}20`,
                },
            }}>
                {/* Icon box */}
                <Box sx={{
                    width: 28, height: 28, borderRadius: 1.25, flexShrink: 0,
                    background: `${accent}15`,
                    border: `1px solid ${accent}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.95rem',
                }}>
                    {tip.icon}
                </Box>
                <Typography sx={{ fontSize: '0.825rem', lineHeight: 1.68, color: C.textSub, flex: 1, pt: 0.1 }}>
                    {tip.text}
                </Typography>
            </Box>
        </motion.div>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, badge, action }) {
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2.5, py: 1.75,
            borderBottom: `1px solid ${C.border}`,
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{
                    width: 28, height: 28, borderRadius: 1.25,
                    background: 'linear-gradient(135deg, #6366f130, #a855f720)',
                    border: `1px solid #6366f130`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#818cf8', flexShrink: 0,
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography sx={{ fontSize: '0.68rem', color: C.textMuted }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                {badge}
            </Box>
            {action}
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

    if (!userProfile) return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
            <CircularProgress size={26} sx={{ color: C.indigo }} />
            <Typography sx={{ color: C.textSub, fontSize: '0.9rem' }}>Loading…</Typography>
        </Box>
    );

    // ── Computed metrics ──
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
    const initials = (userProfile.displayName || userProfile.email || 'M')[0].toUpperCase();

    const STATS = [
        {
            icon: <FireIcon sx={{ fontSize: 18 }} />,
            value: `${streak}d`,
            label: 'Streak',
            color: C.orange,
            pct: Math.min(streak / 30, 1),
        },
        {
            icon: <TrendIcon sx={{ fontSize: 18 }} />,
            value: progressPct !== null ? `${progressPct}%` : '—',
            label: 'Progress',
            color: C.indigo,
            pct: (progressPct || 0) / 100,
        },
        {
            icon: <SparkleIcon sx={{ fontSize: 18 }} />,
            value: progressDone > 0 ? `${progressDone}` : '—',
            label: 'Tasks Done',
            color: C.purple,
            pct: Math.min((progressDone || 0) / Math.max(progressTotal, 1), 1),
        },
        {
            icon: <TimerIcon sx={{ fontSize: 18 }} />,
            value: daysLeft != null && daysLeft > 0 ? `${daysLeft}d` : '—',
            label: 'To Exam',
            color: daysLeft != null && daysLeft < 14 ? C.red : daysLeft != null && daysLeft < 30 ? C.amber : C.green,
            pct: daysLeft != null ? Math.max(0, Math.min(daysLeft / 365, 1)) : 0,
        },
    ];

    const fadeUp = {
        hidden: { opacity: 0, y: 18 },
        show: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.38, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] } }),
    };

    return (
        <Box sx={{
            maxWidth: 1200, mx: 'auto',
            px: { xs: 1.5, sm: 2.5, md: 3.5 },
            pb: { xs: 10, md: 8 },
        }}>

            {/* ══ TOP BAR ════════════════════════════════════════════════════ */}
            <motion.div initial="hidden" animate="show" custom={0} variants={fadeUp}>
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    mb: 3, pt: 0.5,
                }}>
                    <Box>
                        <Typography sx={{
                            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em',
                            textTransform: 'uppercase', color: 'rgba(99,102,241,0.6)',
                        }}>
                            Profile &amp; Settings
                        </Typography>
                        <Typography sx={{
                            fontSize: { xs: '1.55rem', md: '1.9rem' },
                            fontWeight: 900, letterSpacing: '-0.04em',
                            lineHeight: 1, color: C.text, mt: 0.2,
                        }}>
                            Command{' '}
                            <Box component="span" sx={{
                                background: 'linear-gradient(120deg, #6366f1 20%, #a855f7 65%, #ec4899 100%)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                                Center
                            </Box>
                        </Typography>
                    </Box>

                    <Button
                        size="small"
                        startIcon={<LogoutIcon sx={{ fontSize: '13px !important' }} />}
                        onClick={handleLogout}
                        sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 600,
                            fontSize: '0.78rem', color: C.textMuted, px: 1.75, py: 0.8,
                            border: `1px solid ${C.border}`,
                            '&:hover': { borderColor: C.red, color: C.red, bgcolor: 'rgba(239,68,68,0.06)' },
                            transition: 'all 0.18s',
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

            {/* ══ HERO ═══════════════════════════════════════════════════════ */}
            <motion.div initial="hidden" animate="show" custom={1} variants={fadeUp}>
                <Box sx={{
                    borderRadius: 3, overflow: 'hidden', mb: 2.5,
                    border: `1px solid ${C.border}`,
                    background: 'linear-gradient(145deg, rgba(99,102,241,0.14) 0%, rgba(10,9,22,0.97) 45%, rgba(168,85,247,0.09) 100%)',
                    position: 'relative',
                }}>
                    {/* ambient glows */}
                    <Box sx={{ position: 'absolute', top: -80, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <Box sx={{ position: 'absolute', top: -40, right: 60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.13) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <Box sx={{ position: 'absolute', bottom: -50, right: -30, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    {/* Identity row */}
                    <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 2.5, md: 3.5 }, pt: { xs: 2.5, md: 3 }, pb: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 } }}>

                            {/* Avatar */}
                            <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                <Box sx={{
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                                    p: '2.5px',
                                }}>
                                    <Avatar
                                        src={userProfile.photoURL || undefined}
                                        sx={{
                                            width: { xs: 72, md: 88 }, height: { xs: 72, md: 88 },
                                            fontSize: { xs: '1.7rem', md: '2rem' }, fontWeight: 900,
                                            background: 'linear-gradient(135deg, #1a1740, #2a1160)',
                                            color: '#c4b5fd', border: '3px solid #07080f',
                                        }}
                                    >
                                        {initials}
                                    </Avatar>
                                </Box>
                                <Box sx={{
                                    position: 'absolute', bottom: 4, right: 4,
                                    width: 12, height: 12, borderRadius: '50%',
                                    background: C.green, border: `2.5px solid #07080f`,
                                    boxShadow: `0 0 8px ${C.green}90`,
                                }} />
                            </Box>

                            {/* Name + meta */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mb: 0.5 }}>
                                    <Typography sx={{
                                        fontSize: { xs: '1.3rem', md: '1.65rem' },
                                        fontWeight: 900, color: '#fff',
                                        letterSpacing: '-0.03em', lineHeight: 1,
                                    }}>
                                        {userProfile.displayName || 'Student'}
                                    </Typography>
                                    <Chip label={yearLabel} size="small" sx={{
                                        height: 20, fontSize: '0.67rem', fontWeight: 700,
                                        background: 'rgba(99,102,241,0.18)',
                                        color: '#a5b4fc',
                                        border: '1px solid rgba(99,102,241,0.32)',
                                        '& .MuiChip-label': { px: 1.1 },
                                    }} />
                                </Box>

                                {/* Meta row */}
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0, rowGap: 0.3 }}>
                                    {[
                                        userProfile.email && { icon: <EmailIcon sx={{ fontSize: 11 }} />, text: userProfile.email },
                                        userProfile.college && { icon: <SchoolIcon sx={{ fontSize: 11 }} />, text: userProfile.college },
                                        userProfile.country && { icon: <LocationIcon sx={{ fontSize: 11 }} />, text: userProfile.country },
                                    ].filter(Boolean).map((m, i, arr) => (
                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mr: i < arr.length - 1 ? 2 : 0 }}>
                                            <Box sx={{ color: C.textMuted, display: 'flex' }}>{m.icon}</Box>
                                            <Typography sx={{
                                                fontSize: '0.77rem', color: C.textSub,
                                                maxWidth: { xs: 160, sm: 200, md: 'none' },
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {m.text}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Box>

                        {/* Stats strip */}
                        <Box sx={{
                            display: 'flex', mt: 2.5,
                            pt: 0, borderTop: `1px solid ${C.border}`,
                        }}>
                            {STATS.map((s) => (
                                <RadialStat key={s.label} {...s} />
                            ))}
                        </Box>
                    </Box>

                    {/* Bottom gradient line */}
                    <Box sx={{
                        height: '2px',
                        background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899, transparent)',
                        opacity: 0.55,
                    }} />
                </Box>
            </motion.div>

            {/* ══ MAIN GRID ══════════════════════════════════════════════════ */}
            <Grid container spacing={2} alignItems="flex-start">

                {/* ── LEFT: Profile Settings ───────────────────────────────── */}
                <Grid item xs={12} md={5}>
                    <motion.div initial="hidden" animate="show" custom={2} variants={fadeUp}>
                        <Stack spacing={2}>

                            {/* Settings card */}
                            <Box sx={{
                                borderRadius: 3, overflow: 'hidden',
                                border: `1px solid ${C.border}`,
                                background: C.surface,
                            }}>
                                <SectionHeader
                                    icon={<PersonIcon sx={{ fontSize: 14 }} />}
                                    title="Account Settings"
                                    action={
                                        <AnimatePresence mode="wait">
                                            {!isEditing ? (
                                                <motion.div key="btn-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                    <Button
                                                        size="small"
                                                        startIcon={<EditIcon sx={{ fontSize: '12px !important' }} />}
                                                        onClick={() => setIsEditing(true)}
                                                        sx={{
                                                            borderRadius: 1.75, textTransform: 'none',
                                                            fontWeight: 700, fontSize: '0.75rem',
                                                            color: '#818cf8', px: 1.5, py: 0.6,
                                                            border: '1px solid rgba(99,102,241,0.25)',
                                                            '&:hover': { bgcolor: 'rgba(99,102,241,0.09)', borderColor: 'rgba(99,102,241,0.5)' },
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                </motion.div>
                                            ) : (
                                                <motion.div key="btn-save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                    <Box sx={{ display: 'flex', gap: 0.75 }}>
                                                        <Button size="small" onClick={cancelEdit} sx={{
                                                            borderRadius: 1.75, textTransform: 'none', fontWeight: 600,
                                                            fontSize: '0.75rem', color: C.textSub, px: 1.25, py: 0.6,
                                                        }}>
                                                            Cancel
                                                        </Button>
                                                        <Button size="small" variant="contained" onClick={handleSave} disabled={saving}
                                                            startIcon={saving
                                                                ? <CircularProgress size={10} color="inherit" />
                                                                : <CheckIcon sx={{ fontSize: '12px !important' }} />
                                                            }
                                                            sx={{
                                                                borderRadius: 1.75, textTransform: 'none', fontWeight: 700,
                                                                fontSize: '0.75rem', px: 1.5, py: 0.6,
                                                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                                                boxShadow: 'none',
                                                            }}
                                                        >
                                                            Save
                                                        </Button>
                                                    </Box>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    }
                                />

                                <Box sx={{ px: 1.5, py: 1.5 }}>
                                    {/* Error / success */}
                                    <AnimatePresence>
                                        {(error || success) && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <Alert
                                                    severity={error ? 'error' : 'success'}
                                                    sx={{ mb: 1.5, borderRadius: 1.5, py: 0.5 }}
                                                    onClose={() => { setError(''); setSuccess(''); }}
                                                >
                                                    {error || success}
                                                </Alert>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* View / Edit toggle */}
                                    <AnimatePresence mode="wait">
                                        {!isEditing ? (
                                            <motion.div
                                                key="view"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <FieldRow icon={<PersonIcon sx={{ fontSize: 15 }} />} label="Display Name" value={userProfile.displayName} />
                                                <FieldRow icon={<SchoolIcon sx={{ fontSize: 15 }} />} label="Academic Stage" value={yearLabel} />
                                                <Box sx={{ height: '1px', background: C.border, my: 0.5, mx: 1 }} />
                                                <FieldRow icon={<SchoolIcon sx={{ fontSize: 15 }} />} label="Institution" value={userProfile.college} />
                                                <FieldRow icon={<LocationIcon sx={{ fontSize: 15 }} />} label="Country" value={userProfile.country} noBorder />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="edit"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Stack spacing={2} sx={{ px: 0.5, py: 0.5 }}>
                                                    <TextField
                                                        fullWidth size="small" label="Display Name"
                                                        value={form.displayName}
                                                        onChange={handleField('displayName')}
                                                        sx={inputSx}
                                                    />
                                                    <TextField
                                                        select fullWidth size="small" label="Academic Stage"
                                                        value={form.mbbs_year}
                                                        onChange={handleField('mbbs_year')}
                                                        sx={inputSx}
                                                        SelectProps={{
                                                            MenuProps: {
                                                                PaperProps: {
                                                                    sx: { background: '#12131f', border: `1px solid ${C.border}` },
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        {YEARS.map(y => (
                                                            <MenuItem key={y.value} value={y.value} sx={{ fontSize: '0.85rem', color: C.text }}>
                                                                {y.label}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>

                                                    <Divider sx={{ borderColor: C.border }} />

                                                    <Autocomplete
                                                        freeSolo
                                                        options={Array.isArray(collegesData.colleges) ? collegesData.colleges : []}
                                                        value={form.college}
                                                        onChange={(_, v) => handleCollege(v)}
                                                        onInputChange={(_, v) => handleCollege(v)}
                                                        size="small"
                                                        PaperComponent={({ children, ...p }) => (
                                                            <Paper {...p} sx={{ background: '#12131f', border: `1px solid ${C.border}`, borderRadius: 1.5 }}>
                                                                {children}
                                                            </Paper>
                                                        )}
                                                        renderInput={(params) => (
                                                            <TextField {...params} fullWidth label="Institution" placeholder="e.g. AIIMS Delhi" sx={inputSx} />
                                                        )}
                                                    />

                                                    <TextField
                                                        select fullWidth size="small" label="Country"
                                                        value={form.country}
                                                        onChange={handleField('country')}
                                                        sx={inputSx}
                                                        helperText={
                                                            <Box component="span" sx={{ fontSize: '0.7rem', color: '#818cf8' }}>
                                                                Auto-detected from college
                                                            </Box>
                                                        }
                                                        SelectProps={{
                                                            MenuProps: {
                                                                PaperProps: {
                                                                    sx: { background: '#12131f', border: `1px solid ${C.border}` },
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        {COUNTRIES.map(c => (
                                                            <MenuItem key={c} value={c} sx={{ fontSize: '0.85rem', color: C.text }}>
                                                                {c}
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                </Stack>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Box>
                            </Box>

                            {/* Danger zone — compact row */}
                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                px: 2, py: 1.5, borderRadius: 2.5,
                                border: '1px solid rgba(239,68,68,0.14)',
                                background: 'rgba(239,68,68,0.025)',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                    <WarningIcon sx={{ fontSize: 15, color: '#ef444480' }} />
                                    <Box>
                                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444cc' }}>
                                            Danger Zone
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.68rem', color: C.textMuted, lineHeight: 1.3 }}>
                                            Permanently delete account &amp; all data.
                                        </Typography>
                                    </Box>
                                </Box>
                                <Button
                                    size="small"
                                    startIcon={<DeleteIcon sx={{ fontSize: '12px !important' }} />}
                                    onClick={() => setDeleteOpen(true)}
                                    sx={{
                                        borderRadius: 1.75, textTransform: 'none', fontWeight: 700,
                                        fontSize: '0.73rem', color: '#ef4444', px: 1.5, py: 0.6,
                                        border: '1px solid rgba(239,68,68,0.25)',
                                        flexShrink: 0,
                                        '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: C.red },
                                    }}
                                >
                                    Delete
                                </Button>
                            </Box>

                        </Stack>
                    </motion.div>
                </Grid>

                {/* ── RIGHT: Study Intelligence ─────────────────────────────── */}
                <Grid item xs={12} md={7}>
                    <motion.div initial="hidden" animate="show" custom={3} variants={fadeUp}>
                        <Stack spacing={2}>

                            {/* Study DNA */}
                            <Box sx={{
                                borderRadius: 3, overflow: 'hidden',
                                border: `1px solid ${C.border}`,
                                background: C.surface,
                            }}>
                                <SectionHeader
                                    icon={<BrainIcon sx={{ fontSize: 14 }} />}
                                    title="Study DNA"
                                    subtitle="Live analysis of your learning patterns"
                                    badge={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, ml: 0.5 }}>
                                            <Box sx={{
                                                width: 6, height: 6, borderRadius: '50%',
                                                background: C.green,
                                                boxShadow: `0 0 8px ${C.green}`,
                                                animation: 'pulse 2s ease-in-out infinite',
                                                '@keyframes pulse': {
                                                    '0%,100%': { opacity: 1 },
                                                    '50%': { opacity: 0.4 },
                                                },
                                            }} />
                                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: C.green }}>Live</Typography>
                                        </Box>
                                    }
                                />

                                <Box sx={{ px: 1.5, py: 1.5 }}>
                                    {habits.length === 0 ? (
                                        <Box sx={{ py: 4, textAlign: 'center' }}>
                                            <BrainIcon sx={{ fontSize: 34, color: 'rgba(255,255,255,0.06)', mb: 1 }} />
                                            <Typography sx={{ fontSize: '0.83rem', color: C.textMuted, fontStyle: 'italic' }}>
                                                Start studying to generate your fingerprint.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <>
                                            {habits.map((h, i) => <HabitRow key={i} habit={h} index={i} />)}

                                            {progressPct !== null && (
                                                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${C.border}`, px: 1 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                                                        <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textMuted }}>
                                                            Plan Progress
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: C.green }}>
                                                                {progressPct}%
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '0.68rem', color: C.textMuted }}>
                                                                {progressDone}/{progressTotal} topics
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={progressPct}
                                                        sx={{
                                                            height: 5, borderRadius: 6,
                                                            bgcolor: 'rgba(16,185,129,0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                background: 'linear-gradient(90deg, #10b981, #22c55e)',
                                                                borderRadius: 6,
                                                            },
                                                        }}
                                                    />
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </Box>
                            </Box>

                            {/* AI Insights */}
                            <Box sx={{
                                borderRadius: 3, overflow: 'hidden',
                                border: `1px solid ${C.border}`,
                                background: C.surface,
                            }}>
                                <SectionHeader
                                    icon={<InsightsIcon sx={{ fontSize: 14 }} />}
                                    title="AI Insights"
                                    subtitle="Personalised to your usage &amp; habits"
                                />

                                <Box sx={{ px: 1.5, py: 1.5 }}>
                                    {tips.length === 0 ? (
                                        <Box sx={{ py: 4, textAlign: 'center' }}>
                                            <InsightsIcon sx={{ fontSize: 34, color: 'rgba(255,255,255,0.06)', mb: 1 }} />
                                            <Typography sx={{ fontSize: '0.83rem', color: C.textMuted, fontStyle: 'italic' }}>
                                                Complete your profile and start studying for personalised tips.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Stack spacing={1}>
                                            {tips.map((t, i) => <TipCard key={i} tip={t} index={i} />)}
                                        </Stack>
                                    )}
                                </Box>
                            </Box>

                        </Stack>
                    </motion.div>
                </Grid>
            </Grid>

            {/* ══ DELETE DIALOG ══════════════════════════════════════════════ */}
            <Dialog
                open={deleteOpen}
                onClose={() => !deleting && setDeleteOpen(false)}
                PaperProps={{
                    sx: {
                        background: '#0d0e1c',
                        border: `1px solid rgba(239,68,68,0.22)`,
                        borderRadius: { xs: '20px 20px 0 0', md: 2.5 },
                        p: 0.5,
                        width: { xs: '100%', md: 'auto' }, maxWidth: 400,
                        m: { xs: 0, md: 'auto' },
                        position: { xs: 'fixed', md: 'relative' },
                        bottom: { xs: 0, md: 'auto' },
                    },
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: C.red, fontWeight: 800, fontSize: '1rem' }}>
                    <WarningIcon sx={{ fontSize: 18 }} /> Delete Account
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: C.textSub, mb: 2.5, lineHeight: 1.72, fontSize: '0.875rem' }}>
                        This permanently deletes your account and all data. Type{' '}
                        <Box component="strong" sx={{ color: C.text }}>DELETE</Box> to confirm.
                    </DialogContentText>
                    <TextField
                        autoFocus fullWidth variant="outlined" placeholder="DELETE"
                        value={deleteText}
                        onChange={(e) => setDeleteText(e.target.value)}
                        disabled={deleting}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2, background: 'rgba(239,68,68,0.06)',
                                color: C.red, fontWeight: 800,
                                '& fieldset': { borderColor: 'rgba(239,68,68,0.28)' },
                                '&:hover fieldset': { borderColor: 'rgba(239,68,68,0.5)' },
                                '&.Mui-focused fieldset': { borderColor: C.red },
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button
                        onClick={() => { setDeleteOpen(false); setDeleteText(''); }}
                        disabled={deleting}
                        sx={{ color: C.textSub, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={deleteText !== 'DELETE' || deleting}
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
