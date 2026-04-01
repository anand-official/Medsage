import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Typography, Button, TextField, Chip,
    Paper, CircularProgress, Alert, Grid,
    Accordion, AccordionSummary, AccordionDetails,
    ToggleButtonGroup, ToggleButton
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
    School as SchoolIcon,
    Tune as TuneIcon,
    Flag as FlagIcon
} from '@mui/icons-material';
import { plannerAPI } from '../../services/plannerService';

const COUNTRY_SUBJECTS = {
    India: {
        1: ['Anatomy', 'Physiology', 'Biochemistry'],
        2: ['Pathology', 'Pharmacology', 'Microbiology', 'Forensic Medicine'],
        3: ['PSM', 'ENT', 'Ophthalmology', 'Community Medicine'],
        4: ['Medicine', 'Surgery', 'OBGYN', 'Pediatrics'],
        5: ['Internship']
    },
    Nepal: {
        1: ['Anatomy', 'Physiology', 'Biochemistry', 'Microbiology', 'Pathology', 'Pharmacology', 'Community Medicine', 'Introduction to Clinical Medicine', 'Medical Informatics'],
        2: ['Anatomy', 'Physiology', 'Biochemistry', 'Microbiology', 'Pathology', 'Pharmacology', 'Community Medicine', 'Introduction to Clinical Medicine'],
        3: ['Community Medicine', 'Medicine', 'Surgery', 'OBGYN', 'Pediatrics', 'Forensic Medicine', 'Ophthalmology', 'ENT'],
        4: ['Community Medicine', 'Medicine', 'Surgery', 'OBGYN', 'Pediatrics', 'Forensic Medicine', 'Ophthalmology', 'ENT', 'Orthopedics', 'Psychiatry', 'Dermatology', 'Radiology', 'Anesthesia', 'Dental'],
        5: ['Medicine', 'Surgery', 'Orthopedics', 'OBGYN', 'Pediatrics', 'Internship']
    }
};

const MODE_OPTIONS = [
    {
        value: 'exam',
        label: 'Exam Prep',
        description: 'Build toward a fixed exam date with revision pressure and mock-review days.'
    },
    {
        value: 'self_study',
        label: 'Self Study',
        description: 'Pick the chapters you want and generate a mastery path without an exam countdown.'
    }
];

const normalizePlannerCountry = (country) => (country === 'Nepal' ? 'Nepal' : 'India');
const getSubjectsForPlanner = (country, year) => {
    const plannerCountry = normalizePlannerCountry(country);
    return COUNTRY_SUBJECTS[plannerCountry]?.[year] || COUNTRY_SUBJECTS.India[year] || [];
};
const topicKey = (subject, topic) => `${subject}::${topic}`;

