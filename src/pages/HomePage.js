import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Container,
  Button,
  useTheme,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
  LinearProgress,
  Divider,
  Chip,
  Paper,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AutoAwesome as AutoAwesomeIcon,
  Timeline as TimelineIcon,
  Star as StarIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Article as ArticleIcon,
  PlayCircleFilled as PlayIcon,
  CheckCircle as SuccessIcon,
  Radar as RadarIcon,
  Speed as SpeedIcon,
  History as HistoryIcon,
  LocalFireDepartment as StreakIcon,
  Public as PublicIcon,
  Explore as ExploreIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  RocketLaunch as RocketIcon,
  NotificationsActive as AlertIcon,
  MenuBook as BookIcon,
  Medication as ClinicalIcon,
  Assignment as CaseIcon,
  Quiz as FlashcardIcon,
  Science as LabIcon,
  LocalPostOffice as UpdateIcon
} from '@mui/icons-material';
import { usePageAnimation } from '../hooks/usePageAnimation';
import { sm2API } from '../services/api';
import '../animations.css';

// --- Tactical Sub-components (Vision: Clinical Operating System) ---

const CognitiveSkillsRadar = ({ size = 220 }) => {
  const points = [
    { label: 'RECALL', value: 85 },
    { label: 'LOGIC', value: 72 },
    { label: 'SPEED', value: 94 },
    { label: 'DIAGNOSTICS', value: 68 },
    { label: 'CORRELATION', value: 80 }
  ];
  const center = size / 2;
  const radius = size * 0.35;
  const getPointCoords = (index, value) => {
    const angle = (Math.PI * 2 / points.length) * index - Math.PI / 2;
    const r = (radius * value) / 100;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };
  const polygonPoints = points.map((p, i) => {
    const coords = getPointCoords(i, p.value);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {[25, 50, 75, 100].map(level => (
          <polygon
            key={level}
            points={points.map((_, i) => {
              const coords = getPointCoords(i, level);
              return `${coords.x},${coords.y}`;
            }).join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          points={polygonPoints}
          fill="url(#radarGrad)"
          stroke="#6366f1"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' }}
        />
        {points.map((p, i) => {
          const coords = getPointCoords(i, 115);
          return (
            <text
              key={i} x={coords.x} y={coords.y}
              fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="900"
              textAnchor="middle" alignmentBaseline="middle"
            >
              {p.label}
            </text>
          );
        })}
      </svg>
    </Box>
  );
};

const ReadinessPortal = () => (
  <Box sx={{ position: 'relative', width: 200, height: 200, mx: 'auto' }}>
    <svg width="200" height="200" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
      <motion.circle
        initial={{ strokeDasharray: "0 282.6" }}
        animate={{ strokeDasharray: "220 282.6" }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        cx="50" cy="50" r="45" fill="none"
        stroke="url(#readinessGrad)" strokeWidth="8"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 12px rgba(99, 102, 241, 0.4))' }}
      />
      <defs>
        <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
    <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
      <Typography variant="h2" sx={{ fontWeight: 950, lineHeight: 1, letterSpacing: '-2px' }}>78</Typography>
      <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: '2px', opacity: 0.5 }}>READY%</Typography>
    </Box>
  </Box>
);

const HubCard = ({ children, title, subtitle, icon, badge, action, color = 'rgba(255,255,255,0.04)', height = '100%' }) => (
  <motion.div
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    style={{ height: height }}
  >
    <Box className="glass-card" sx={{
      p: 3, height: '100%', borderRadius: 8, position: 'relative', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column',
      '&:before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
        pointerEvents: 'none'
      }
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, zIndex: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{
            width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            {React.cloneElement(icon, { sx: { color: 'primary.main', fontSize: 20 } })}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1, letterSpacing: '-0.5px' }}>{title}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.4 }}>{subtitle}</Typography>
          </Box>
        </Stack>
        {badge && <Chip label={badge} size="small" sx={{ height: 20, bgcolor: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 900 }} />}
      </Box>

      <Box sx={{ flexGrow: 1, zIndex: 1 }}>{children}</Box>

      {action && (
        <Button fullWidth variant="contained" sx={{ mt: 3, py: 1.2, borderRadius: 3, background: 'rgba(255,255,255,0.05)', fontWeight: 800, border: '1px solid rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'primary.main', border: '1px solid transparent' } }}>
          {action}
        </Button>
      )}
    </Box>
  </motion.div>
);

const HomePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  usePageAnimation();

  const [degree, setDegree] = useState('MBBS');
  const [activeTab, setActiveTab] = useState('OPERATIONS');
  const [syncedClinicians, setSyncedClinicians] = useState(156);
  const [wardNotes, setWardNotes] = useState('');

  // Flashcard State
  const [dueCards, setDueCards] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [flashcardLoading, setFlashcardLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setSyncedClinicians(p => p + (Math.random() > 0.5 ? 1 : -1)), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDueCards = async () => {
      try {
        const res = await sm2API.getDueCards(10);
        setDueCards(res.cards || []);
      } catch (err) {
        console.error('Failed to load flashcards:', err);
      } finally {
        setFlashcardLoading(false);
      }
    };
    fetchDueCards();
  }, []);

  const handleReview = async (quality) => {
    const currentCard = dueCards[cardIndex];
    if (!currentCard) return;
    try {
      await sm2API.submitReview(currentCard._id, quality);
      setCardIndex(p => p + 1);
      setIsRevealed(false);
    } catch (err) {
      console.error('Failed to submit review', err);
    }
  };

  const currentCard = dueCards[cardIndex];

  const handleDegreeChange = (event, newDegree) => {
    if (newDegree !== null) setDegree(newDegree);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 6, position: 'relative' }}>

      {/* 1. PRODUCTIVITY HUB HEADER (The "Operational Context") */}
      <Grid container spacing={4} sx={{ mb: 6 }} alignItems="center">
        <Grid item xs={12} lg={7}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={degree}
              exclusive
              onChange={handleDegreeChange}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.03)',
                borderRadius: 3,
                p: 0.5,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: 2,
                  px: 2,
                  py: 0.5,
                  color: 'text.secondary',
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }
                }
              }}
            >
              <ToggleButton value="MBBS">MBBS</ToggleButton>
              <ToggleButton value="BDS">BDS</ToggleButton>
            </ToggleButtonGroup>
            <Divider orientation="vertical" flexItem sx={{ opacity: 0.1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box className="pulse-glow" sx={{ width: 8, height: 8, bgcolor: '#10b981', borderRadius: '50%' }} />
              <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: '1px', opacity: 0.6 }}>{syncedClinicians} IN FOCUS</Typography>
            </Box>
          </Stack>
          <Typography variant="h1" className="premium-text-shimmer" sx={{ fontWeight: 950, letterSpacing: '-4px', mb: 1.5 }}>
            Productivity Hub
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.5, fontWeight: 500, maxWidth: 600 }}>
            Tailored for <strong>{degree} Excellence</strong> • <strong>3rd Prof Part I</strong> • Target: <strong>Final Exams</strong>
          </Typography>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper className="glass-card" sx={{ p: 3, borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
            <Stack direction="row" spacing={3} justifyContent="space-around">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.4 }}>READY STATE</Typography>
                <Typography variant="h4" sx={{ fontWeight: 950, color: 'primary.main' }}>84<span style={{ fontSize: '1rem' }}>%</span></Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ opacity: 0.1 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.4 }}>PROD. RATIO</Typography>
                <Typography variant="h4" sx={{ fontWeight: 950, color: 'secondary.main' }}>1.4</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ opacity: 0.1 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, opacity: 0.4 }}>T-MINUS</Typography>
                <Typography variant="h4" sx={{ fontWeight: 950, color: 'success.main' }}>12<span style={{ fontSize: '1rem' }}>d</span></Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* 2. THE HUB NAVIGATION (PM Philosophy: Managing Cognitive Load) */}
      <Box sx={{ mb: 4, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Stack direction="row" spacing={4}>
          {['OPERATIONS', 'WARD', 'LIBRARY'].map(tab => (
            <Typography
              key={tab}
              onClick={() => setActiveTab(tab)}
              sx={{
                pb: 1.5,
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: '0.85rem',
                letterSpacing: '1px',
                color: activeTab === tab ? 'primary.main' : 'text.secondary',
                borderBottom: `2px solid ${activeTab === tab ? '#6366f1' : 'transparent'}`,
                transition: 'all 0.3s ease'
              }}
            >
              {tab}
            </Typography>
          ))}
        </Stack>
      </Box>

      {/* 3. DYNAMIC CONTENT ZONES */}
      <AnimatePresence mode="wait">
        {activeTab === 'OPERATIONS' && (
          <motion.div
            key="ops"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Grid container spacing={3}>
              {/* Readiness Index */}
              <Grid item xs={12} lg={4}>
                <HubCard title="Readiness Index" subtitle="Objective Success Probability" icon={<SpeedIcon />}>
                  <ReadinessPortal />
                  <Stack spacing={2} sx={{ mt: 3, px: 1 }}>
                    <Box sx={{ p: 2, bgcolor: 'rgba(99, 102, 241, 0.03)', borderRadius: 4, textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>GO FOR LAUNCH</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.5 }}>Clinical diagnostics at peak performance.</Typography>
                    </Box>
                    <Button fullWidth variant="contained" sx={{ py: 1.5, borderRadius: 4, background: 'linear-gradient(90deg, #6366f1, #a855f7)', fontWeight: 900 }}>
                      INITIALIZE CYCLE
                    </Button>
                  </Stack>
                </HubCard>
              </Grid>

              {/* Daily Flashcard Sprint (Active Recall Hub) */}
              <Grid item xs={12} lg={4}>
                <HubCard title="Active Retrieval" subtitle="Daily Flashcard Sprint" icon={<FlashcardIcon />} badge={flashcardLoading ? "LOADING" : (dueCards.length - cardIndex > 0 ? `${dueCards.length - cardIndex} PENDING` : "ALL DONE")}>
                  <Box sx={{ mt: 2, p: 2.5, minHeight: 200, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                    {flashcardLoading ? (
                      <LinearProgress sx={{ width: '50%', borderRadius: 2 }} />
                    ) : !currentCard ? (
                      <>
                        <SuccessIcon sx={{ color: 'success.main', fontSize: 48, mb: 1, opacity: 0.8 }} />
                        <Typography variant="body1" sx={{ fontWeight: 800 }}>Spaced Repetition Complete</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>Check back tomorrow for more review cards.</Typography>
                      </>
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.div key={currentCard._id + (isRevealed ? '-rev' : '')} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 900, mb: 1, display: 'block' }}>{currentCard.subject?.toUpperCase() || 'GENERAL'} • {currentCard.chapter?.substring(0, 25) || 'CONCEPT'}</Typography>

                          <Typography variant="body1" sx={{ fontWeight: 800, mb: 2, display: '-webkit-box', WebkitLineClamp: isRevealed ? 4 : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {isRevealed ? currentCard.answer_summary : currentCard.question}
                          </Typography>

                          {!isRevealed ? (
                            <Button variant="outlined" size="small" sx={{ borderRadius: 3, fontWeight: 800 }} onClick={() => setIsRevealed(true)}>REVEAL KEY</Button>
                          ) : (
                            <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                              {[0, 2, 4, 5].map((q, i) => {
                                const labels = ['Blackout', 'Hard', 'Good', 'Perfect'];
                                const colors = ['error', 'warning', 'info', 'success'];
                                return (
                                  <Button key={q} size="small" variant="contained" color={colors[i]} sx={{ minWidth: 0, px: 1.5, py: 0.5, borderRadius: 2, fontSize: '0.65rem', fontWeight: 800 }} onClick={() => handleReview(q)}>
                                    {labels[i]}
                                  </Button>
                                )
                              })}
                            </Stack>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center', opacity: 0.4 }}>
                    Spaced repetition cycle optimized for long-term retention.
                  </Typography>
                </HubCard>
              </Grid>

              {/* Cognitive Profiling */}
              <Grid item xs={12} lg={4}>
                <HubCard title="Cognitive Profile" subtitle="Neural Synthesis Analysis" icon={<RadarIcon />}>
                  <CognitiveSkillsRadar size={200} />
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, p: 1, px: 2, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                      MBBS-NEXT ALIGNED PROFILE
                    </Typography>
                  </Box>
                </HubCard>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {activeTab === 'WARD' && (
          <motion.div
            key="ward"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Grid container spacing={3}>
              {/* Clinical Briefcase - Note Taking */}
              <Grid item xs={12} lg={7}>
                <HubCard title="Clinical Briefcase" subtitle="Ward Round Observation Logging" icon={<ClinicalIcon />}>
                  <TextField
                    multiline
                    rows={4}
                    fullWidth
                    value={wardNotes}
                    onChange={(e) => setWardNotes(e.target.value)}
                    placeholder="Enter ward findings or case symptoms... AI will link to textbook theory."
                    sx={{
                      bgcolor: 'rgba(0,0,0,0.2)',
                      borderRadius: 4,
                      '& .MuiOutlinedInput-notchedOutline': { border: '1px solid rgba(255,255,255,0.05)' }
                    }}
                  />
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<AutoAwesomeIcon />}
                      sx={{ borderRadius: 3, px: 3, fontWeight: 800 }}
                      onClick={() => {
                        if (wardNotes.trim()) {
                          navigate('/question', { state: { initialQuery: `Analyze these ward findings: ${wardNotes}` } });
                        }
                      }}
                    >
                      AI SYNTHESIS
                    </Button>
                    <Button variant="outlined" startIcon={<CaseIcon />} sx={{ borderRadius: 3, px: 3, fontWeight: 800 }}>
                      SAVE TO PORTFOLIO
                    </Button>
                  </Stack>
                </HubCard>
              </Grid>

              {/* Recent Case Intelligence */}
              <Grid item xs={12} lg={5}>
                <HubCard title="Recent Insights" subtitle="Theory-to-Bedside Connections" icon={<LabIcon />}>
                  <Stack spacing={2}>
                    {[
                      { t: 'Myocardial Infarction', d: 'ST-Elevation detected. Linked to Robbins Path.', c: '#ef4444' },
                      { t: degree === 'BDS' ? 'Mandibular Cyst' : 'Liver Cirrhosis', d: 'Radiology patterns cross-referenced.', c: '#6366f1' }
                    ].map(item => (
                      <Box key={item.t} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 4, borderLeft: `4px solid ${item.c}` }}>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.t}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>{item.d}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </HubCard>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {activeTab === 'LIBRARY' && (
          <motion.div
            key="lib"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <HubCard title="Standard Reference Matrix" subtitle="Hotlinks to Essential Digital Textbooks" icon={<BookIcon />}>
                  <Grid container spacing={2}>
                    {[
                      'Harrison\'s Internal Medicine', 'Robbins Pathology', 'Gray\'s Anatomy',
                      'Guyton Physiology', 'KDT Pharmacology', 'Bailey & Love Surgery'
                    ].map(book => (
                      <Grid item xs={12} md={4} key={book}>
                        <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' } }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{book}</Typography>
                          <IconButton size="small"><ExploreIcon sx={{ fontSize: 16 }} /></IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </HubCard>
              </Grid>
            </Grid>
          </motion.div>
        )}
      </AnimatePresence>

      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ opacity: 0.2 }}>PREMIUM OPERATING ENVIRONMENT V4.2 • SECURE SESSION</Typography>
      </Box>

    </Container>
  );
};

export default HomePage;