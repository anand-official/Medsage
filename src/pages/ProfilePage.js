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

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputSx = (editing) => ({
    '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        bgcolor: editing ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'all 0.2s',
        '& fieldset': { borderColor: editing ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)' },
        '&:hover fieldset': { borderColor: editing ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.05)' },
        '&.Mui-focused fieldset': { borderColor: '#6366f1' },
        '&.Mui-disabled': { bgcolor: 'transparent', opacity: 0.7 },
        '& input, & .MuiSelect-select': { fontSize: 14 },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
    '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
});

function FieldLabel({ children }) {
    return (
        <Typography variant="caption" sx={{
            display: 'block', mb: 0.75,
            fontWeight: 700, fontSize: 10,
            textTransform: 'uppercase', letterSpacing: '1px',
            color: 'rgba(255,255,255,0.35)',
        }}>
            {children}
        </Typography>
    );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────
function SectionCard({ icon, title, subtitle, accentColor = '#6366f1', badge, children, headerRight }) {
    return (
        <Paper elevation={0} sx={{
            borderRadius: 4, overflow: 'hidden',
            border: `1px solid ${accentColor}20`,
            background: `linear-gradient(145deg, ${accentColor}08 0%, rgba(10,10,20,0.6) 100%)`,
            backdropFilter: 'blur(12px)',
        }}>
            {/* Card header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between"
                sx={{ px: 3, py: 2, borderBottom: `1px solid ${accentColor}15` }}>
                <Stack direction="row" alignItems="center" gap={1.5}>
                    <Box sx={{
                        width: 32, height: 32, borderRadius: 2,
                        background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 14px ${accentColor}35`,
                        flexShrink: 0,
                    }}>
                        {icon}
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    {badge}
                </Stack>
                {headerRight}
            </Stack>

            <Box sx={{ p: 3 }}>
                {children}
            </Box>
        </Paper>
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
    }, [
        isEditing,
        userProfile?.uid,
        userProfile?.displayName,
        userProfile?.mbbs_year,
        userProfile?.college,
        userProfile?.country,
    ]);

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
            <CircularProgress size={28} /><Typography color="text.secondary">Loading…</Typography>
        </Box>
    );

    // ── Metrics ──────────────────────────────────────────────────────────────
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

    const STAT_ITEMS = [
        { icon: <FireIcon sx={{ fontSize: 20 }} />, value: `${streak}d`, label: 'Streak', color: '#f97316' },
        { icon: <TrendIcon sx={{ fontSize: 20 }} />, value: progressPct !== null ? `${progressPct}%` : '—', label: 'Progress', color: '#6366f1' },
        { icon: <SparkleIcon sx={{ fontSize: 20 }} />, value: progressDone > 0 ? `${progressDone}` : '—', label: 'Tasks Done', color: '#a855f7' },
        { icon: <TimerIcon sx={{ fontSize: 20 }} />, value: daysLeft !== null && daysLeft > 0 ? `${daysLeft}d` : '—', label: 'To Exam', color: daysLeft !== null && daysLeft < 14 ? '#ef4444' : daysLeft !== null && daysLeft < 30 ? '#f59e0b' : '#22c55e' },
    ];

    const yearLabel = YEARS.find(y => y.value === userProfile.mbbs_year)?.label || `Year ${userProfile.mbbs_year || '?'}`;

    return (
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 1.5, sm: 2.5, md: 3 }, pb: { xs: 12, md: 8 } }}>

            {/* ══ PAGE HEADER ══════════════════════════════════════════════════ */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: { xs: 3, md: 4 } }}>
                    <Box>
                        <Typography variant="caption" sx={{
                            fontWeight: 800, fontSize: 10.5, letterSpacing: '0.16em',
                            textTransform: 'uppercase', color: 'rgba(99,102,241,0.7)',
                        }}>
                            Your Profile
                        </Typography>
                        <Typography variant="h3" fontWeight={900} sx={{
                            fontSize: { xs: '1.6rem', sm: '2rem', md: '2.4rem' },
                            letterSpacing: '-2px', lineHeight: 1, mt: 0.25,
                        }}>
                            Command{' '}
                            <Box component="span" sx={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 60%, #ec4899 100%)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                                Center
                            </Box>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 13, letterSpacing: '-0.1px' }}>
                            Your profile, study fingerprint &amp; AI insights.
                        </Typography>
                    </Box>
                    <Button
                        variant="text" size="small"
                        startIcon={<LogoutIcon sx={{ fontSize: '14px !important' }} />}
                        onClick={handleLogout}
                        sx={{
                            borderRadius: 2.5, textTransform: 'none', fontWeight: 700, fontSize: 12.5,
                            color: 'rgba(255,255,255,0.3)', px: 2, py: 0.9,
                            border: '1px solid rgba(255,255,255,0.07)',
                            '&:hover': { borderColor: '#ef4444', color: '#ef4444', bgcolor: 'rgba(239,68,68,0.06)' },
                            transition: 'all 0.2s',
                            mb: 0.5,
                        }}
                    >
                        Sign out
                    </Button>
                </Stack>
            </motion.div>

            {userProfile?._fallback && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
                    Offline mode — changes may not save until the backend is reachable.
                </Alert>
            )}

            {/* ══ HERO IDENTITY CARD ═══════════════════════════════════════════ */}
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
                <Paper elevation={0} sx={{
                    mb: { xs: 2.5, md: 3 }, borderRadius: 4,
                    border: '1px solid rgba(99,102,241,0.22)',
                    background: 'linear-gradient(135deg, rgba(15,12,30,0.97) 0%, rgba(20,15,42,0.97) 100%)',
                    overflow: 'hidden', position: 'relative',
                }}>
                    {/* Ambient glow blobs */}
                    <Box sx={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <Box sx={{ position: 'absolute', bottom: -60, left: '25%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    <Box sx={{ p: { xs: 2.5, sm: 3, md: 3.5 }, position: 'relative', zIndex: 1 }}>
                        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">

                            {/* Identity block */}
                            <Grid item xs={12} sm={7} md={8}>
                                <Stack direction="row" alignItems="center" gap={{ xs: 2.5, md: 3 }}>
                                    {/* Avatar with ring */}
                                    <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                        <Box sx={{
                                            position: 'absolute', inset: -3, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                                            zIndex: 0,
                                        }} />
                                        <Avatar src={userProfile.photoURL} sx={{
                                            width: { xs: 68, md: 84 }, height: { xs: 68, md: 84 },
                                            position: 'relative', zIndex: 1,
                                            border: '3px solid rgba(10,10,20,1)',
                                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                            fontSize: { xs: '1.5rem', md: '1.9rem' },
                                            fontWeight: 800,
                                        }} />
                                        {/* Online dot */}
                                        <Box sx={{
                                            position: 'absolute', bottom: 2, right: 2,
                                            width: 13, height: 13, borderRadius: '50%',
                                            bgcolor: '#22c55e',
                                            border: '2.5px solid rgba(10,10,20,1)',
                                            zIndex: 2,
                                            boxShadow: '0 0 8px rgba(34,197,94,0.7)',
                                        }} />
                                    </Box>

                                    {/* Name + metadata */}
                                    <Box sx={{ minWidth: 0 }}>
                                        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                                            <Typography fontWeight={900} sx={{
                                                fontSize: { xs: '1.2rem', md: '1.45rem' },
                                                letterSpacing: '-0.5px', lineHeight: 1,
                                            }}>
                                                {userProfile.displayName || 'Doctor'}
                                            </Typography>
                                            <Chip
                                                label={yearLabel}
                                                size="small"
                                                sx={{
                                                    height: 20, fontSize: 10, fontWeight: 800,
                                                    bgcolor: 'rgba(99,102,241,0.15)',
                                                    color: '#a5b4fc',
                                                    border: '1px solid rgba(99,102,241,0.28)',
                                                    borderRadius: 1.5,
                                                }}
                                            />
                                        </Stack>

                                        <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mt: 1 }}>
                                            {[
                                                { icon: <EmailIcon sx={{ fontSize: 11 }} />, text: userProfile.email },
                                                userProfile.college && { icon: <SchoolIcon sx={{ fontSize: 11 }} />, text: userProfile.college },
                                                userProfile.country && { icon: <LocationIcon sx={{ fontSize: 11 }} />, text: userProfile.country },
                                            ].filter(Boolean).map((item, i) => (
                                                <Typography key={i} color="text.secondary" sx={{
                                                    display: 'flex', alignItems: 'center', gap: 0.5,
                                                    fontSize: 11.5, lineHeight: 1.4,
                                                    maxWidth: { xs: 200, sm: 260, md: 'none' },
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {item.icon}{item.text}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Grid>

                            {/* Stats row */}
                            <Grid item xs={12} sm={5} md={4}>
                                <Grid container spacing={1.5}>
                                    {STAT_ITEMS.map((s, i) => (
                                        <Grid item xs={6} key={i}>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.92 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1 + i * 0.06 }}
                                            >
                                                <Box sx={{
                                                    p: { xs: 1.75, md: 2 }, borderRadius: 3,
                                                    background: `${s.color}10`,
                                                    border: `1px solid ${s.color}22`,
                                                    position: 'relative', overflow: 'hidden',
                                                }}>
                                                    <Box sx={{ color: s.color, mb: 0.75, display: 'flex' }}>{s.icon}</Box>
                                                    <Typography fontWeight={900} sx={{
                                                        color: s.color,
                                                        fontSize: { xs: '1.15rem', md: '1.35rem' },
                                                        letterSpacing: '-0.5px', lineHeight: 1,
                                                    }}>
                                                        {s.value}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 700, mt: 0.25, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        {s.label}
                                                    </Typography>
                                                </Box>
                                            </motion.div>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </motion.div>

            {/* ══ MAIN GRID ════════════════════════════════════════════════════ */}
            <Grid container spacing={{ xs: 2, md: 2.5 }} alignItems="flex-start">

                {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
                <Grid item xs={12} md={5}>
                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}>
                        <Stack spacing={2.5}>

                            {/* Account Settings */}
                            <SectionCard
                                icon={<PersonIcon sx={{ color: '#fff', fontSize: 15 }} />}
                                title="Account Settings"
                                accentColor="#6366f1"
                                headerRight={
                                    <AnimatePresence mode="wait">
                                        {!isEditing ? (
                                            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <Button
                                                    size="small"
                                                    startIcon={<EditIcon sx={{ fontSize: '12px !important' }} />}
                                                    onClick={() => setIsEditing(true)}
                                                    sx={{
                                                        borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 12,
                                                        color: '#818cf8', px: 1.5, py: 0.7, minWidth: 0,
                                                        border: '1px solid rgba(99,102,241,0.2)',
                                                        '&:hover': { bgcolor: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.4)' },
                                                    }}>
                                                    Edit
                                                </Button>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <Stack direction="row" gap={0.75}>
                                                    <Button size="small" onClick={cancelEdit} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 12, color: 'text.secondary', px: 1.5, py: 0.7, minWidth: 0 }}>
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="small" variant="contained" onClick={handleSave} disabled={saving}
                                                        startIcon={saving ? <CircularProgress size={11} color="inherit" /> : <CheckIcon sx={{ fontSize: '12px !important' }} />}
                                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 12, background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: 'none', px: 1.75, py: 0.7, minWidth: 0 }}>
                                                        Save
                                                    </Button>
                                                </Stack>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                }
                            >
                                <AnimatePresence>
                                    {(error || success) && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                            <Alert severity={error ? 'error' : 'success'} sx={{ mb: 2.5, borderRadius: 2, py: 0.5 }} onClose={() => { setError(''); setSuccess(''); }}>
                                                {error || success}
                                            </Alert>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Stack spacing={2.5}>
                                    <Box>
                                        <FieldLabel>Display Name</FieldLabel>
                                        <TextField fullWidth size="small" value={form.displayName}
                                            onChange={handleField('displayName')} disabled={!isEditing}
                                            placeholder="Your name" sx={inputSx(isEditing)} />
                                    </Box>

                                    <Box>
                                        <FieldLabel>Academic Stage</FieldLabel>
                                        <TextField select fullWidth size="small" value={form.mbbs_year}
                                            onChange={handleField('mbbs_year')} disabled={!isEditing} sx={inputSx(isEditing)}>
                                            {YEARS.map(y => <MenuItem key={y.value} value={y.value}>{y.label}</MenuItem>)}
                                        </TextField>
                                    </Box>

                                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                                    <Box>
                                        <FieldLabel>Institution</FieldLabel>
                                        {isEditing ? (
                                            <Autocomplete freeSolo options={collegesData.colleges} value={form.college}
                                                onChange={(_, v) => handleCollege(v)} onInputChange={(_, v) => handleCollege(v)}
                                                size="small"
                                                renderInput={(params) => (
                                                    <TextField {...params} fullWidth placeholder="e.g. AIIMS Delhi" sx={inputSx(true)} />
                                                )} />
                                        ) : (
                                            <TextField fullWidth size="small" value={form.college || '—'} disabled sx={inputSx(false)} />
                                        )}
                                    </Box>

                                    <Box>
                                        <FieldLabel>
                                            Country
                                            {isEditing && (
                                                <Box component="span" sx={{ ml: 1, color: '#818cf8', fontWeight: 600 }}>
                                                    · auto-detected from college
                                                </Box>
                                            )}
                                        </FieldLabel>
                                        <TextField select fullWidth size="small" value={form.country}
                                            onChange={handleField('country')} disabled={!isEditing} sx={inputSx(isEditing)}>
                                            {COUNTRIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                        </TextField>
                                    </Box>
                                </Stack>
                            </SectionCard>

                            {/* Danger Zone */}
                            <Paper elevation={0} sx={{
                                borderRadius: 4, overflow: 'hidden',
                                border: '1px solid rgba(239,68,68,0.14)',
                                background: 'rgba(239,68,68,0.02)',
                            }}>
                                <Stack direction="row" alignItems="center" gap={1.5}
                                    sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(239,68,68,0.08)' }}>
                                    <Box sx={{
                                        width: 32, height: 32, borderRadius: 2,
                                        bgcolor: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <WarningIcon sx={{ fontSize: 15, color: '#ef4444' }} />
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#ef4444" sx={{ letterSpacing: '-0.2px' }}>
                                        Danger Zone
                                    </Typography>
                                </Stack>
                                <Box sx={{ px: 3, py: 2.5 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.7, fontSize: 13 }}>
                                        Permanently deletes your account and all associated data. This cannot be undone.
                                    </Typography>
                                    <Button
                                        variant="outlined" color="error" size="small"
                                        startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
                                        onClick={() => setDeleteOpen(true)}
                                        sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', fontSize: 13, py: 0.9 }}>
                                        Delete Account
                                    </Button>
                                </Box>
                            </Paper>

                        </Stack>
                    </motion.div>
                </Grid>

                {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
                <Grid item xs={12} md={7}>
                    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
                        <Stack spacing={2.5}>

                            {/* Study Fingerprint */}
                            <SectionCard
                                icon={<BrainIcon sx={{ color: '#fff', fontSize: 15 }} />}
                                title="Study Fingerprint"
                                subtitle="Live analysis of your learning patterns"
                                accentColor="#6366f1"
                                badge={
                                    <Stack direction="row" alignItems="center" gap={0.6} sx={{ ml: 1 }}>
                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 7px rgba(34,197,94,0.85)' }} />
                                        <Typography variant="caption" sx={{ fontSize: 10.5, fontWeight: 700, color: '#22c55e' }}>Live</Typography>
                                    </Stack>
                                }
                            >
                                {habits.length === 0 ? (
                                    <Box sx={{ py: 5, textAlign: 'center' }}>
                                        <BrainIcon sx={{ fontSize: 38, color: 'rgba(255,255,255,0.07)', mb: 1.5 }} />
                                        <Typography variant="body2" color="text.disabled" fontStyle="italic" sx={{ fontSize: 13 }}>
                                            Start studying to generate your fingerprint.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={1.5}>
                                        {habits.map((h, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.1 + i * 0.06 }}
                                            >
                                                <Box sx={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    px: 2, py: 1.5, borderRadius: 2.5,
                                                    background: `${h.color}08`,
                                                    border: `1px solid ${h.color}18`,
                                                    transition: 'background 0.2s',
                                                    '&:hover': { background: `${h.color}12` },
                                                }}>
                                                    <Stack direction="row" alignItems="center" gap={1.5}>
                                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: h.color, flexShrink: 0, boxShadow: `0 0 6px ${h.color}` }} />
                                                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '-0.1px' }}>
                                                            {h.label}
                                                        </Typography>
                                                    </Stack>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: h.color }}>
                                                        {h.value}
                                                    </Typography>
                                                </Box>
                                            </motion.div>
                                        ))}

                                        {studyPlan && progressPct !== null && (
                                            <Box sx={{ mt: 1, pt: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)' }}>
                                                        Study Plan Progress
                                                    </Typography>
                                                    <Stack direction="row" alignItems="center" gap={0.75}>
                                                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{progressPct}%</Typography>
                                                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                                                            · {progressDone} of {progressTotal} topics
                                                        </Typography>
                                                    </Stack>
                                                </Stack>
                                                <LinearProgress
                                                    variant="determinate" value={progressPct}
                                                    sx={{
                                                        height: 6, borderRadius: 6,
                                                        bgcolor: 'rgba(16,185,129,0.1)',
                                                        '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 6 },
                                                    }}
                                                />
                                            </Box>
                                        )}
                                    </Stack>
                                )}
                            </SectionCard>

                            {/* AI Personalised Tips */}
                            <SectionCard
                                icon={<InsightsIcon sx={{ color: '#fff', fontSize: 15 }} />}
                                title="AI Personalised Tips"
                                subtitle="Based on your platform usage & habits"
                                accentColor="#a855f7"
                            >
                                {tips.length === 0 ? (
                                    <Box sx={{ py: 5, textAlign: 'center' }}>
                                        <InsightsIcon sx={{ fontSize: 38, color: 'rgba(255,255,255,0.07)', mb: 1.5 }} />
                                        <Typography variant="body2" color="text.disabled" fontStyle="italic" sx={{ fontSize: 13 }}>
                                            Complete your profile and start studying for personalised tips.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Stack spacing={1.5}>
                                        {tips.map((tip, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.22 + i * 0.07 }}
                                            >
                                                <Box sx={{
                                                    display: 'flex', gap: 1.5, alignItems: 'flex-start',
                                                    px: 2, py: 1.75, borderRadius: 2.5,
                                                    background: 'rgba(255,255,255,0.022)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    borderLeft: '3px solid rgba(168,85,247,0.55)',
                                                    transition: 'background 0.2s, border-left-color 0.2s',
                                                    '&:hover': {
                                                        background: 'rgba(168,85,247,0.05)',
                                                        borderLeftColor: 'rgba(168,85,247,0.85)',
                                                    },
                                                }}>
                                                    <Typography sx={{ fontSize: 17, lineHeight: 1.5, flexShrink: 0, mt: '1px' }}>
                                                        {tip.icon}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.62)' }}>
                                                        {tip.text}
                                                    </Typography>
                                                </Box>
                                            </motion.div>
                                        ))}
                                    </Stack>
                                )}
                            </SectionCard>

                        </Stack>
                    </motion.div>
                </Grid>
            </Grid>

            {/* ══ DELETE DIALOG ════════════════════════════════════════════════ */}
            <Dialog
                open={deleteOpen}
                onClose={() => !deleting && setDeleteOpen(false)}
                PaperProps={{
                    sx: {
                        background: '#0c0c1a', border: '1px solid rgba(239,68,68,0.22)',
                        borderRadius: { xs: '20px 20px 0 0', md: 3 }, p: 1,
                        width: { xs: '100%', md: 'auto' }, maxWidth: 420,
                        m: { xs: 0, md: 'auto' },
                        position: { xs: 'fixed', md: 'relative' },
                        bottom: { xs: 0, md: 'auto' },
                    },
                }}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#ef4444', fontWeight: 800 }}>
                    <WarningIcon sx={{ fontSize: 20 }} /> Delete Account
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'rgba(255,255,255,0.6)', mb: 2.5, lineHeight: 1.75, fontSize: 14 }}>
                        This permanently deletes your account and all data. Type{' '}
                        <strong style={{ color: '#fff' }}>DELETE</strong> to confirm.
                    </DialogContentText>
                    <TextField
                        autoFocus fullWidth variant="outlined" placeholder="DELETE"
                        value={deleteText} onChange={(e) => setDeleteText(e.target.value)} disabled={deleting}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'rgba(239,68,68,0.05)', color: '#ef4444', fontWeight: 800, '& fieldset': { borderColor: 'rgba(239,68,68,0.3)' } } }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => { setDeleteOpen(false); setDeleteText(''); }} disabled={deleting}
                        sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        disabled={deleteText !== 'DELETE' || deleting}
                        color="error" variant="contained"
                        sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                        startIcon={deleting && <CircularProgress size={14} color="inherit" />}>
                        Confirm Deletion
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