export default function PlannerSetup({ onCancel }) {
    const { userProfile } = useAuth();
    const {
        generateStudyPlan,
        isGenerating,
        error,
        setError,
        studyPlan
    } = useStudyContext();

    const plannerCountry = normalizePlannerCountry(userProfile?.country);
    const initialYear = studyPlan?.mbbs_year || userProfile?.mbbs_year || 1;
    const initialMode = studyPlan?.plan_mode || (studyPlan ? (studyPlan?.exam_date ? 'exam' : 'self_study') : 'exam');

    const [activeStep, setActiveStep] = useState(0);
    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [planMode, setPlanMode] = useState(initialMode);
    const [examDate, setExamDate] = useState(
        studyPlan?.exam_date ? new Date(studyPlan.exam_date).toISOString().split('T')[0] : ''
    );
    const [studyDurationDays, setStudyDurationDays] = useState(studyPlan?.plan_duration_days || 21);
    const [syllabus, setSyllabus] = useState({});
    const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
    const [syllabusError, setSyllabusError] = useState(null);
    const [selectedTopicKeys, setSelectedTopicKeys] = useState(studyPlan?.selected_topic_keys || []);
    const [weakTopics, setWeakTopics] = useState(studyPlan?.weak_topics || []);
    const [strongTopics, setStrongTopics] = useState(studyPlan?.strong_topics || []);

    const subjectsForSelectedYear = useMemo(
        () => getSubjectsForPlanner(plannerCountry, selectedYear),
        [plannerCountry, selectedYear]
    );

    useEffect(() => {
        if (!studyPlan && userProfile?.mbbs_year) {
            setSelectedYear(userProfile.mbbs_year);
        }
    }, [userProfile, studyPlan]);

    useEffect(() => {
        let cancelled = false;

        const fetchSyllabus = async () => {
            setSyllabusError(null);
            try {
                setIsLoadingSyllabus(true);
                const res = await plannerAPI.getSyllabus(selectedYear, plannerCountry);
                if (cancelled) return;
                const nextSyllabus = res.data || {};
                setSyllabus(nextSyllabus);

                const validKeys = new Set();
                const validTopicLabels = new Set();
                Object.entries(nextSyllabus).forEach(([subject, topics]) => {
                    topics.forEach(topic => {
                        validKeys.add(topicKey(subject, topic));
                        validTopicLabels.add(topic);
                    });
                });

                setSelectedTopicKeys(prev => prev.filter(key => validKeys.has(key)));
                setWeakTopics(prev => prev.filter(topic => validTopicLabels.has(topic)));
                setStrongTopics(prev => prev.filter(topic => validTopicLabels.has(topic)));
            } catch (err) {
                if (!cancelled) {
                    console.error('Failed to load syllabus:', err);
                    setSyllabus({});
                    setSyllabusError('Could not load syllabus topics. You can still generate a plan, but chapter-level control will be limited.');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingSyllabus(false);
                }
            }
        };

        fetchSyllabus();
        return () => {
            cancelled = true;
        };
    }, [selectedYear, plannerCountry]);

    const availableTopicKeys = useMemo(() => {
        const keys = new Set();
        Object.entries(syllabus).forEach(([subject, topics]) => {
            topics.forEach(topic => keys.add(topicKey(subject, topic)));
        });
        return keys;
    }, [syllabus]);

    const scopedSyllabus = useMemo(() => {
        if (!selectedTopicKeys.length) {
            return syllabus;
        }

        const selectedSet = new Set(selectedTopicKeys);
        return Object.fromEntries(
            Object.entries(syllabus)
                .map(([subject, topics]) => [
                    subject,
                    topics.filter(topic => selectedSet.has(topicKey(subject, topic)))
                ])
                .filter(([, topics]) => topics.length > 0)
        );
    }, [syllabus, selectedTopicKeys]);

    const selectedSubjectsForPlan = useMemo(() => {
        const source = selectedTopicKeys.length ? scopedSyllabus : syllabus;
        const subjects = Object.keys(source);
        return subjects.length ? subjects : subjectsForSelectedYear;
    }, [scopedSyllabus, selectedTopicKeys.length, syllabus, subjectsForSelectedYear]);

    const selectedTopicCount = selectedTopicKeys.length;
    const isStep1Valid = planMode === 'exam'
        ? (!!examDate && new Date(examDate) >= new Date(Date.now() + 24 * 60 * 60 * 1000))
        : Number(studyDurationDays) >= 7 && Number(studyDurationDays) <= 84;

    const steps = [
        {
            label: 'Planner Mode',
            description: planMode === 'exam'
                ? 'Keep the current exam-driven setup, but with tighter syllabus control.'
                : 'Build a self-study path around the exact chapters you want to master.'
        },
        {
            label: 'Chapter Scope',
            description: 'Select only the chapters you want in this plan, or leave it empty to use the full year syllabus.'
        },
        {
            label: 'Difficult Chapters',
            description: 'Mark what needs extra repetition and earlier placement.'
        },
        {
            label: 'Confident Chapters',
            description: 'Mark what can be scheduled lighter or later.'
        }
    ];

    const toggleFocusTopic = (subject, topic) => {
        const key = topicKey(subject, topic);
        if (error && setError) setError(null);
        setSelectedTopicKeys(prev =>
            prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
        );
    };

    const toggleTopicStrength = (topic, type) => {
        if (error && setError) setError(null);

        if (type === 'weak') {
            setWeakTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
            setStrongTopics(prev => prev.filter(t => t !== topic));
            return;
        }

        setStrongTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
        setWeakTopics(prev => prev.filter(t => t !== topic));
    };

    const setSubjectScope = (subject, mode) => {
        const subjectKeys = (syllabus[subject] || []).map(topic => topicKey(subject, topic));
        setSelectedTopicKeys(prev => {
            const next = new Set(prev);
            if (mode === 'all') {
                subjectKeys.forEach(key => next.add(key));
            } else {
                subjectKeys.forEach(key => next.delete(key));
            }
            return [...next];
        });
    };

    const renderScopeSelection = () => {
        if (isLoadingSyllabus) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (syllabusError) {
            return <Alert severity="warning" sx={{ borderRadius: 3 }}>{syllabusError}</Alert>;
        }

        if (Object.keys(syllabus).length === 0) {
            return <Typography color="text.secondary">No chapter map is available for this year yet.</Typography>;
        }

        return (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(syllabus).map(([subject, topics]) => {
                    const selectedCount = topics.filter(topic => selectedTopicKeys.includes(topicKey(subject, topic))).length;
                    return (
                        <Accordion key={subject} variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography fontWeight={700}>{subject}</Typography>
                                {selectedCount > 0 && (
                                    <Box sx={{ ml: 2, px: 1.5, py: 0.2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 10, fontSize: '0.75rem', fontWeight: 'bold' }}>
                                        {selectedCount} in plan
                                    </Box>
                                )}
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                                <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                                    <Button size="small" variant="outlined" sx={{ borderRadius: 99, textTransform: 'none' }} onClick={() => setSubjectScope(subject, 'all')}>
                                        Select all
                                    </Button>
                                    <Button size="small" sx={{ borderRadius: 99, textTransform: 'none' }} onClick={() => setSubjectScope(subject, 'clear')}>
                                        Clear
                                    </Button>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {topics.map(topic => {
                                        const key = topicKey(subject, topic);
                                        const isSelected = selectedTopicKeys.includes(key);
                                        return (
                                            <Chip
                                                key={key}
                                                label={topic}
                                                clickable
                                                onClick={() => toggleFocusTopic(subject, topic)}
                                                color={isSelected ? 'primary' : 'default'}
                                                variant={isSelected ? 'filled' : 'outlined'}
                                                sx={{ fontWeight: isSelected ? 700 : 400 }}
                                            />
                                        );
                                    })}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box>
        );
    };

    const renderTopicSelection = (type) => {
        if (isLoadingSyllabus) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                    <CircularProgress />
                </Box>
            );
        }

        if (syllabusError) {
            return <Alert severity="warning" sx={{ borderRadius: 3 }}>{syllabusError}</Alert>;
        }

        const isWeak = type === 'weak';
        const activeColor = isWeak ? 'error' : 'success';
        const selectedList = isWeak ? weakTopics : strongTopics;
        const visibleSyllabus = selectedTopicKeys.length ? scopedSyllabus : syllabus;

        if (Object.keys(visibleSyllabus).length === 0) {
            return <Typography color="text.secondary">Select a chapter scope first to tailor these controls.</Typography>;
        }

        return (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {Object.entries(visibleSyllabus).map(([subject, topics]) => (
                    <Accordion key={subject} variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography fontWeight={600}>{subject}</Typography>
                            {topics.some(topic => selectedList.includes(topic)) && (
                                <Box sx={{ ml: 2, px: 1.5, py: 0.2, bgcolor: `${activeColor}.light`, color: `${activeColor}.contrastText`, borderRadius: 10, fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {topics.filter(topic => selectedList.includes(topic)).length} selected
                                </Box>
                            )}
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {topics.map(topic => (
                                    <Chip
                                        key={topicKey(subject, topic)}
                                        label={topic}
                                        clickable
                                        onClick={() => toggleTopicStrength(topic, type)}
                                        color={selectedList.includes(topic) ? activeColor : 'default'}
                                        variant={selectedList.includes(topic) ? 'filled' : 'outlined'}
                                        sx={{ fontWeight: selectedList.includes(topic) ? 600 : 400 }}
                                    />
                                ))}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        );
    };

    const handleGenerate = async () => {
        await generateStudyPlan({
            year: selectedYear,
            planMode,
            examDate: planMode === 'exam' ? examDate : null,
            studyDurationDays: planMode === 'self_study' ? Number(studyDurationDays) : null,
            selectedSubjects: selectedSubjectsForPlan,
            selectedTopicKeys: selectedTopicKeys.filter(key => availableTopicKeys.has(key)),
            weakTopics,
            strongTopics
        });
    };

    const nextStep = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 0));

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}>
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
                                Keep the current planner feel, but take tighter control of what actually gets studied.
                            </Typography>
                        </Box>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>{error}</Alert>}

                    <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                        {steps.map((step, index) => (
                            <Box key={step.label} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: index <= activeStep ? 'primary.main' : 'grey.200', transition: 'background-color 0.3s' }} />
                        ))}
                    </Box>

                    <Box sx={{ minHeight: 380 }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${activeStep}-${planMode}`}
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
                                        <Grid item xs={12}>
                                            <ToggleButtonGroup
                                                fullWidth
                                                exclusive
                                                value={planMode}
                                                onChange={(event, value) => value && setPlanMode(value)}
                                                sx={{
                                                    bgcolor: 'rgba(99,102,241,0.04)',
                                                    p: 0.5,
                                                    borderRadius: 3,
                                                    '& .MuiToggleButton-root': {
                                                        border: 'none',
                                                        borderRadius: 2.5,
                                                        textTransform: 'none',
                                                        py: 1.25
                                                    }
                                                }}
                                            >
                                                {MODE_OPTIONS.map(option => (
                                                    <ToggleButton key={option.value} value={option.value}>
                                                        <Box sx={{ textAlign: 'left' }}>
                                                            <Typography fontWeight={700}>{option.label}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {option.description}
                                                            </Typography>
                                                        </Box>
                                                    </ToggleButton>
                                                ))}
                                            </ToggleButtonGroup>
                                        </Grid>

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
                                            {planMode === 'exam' ? (
                                                <TextField
                                                    type="date"
                                                    fullWidth
                                                    label="Target Exam Date"
                                                    value={examDate}
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
                                            ) : (
                                                <TextField
                                                    type="number"
                                                    fullWidth
                                                    label="Self-Study Horizon (Days)"
                                                    value={studyDurationDays}
                                                    onChange={(e) => setStudyDurationDays(e.target.value)}
                                                    InputLabelProps={{ shrink: true }}
                                                    inputProps={{ min: 7, max: 84 }}
                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                                                    helperText="Pick how many days you want this focused self-study plan to run."
                                                />
                                            )}
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Alert severity="info" sx={{ borderRadius: 3, '& .MuiAlert-message': { width: '100%' } }}>
                                                <Typography variant="subtitle2" fontWeight={700}>
                                                    {plannerCountry} MBBS syllabus, Year {selectedYear}
                                                </Typography>
                                                <Typography variant="body2" sx={{ mb: 1.5 }}>
                                                    The planner will show only subjects from this syllabus and year, then let you narrow the chapter scope yourself.
                                                </Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                    {subjectsForSelectedYear.map(subject => (
                                                        <Chip key={subject} label={subject} size="small" sx={{ fontWeight: 600 }} />
                                                    ))}
                                                </Box>
                                            </Alert>
                                        </Grid>
                                    </Grid>
                                )}

                                {activeStep === 1 && (
                                    <Box>
                                        <Alert severity={selectedTopicCount > 0 ? 'success' : 'info'} icon={false} sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}>
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                {selectedTopicCount > 0 ? `${selectedTopicCount} chapters selected` : 'Full-year scope currently active'}
                                            </Typography>
                                            <Typography variant="body2">
                                                {selectedTopicCount > 0
                                                    ? `This plan will stay inside ${selectedSubjectsForPlan.join(', ')} and ignore the rest of the year.`
                                                    : 'Leave this empty to plan against the full year syllabus, or hand-pick the exact chapters you want.'}
                                            </Typography>
                                            {selectedTopicCount > 0 && (
                                                <Button size="small" sx={{ mt: 1.5, textTransform: 'none', borderRadius: 99 }} onClick={() => setSelectedTopicKeys([])}>
                                                    Reset to full syllabus
                                                </Button>
                                            )}
                                        </Alert>
                                        {renderScopeSelection()}
                                    </Box>
                                )}

                                {activeStep === 2 && (
                                    <Box>
                                        <Alert severity="error" icon={false} sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}>
                                            <Typography variant="subtitle2" fontWeight={700}>Prioritize these chapters</Typography>
                                            <Typography variant="body2">The planner will schedule these earlier, revisit them more often, and treat them like friction points.</Typography>
                                        </Alert>
                                        {renderTopicSelection('weak')}
                                    </Box>
                                )}

                                {activeStep === 3 && (
                                    <Box>
                                        <Alert severity="success" icon={false} sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}>
                                            <Typography variant="subtitle2" fontWeight={700}>Ease off these chapters</Typography>
                                            <Typography variant="body2">These still stay in plan scope, but the engine will treat them as lighter maintenance rather than rescue work.</Typography>
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

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Chip
                                icon={planMode === 'exam' ? <FlagIcon /> : <SchoolIcon />}
                                label={planMode === 'exam' ? 'Exam Prep' : 'Self Study'}
                                sx={{ borderRadius: 99, fontWeight: 700 }}
                            />
                            {selectedTopicCount > 0 && (
                                <Chip icon={<TuneIcon />} label={`${selectedTopicCount} custom`} sx={{ borderRadius: 99, fontWeight: 700 }} />
                            )}

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
                                    {isGenerating
                                        ? 'Generating AI Plan...'
                                        : planMode === 'exam'
                                            ? 'Build Exam Planner'
                                            : 'Build Self-Study Path'}
                                </Button>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </motion.div>
    );
}
