// src/pages/HomePage.js
import React, { useState, useEffect, useMemo } from 'react';
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
  AutoStories as ReviewIcon,
  KeyboardArrowRight as ChevronIcon,
  AccessTime as ClockIcon,
  CalendarToday as CalendarIcon,
  Bolt as BoltIcon,
  Tune as TuneIcon,
  TrackChanges as FocusIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useStudyContext } from '../contexts/StudyContext';
import sm2API from '../services/sm2Service';
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
function getTaskTypeCopy(taskType) {
  if (taskType === 'review') {
    return {
      label: 'Review',
      tone: 'Retention',
      gradient: 'linear-gradient(135deg, #f59e0b, #ea580c)',
    };
  }

  if (taskType === 'mock_exam') {
    return {
      label: 'Mock',
      tone: 'Pressure',
      gradient: 'linear-gradient(135deg, #ef4444, #f97316)',
    };
  }

  return {
    label: 'Learn',
    tone: 'Depth',
    gradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
  };
}

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
  const [reviewStats, setReviewStats] = useState({
    loading: true,
    data: null,
    error: null,
  });

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

  useEffect(() => {
    let cancelled = false;

    const loadReviewStats = async () => {
      try {
        const data = await sm2API.getStats();
        if (cancelled) return;
        setReviewStats({
          loading: false,
          data,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setReviewStats({
          loading: false,
          data: null,
          error: error?.message || 'Review stats unavailable',
        });
      }
    };

    loadReviewStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalTasks     = todayData?.tasks?.length ?? 0;
  const doneTasks      = todayData?.tasks?.filter(t => t.completed).length ?? 0;
  const completionPct  = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const streak         = analyticsData?.streak?.current ?? todayData?.streak?.current ?? 0;
  const topicsDone     = analyticsData?.totalCompleted ?? studyPlan?.completedTopics ?? 0;
  const dueReviewCount = reviewStats?.data?.due_now ?? 0;
  const retentionRate = reviewStats?.data?.avg_retention ?? null;
  const reviewDeckSize = reviewStats?.data?.total_cards ?? 0;

  const plannerMode = studyPlan?.plan_mode || (studyPlan?.exam_date ? 'exam' : null);
  const planDurationDays = studyPlan?.plan_duration_days || studyPlan?.daily_plan?.length || null;
  const subjectCount = studyPlan?.subjects_selected?.length || 0;
  const customScopeCount = studyPlan?.selected_topic_keys?.length || 0;
  const weakTopics = studyPlan?.weak_topics || [];
  const strongTopics = studyPlan?.strong_topics || [];
  const incompleteTasks = todayData?.tasks?.filter((task) => !task.completed) || [];
  const nextTask = incompleteTasks[0] || null;

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
  const lastSession = sessions[0] || null;

  const submitAsk = () => {
    const q = query.trim();
    if (q) navigate('/question', { state: { initialQuery: q } });
  };

  const commandCenter = useMemo(() => {
    if (!studyPlan) {
      return {
        eyebrow: 'Build your study OS',
        title: 'Generate a plan that knows your year, scope, and pressure window.',
        body: 'Start with the planner so Medsage can map today, revision load, and the chapters that deserve extra repetition.',
        ctaLabel: 'Create Study Plan',
        ctaAction: () => navigate('/planner'),
        secondaryLabel: 'Ask Cortex First',
        secondaryAction: () => navigate('/question'),
        chips: ['No plan yet', 'Personalization locked', 'Daily loop inactive'],
        accent: 'linear-gradient(135deg, #6366f1, #a855f7)',
      };
    }

    if (dueReviewCount > 0) {
      return {
        eyebrow: 'Highest leverage right now',
        title: `Clear ${dueReviewCount} due review card${dueReviewCount === 1 ? '' : 's'} before learning anything new.`,
        body: retentionRate !== null
          ? `Your current retention is ${retentionRate}%. Locking recall first will make the rest of today’s work compound better.`
          : 'Your review queue is live. Finish the due cards first to protect long-term recall before you push new topics.',
        ctaLabel: 'Start Review Session',
        ctaAction: () => navigate('/review'),
        secondaryLabel: nextTask ? 'Open Planner' : 'Ask Cortex',
        secondaryAction: () => navigate(nextTask ? '/planner' : '/question'),
        chips: [
          `${dueReviewCount} due now`,
          reviewDeckSize > 0 ? `${reviewDeckSize} cards in deck` : 'Review active',
          plannerMode === 'exam' ? 'Exam retention mode' : 'Self-study retention mode',
        ],
        accent: 'linear-gradient(135deg, #f59e0b, #ea580c)',
      };
    }

    if (nextTask) {
      const taskTypeCopy = getTaskTypeCopy(nextTask.type);
      const taskTopic = nextTask.topic || weakTopics[0] || studyPlan?.subjects_selected?.[0] || 'your next topic';
      return {
        eyebrow: `${taskTypeCopy.tone} block ready`,
        title: nextTask.text,
        body: plannerMode === 'exam' && daysToExam !== null
          ? `${daysToExam} day${daysToExam === 1 ? '' : 's'} left. This is the next block Medsage wants you to finish to stay on pace.`
          : 'This is the next block in your mastery path. Completing it keeps your momentum and weak-area coverage intact.',
        ctaLabel: nextTask.type === 'review' ? 'Open Review' : 'Study This Topic',
        ctaAction: () => {
          if (nextTask.type === 'review') {
            navigate('/review');
            return;
          }

          navigate('/question', {
            state: {
              initialQuery: `Teach me ${taskTopic} at my MBBS level. Make it high-yield, structured, and exam-focused.`,
            },
          });
        },
        secondaryLabel: 'Open Planner',
        secondaryAction: () => navigate('/planner'),
        chips: [
          taskTypeCopy.label,
          nextTask.topic || 'Planner-guided topic',
          completionPct === 100 ? 'Today complete' : `${completionPct}% of today done`,
        ],
        accent: taskTypeCopy.gradient,
      };
    }

    if (lastSession) {
      return {
        eyebrow: 'Resume your flow',
        title: 'Your planner is clear. Continue your last Cortex study session.',
        body: 'Use the gap to deepen one concept, turn it into notes, or create the next revision loop from that conversation.',
        ctaLabel: 'Continue Cortex Session',
        ctaAction: () => navigate('/question', { state: { sessionId: lastSession.id } }),
        secondaryLabel: 'Open Library',
        secondaryAction: () => navigate('/books'),
        chips: ['Planner caught up', 'Cortex context ready', 'Use spare depth block'],
        accent: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
      };
    }

    return {
      eyebrow: 'Stay in motion',
      title: 'Your core tasks are done. Use Cortex to reinforce a weak topic before you log off.',
      body: weakTopics.length > 0
        ? `Recommended weak area: ${weakTopics[0]}. One extra high-yield pass now is worth more than passive revision later.`
        : 'Open Cortex for a focused recap, viva drill, or rapid-fire revision round while your momentum is high.',
      ctaLabel: 'Open Cortex',
      ctaAction: () => navigate('/question', {
        state: {
          initialQuery: weakTopics[0]
            ? `Give me a rapid revision drill on ${weakTopics[0]} with high-yield exam points and recall questions.`
            : 'Give me a rapid revision drill for one high-yield medical topic at my MBBS level.',
        },
      }),
      secondaryLabel: 'Open Review',
      secondaryAction: () => navigate('/review'),
      chips: ['Momentum preserved', 'Use a quick reinforcement block', plannerMode === 'exam' ? 'Exam mode active' : 'Mastery mode active'],
      accent: 'linear-gradient(135deg, #10b981, #059669)',
    };
  }, [
    completionPct,
    daysToExam,
    dueReviewCount,
    lastSession,
    navigate,
    nextTask,
    plannerMode,
    retentionRate,
    reviewDeckSize,
    studyPlan,
    weakTopics,
  ]);

  const focusSignals = useMemo(() => {
    const signals = [];

    if (plannerMode === 'exam' && daysToExam !== null) {
      signals.push({
        icon: <CalendarIcon sx={{ fontSize: 16 }} />,
        label: 'Exam Pressure',
        value: daysToExam === 0 ? 'Exam day' : `${daysToExam} day${daysToExam === 1 ? '' : 's'} left`,
        tone: daysToExam < 7 ? C.streak : C.amber,
      });
    } else if (planDurationDays) {
      signals.push({
        icon: <PlannerIcon sx={{ fontSize: 16 }} />,
        label: 'Study Horizon',
        value: `${planDurationDays} days`,
        tone: C.emerald,
      });
    }

    signals.push({
      icon: <FocusIcon sx={{ fontSize: 16 }} />,
      label: 'Scope',
      value: customScopeCount > 0 ? `${customScopeCount} custom chapters` : `${subjectCount || 0} subjects`,
      tone: C.indigo,
    });

    signals.push({
      icon: <ReviewIcon sx={{ fontSize: 16 }} />,
      label: 'Review Queue',
      value: reviewStats.loading ? 'Checking...' : `${dueReviewCount} due now`,
      tone: dueReviewCount > 0 ? C.amber : C.emerald,
    });

    signals.push({
      icon: <TuneIcon sx={{ fontSize: 16 }} />,
      label: 'Weak Areas',
      value: weakTopics.length > 0 ? weakTopics.slice(0, 2).join(' · ') : 'Not marked yet',
      tone: weakTopics.length > 0 ? C.streak : C.purple,
    });

    return signals;
  }, [
    customScopeCount,
    daysToExam,
    dueReviewCount,
    planDurationDays,
    plannerMode,
    reviewStats.loading,
    subjectCount,
    weakTopics,
  ]);

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

      <MotionBox variants={fadeUp} custom={0.5} sx={{ mb: { xs: 3, md: 3.5 } }}>
        <Card
          isDark={isDark}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            background: isDark
              ? 'linear-gradient(135deg, rgba(10,12,26,0.96), rgba(20,14,40,0.94))'
              : 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(247,244,255,0.98))',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.08)'}`,
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, background: commandCenter.accent, opacity: isDark ? 0.12 : 0.08, pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', top: -90, right: -70, width: 240, height: 240, borderRadius: '50%', background: commandCenter.accent, opacity: isDark ? 0.18 : 0.12, filter: 'blur(55px)', pointerEvents: 'none' }} />

          <Box sx={{ position: 'relative', p: { xs: 2.5, md: 3.5 } }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.45fr 1fr' }, gap: { xs: 2.5, lg: 3 }, alignItems: 'stretch' }}>
              <Box>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '0.14em' }}>
                  Study Operating System
                </Typography>
                <Typography sx={{ mt: 0.25, fontWeight: 900, fontSize: { xs: '1.75rem', md: '2.35rem' }, letterSpacing: '-0.05em', lineHeight: 1.02 }}>
                  Today Command Center
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 640, fontSize: { xs: '0.92rem', md: '1rem' } }}>
                  {commandCenter.eyebrow}. Medsage is prioritizing the next move that keeps your recall, planner pace, and weak-topic coverage aligned.
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, rowGap: 1 }}>
                  {commandCenter.chips.map((chip) => (
                    <Chip
                      key={chip}
                      label={chip}
                      size="small"
                      sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.08)'}` }}
                    />
                  ))}
                </Stack>
              </Box>

              <Box sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.78)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.08)'}`, boxShadow: isDark ? '0 18px 40px rgba(0,0,0,0.28)' : '0 18px 40px rgba(99,102,241,0.08)' }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', background: commandCenter.accent, color: '#fff', boxShadow: '0 8px 24px rgba(99,102,241,0.28)', mb: 1.5 }}>
                  <BoltIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary' }}>
                  Next Best Move
                </Typography>
                <Typography sx={{ mt: 0.75, fontWeight: 800, fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.2 }}>
                  {commandCenter.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.1, lineHeight: 1.7 }}>
                  {commandCenter.body}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2.25 }}>
                  <Button
                    onClick={commandCenter.ctaAction}
                    startIcon={<BoltIcon />}
                    sx={{ borderRadius: 3, fontWeight: 800, px: 2.5, py: 1.1, color: '#fff', background: commandCenter.accent, boxShadow: '0 10px 24px rgba(99,102,241,0.24)' }}
                  >
                    {commandCenter.ctaLabel}
                  </Button>
                  <Button
                    onClick={commandCenter.secondaryAction}
                    variant="outlined"
                    sx={{ borderRadius: 3, fontWeight: 700, px: 2.25, py: 1.1, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.14)' }}
                  >
                    {commandCenter.secondaryLabel}
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>
        </Card>
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
        <StatPill
          icon={<ReviewIcon />}
          value={reviewStats.loading ? null : dueReviewCount}
          label="Due Reviews" color={C.amber}
          loading={reviewStats.loading} custom={4}
        />
        {plannerMode === 'exam' && daysToExam !== null && (
          <StatPill
            icon={<CalendarIcon />} value={daysToExam}
            label="Days to Exam" color={C.amber}
            loading={false} custom={5}
          />
        )}
        {plannerMode === 'self_study' && planDurationDays !== null && (
          <StatPill
            icon={<PlannerIcon />} value={planDurationDays}
            label="Study Horizon" color={C.emerald}
            loading={false} custom={5}
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
                  icon={<ReviewIcon />} label="Daily Review" desc="Spaced repetition session"
                  gradient="linear-gradient(135deg, #f59e0b, #ea580c)" glow="rgba(245,158,11,0.35)"
                  onClick={() => navigate('/review')} custom={9}
                />
                <LaunchRow
                  icon={<LibraryIcon />} label="Book Library" desc="Medical references"
                  gradient="linear-gradient(135deg, #0ea5e9, #6366f1)" glow="rgba(14,165,233,0.35)"
                  onClick={() => navigate('/books')} custom={10}
                />
              </Stack>
              <Box sx={{ height: 6 }} />
            </Card>
          </MotionBox>

          <MotionBox variants={fadeUp} custom={9.5}>
            <Card isDark={isDark}>
              <Box sx={{ px: 2.5, pt: 2.5, pb: 2.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.08em', color: 'text.secondary', textTransform: 'uppercase', mb: 2 }}>
                  Study Pulse
                </Typography>

                <Stack spacing={1.1}>
                  {focusSignals.map((signal) => (
                    <Box
                      key={signal.label}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        p: 1.35,
                        borderRadius: 2.5,
                        border: `1px solid ${signal.tone}22`,
                        background: `${signal.tone}10`,
                      }}
                    >
                      <Box sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: signal.tone,
                        background: `${signal.tone}20`,
                      }}>
                        {signal.icon}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', lineHeight: 1.1 }}>
                          {signal.label}
                        </Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', lineHeight: 1.25 }}>
                          {signal.value}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>

                <Box sx={{ mt: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', color: 'text.secondary', textTransform: 'uppercase', mb: 1.1 }}>
                    Personalization Layer
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ rowGap: 0.75 }}>
                    {(weakTopics.length > 0 ? weakTopics.slice(0, 3) : ['Add weak topics in planner']).map((topic) => (
                      <Chip
                        key={`weak-${topic}`}
                        icon={<TuneIcon sx={{ fontSize: '13px !important' }} />}
                        label={topic}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          bgcolor: 'rgba(239,68,68,0.12)',
                          color: weakTopics.length > 0 ? C.streak : 'text.secondary',
                          border: '1px solid rgba(239,68,68,0.18)',
                        }}
                      />
                    ))}
                    {strongTopics.slice(0, 2).map((topic) => (
                      <Chip
                        key={`strong-${topic}`}
                        icon={<FocusIcon sx={{ fontSize: '13px !important' }} />}
                        label={topic}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          bgcolor: 'rgba(16,185,129,0.12)',
                          color: C.emerald,
                          border: '1px solid rgba(16,185,129,0.18)',
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              </Box>
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
