import React, { useState, useEffect } from 'react';
import {
    Dialog, Typography, Box, TextField, Button, MenuItem, Stack, Slide,
    Avatar, useTheme, useMediaQuery, IconButton, Autocomplete
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    School as SchoolIcon, LocationOn as LocationIcon, CheckCircle as CheckCircleIcon,
    AutoAwesome as SparkleIcon, PersonOutline as PersonIcon, ArrowForward as ArrowForwardIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import collegesData from '../../data/colleges.json';
import '../../animations.css';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const YEARS = [
    { value: 1, label: '1st Year MBBS (Pre-Clinical)' },
    { value: 2, label: '2nd Year MBBS (Para-Clinical)' },
    { value: 3, label: '3rd Year MBBS (Part 1)' },
    { value: 4, label: '4th Year MBBS (Part 2 - Final)' },
    { value: 5, label: 'Internship / Post-Graduate' }
];

export default function Onboarding() {
    const { userProfile, updateOnboardingProfile } = useAuth();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        displayName: '',
        mbbs_year: '',
        college: '',
        country: 'India'
    });

    useEffect(() => {
        if (userProfile && !userProfile.onboarded) {
            setFormData(prev => ({ ...prev, displayName: userProfile.displayName || '' }));
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [userProfile]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleNext = () => {
        if (step === 1 && !formData.displayName.trim()) {
            setError('Please enter your name'); return;
        }
        if (step === 2 && !formData.mbbs_year) {
            setError('Please select your current year'); return;
        }
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
        setError('');
    };

    const handleSubmit = async () => {
        if (!formData.college.trim()) {
            setError('Please enter your college name'); return;
        }
        try {
            setLoading(true); setError('');
            await updateOnboardingProfile({ ...formData, onboarded: true });
            // setOpen(false) is handled by the useEffect watching userProfile.onboarded
        } catch (err) {
            console.error('Onboarding save failed:', err);
            // Backend unreachable — close gracefully anyway
            setError('');
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { title: "Welcome", desc: "Let's personalize your clinical intelligence suite." },
        { title: "Academic Stage", desc: "Helps AI tailor medical content to your exact level." },
        { title: "Final Details", desc: "Join the network of future medical leaders." }
    ];

    return (
        <Dialog
            open={open}
            TransitionComponent={Transition}
            keepMounted={false}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    borderRadius: 6,
                    height: { xs: 'auto', md: '600px' },
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
                }
            }}
        >
            {/* Sidebar / Top area */}
            <Box sx={{
                width: isMobile ? '100%' : '35%',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                p: 4,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                color: 'white'
            }}>
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: 'radial-gradient(circle at top left, rgba(99,102,241,0.2) 0%, transparent 50%)',
                    zIndex: 0
                }} />

                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 6 }}>
                        <Avatar src={userProfile?.photoURL} sx={{ width: 56, height: 56, border: '2px solid rgba(255,255,255,0.2)' }} />
                        <Typography variant="h6" fontWeight={800}>Setup Profile</Typography>
                    </Box>

                    {!isMobile && (
                        <Stack spacing={4}>
                            {steps.map((s, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, opacity: step >= i + 1 ? 1 : 0.4 }}>
                                    <Box sx={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        bgcolor: step === i + 1 ? '#6366f1' : (step > i + 1 ? '#10b981' : 'rgba(255,255,255,0.1)'),
                                        color: 'white', fontWeight: 700, fontSize: '0.9rem'
                                    }}>
                                        {step > i + 1 ? <CheckCircleIcon fontSize="small" /> : i + 1}
                                    </Box>
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight={700}>{s.title}</Typography>
                                        <Typography variant="caption" color="rgba(255,255,255,0.6)">{s.desc}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </Box>

                {!isMobile && (
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="caption" color="rgba(255,255,255,0.4)">
                            Medsage secure onboarding process
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Form Area */}
            <Box sx={{
                flex: 1, p: { xs: 4, md: 6 },
                display: 'flex', flexDirection: 'column',
                position: 'relative', bgcolor: 'background.default'
            }}>

                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 1, letterSpacing: '-0.5px' }} className="premium-text-shimmer">
                        {steps[step - 1].title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
                        {steps[step - 1].desc}
                    </Typography>

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                <TextField
                                    fullWidth label="Preferred Name" name="displayName"
                                    value={formData.displayName} onChange={handleChange}
                                    variant="outlined"
                                    InputProps={{ startAdornment: <PersonIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} /> }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                                />
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                <TextField
                                    select fullWidth label="Current MBBS Year" name="mbbs_year"
                                    value={formData.mbbs_year} onChange={handleChange}
                                    variant="outlined"
                                    InputProps={{ startAdornment: <SchoolIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} /> }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                                >
                                    {YEARS.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                    ))}
                                </TextField>
                                <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)', display: 'flex', gap: 2 }}>
                                    <SparkleIcon sx={{ color: '#a855f7' }} />
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                        The Study Planner uses this to automatically filter the massive MBBS curriculum down to exactly what you need to study right now.
                                    </Typography>
                                </Box>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                <Stack spacing={3}>
                                    <Autocomplete
                                        freeSolo
                                        options={collegesData.colleges}
                                        value={formData.college}
                                        onChange={(event, newValue) => {
                                            setFormData(prev => ({ ...prev, college: newValue || '' }));
                                            setError('');
                                        }}
                                        onInputChange={(event, newInputValue) => {
                                            setFormData(prev => ({ ...prev, college: newInputValue || '' }));
                                            setError('');
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                fullWidth label="Medical College / University" name="college"
                                                variant="outlined" placeholder="e.g. AIIMS Delhi"
                                                InputProps={{
                                                    ...params.InputProps,
                                                    startAdornment: (
                                                        <>
                                                            <SchoolIcon color="primary" sx={{ mr: 1, ml: 1, opacity: 0.7 }} />
                                                            {params.InputProps.startAdornment}
                                                        </>
                                                    )
                                                }}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                                            />
                                        )}
                                    />
                                    <TextField
                                        select fullWidth label="Country of Study" name="country"
                                        value={formData.country} onChange={handleChange}
                                        variant="outlined"
                                        InputProps={{ startAdornment: <LocationIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} /> }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
                                    >
                                        <MenuItem value="India">India</MenuItem>
                                        <MenuItem value="United States">United States</MenuItem>
                                        <MenuItem value="United Kingdom">United Kingdom</MenuItem>
                                        <MenuItem value="Australia">Australia</MenuItem>
                                        <MenuItem value="Other">Other</MenuItem>
                                    </TextField>
                                </Stack>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {error && (
                        <Typography variant="caption" color="error" sx={{ mt: 3, display: 'block' }}>
                            {error}
                        </Typography>
                    )}
                </Box>

                {/* Footer Nav */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Button
                        disabled={step === 1 || loading} onClick={handleBack}
                        startIcon={<ArrowBackIcon />}
                        sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}
                    >
                        Back
                    </Button>

                    {step < 3 ? (
                        <Button
                            variant="contained" onClick={handleNext} endIcon={<ArrowForwardIcon />}
                            sx={{
                                borderRadius: 3, px: 3, py: 1.2, fontWeight: 700, textTransform: 'none',
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                boxShadow: '0 8px 25px rgba(99,102,241,0.3)'
                            }}
                        >
                            Continue
                        </Button>
                    ) : (
                        <Button
                            variant="contained" onClick={handleSubmit} disabled={loading}
                            startIcon={loading ? undefined : <CheckCircleIcon />}
                            sx={{
                                borderRadius: 3, px: 3, py: 1.2, fontWeight: 700, textTransform: 'none',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                boxShadow: '0 8px 25px rgba(16,185,129,0.3)',
                                '&:hover': { background: 'linear-gradient(135deg, #059669, #047857)' }
                            }}
                        >
                            {loading ? 'Saving...' : 'Complete Setup'}
                        </Button>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
}
