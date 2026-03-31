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
function generateInsights({ streak, progressPct, daysLeft, mbbs_year }) {
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


    if (daysLeft !== null && daysLeft < 14) {
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

// ─── inputSx ─────────────────────────────────────────────────────────────────
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

    // Sync form from server when profile fields change, but never clobber in-progress edits.
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
    const daysLeft = studyPlan?.exam_date ? differenceInDays(new Date(studyPlan.exam_date), new Date()) : null;
    const { habits, tips } = useMemo(
        () => generateInsights({ streak, progressPct, daysLeft, mbbs_year: userProfile.mbbs_year }),
        [streak, progressPct, daysLeft, userProfile.mbbs_year]
    );

    const STAT_ITEMS = [
        { icon: <FireIcon sx={{ fontSize: 18 }} />, value: `${streak}d`, label: 'Streak', color: '#f97316' },
        { icon: <TrendIcon sx={{ fontSize: 18 }} />, value: progressPct !== null ? `${progressPct}%` : '—', label: 'Progress', color: '#6366f1' },
        { icon: <SparkleIcon sx={{ fontSize: 18 }} />, value: progressDone > 0 ? `${progressDone}` : '—', label: 'Tasks Done', color: '#a855f7' },
        { icon: <TimerIcon sx={{ fontSize: 18 }} />, value: daysLeft !== null && daysLeft > 0 ? `${daysLeft}d` : '—', label: 'To Exam', color: daysLeft !== null && daysLeft < 14 ? '#ef4444' : daysLeft !== null && daysLeft < 30 ? '#f59e0b' : '#22c55e' },
    ];

    return (
        <Box sx={{
            maxWidth: 1400,
            mx: 'auto',
            px: { xs: 1.5, sm: 2.5, md: 3 },
            pb: { xs: 12, md: 8 },
        }}>

            {/* ══════════════════════════════════════════════════════════════
                PAGE TITLE
            ══════════════════════════════════════════════════════════════ */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: { xs: 3, md: 4 } }}>
                    <Box>
                        <Typography variant="h3" fontWeight={900} sx={{
                            fontSize: { xs: '1.6rem', sm: '2rem', md: '2.5rem' },
                            letterSpacing: '-2px', lineHeight: 1,
                        }}>
                            Command{' '}
                            <Box component="span" sx={{
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                                Center
                            </Box>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: 13 }}>
                            Your profile, study fingerprint &amp; AI insights.
                        </Typography>
                    </Box>
                    <Button
                        variant="outlined" size="small"
                        startIcon={<LogoutIcon sx={{ fontSize: '15px !important' }} />}
                        onClick={handleLogout}
                        sx={{
                            borderRadius: 2.5, textTransform: 'none', fontWeight: 700, fontSize: 13,
                            borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)',
                            px: 2, py: 1,
                            '&:hover': { borderColor: '#ef4444', color: '#ef4444', bgcolor: 'rgba(239,68,68,0.07)' },
                        }}
                    >
                        Sign out
                    </Button>
                </Stack>
            </motion.div>

            {userProfile?._fallback && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>Offline mode — changes may not save until the backend is reachable.</Alert>
            )}

            {/* ══════════════════════════════════════════════════════════════
                IDENTITY + STATS HERO CARD
            ══════════════════════════════════════════════════════════════ */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
                <Paper elevation={0} sx={{
                    mb: { xs: 2.5, md: 3 },
                    borderRadius: 4,
                    border: '1px solid rgba(99,102,241,0.2)',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.06) 50%, rgba(10,10,16,0.8) 100%)',
                    overflow: 'hidden',
                    position: 'relative',
                }}>
                    {/* Decorative blobs */}
                    <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

                    <Box sx={{ p: { xs: 2.5, sm: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
                        <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
                            {/* Identity */}
                            <Grid item xs={12} sm={7} md={8}>
                                <Stack direction="row" alignItems="center" gap={{ xs: 2, md: 3 }}>
                                    <Avatar src={userProfile.photoURL} sx={{
                                        width: { xs: 64, md: 80 }, height: { xs: 64, md: 80 }, flexShrink: 0,
                                        border: '3px solid rgba(99,102,241,0.4)',
                                        boxShadow: '0 0 0 6px rgba(99,102,241,0.08), 0 12px 40px rgba(0,0,0,0.5)',
                                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                    }} />
                                    <Box sx={{ minWidth: 0 }}>
                                        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 0.5 }}>
                                            <Typography variant="h5" fontWeight={900} sx={{
                                                letterSpacing: '-0.5px', lineHeight: 1,
                                                fontSize: { xs: '1.25rem', md: '1.5rem' },
                                            }}>
                                                {userProfile.displayName || 'Doctor'}
                                            </Typography>
                                            <Chip label={YEARS.find(y => y.value === userProfile.mbbs_year)?.label || `Year ${userProfile.mbbs_year || '?'}`}
                                                size="small"
                                                sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(99,102,241,0.18)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 1.5 }}
                                            />
                                        </Stack>
                                        <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mt: 1 }}>
                                            {[
                                                { icon: <EmailIcon sx={{ fontSize: 12 }} />, text: userProfile.email },
                                                userProfile.college && { icon: <SchoolIcon sx={{ fontSize: 12 }} />, text: userProfile.college },
                                                userProfile.country && { icon: <LocationIcon sx={{ fontSize: 12 }} />, text: userProfile.country },
                                            ].filter(Boolean).map((item, i) => (
                                                <Typography key={i} variant="caption" color="text.secondary"
                                                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 12,
                                                        maxWidth: { xs: 220, md: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.icon}{item.text}
                                                </Typography>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Grid>

                            {/* Stats 2x2 */}
                            <Grid item xs={12} sm={5} md={4}>
                                <Grid container spacing={1.5}>
                                    {STAT_ITEMS.map((s, i) => (
                                        <Grid item xs={6} key={i}>
                                            <Box sx={{
                                                p: { xs: 1.5, md: 1.75 }, borderRadius: 3,
                                                background: `${s.color}12`,
                                                border: `1px solid ${s.color}25`,
                                                display: 'flex', flexDirection: 'column', gap: 0.25,
                                            }}>
                                                <Box sx={{ color: s.color, display: 'flex', mb: 0.25 }}>{s.icon}</Box>
                                                {s.value === null ? (
                                                    <CircularProgress size={14} sx={{ color: s.color }} />
                                                ) : (
                                                    <Typography fontWeight={900} sx={{ color: s.color, fontSize: { xs: 16, md: 20 }, lineHeight: 1 }}>
                                                        {s.value}
                                                    </Typography>
                                                )}
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 600 }}>{s.label}</Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </motion.div>

            {/* ══════════════════════════════════════════════════════════════
                MAIN CONTENT GRID
            ══════════════════════════════════════════════════════════════ */}
            <Grid container spacing={{ xs: 2, md: 2.5 }} alignItems="flex-start">

                {/* ── LEFT: Settings + Danger ─────────────────────────────── */}
                <Grid item xs={12} md={5}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}>
                        <Stack spacing={2.5}>

                            {/* Account Settings */}
                            <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}>
                                {/* Header */}
                                <Stack direction="row" alignItems="center" justifyContent="space-between"
                                    sx={{ px: { xs: 2.5, md: 3 }, py: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <Stack direction="row" alignItems="center" gap={1.5}>
                                        <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <PersonIcon sx={{ fontSize: 15, color: '#818cf8' }} />
                                        </Box>
                                        <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '-0.2px' }}>Account Settings</Typography>
                                    </Stack>
                                    <AnimatePresence mode="wait">
                                        {!isEditing ? (
                                            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <Button size="small" startIcon={<EditIcon sx={{ fontSize: '13px !important' }} />}
                                                    onClick={() => setIsEditing(true)}
                                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 12, color: '#818cf8', px: 1.5, minWidth: 0, py: 0.75, '&:hover': { bgcolor: 'rgba(99,102,241,0.08)' } }}>
                                                    Edit
                                                </Button>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                <Stack direction="row" gap={0.75}>
                                                    <Button size="small" onClick={cancelEdit}
                                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 12, color: 'text.secondary', px: 1.5, py: 0.75, minWidth: 0 }}>
                                                        Cancel
                                                    </Button>
                                                    <Button size="small" variant="contained" onClick={handleSave} disabled={saving}
                                                        startIcon={saving ? <CircularProgress size={11} color="inherit" /> : <CheckIcon sx={{ fontSize: '13px !important' }} />}
                                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, fontSize: 12, background: 'linear-gradient(135deg, #6366f1, #a855f7)', boxShadow: 'none', px: 1.75, py: 0.75, minWidth: 0 }}>
                                                        Save
                                                    </Button>
                                                </Stack>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Stack>

                                {/* Form */}
                                <Box sx={{ px: { xs: 2.5, md: 3 }, py: 3 }}>
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
                                                {isEditing && <Box component="span" sx={{ ml: 1, color: '#818cf8', fontWeight: 600 }}>· auto-detected from college</Box>}
                                            </FieldLabel>
                                            <TextField select fullWidth size="small" value={form.country}
                                                onChange={handleField('country')} disabled={!isEditing} sx={inputSx(isEditing)}>
                                                {COUNTRIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                                            </TextField>
                                        </Box>
                                    </Stack>
                                </Box>
                            </Paper>

                            {/* Danger Zone */}
                            <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.015)' }}>
                                <Stack direction="row" alignItems="center" gap={1.5}
                                    sx={{ px: { xs: 2.5, md: 3 }, py: 2, borderBottom: '1px solid rgba(239,68,68,0.08)' }}>
                                    <Box sx={{ width: 30, height: 30, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <WarningIcon sx={{ fontSize: 15, color: '#ef4444' }} />
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight={800} color="#ef4444" sx={{ letterSpacing: '-0.2px' }}>Danger Zone</Typography>
                                </Stack>
                                <Box sx={{ px: { xs: 2.5, md: 3 }, py: 2.5 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65, fontSize: 13 }}>
                                        Permanently deletes your account and all associated data. This cannot be undone.
                                    </Typography>
                                    <Button variant="outlined" color="error" size="small"
                                        startIcon={<DeleteIcon sx={{ fontSize: '15px !important' }} />}
                                        onClick={() => setDeleteOpen(true)}
                                        sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', fontSize: 13, py: 1 }}>
                                        Delete Account
                                    </Button>
                                </Box>
                            </Paper>
                        </Stack>
                    </motion.div>
                </Grid>

                {/* ── RIGHT: Fingerprint + AI Tips ────────────────────────── */}
                <Grid item xs={12} md={7}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18 }}>
                        <Stack spacing={2.5}>

                            {/* Study Fingerprint */}
                            <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.18)', background: 'linear-gradient(145deg, rgba(99,102,241,0.07) 0%, rgba(168,85,247,0.04) 100%)' }}>
                                <Stack direction="row" alignItems="center" gap={1.5}
                                    sx={{ px: { xs: 2.5, md: 3 }, py: 2, borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                                    <Box sx={{ width: 30, height: 30, borderRadius: 2, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                                        <BrainIcon sx={{ color: '#fff', fontSize: 15 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: '-0.2px' }}>Study Fingerprint</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Live analysis of your learning patterns</Typography>
                                    </Box>
                                    <Stack direction="row" alignItems="center" gap={0.75}>
                                        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.8)' }} />
                                        <Typography variant="caption" color="#22c55e" fontWeight={700} sx={{ fontSize: 11 }}>Live</Typography>
                                    </Stack>
                                </Stack>

                                <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                                    {habits.length === 0 ? (
                                        <Box sx={{ py: 4, textAlign: 'center' }}>
                                            <BrainIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.08)', mb: 1 }} />
                                            <Typography variant="body2" color="text.disabled" fontStyle="italic">Start studying to generate your fingerprint.</Typography>
                                        </Box>
                                    ) : (
                                        <>
                                            <Grid container spacing={1.5}>
                                                {habits.map((h, i) => (
                                                    <Grid item xs={6} sm={4} md={3} key={i}>
                                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}>
                                                            <Box sx={{
                                                                p: { xs: 1.75, md: 2 }, borderRadius: 3,
                                                                background: `${h.color}0d`,
                                                                border: `1px solid ${h.color}20`,
                                                                height: '100%',
                                                            }}>
                                                                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: h.color, mb: 1, boxShadow: `0 0 5px ${h.color}` }} />
                                                                <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.5 }}>
                                                                    {h.label}
                                                                </Typography>
                                                                <Typography sx={{ color: h.color, fontWeight: 800, fontSize: 13, lineHeight: 1.3 }}>
                                                                    {h.value}
                                                                </Typography>
                                                            </Box>
                                                        </motion.div>
                                                    </Grid>
                                                ))}
                                            </Grid>

                                            {studyPlan && progressPct !== null && (
                                                <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: 'rgba(255,255,255,0.35)' }}>
                                                            Study Plan Progress
                                                        </Typography>
                                                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{progressPct}%</Typography>
                                                    </Stack>
                                                    <LinearProgress variant="determinate" value={progressPct} sx={{ height: 5, borderRadius: 6, bgcolor: 'rgba(16,185,129,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 6 } }} />
                                                    <Typography sx={{ mt: 0.75, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                                                        {progressDone} of {progressTotal} topics completed
                                                    </Typography>
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </Box>
                            </Paper>

                            {/* AI Personalised Tips */}
                            <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(168,85,247,0.18)', background: 'linear-gradient(145deg, rgba(168,85,247,0.06) 0%, rgba(236,72,153,0.03) 100%)' }}>
                                <Stack direction="row" alignItems="center" gap={1.5}
                                    sx={{ px: { xs: 2.5, md: 3 }, py: 2, borderBottom: '1px solid rgba(168,85,247,0.12)' }}>
                                    <Box sx={{ width: 30, height: 30, borderRadius: 2, background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(168,85,247,0.3)' }}>
                                        <InsightsIcon sx={{ color: '#fff', fontSize: 15 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: '-0.2px' }}>AI Personalised Tips</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>Based on your platform usage &amp; habits</Typography>
                                    </Box>
                                </Stack>

                                <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                                    {tips.length === 0 ? (
                                        <Box sx={{ py: 4, textAlign: 'center' }}>
                                            <InsightsIcon sx={{ fontSize: 36, color: 'rgba(255,255,255,0.08)', mb: 1 }} />
                                            <Typography variant="body2" color="text.disabled" fontStyle="italic">Complete your profile and start studying for personalised tips.</Typography>
                                        </Box>
                                    ) : (
                                        <Grid container spacing={1.5}>
                                            {tips.map((tip, i) => (
                                                <Grid item xs={12} sm={6} key={i}>
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.25 + i * 0.07, duration: 0.3 }}
                                                        style={{ height: '100%' }}
                                                    >
                                                        <Box sx={{
                                                            display: 'flex', gap: 1.5, alignItems: 'flex-start',
                                                            p: { xs: 1.75, md: 2 }, borderRadius: 3, height: '100%',
                                                            background: 'rgba(255,255,255,0.025)',
                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                            transition: 'background 0.2s',
                                                            '&:hover': { background: 'rgba(255,255,255,0.045)' },
                                                        }}>
                                                            <Typography sx={{ fontSize: 16, lineHeight: 1.5, flexShrink: 0 }}>{tip.icon}</Typography>
                                                            <Typography sx={{ fontSize: 12.5, lineHeight: 1.65, color: 'rgba(255,255,255,0.65)' }}>
                                                                {tip.text}
                                                            </Typography>
                                                        </Box>
                                                    </motion.div>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    )}
                                </Box>
                            </Paper>

                        </Stack>
                    </motion.div>
                </Grid>
            </Grid>

            {/* ══════════════════════════════════════════════════════════════
                DELETE DIALOG
            ══════════════════════════════════════════════════════════════ */}
            <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}
                PaperProps={{ sx: { background: '#0d0d18', border: '1px solid rgba(239,68,68,0.25)', borderRadius: { xs: '20px 20px 0 0', md: 3 }, p: 1, width: { xs: '100%', md: 'auto' }, maxWidth: 420, m: { xs: 0, md: 'auto' }, position: { xs: 'fixed', md: 'relative' }, bottom: { xs: 0, md: 'auto' } } }}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#ef4444', fontWeight: 800 }}>
                    <WarningIcon sx={{ fontSize: 20 }} /> Delete Account
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'rgba(255,255,255,0.6)', mb: 2.5, lineHeight: 1.7 }}>
                        This permanently deletes your account and all data. Type <strong style={{ color: '#fff' }}>DELETE</strong> to confirm.
                    </DialogContentText>
                    <TextField autoFocus fullWidth variant="outlined" placeholder="DELETE"
                        value={deleteText} onChange={(e) => setDeleteText(e.target.value)} disabled={deleting}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'rgba(239,68,68,0.05)', color: '#ef4444', fontWeight: 800, '& fieldset': { borderColor: 'rgba(239,68,68,0.3)' } } }} />
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => { setDeleteOpen(false); setDeleteText(''); }} disabled={deleting}
                        sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleDelete} disabled={deleteText !== 'DELETE' || deleting} color="error" variant="contained"
                        sx={{ borderRadius: 2.5, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                        startIcon={deleting && <CircularProgress size={14} color="inherit" />}>
                        Confirm Deletion
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
