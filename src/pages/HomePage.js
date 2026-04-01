// src/pages/HomePage.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, useTheme, useMediaQuery,
  Stack, LinearProgress, Chip, Paper, TextField,
  IconButton, Skeleton, Divider,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Send as SendIcon,
  AutoAwesome as AskIcon,
  CalendarMonth as PlannerIcon,
  MenuBook as LibraryIcon,
  LocalFireDepartment as StreakIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  ArrowForward as ArrowIcon,
  TrendingUp as TrendingIcon,
  EmojiEvents as TrophyIcon,
  KeyboardArrowRight as ChevronIcon,
  AccessTime as ClockIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useStudyContext } from '../contexts/StudyContext';
import '../animations.css';

// ─── Colour constants ─────────────────────────────────────────────────────────
const C = {
  streak:  '#ef4444',
  indigo:  '#6366f1',
  indigoL: '#818cf8',
  emerald: '#10b981',
  amber:   '#f59e0b',
  purple:  '#a855f7',
};

// ─── Framer Motion variants ───────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] },
  }),
};

const MotionBox = motion(Box);

// ─── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct = 0, size = 72, sw = 6 }) {
  const color = pct === 100 ? C.emerald : C.indigo;
  const r     = (size - sw) / 2;
  const circ  = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke 0.4s' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1, color }}>
          {pct}%
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.disabled', fontWeight: 700 }}>
          done
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Compact stat pill ────────────────────────────────────────────────────────
function StatPill({ icon, value, label, color, loading, custom = 0 }) {
  return (
    <MotionBox
      variants={fadeUp}
      custom={custom}
      sx={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex', alignItems: 'center', gap: 1.25,
        px: 2, py: 1.5, borderRadius: 3,
        border: `1px solid ${color}22`,
        background: `${color}09`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* accent glow */}
      <Box sx={{
        position: 'absolute', top: -16, right: -16,
        width: 56, height: 56, borderRadius: '50%',
        background: `${color}20`, filter: 'blur(16px)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        width: 34, height: 34, borderRadius: 2, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
        '& .MuiSvgIcon-root': { fontSize: 17 },
      }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {loading
          ? <Skeleton width={40} height={22} sx={{ bgcolor: 'rgba(255,255,255,0.07)' }} />
          : <Typography sx={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1, color }}>
              {value ?? '—'}
            </Typography>
        }
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1, display: 'block' }}>
          {label}
        </Typography>
      </Box>
    </MotionBox>
  );
}

