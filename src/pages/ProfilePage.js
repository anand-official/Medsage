import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Avatar, TextField, Button, Grid,
    Paper, IconButton, Divider, CircularProgress, Alert, MenuItem,
    Stack, Chip, Tooltip, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Logout as LogoutIcon,
    School as SchoolIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon,
    Email as EmailIcon,
    LocalFireDepartment as FireIcon,
    MenuBook as BookIcon,
    Insights as GraphIcon,
    AutoAwesome as SparkleIcon,
    Timer as TimerIcon,
    DeleteForever as DeleteIcon,
    Warning as WarningIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStudyContext } from '../contexts/StudyContext';
import { format, differenceInDays } from 'date-fns';

const YEARS = [
    { value: 1, label: '1st Year MBBS' },
    { value: 2, label: '2nd Year MBBS' },
    { value: 3, label: '3rd Year MBBS' },
    { value: 4, label: '4th Year MBBS' },
    { value: 5, label: 'Internship / PG' }
];

// Helper to format large numbers
const compactNum = (num) => Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num || 0);

// Animation variants
const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' } })
};

export default function ProfilePage() {
    const { userProfile, updateOnboardingProfile, logout, deleteAccount } = useAuth();
    const {
        studyPlan, analyticsData, todayData,
        getStudyPlan, fetchAnalytics, fetchToday
    } = useStudyContext();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Delete Account states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        displayName: userProfile?.displayName || '',
        mbbs_year: userProfile?.mbbs_year || '',
        college: userProfile?.college || '',
        country: userProfile?.country || 'India'
    });

    // Load planner data if not already loaded so dashboard feels populated
    useEffect(() => {
        if (!studyPlan) getStudyPlan();
        if (!analyticsData) fetchAnalytics();
        if (!todayData) fetchToday();
    }, [studyPlan, analyticsData, todayData, getStudyPlan, fetchAnalytics, fetchToday]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setError('');
            setSuccess('');
            await updateOnboardingProfile(formData);
            setSuccess('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/signin');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') return;
        try {
            setDeleting(true);
            setError('');
            // Execute exact backend cascade for GDPR compliance
            await deleteAccount();
            navigate('/signin');
        } catch (err) {
            setError(err.message || 'Failed to delete account');
            setDeleteDialogOpen(false);
        } finally {
            setDeleting(false);
        }
    };

    if (!userProfile) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 3 }}>
                <CircularProgress sx={{ color: 'primary.main' }} size={48} thickness={3} />
                <Typography variant="body1" color="text.secondary" fontWeight={600}>
                    Loading your profile…
                </Typography>
                <Typography variant="caption" color="text.disabled">
                    If this takes too long, please check your connection or sign out and back in.
                </Typography>
            </Box>
        );
    }

    // Derived planner metrics
    const streak = analyticsData?.streak?.current || 0;
    const progressTotal = studyPlan?.analytics?.total_tasks || 0;
    const progressDone = studyPlan?.analytics?.completed || 0;
    const progressPct = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;
    const daysLeft = studyPlan?.exam_date ? differenceInDays(new Date(studyPlan.exam_date), new Date()) : null;

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 2 } }}>
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <Typography variant="h3" fontWeight={900} sx={{ mb: 1, letterSpacing: '-1.5px' }}>
                    Command <Box component="span" sx={{ color: 'primary.main' }}>Center</Box>
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
                    Manage your identity and high-level progression metrics.
                </Typography>
            </motion.div>

            {/* Backend unavailable warning */}
            {userProfile?._fallback && (
                <Alert
                    severity="warning"
                    sx={{ mb: 3, borderRadius: 3, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}
                >
                    Running in offline mode — your profile data is loaded from your Google account. Changes may not save until the backend is reachable.
                </Alert>
            )}
            <Grid container spacing={4} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                {/* ── LEFT COLUMN: IDENTITY CARD ── */}
                <Grid item xs={12} md={6}>
                    <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible">
                        <Paper sx={{
                            p: 6, borderRadius: 5, position: 'relative', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center'
                        }}>
                            {/* Abstract Glow */}
                            <Box sx={{
                                position: 'absolute', top: -50, left: -50, width: 200, height: 200,
                                background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
                                zIndex: 0
                            }} />

                            <Avatar
                                src={userProfile.photoURL}
                                sx={{
                                    width: 180, height: 180, mb: 4, zIndex: 1,
                                    border: '6px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    '&:hover': { transform: 'scale(1.08) rotate(2deg)' }
                                }}
                            />

                            <Box sx={{ zIndex: 1, textAlign: 'center', width: '100%' }}>
                                <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                                    {userProfile.displayName || 'Doctor'}
                                </Typography>

                                <Chip
                                    icon={<SchoolIcon fontSize="small" />}
                                    label={`Year ${userProfile.mbbs_year || '?'}`}
                                    size="small"
                                    sx={{
                                        fontWeight: 800, mb: 2,
                                        background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                                        border: '1px solid rgba(99,102,241,0.3)'
                                    }}
                                />

                                <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

                                <Stack spacing={1.5} sx={{ textAlign: 'left', mb: 4 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                        <EmailIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                        <Typography variant="body2" fontWeight={500} noWrap>{userProfile.email}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                        <SchoolIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                        <Typography variant="body2" fontWeight={500} noWrap>{userProfile.college || 'No college set'}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                                        <LocationIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                        <Typography variant="body2" fontWeight={500} noWrap>{userProfile.country || 'No country set'}</Typography>
                                    </Box>
                                </Stack>

                                <Button
                                    variant="outlined" color="error" fullWidth
                                    startIcon={<LogoutIcon />} onClick={handleLogout}
                                    sx={{
                                        borderRadius: 3, fontWeight: 700, textTransform: 'none', py: 1.2,
                                        borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444',
                                        '&:hover': { background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444' }
                                    }}
                                >
                                    Sign Out Securely
                                </Button>
                            </Box>
                        </Paper>

                        {/* MINI METRICS CARD (If Plan Exists) */}
                        {studyPlan && (
                            <Paper sx={{
                                mt: 3, p: 3, borderRadius: 5,
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(5,150,105,0.1))',
                                border: '1px solid rgba(16,185,129,0.2)'
                            }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" fontWeight={800} color="success.main">
                                        Planner Status
                                    </Typography>
                                    <SparkleIcon fontSize="small" sx={{ color: '#10b981' }} />
                                </Stack>
                                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 0.5 }}>
                                    <Typography variant="h3" fontWeight={900} color="#10b981" sx={{ lineHeight: 1 }}>
                                        {progressPct}%
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    Global Completion ({progressDone} / {progressTotal} topics)
                                </Typography>

                                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                                    <Box sx={{ flex: 1, p: 1.5, borderRadius: 3, background: 'rgba(0,0,0,0.2)' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                            <FireIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}>Streak</Typography>
                                        </Box>
                                        <Typography variant="h6" fontWeight={800}>{streak}</Typography>
                                    </Box>
                                    <Box sx={{ flex: 1, p: 1.5, borderRadius: 3, background: 'rgba(0,0,0,0.2)' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                            <TimerIcon sx={{ fontSize: 14, color: '#6366f1' }} />
                                            <Typography variant="caption" color="text.secondary" fontWeight={700}>T-Minus</Typography>
                                        </Box>
                                        <Typography variant="h6" fontWeight={800}>{daysLeft !== null ? daysLeft : '-'}</Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        )}
                    </motion.div>
                </Grid>

                {/* ── RIGHT COLUMN: SETTINGS FORM ── */}
                <Grid item xs={12} md={6}>
                    <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
                        <Paper sx={{
                            p: { xs: 3, md: 5 }, borderRadius: 5,
                            border: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)'
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                <Box>
                                    <Typography variant="h5" fontWeight={900} sx={{ letterSpacing: '-0.5px', mb: 0.5 }}>
                                        Account Settings
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Update your demographics. This syncs directly to the AI study generation engine.
                                    </Typography>
                                </Box>
                                {!isEditing ? (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        variant="outlined"
                                        startIcon={<EditIcon fontSize="small" />}
                                        sx={{
                                            borderRadius: 3, borderColor: 'rgba(99,102,241,0.3)',
                                            color: 'primary.main', textTransform: 'none', fontWeight: 700
                                        }}
                                    >
                                        Edit Details
                                    </Button>
                                ) : (
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFormData({
                                                    displayName: userProfile?.displayName || '',
                                                    mbbs_year: userProfile?.mbbs_year || '',
                                                    college: userProfile?.college || '',
                                                    country: userProfile?.country || 'India'
                                                });
                                                setError('');
                                            }}
                                            sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="contained"
                                            onClick={handleSave}
                                            disabled={loading}
                                            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                            sx={{
                                                borderRadius: 3, background: 'linear-gradient(135deg, #10b981, #059669)',
                                                fontWeight: 800, textTransform: 'none', px: 3,
                                                boxShadow: '0 8px 25px rgba(16,185,129,0.3)',
                                                '&:hover': { background: 'linear-gradient(135deg, #059669, #047857)' }
                                            }}
                                        >
                                            Save Changes
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}
                            {success && <Alert severity="success" sx={{ mb: 4, borderRadius: 2 }}>{success}</Alert>}

                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, ml: 1 }}>
                                        Preferred Display Name
                                    </Typography>
                                    <TextField
                                        fullWidth name="displayName"
                                        value={formData.displayName} onChange={handleChange} disabled={!isEditing}
                                        variant="outlined"
                                        InputProps={{ startAdornment: <PersonIcon sx={{ color: 'text.secondary', mr: 1.5 }} /> }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 3,
                                                bgcolor: isEditing ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'
                                            }
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, ml: 1 }}>
                                        Academic Stage
                                    </Typography>
                                    <TextField
                                        select fullWidth name="mbbs_year"
                                        value={formData.mbbs_year} onChange={handleChange} disabled={!isEditing}
                                        variant="outlined"
                                        InputProps={{ startAdornment: <SchoolIcon sx={{ color: 'text.secondary', mr: 1.5 }} /> }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 3,
                                                bgcolor: isEditing ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'
                                            }
                                        }}
                                    >
                                        {YEARS.map((y) => <MenuItem key={y.value} value={y.value}>{y.label}</MenuItem>)}
                                    </TextField>
                                </Grid>

                                <Grid item xs={12}>
                                    <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.05)' }} />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, ml: 1 }}>
                                        Institution
                                    </Typography>
                                    <TextField
                                        fullWidth name="college"
                                        value={formData.college} onChange={handleChange} disabled={!isEditing}
                                        variant="outlined"
                                        InputProps={{ startAdornment: <BookIcon sx={{ color: 'text.secondary', mr: 1.5 }} /> }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 3,
                                                bgcolor: isEditing ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'
                                            }
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, ml: 1 }}>
                                        Country of Study
                                    </Typography>
                                    <TextField
                                        select fullWidth name="country"
                                        value={formData.country} onChange={handleChange} disabled={!isEditing}
                                        variant="outlined"
                                        InputProps={{ startAdornment: <LocationIcon sx={{ color: 'text.secondary', mr: 1.5 }} /> }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 3,
                                                bgcolor: isEditing ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.2)'
                                            }
                                        }}
                                    >
                                        <MenuItem value="India">India</MenuItem>
                                        <MenuItem value="United States">United States</MenuItem>
                                        <MenuItem value="United Kingdom">United Kingdom</MenuItem>
                                        <MenuItem value="Australia">Australia</MenuItem>
                                        <MenuItem value="Singapore">Singapore</MenuItem>
                                        <MenuItem value="Other">Other</MenuItem>
                                    </TextField>
                                </Grid>
                            </Grid>
                        </Paper>


                        {/* ── DANGER ZONE ── */}
                        <Paper sx={{
                            mt: 4, p: { xs: 3, md: 5 }, borderRadius: 5,
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.03)', backdropFilter: 'blur(10px)'
                        }}>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                <Box sx={{
                                    p: 1.5, borderRadius: 3, background: 'rgba(239, 68, 68, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <WarningIcon sx={{ color: '#ef4444' }} />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" fontWeight={800} color="#ef4444" sx={{ mb: 0.5 }}>
                                        Danger Zone
                                    </Typography>
                                    <Typography variant="body2" color="rgba(255,255,255,0.6)" sx={{ mb: 3 }}>
                                        Permanently delete your account and all associated data (study plans, analytics, and settings). This action is irreversible.
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<DeleteIcon />}
                                        onClick={() => setDeleteDialogOpen(true)}
                                        sx={{
                                            borderRadius: 3, fontWeight: 700, textTransform: 'none',
                                            borderWidth: 2, '&:hover': { borderWidth: 2, background: 'rgba(239,68,68,0.1)' }
                                        }}
                                    >
                                        Delete Account
                                    </Button>
                                </Box>
                            </Box>
                        </Paper>

                    </motion.div>
                </Grid>
            </Grid>

            {/* Delete Account Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => !deleting && setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: {
                        background: '#0f0a1c',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 4,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                        p: 1
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#ef4444', fontWeight: 800 }}>
                    <WarningIcon />
                    Delete Account
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                        This will permanently delete your Medsage account and remove all of your progress, study plans, and data.
                        <br /><br />
                        Type <strong>DELETE</strong> below to confirm.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        variant="outlined"
                        placeholder="DELETE"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        disabled={deleting}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: '#ef4444',
                                fontWeight: 800
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => { setDeleteDialogOpen(false); setDeleteConfirmText(''); }}
                        disabled={deleting}
                        sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || deleting}
                        color="error"
                        variant="contained"
                        sx={{ borderRadius: 3, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                        startIcon={deleting && <CircularProgress size={16} color="inherit" />}
                    >
                        Confirm Deletion
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
