import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Button, TextField, Chip,
    Paper, CircularProgress, Alert, Grid,
    Accordion, AccordionSummary, AccordionDetails, Collapse
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudyContext } from '../../contexts/StudyContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
    AutoAwesome as SparkleIcon, 
    CalendarMonth as CalendarIcon,
    ExpandMore as ExpandMoreIcon,
    ArrowForward as ArrowForwardIcon,
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { plannerAPI } from '../../services/plannerService';

const ALL_SUBJECTS = {
    1: ['Anatomy', 'Physiology', 'Biochemistry'],
    2: ['Pathology', 'Pharmacology', 'Microbiology'],
    3: ['PSM', 'ENT', 'Ophthalmology'],
    4: ['Medicine', 'Surgery', 'OBGYN', 'Pediatrics'],
    5: ['Internship']
};

export default function PlannerSetup({ onCancel }) {
    const { userProfile } = useAuth();
    const {
        examDate, setExamDate,
        setSelectedSubjects,
        weakTopics, setWeakTopics,
        strongTopics, setStrongTopics,
        generateStudyPlan, isGenerating, error, setError,
        studyPlan
    } = useStudyContext();

    const [activeStep, setActiveStep] = useState(0);
    const [syllabus, setSyllabus] = useState({});
    const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
    const [syllabusError, setSyllabusError] = useState(null);

    // Initialise year: prefer existing plan's year, then user profile, then default 1
    const [selectedYear, setSelectedYear] = useState(
        studyPlan?.mbbs_year || userProfile?.mbbs_year || 1
    );

    // Keep year in sync if profile loads after mount (only when no existing plan)
    useEffect(() => {
        if (!studyPlan && userProfile?.mbbs_year) {
            setSelectedYear(userProfile.mbbs_year);
        }
    }, [userProfile, studyPlan]);

    // Fetch Syllabus when the selectedYear changes
    useEffect(() => {
        if (selectedYear) {
            const subjectsForYear = ALL_SUBJECTS[selectedYear] || [];
            setSelectedSubjects(subjectsForYear);
            fetchSyllabus(selectedYear, userProfile?.country || 'India');
            // reset selections if year changes to avoid orphaned topics
            setWeakTopics([]);
            setStrongTopics([]);
        }
    }, [selectedYear, setSelectedSubjects, userProfile?.country, setWeakTopics, setStrongTopics]);

    const fetchSyllabus = async (year, country) => {
        setSyllabusError(null);
        try {
            setIsLoadingSyllabus(true);
            const res = await plannerAPI.getSyllabus(year, country);
            if (res.data) setSyllabus(res.data);
        } catch (err) {
            console.error("Failed to load syllabus:", err);
            setSyllabusError('Could not load syllabus topics. You can still generate a plan — the AI will use broad subject knowledge.');
        } finally {
            setIsLoadingSyllabus(false);
        }
    };

    const toggleTopic = (topic, type) => {
        if (error && setError) setError(null);

        if (type === 'weak') {
            if (weakTopics.includes(topic)) {
                setWeakTopics(prev => prev.filter(t => t !== topic));
            } else {
                setWeakTopics(prev => [...prev, topic]);
                setStrongTopics(prev => prev.filter(t => t !== topic)); // Remove mutually exclusive
            }
        } else {
            if (strongTopics.includes(topic)) {
                setStrongTopics(prev => prev.filter(t => t !== topic));
            } else {
                setStrongTopics(prev => [...prev, topic]);
                setWeakTopics(prev => prev.filter(t => t !== topic)); // Remove mutually exclusive
            }
        }
    };

    const handleGenerate = async () => {
        await generateStudyPlan(selectedYear);
    };

    // Validation: Date must be in the future (at least tomorrow)
    const isStep1Valid = !!examDate && new Date(examDate) >= new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // UI steps configuration
    const steps = [
        { label: 'Exam Timeline', description: 'When is your final exam?' },
        { label: 'Weak Topics', description: 'What chapters slow you down?' },
        { label: 'Strong Topics', description: 'What chapters are you confident in?' }
    ];

    const nextStep = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 0));

    // Render topics grouped by subject inside an Accordion
    const renderTopicSelection = (type) => {
        if (isLoadingSyllabus) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                </Box>
            );
        }

        const isWeak = type === 'weak';
        const activeColor = isWeak ? 'error' : 'success';
        const selectedList = isWeak ? weakTopics : strongTopics;

        if (syllabusError) {
            return <Alert severity="warning" sx={{ borderRadius: 3 }}>{syllabusError}</Alert>;
        }

        if (Object.keys(syllabus).length === 0) {
            return <Typography color="text.secondary">No detailed topics available for this year. AI will rely on broad subjects.</Typography>;
        }

        return (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(syllabus).map(([subject, topics]) => (
                    <Accordion key={subject} variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography fontWeight={600}>{subject}</Typography>
                            {/* Show count badge if topics selected here */}
                            {topics.some(t => selectedList.includes(t)) && (
                                <Box sx={{ ml: 2, px: 1.5, py: 0.2, bgcolor: `${activeColor}.light`, color: `${activeColor}.contrastText`, borderRadius: 10, fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {topics.filter(t => selectedList.includes(t)).length} selected
                                </Box>
                            )}
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {topics.map(topic => (
                                    <Chip
                                        key={topic}
                                        label={topic}
                                        clickable
                                        onClick={() => toggleTopic(topic, type)}
                                        color={selectedList.includes(topic) ? activeColor : "default"}
                                        variant={selectedList.includes(topic) ? "filled" : "outlined"}
                                        sx={{ fontWeight: selectedList.includes(topic) ? 600 : 400, transition: 'all 0.2s' }}
                                    />
                                ))}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        );
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}>

                {/* Decorative background */}
                <Box sx={{
                    position: 'absolute', top: 0, right: 0, width: 300, height: 300,
                    background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
                    transform: 'translate(30%, -30%)', zIndex: 0
                }} />

                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: 3, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SparkleIcon sx={{ color: 'white' }} />
                        </Box>
                        <Box>
                            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>Configure Your AI Map</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Tailor the spaced-repetition plan exactly down to the chapter level.
                            </Typography>
                        </Box>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

                    {/* Stepper Progress */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                        {steps.map((step, index) => (
                            <Box key={index} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: index <= activeStep ? 'primary.main' : 'grey.200', transition: 'background-color 0.3s' }} />
                        ))}
                    </Box>

                    <Box sx={{ minHeight: 300 }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                                    Step {activeStep + 1}: {steps[activeStep].label}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                                    {steps[activeStep].description}
                                </Typography>

                                {activeStep === 0 && (
                                    <Grid container spacing={4}>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                select
                                                fullWidth
                                                label="Current MBBS Year"
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                                SelectProps={{ native: true }}
                                                InputLabelProps={{ shrink: true }}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                            >
                                                <option value={1}>1st Year (Pre-Clinical)</option>
                                                <option value={2}>2nd Year (Para-Clinical)</option>
                                                <option value={3}>3rd Year (Clinical Part 1)</option>
                                                <option value={4}>4th Year (Clinical Part 2)</option>
                                                <option value={5}>5th Year (Internship)</option>
                                            </TextField>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                type="date"
                                                fullWidth
                                                label="Target Exam Date"
                                                value={examDate || ''}
                                                onChange={(e) => {
                                                    setExamDate(e.target.value);
                                                    if (error && setError) setError(null);
                                                }}
                                                InputLabelProps={{ shrink: true }}
                                                InputProps={{ startAdornment: <CalendarIcon color="action" sx={{ mr: 1 }} /> }}
                                                inputProps={{ 
                                                    min: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                                                }}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                            />
                                        </Grid>
                                    </Grid>
                                )}

                                {activeStep === 1 && (
                                    <Box>
                                        <Alert severity="error" icon={false} sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}>
                                            <Typography variant="subtitle2" fontWeight={700}>Prioritize these topics</Typography>
                                            <Typography variant="body2">The AI will schedule these topics earlier and review them more frequently.</Typography>
                                        </Alert>
                                        {renderTopicSelection('weak')}
                                    </Box>
                                )}

                                {activeStep === 2 && (
                                    <Box>
                                        <Alert severity="success" icon={false} sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}>
                                            <Typography variant="subtitle2" fontWeight={700}>Review these topics less</Typography>
                                            <Typography variant="body2">The AI will defer these topics towards the end of your prep or skip heavy deep dives.</Typography>
                                        </Alert>
                                        {renderTopicSelection('strong')}
                                    </Box>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </Box>

                    <Box sx={{ mt: { xs: 4, md: 6 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button 
                                disabled={activeStep === 0} 
                                onClick={prevStep}
                                startIcon={<ArrowBackIcon />}
                                sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600 }}
                            >
                                Back
                            </Button>
                            {onCancel && activeStep === 0 && (
                                <Button 
                                    onClick={onCancel}
                                    sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
                                >
                                    Cancel
                                </Button>
                            )}
                        </Box>
                        
                        {activeStep < steps.length - 1 ? (
                            <Button 
                                variant="contained" 
                                onClick={nextStep}
                                disabled={activeStep === 0 && !isStep1Valid}
                                endIcon={<ArrowForwardIcon />}
                                sx={{ borderRadius: 3, px: 4, textTransform: 'none', fontWeight: 700, boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                size="large"
                                disabled={isGenerating}
                                onClick={handleGenerate}
                                startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <SparkleIcon />}
                                sx={{
                                    borderRadius: 3, px: 4, py: 1.5, fontWeight: 800, textTransform: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    boxShadow: '0 8px 25px rgba(16,185,129,0.3)',
                                    '&:hover': { background: 'linear-gradient(135deg, #059669, #047857)' }
                                }}
                            >
                                {isGenerating ? 'Generating AI Plan...' : 'Generate My Path'}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>
        </motion.div>
    );
}