// ─── Quick-launch row item ────────────────────────────────────────────────────
function LaunchRow({ icon, label, desc, gradient, glow, onClick, custom = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <MotionBox
      variants={fadeUp}
      custom={custom}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.75,
        px: 2, py: 1.5, cursor: 'pointer', borderRadius: 3,
        transition: 'background 0.18s',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        '&:active': { background: 'rgba(255,255,255,0.07)' },
      }}
    >
      <Box sx={{
        width: 40, height: 40, borderRadius: 2.5, flexShrink: 0,
        background: gradient,
        boxShadow: hovered ? `0 6px 18px ${glow}` : `0 3px 10px ${glow.replace('0.35','0.18')}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        transition: 'box-shadow 0.2s, transform 0.2s',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        '& .MuiSvgIcon-root': { fontSize: 20 },
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={700} sx={{ fontSize: '0.875rem', lineHeight: 1.2 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{desc}</Typography>
      </Box>
      <ChevronIcon sx={{
        fontSize: 18, flexShrink: 0,
        color: hovered ? C.indigoL : 'text.disabled',
        transition: 'color 0.2s, transform 0.2s',
        transform: hovered ? 'translateX(3px)' : 'none',
      }} />
    </MotionBox>
  );
}

// ─── Relative time helper ─────────────────────────────────────────────────────
function relativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, isDark, onClick, custom = 0 }) {
  const firstMsg = session?.messages?.find(m => m.role === 'user');
  const text     = firstMsg?.text || firstMsg?.content || 'Untitled session';
  return (
    <MotionBox
      variants={fadeUp}
      custom={custom}
      onClick={onClick}
      sx={{
        flexShrink: 0,
        width: { xs: 220, sm: 260, md: 'auto' },
        flex: { md: 1 },
        p: 2, borderRadius: 3, cursor: 'pointer',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
        background: isDark ? 'rgba(14,11,26,0.65)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(16px)',
        transition: 'border-color 0.18s, background 0.18s',
        '&:hover': {
          borderColor: `${C.indigoL}55`,
          background: isDark ? 'rgba(20,15,35,0.8)' : 'rgba(255,255,255,1)',
        },
      }}
    >
      <Typography
        variant="body2"
        fontWeight={600}
        sx={{
          mb: 1, display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', lineHeight: 1.45, minHeight: '2.9em',
          fontSize: '0.82rem',
        }}
      >
        {text}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.disabled' }}>
          <ClockIcon sx={{ fontSize: 12 }} />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>
            {relativeTime(session.timestamp)}
          </Typography>
        </Box>
        <Chip
          label="Continue"
          size="small"
          sx={{
            height: 20, fontSize: '0.62rem', fontWeight: 700,
            bgcolor: 'rgba(99,102,241,0.12)', color: C.indigoL,
            border: `1px solid rgba(99,102,241,0.2)`,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(99,102,241,0.2)' },
          }}
        />
      </Box>
    </MotionBox>
  );
}

// ─── Exam pulse ring ─────────────────────────────────────────────────────────
function ExamPulse({ days }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* outer pulse ring */}
      <Box
        component={motion.div}
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          width: 90, height: 90, borderRadius: '50%',
          border: `2px solid ${C.amber}`,
        }}
      />
      {/* inner ring */}
      <Box sx={{
        width: 72, height: 72, borderRadius: '50%',
        background: `${C.amber}15`,
        border: `2px solid ${C.amber}55`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1, color: C.amber }}>
          {days}
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: `${C.amber}99`, letterSpacing: '0.05em' }}>
          DAYS
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ children, isDark, sx = {} }) {
  return (
    <Paper elevation={0} sx={{
      borderRadius: 4,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      background: isDark ? 'rgba(12,10,22,0.7)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)',
      overflow: 'hidden',
      ...sx,
    }}>
      {children}
    </Paper>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const HomePage = () => {
  const theme   = useTheme();
  const isDark  = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const {
    studyPlan, todayData, analyticsData,
    getStudyPlan, fetchToday, fetchAnalytics, todayLoading,
  } = useStudyContext();

  const [query, setQuery] = useState('');

  // Greeting & date
  const firstName = userProfile?.displayName?.split(' ')[0] || 'Doctor';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayStr    = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  // Data
  useEffect(() => {
    if (!studyPlan)    getStudyPlan();
    if (!todayData)    fetchToday();
    if (!analyticsData) fetchAnalytics();
  }, []); // eslint-disable-line

  const totalTasks     = todayData?.tasks?.length ?? 0;
  const doneTasks      = todayData?.tasks?.filter(t => t.completed).length ?? 0;
  const completionPct  = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const streak         = analyticsData?.streak?.current ?? todayData?.streak?.current ?? 0;
  const topicsDone     = analyticsData?.totalCompleted ?? studyPlan?.completedTopics ?? 0;

  const plannerMode = studyPlan?.plan_mode || (studyPlan?.exam_date ? 'exam' : null);
  const planDurationDays = studyPlan?.plan_duration_days || studyPlan?.daily_plan?.length || null;
  const subjectCount = studyPlan?.subjects_selected?.length || 0;
  const customScopeCount = studyPlan?.selected_topic_keys?.length || 0;

  // Exam countdown
  const examDate  = plannerMode === 'exam' && studyPlan?.exam_date ? new Date(studyPlan.exam_date) : null;
  const daysToExam = examDate
    ? Math.max(0, Math.ceil((examDate - Date.now()) / 86400000))
    : null;

  // Recent sessions from localStorage
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cortex_sessions');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSessions(Array.isArray(parsed) ? parsed.slice(0, 3) : []);
      }
    } catch {
      setSessions([]);
    }
  }, []);

  const submitAsk = () => {
    const q = query.trim();
    if (q) navigate('/question', { state: { initialQuery: q } });
  };

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <Box
      component={motion.div}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      sx={{ position: 'relative', pb: { xs: 4, md: 6 } }}
    >

      {/* ══ A) HEADER STRIP ════════════════════════════════════════════════════ */}
      <MotionBox
        variants={fadeUp}
        custom={0}
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 2,
          mb: { xs: 3, md: 3.5 },
        }}
      >
        {/* Left: greeting */}
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.55rem', sm: '1.75rem', md: '2rem' },
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 55%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {greeting}, {firstName}
          </Typography>
          <Chip
            icon={<CalendarIcon sx={{ fontSize: '13px !important' }} />}
            label={dayStr}
            size="small"
            sx={{
              mt: 0.75,
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: 'text.secondary',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              '& .MuiChip-icon': { color: 'text.disabled' },
            }}
          />
        </Box>

        {/* Right: Ask Cortex button */}
        <Button
          onClick={() => navigate('/question')}
          startIcon={<AskIcon sx={{ fontSize: '18px !important' }} />}
          sx={{
            borderRadius: 3, fontWeight: 700, px: 3, py: 1.25,
            fontSize: '0.88rem',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff',
            boxShadow: '0 4px 18px rgba(99,102,241,0.35)',
            flexShrink: 0,
            '@media (hover: hover)': {
              '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #9333ea)', boxShadow: '0 6px 22px rgba(99,102,241,0.5)' },
            },
          }}
        >
          Ask Cortex
        </Button>
      </MotionBox>

      {/* ══ B) STATS STRIP ═════════════════════════════════════════════════════ */}
      <Box
        component={motion.div}
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        sx={{
          display: 'flex',
          gap: { xs: 1, md: 1.5 },
          mb: { xs: 3, md: 3.5 },
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <StatPill
          icon={<StreakIcon />} value={streak || 0}
          label="Day Streak" color={C.streak}
          loading={todayLoading && !streak} custom={1}
        />
        <StatPill
          icon={<CheckIcon />}
          value={todayLoading ? null : `${doneTasks}/${totalTasks}`}
          label="Today's Tasks" color={C.indigo}
          loading={todayLoading} custom={2}
        />
        <StatPill
          icon={<TrendingIcon />} value={topicsDone}
          label="Topics Mastered" color={C.emerald}
          loading={todayLoading} custom={3}
        />
        {plannerMode === 'exam' && daysToExam !== null && (
          <StatPill
            icon={<CalendarIcon />} value={daysToExam}
            label="Days to Exam" color={C.amber}
            loading={false} custom={4}
          />
        )}
        {plannerMode === 'self_study' && planDurationDays !== null && (
          <StatPill
            icon={<PlannerIcon />} value={planDurationDays}
            label="Study Horizon" color={C.emerald}
            loading={false} custom={4}
          />
        )}
      </Box>

      {/* ══ C) MAIN BENTO GRID ═════════════════════════════════════════════════ */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
          gap: { xs: 2, md: 2.5 },
          mb: { xs: 3, md: 3.5 },
        }}
      >
        {/* ── Left: Today's Focus ─────────────────────────────────────────── */}
        <MotionBox variants={fadeUp} custom={5} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Card isDark={isDark} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* header */}
            <Box sx={{
              px: { xs: 2.5, md: 3 }, pt: 2.5, pb: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TrophyIcon sx={{ color: '#fff', fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography fontWeight={800} sx={{ fontSize: '1rem', lineHeight: 1.1 }}>
                    Today's Focus
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </Typography>
                </Box>
              </Box>
              {!todayLoading && totalTasks > 0 && (
                <Chip
                  size="small"
                  label={completionPct === 100 ? 'All done!' : `${completionPct}%`}
                  sx={{
                    fontWeight: 800, fontSize: '0.7rem',
                    bgcolor: completionPct === 100 ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)',
                    color: completionPct === 100 ? C.emerald : C.indigoL,
                    border: `1px solid ${completionPct === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.22)'}`,
                  }}
                />
              )}
            </Box>

            {/* body */}
            <Box sx={{ px: { xs: 2.5, md: 3 }, py: 2.5, flex: 1 }}>
              {todayLoading ? (
                <Stack spacing={1.25}>
                  {[1,2,3,4].map(i => (
                    <Skeleton key={i} variant="rounded" height={48}
                      sx={{ borderRadius: 2.5, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                    />
                  ))}
                </Stack>
              ) : !todayData || totalTasks === 0 ? (
                /* empty state */
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <Box sx={{
                    width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2,
                    background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <PlannerIcon sx={{ color: C.indigo, fontSize: 28 }} />
                  </Box>
                  <Typography fontWeight={700} sx={{ mb: 0.75 }}>No study plan yet</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 260, mx: 'auto' }}>
                    Set up your AI-generated plan to track daily goals and progress.
                  </Typography>
                  <Button
                    variant="contained" startIcon={<PlannerIcon />}
                    onClick={() => navigate('/planner')}
                    sx={{
                      borderRadius: 3, fontWeight: 700, px: 3.5, py: 1,
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      boxShadow: '0 4px 18px rgba(99,102,241,0.38)',
                    }}
                  >
                    Create Study Plan
                  </Button>
                </Box>
              ) : (
                <>
                  {/* progress summary */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
                    <ProgressRing pct={completionPct} />
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700} sx={{ mb: 0.75, fontSize: '0.88rem' }}>
                        {doneTasks} of {totalTasks} tasks complete
                      </Typography>
                      <LinearProgress
                        variant="determinate" value={completionPct}
                        sx={{
                          height: 6, borderRadius: 4,
                          bgcolor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            background: completionPct === 100
                              ? `linear-gradient(90deg, ${C.emerald}, #059669)`
                              : `linear-gradient(90deg, ${C.indigo}, ${C.purple})`,
                          },
                        }}
                      />
                      {completionPct === 100 && (
                        <Typography variant="caption" sx={{ color: C.emerald, fontWeight: 700, mt: 0.5, display: 'block' }}>
                          Perfect! All done for today
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* task list */}
                  <Stack spacing={0.75}>
                    <AnimatePresence>
                      {todayData.tasks.slice(0, 7).map((t, i) => (
                        <motion.div key={t.id || i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.28 }}
                        >
                          <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1.5,
                            px: 1.75, py: 1.2, borderRadius: 2.5,
                            background: t.completed
                              ? isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.03)'
                              : isDark ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.015)',
                            border: '1px solid',
                            borderColor: t.completed
                              ? 'rgba(16,185,129,0.18)'
                              : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.055)',
                          }}>
                            {t.completed
                              ? <CheckIcon sx={{ color: C.emerald, fontSize: 17, flexShrink: 0 }} />
                              : <UncheckedIcon sx={{ color: 'text.disabled', fontSize: 17, flexShrink: 0 }} />
                            }
                            <Typography variant="body2" sx={{
                              flex: 1, minWidth: 0,
                              fontWeight: t.completed ? 400 : 600,
                              color: t.completed ? 'text.secondary' : 'text.primary',
                              textDecoration: t.completed ? 'line-through' : 'none',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              fontSize: '0.84rem',
                            }}>
                              {t.text}
                            </Typography>
                            {t.topic && (
                              <Chip label={t.topic} size="small" sx={{
                                height: 18, fontSize: '0.6rem', fontWeight: 700, flexShrink: 0,
                                bgcolor: 'rgba(99,102,241,0.09)', color: C.indigoL,
                                border: '1px solid rgba(99,102,241,0.14)',
                              }} />
                            )}
                          </Box>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {totalTasks > 7 && (
                      <Typography variant="caption" color="text.disabled" sx={{ pl: 1, pt: 0.25 }}>
                        +{totalTasks - 7} more in planner
                      </Typography>
                    )}
                  </Stack>

                  <Button
                    fullWidth onClick={() => navigate('/planner')} endIcon={<ArrowIcon />}
                    sx={{
                      mt: 2.5, borderRadius: 3, fontWeight: 700, py: 1.1, fontSize: '0.84rem',
                      color: C.indigoL,
                      border: '1px solid rgba(99,102,241,0.18)',
                      background: 'rgba(99,102,241,0.04)',
                      '@media (hover: hover)': {
                        '&:hover': { background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.32)' },
                      },
                    }}
                  >
                    Open Full Planner
                  </Button>
                </>
              )}
            </Box>
          </Card>
        </MotionBox>

        {/* ── Right: Quick Launch + Planner Focus ─────────────────────────── */}
        <Stack spacing={2}>
          {/* Quick Launch */}
          <MotionBox variants={fadeUp} custom={6}>
            <Card isDark={isDark}>
              <Box sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.08em', color: 'text.secondary', textTransform: 'uppercase' }}>
                  Quick Launch
                </Typography>
              </Box>
              <Stack divider={<Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />}>
                <LaunchRow
                  icon={<AskIcon />} label="Cortex" desc="Ask any medical question"
                  gradient="linear-gradient(135deg, #6366f1, #a855f7)" glow="rgba(99,102,241,0.35)"
                  onClick={() => navigate('/question')} custom={7}
                />
                <LaunchRow
                  icon={<PlannerIcon />} label="Study Planner" desc="AI-generated schedule"
                  gradient="linear-gradient(135deg, #10b981, #059669)" glow="rgba(16,185,129,0.35)"
                  onClick={() => navigate('/planner')} custom={8}
                />
                <LaunchRow
                  icon={<LibraryIcon />} label="Book Library" desc="Medical references"
                  gradient="linear-gradient(135deg, #0ea5e9, #6366f1)" glow="rgba(14,165,233,0.35)"
                  onClick={() => navigate('/books')} custom={9}
                />
              </Stack>
              <Box sx={{ height: 6 }} />
            </Card>
          </MotionBox>

          {/* Planner Focus */}
          <MotionBox variants={fadeUp} custom={10}>
            <Card isDark={isDark}>
              <Box sx={{ px: 2.5, pt: 2.5, pb: 2.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.08em', color: 'text.secondary', textTransform: 'uppercase', mb: 2 }}>
                  {plannerMode === 'self_study' ? 'Self-Study Focus' : 'Exam Countdown'}
                </Typography>

                {plannerMode === 'self_study' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                    <Box sx={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.22)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.emerald,
                      boxShadow: '0 10px 30px rgba(16,185,129,0.14)',
                      flexShrink: 0,
                    }}>
                      <PlannerIcon sx={{ fontSize: 30 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography fontWeight={800} sx={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                        {planDurationDays ? `${planDurationDays}-day mastery path` : 'Self-study path active'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {`Year ${studyPlan?.mbbs_year || '—'}${subjectCount ? ` · ${subjectCount} subjects` : ''}${customScopeCount ? ` · ${customScopeCount} chosen chapters` : ''}`}
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={customScopeCount > 0 ? 'Custom scope' : 'Full-year syllabus'}
                          sx={{
                            height: 20, fontSize: '0.62rem', fontWeight: 700,
                            bgcolor: 'rgba(16,185,129,0.12)',
                            color: C.emerald,
                            border: '1px solid rgba(16,185,129,0.22)',
                          }}
                        />
                        {subjectCount > 0 && (
                          <Chip
                            size="small"
                            label={`${subjectCount} subjects`}
                            sx={{
                              height: 20, fontSize: '0.62rem', fontWeight: 700,
                              bgcolor: 'rgba(99,102,241,0.1)',
                              color: C.indigoL,
                              border: '1px solid rgba(99,102,241,0.18)',
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>
                ) : examDate && daysToExam !== null ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                    <ExamPulse days={daysToExam} />
                    <Box>
                      <Typography fontWeight={800} sx={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                        {studyPlan?.exam_name || studyPlan?.examName || 'Final Exam'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {examDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={daysToExam === 0 ? 'Today!' : daysToExam < 7 ? 'This week' : daysToExam < 30 ? 'This month' : 'Upcoming'}
                          sx={{
                            height: 20, fontSize: '0.62rem', fontWeight: 700,
                            bgcolor: daysToExam < 7 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                            color: daysToExam < 7 ? C.streak : C.amber,
                            border: `1px solid ${daysToExam < 7 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  /* No exam date CTA */
                  <Box sx={{ textAlign: 'center', py: 1 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: '50%', mx: 'auto', mb: 1.5,
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CalendarIcon sx={{ color: C.amber, fontSize: 22 }} />
                    </Box>
                    <Typography fontWeight={700} sx={{ mb: 0.5, fontSize: '0.88rem' }}>
                      No exam date set
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                      Add your exam date in the planner to start the countdown.
                    </Typography>
                    <Button
                      size="small" onClick={() => navigate('/planner')}
                      sx={{
                        borderRadius: 2.5, fontWeight: 700, px: 2, py: 0.75, fontSize: '0.78rem',
                        color: C.amber,
                        border: '1px solid rgba(245,158,11,0.25)',
                        background: 'rgba(245,158,11,0.07)',
                        '@media (hover: hover)': { '&:hover': { background: 'rgba(245,158,11,0.14)' } },
                      }}
                    >
                      Set Up Planner
                    </Button>
                  </Box>
                )}
              </Box>
            </Card>
          </MotionBox>
        </Stack>
      </Box>

      {/* ══ Ask Cortex search bar ═══════════════════════════════════════════════ */}
      <MotionBox variants={fadeUp} custom={11} sx={{ mb: { xs: 3, md: 3.5 } }}>
        <Card isDark={isDark} sx={{ px: { xs: 2, md: 2.5 }, py: { xs: 1.5, md: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Cortex pill */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.6,
              px: 1.25, py: 0.6, flexShrink: 0,
              borderRadius: 99,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              boxShadow: '0 2px 10px rgba(99,102,241,0.4)',
            }}>
              <AskIcon sx={{ fontSize: 11, color: '#fff' }} />
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#fff', letterSpacing: '0.08em' }}>
                CORTEX
              </Typography>
            </Box>

            <TextField
              fullWidth variant="standard"
              placeholder={isMobile ? 'Ask a medical question...' : 'Ask pharmacology, anatomy, pathology, clinical diagnosis…'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAsk()}
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: { xs: 14, md: 15 },
                  fontWeight: 500,
                },
              }}
            />

            <motion.div whileTap={{ scale: 0.9 }}>
              <IconButton
                onClick={submitAsk}
                disabled={!query.trim()}
                sx={{
                  flexShrink: 0,
                  width: 38, height: 38, borderRadius: 2.5,
                  background: query.trim()
                    ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  color: query.trim() ? '#fff' : 'text.disabled',
                  transition: 'background 0.2s, color 0.2s',
                  '@media (hover: hover)': {
                    '&:hover': { background: query.trim() ? 'linear-gradient(135deg, #4f46e5, #9333ea)' : undefined },
                  },
                }}
              >
                <SendIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </motion.div>
          </Box>
        </Card>
      </MotionBox>

      {/* ══ D) RECENT SESSIONS ════════════════════════════════════════════════ */}
      <MotionBox variants={fadeUp} custom={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}>
          <Typography fontWeight={800} sx={{ fontSize: '0.95rem' }}>
            Recent Cortex Sessions
          </Typography>
          {sessions.length > 0 && (
            <Button
              size="small" endIcon={<ArrowIcon sx={{ fontSize: '14px !important' }} />}
              onClick={() => navigate('/question')}
              sx={{ fontSize: '0.75rem', fontWeight: 700, color: C.indigoL, py: 0.5, px: 1.5, borderRadius: 2 }}
            >
              View all
            </Button>
          )}
        </Box>

        {sessions.length === 0 ? (
          <Card isDark={isDark} sx={{ px: 3, py: 4, textAlign: 'center' }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: '50%', mx: 'auto', mb: 1.5,
              background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
              border: '1px solid rgba(99,102,241,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AskIcon sx={{ color: C.indigo, fontSize: 24 }} />
            </Box>
            <Typography fontWeight={700} sx={{ mb: 0.5, fontSize: '0.9rem' }}>
              No sessions yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ask Cortex your first medical question to get started.
            </Typography>
            <Button
              variant="outlined" onClick={() => navigate('/question')}
              sx={{
                borderRadius: 3, fontWeight: 700, px: 3, py: 0.9, fontSize: '0.82rem',
                borderColor: 'rgba(99,102,241,0.3)', color: C.indigoL,
                '&:hover': { borderColor: C.indigoL, bgcolor: 'rgba(99,102,241,0.07)' },
              }}
            >
              Ask Cortex
            </Button>
          </Card>
        ) : (
          <Box
            component={motion.div}
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            sx={{
              display: 'flex',
              gap: { xs: 1.5, md: 2 },
              overflowX: { xs: 'auto', md: 'visible' },
              pb: { xs: 1, md: 0 },
              // custom scrollbar
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
            }}
          >
            {sessions.map((s, i) => (
              <SessionCard
                key={s.id || i}
                session={s}
                isDark={isDark}
                onClick={() => navigate('/question', { state: { sessionId: s.id } })}
                custom={i}
              />
            ))}
          </Box>
        )}
      </MotionBox>

    </Box>
  );
};

export default HomePage;
