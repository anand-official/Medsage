import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Grid, Button, useTheme, useMediaQuery,
  Stack, LinearProgress, Chip, Paper, TextField, Divider,
  IconButton, Skeleton,
} from '@mui/material';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
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
  Psychology as BrainIcon,
  TrendingUp as TrendingIcon,
  EmojiEvents as TrophyIcon,
  KeyboardArrowRight as ChevronIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useStudyContext } from '../contexts/StudyContext';
import '../animations.css';

// ─── Animated SVG Ring ────────────────────────────────────────────────────────
function ProgressRing({ pct = 0, size = 84, sw = 7 }) {
  const color = pct === 100 ? '#10b981' : '#6366f1';
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(99,102,241,0.1)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1), stroke 0.4s' }} />
      </svg>
      <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 0,
      }}>
        <Typography sx={{ fontSize: '1.15rem', fontWeight: 900, lineHeight: 1, color }}>
          {pct}%
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', fontWeight: 700 }}>
          done
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Big Stat Block ───────────────────────────────────────────────────────────
function StatBlock({ icon, value, label, sub, color, loading, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      style={{ flex: 1, minWidth: 0 }}
    >
      <Paper elevation={0} sx={{
        px: { xs: 2, md: 2.5 }, py: { xs: 2, md: 2.5 },
        borderRadius: 4,
        border: `1px solid ${color}22`,
        background: `${color}07`,
        position: 'relative', overflow: 'hidden',
        height: '100%',
      }}>
        {/* Accent glow */}
        <Box sx={{
          position: 'absolute', top: -20, right: -20,
          width: 80, height: 80, borderRadius: '50%',
          background: `${color}18`, filter: 'blur(20px)',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          width: 38, height: 38, borderRadius: 2.5, mb: 1.5,
          background: `${color}18`, border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </Box>
        {loading
          ? <Skeleton width={56} height={34} sx={{ bgcolor: 'rgba(255,255,255,0.07)', mb: 0.5 }} />
          : <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, fontWeight: 900, lineHeight: 1, color, mb: 0.25 }}>
              {value ?? '—'}
            </Typography>
        }
        <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, mt: 0.25, display: 'block' }}>
            {sub}
          </Typography>
        )}
      </Paper>
    </motion.div>
  );
}

// ─── Quick Launch Row ─────────────────────────────────────────────────────────
function LaunchRow({ icon, label, desc, gradient, glow, onClick, delay = 0 }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Box
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 2,
          px: 2, py: 1.5, cursor: 'pointer',
          borderRadius: 3,
          transition: 'background 0.18s',
          background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
          '&:active': { background: 'rgba(255,255,255,0.07)' },
        }}
      >
        <Box sx={{
          width: 44, height: 44, borderRadius: 3, flexShrink: 0,
          background: gradient,
          boxShadow: hovered ? `0 6px 20px ${glow}` : `0 3px 10px ${glow.replace('0.35','0.2')}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
          transition: 'box-shadow 0.2s, transform 0.2s',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}>
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} sx={{ fontSize: '0.88rem', lineHeight: 1.2 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">{desc}</Typography>
        </Box>
        <ChevronIcon sx={{
          fontSize: 20, color: hovered ? 'primary.main' : 'text.disabled',
          transition: 'color 0.2s, transform 0.2s',
          transform: hovered ? 'translateX(3px)' : 'none',
          flexShrink: 0,
        }} />
      </Box>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const HomePage = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const {
    studyPlan, todayData, analyticsData,
    getStudyPlan, fetchToday, fetchAnalytics, todayLoading,
  } = useStudyContext();

  const [query, setQuery] = useState('');

  const firstName = userProfile?.displayName?.split(' ')[0] || 'Doctor';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    if (!studyPlan) getStudyPlan();
    if (!todayData) fetchToday();
    if (!analyticsData) fetchAnalytics();
  }, []);

  const totalTasks = todayData?.tasks?.length ?? 0;
  const doneTasks = todayData?.tasks?.filter(t => t.completed).length ?? 0;
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const streak = analyticsData?.streak?.current ?? todayData?.streak?.current ?? 0;
  const topicsDone = analyticsData?.totalCompleted ?? studyPlan?.completedTopics ?? 0;

  const go = (path) => navigate(path);
  const submitAsk = () => {
    const q = query.trim();
    if (q) navigate('/question', { state: { initialQuery: q } });
  };

  return (
    <Box sx={{ position: 'relative', pb: { xs: 4, md: 6 } }}>

      {/* ══════════════════════════════════════════════════════════
          HERO  – full-bleed cinematic banner
      ══════════════════════════════════════════════════════════ */}
      <Box sx={{
        position: 'relative',
        mx: { xs: -2, sm: -3, md: -4, lg: -6 },
        px: { xs: 2, sm: 3, md: 4, lg: 6 },
        pt: { xs: 4, md: 6 },
        pb: { xs: 5, md: 7 },
        mb: { xs: 4, md: 5 },
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(160deg, #09090f 0%, #130d24 45%, #0b1120 100%)'
          : 'linear-gradient(160deg, #1a1040 0%, #2e1a6e 45%, #102040 100%)',
      }}>
        {/* ── background decoration ── */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* grid */}
          <Box sx={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }} />
          {/* orbs */}
          <Box sx={{
            position: 'absolute', top: '-20%', right: '-8%',
            width: 520, height: 520, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.28) 0%, transparent 65%)',
            filter: 'blur(50px)',
          }} />
          <Box sx={{
            position: 'absolute', bottom: '-30%', left: '10%',
            width: 440, height: 440, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.32) 0%, transparent 65%)',
            filter: 'blur(50px)',
          }} />
          <Box sx={{
            position: 'absolute', top: '20%', left: '-5%',
            width: 300, height: 300, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }} />
          {/* bottom fade */}
          <Box sx={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
            background: isDark
              ? 'linear-gradient(transparent, #09090f)'
              : 'linear-gradient(transparent, #1a1040)',
          }} />
        </Box>

        {/* ── content ── */}
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* date badge */}
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.75,
              px: 1.5, py: 0.5, borderRadius: 99, mb: 2,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(8px)',
            }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: '50%',
                bgcolor: '#10b981',
                boxShadow: '0 0 6px #10b981',
              }} />
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.05em' }}>
                {dayStr}
              </Typography>
            </Box>

            {/* greeting */}
            <Typography sx={{
              fontWeight: 900,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3.2rem' },
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              color: '#fff',
              mb: { xs: 3, md: 4 },
            }}>
              {greeting},&nbsp;
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 60%, #fb923c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {firstName}
              </Box>
            </Typography>

            {/* AI search bar */}
            <Box sx={{ position: 'relative', maxWidth: 640 }}>
              {/* glow */}
              <Box sx={{
                position: 'absolute', inset: -2,
                borderRadius: 4,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(168,85,247,0.4), rgba(236,72,153,0.3))',
                filter: 'blur(10px)',
                opacity: 0.6,
                zIndex: 0,
              }} />
              <Paper elevation={0} sx={{
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center',
                borderRadius: 3.5,
                border: '1.5px solid rgba(255,255,255,0.18)',
                background: 'rgba(10,8,20,0.65)',
                backdropFilter: 'blur(24px)',
                px: { xs: 1.5, md: 2.5 }, py: 1,
                '&:focus-within': {
                  borderColor: 'rgba(167,139,250,0.7)',
                  boxShadow: '0 0 0 4px rgba(99,102,241,0.15)',
                },
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.6,
                  px: 1.25, py: 0.6, mr: 2, flexShrink: 0,
                  borderRadius: 99,
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  boxShadow: '0 2px 10px rgba(99,102,241,0.45)',
                }}>
                  <AskIcon sx={{ fontSize: 12, color: '#fff' }} />
                  <Typography sx={{ fontSize: '0.62rem', fontWeight: 900, color: '#fff', letterSpacing: '0.08em' }}>
                    CORTEX
                  </Typography>
                </Box>

                <TextField
                  fullWidth variant="standard"
                  placeholder={isMobile ? 'Ask a medical question...' : 'Ask anything — pharmacology, anatomy, pathology, diagnosis...'}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAsk()}
                  InputProps={{
                    disableUnderline: true,
                    sx: {
                      fontSize: { xs: 14, md: 16 },
                      fontWeight: 500,
                      '& input': { color: 'rgba(255,255,255,0.9)' },
                    },
                  }}
                  sx={{ '& input::placeholder': { color: 'rgba(255,255,255,0.35)', opacity: 1 } }}
                />

                <motion.div whileTap={{ scale: 0.92 }}>
                  <IconButton
                    onClick={submitAsk}
                    disabled={!query.trim()}
                    sx={{
                      ml: 1, flexShrink: 0,
                      width: 40, height: 40, borderRadius: 2.5,
                      background: query.trim()
                        ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                        : 'rgba(255,255,255,0.07)',
                      color: query.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
                      transition: 'background 0.2s, color 0.2s',
                      '@media (hover: hover)': {
                        '&:hover': { background: query.trim() ? 'linear-gradient(135deg, #4f46e5, #9333ea)' : undefined },
                      },
                    }}
                  >
                    <SendIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </motion.div>
              </Paper>
            </Box>
          </motion.div>
        </Box>
      </Box>

      {/* ══════════════════════════════════════════════════════════
          STATS ROW
      ══════════════════════════════════════════════════════════ */}
      <Stack
        direction={{ xs: 'row' }}
        spacing={{ xs: 1.25, md: 2 }}
        sx={{ mb: { xs: 3, md: 4 }, flexWrap: { xs: 'wrap', sm: 'nowrap' }, rowGap: 1.25 }}
      >
        <StatBlock
          icon={<StreakIcon sx={{ fontSize: 19 }} />}
          value={streak || 0} label="Day Streak" sub="days in a row"
          color="#ef4444" loading={todayLoading && !streak} delay={0.05}
        />
        <StatBlock
          icon={<CheckIcon sx={{ fontSize: 19 }} />}
          value={todayLoading ? null : `${doneTasks}/${totalTasks}`} label="Today's Tasks" sub="completed"
          color="#6366f1" loading={todayLoading} delay={0.15}
        />
        <StatBlock
          icon={<TrendingIcon sx={{ fontSize: 19 }} />}
          value={topicsDone} label="Topics Mastered" sub="all time"
          color="#10b981" loading={todayLoading} delay={0.2}
        />
      </Stack>

      {/* ══════════════════════════════════════════════════════════
          MAIN BENTO GRID
      ══════════════════════════════════════════════════════════ */}
      <Grid container spacing={{ xs: 2, md: 2.5 }}>

        {/* ── TODAY'S FOCUS ─────────────────────────────────────── */}
        <Grid item xs={12} md={7} lg={8}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            style={{ height: '100%' }}
          >
            <Paper elevation={0} sx={{
              height: '100%',
              borderRadius: 4,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              background: isDark
                ? 'rgba(12,10,22,0.7)'
                : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* card header */}
              <Box sx={{
                px: { xs: 2.5, md: 3 }, pt: 3, pb: 2.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: 3,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TrophyIcon sx={{ color: '#fff', fontSize: 19 }} />
                  </Box>
                  <Box>
                    <Typography fontWeight={800} sx={{ fontSize: '1.05rem', lineHeight: 1.1 }}>
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
                    label={completionPct === 100 ? '🎉 All done!' : `${completionPct}% complete`}
                    sx={{
                      fontWeight: 800, fontSize: '0.72rem',
                      bgcolor: completionPct === 100 ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)',
                      color: completionPct === 100 ? '#10b981' : '#818cf8',
                      border: `1px solid ${completionPct === 100 ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.25)'}`,
                    }}
                  />
                )}
              </Box>

              {/* card body */}
              <Box sx={{ px: { xs: 2.5, md: 3 }, py: 3, flex: 1 }}>
                {todayLoading ? (
                  <Stack spacing={1.5}>
                    {[1,2,3,4].map(i => (
                      <Skeleton key={i} variant="rounded" height={54}
                        sx={{ borderRadius: 2.5, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                    ))}
                  </Stack>
                ) : !todayData || totalTasks === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Box sx={{
                      width: 72, height: 72, borderRadius: '50%',
                      mx: 'auto', mb: 2.5,
                      background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <PlannerIcon sx={{ color: '#6366f1', fontSize: 32 }} />
                    </Box>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>No study plan yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 280, mx: 'auto' }}>
                      Set up your AI-generated study plan to track daily goals.
                    </Typography>
                    <Button
                      variant="contained" startIcon={<PlannerIcon />}
                      onClick={() => go('/planner')}
                      sx={{
                        borderRadius: 3, fontWeight: 700, px: 4, py: 1.2,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        boxShadow: '0 4px 18px rgba(99,102,241,0.4)',
                      }}
                    >
                      Create Study Plan
                    </Button>
                  </Box>
                ) : (
                  <>
                    {/* progress summary */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3.5 }}>
                      <ProgressRing pct={completionPct} />
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={700} sx={{ mb: 1, fontSize: '0.92rem' }}>
                          {doneTasks} of {totalTasks} tasks complete
                        </Typography>
                        <LinearProgress
                          variant="determinate" value={completionPct}
                          sx={{
                            height: 7, borderRadius: 4,
                            bgcolor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              background: completionPct === 100
                                ? 'linear-gradient(90deg, #10b981, #059669)'
                                : 'linear-gradient(90deg, #6366f1, #a855f7)',
                            },
                          }}
                        />
                        {completionPct === 100 && (
                          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700, mt: 0.5, display: 'block' }}>
                            Perfect! All done for today 🎉
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* task list */}
                    <Stack spacing={1}>
                      <AnimatePresence>
                        {todayData.tasks.slice(0, 7).map((t, i) => (
                          <motion.div key={t.id || i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                          >
                            <Box sx={{
                              display: 'flex', alignItems: 'center', gap: 1.5,
                              px: 2, py: 1.4, borderRadius: 3,
                              background: t.completed
                                ? isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)'
                                : isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
                              border: '1px solid',
                              borderColor: t.completed
                                ? 'rgba(16,185,129,0.2)'
                                : isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.065)',
                              transition: 'background 0.2s',
                            }}>
                              {t.completed
                                ? <CheckIcon sx={{ color: '#10b981', fontSize: 18, flexShrink: 0 }} />
                                : <UncheckedIcon sx={{ color: 'text.disabled', fontSize: 18, flexShrink: 0 }} />
                              }
                              <Typography variant="body2" sx={{
                                flex: 1, minWidth: 0,
                                fontWeight: t.completed ? 400 : 600,
                                color: t.completed ? 'text.secondary' : 'text.primary',
                                textDecoration: t.completed ? 'line-through' : 'none',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {t.text}
                              </Typography>
                              {t.topic && (
                                <Chip label={t.topic} size="small" sx={{
                                  height: 20, fontSize: '0.62rem', fontWeight: 700, flexShrink: 0,
                                  bgcolor: 'rgba(99,102,241,0.09)', color: '#818cf8',
                                  border: '1px solid rgba(99,102,241,0.15)',
                                }} />
                              )}
                            </Box>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {totalTasks > 7 && (
                        <Typography variant="caption" color="text.disabled" sx={{ pl: 1, pt: 0.5 }}>
                          +{totalTasks - 7} more tasks in planner
                        </Typography>
                      )}
                    </Stack>

                    <Button
                      fullWidth onClick={() => go('/planner')} endIcon={<ArrowIcon />}
                      sx={{
                        mt: 3, borderRadius: 3, fontWeight: 700, py: 1.2,
                        color: '#818cf8',
                        border: '1px solid rgba(99,102,241,0.18)',
                        background: 'rgba(99,102,241,0.04)',
                        '@media (hover: hover)': {
                          '&:hover': { background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.35)' },
                        },
                      }}
                    >
                      Open Full Planner
                    </Button>
                  </>
                )}
              </Box>
            </Paper>
          </motion.div>
        </Grid>

        {/* ── RIGHT COLUMN ──────────────────────────────────────── */}
        <Grid item xs={12} md={5} lg={4}>
          <Stack spacing={2} sx={{ height: '100%' }}>

            {/* Quick Launch */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.24 }}
            >
              <Paper elevation={0} sx={{
                borderRadius: 4,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
                background: isDark ? 'rgba(12,10,22,0.7)' : 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(20px)',
                overflow: 'hidden',
              }}>
                <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                  <Typography fontWeight={800} sx={{ fontSize: '0.82rem', letterSpacing: '0.08em', color: 'text.secondary', textTransform: 'uppercase' }}>
                    Quick Launch
                  </Typography>
                </Box>

                <Stack divider={<Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />}>
                  <LaunchRow
                    icon={<AskIcon sx={{ fontSize: 22 }} />}
                    label="Cortex" desc="Ask any medical question"
                    gradient="linear-gradient(135deg, #6366f1, #a855f7)"
                    glow="rgba(99,102,241,0.35)"
                    onClick={() => go('/question')} delay={0.28}
                  />
                  <LaunchRow
                    icon={<PlannerIcon sx={{ fontSize: 22 }} />}
                    label="Study Planner" desc="AI-generated schedule"
                    gradient="linear-gradient(135deg, #10b981, #059669)"
                    glow="rgba(16,185,129,0.35)"
                    onClick={() => go('/planner')} delay={0.36}
                  />
                  <LaunchRow
                    icon={<LibraryIcon sx={{ fontSize: 22 }} />}
                    label="Book Library" desc="Medical references"
                    gradient="linear-gradient(135deg, #0ea5e9, #6366f1)"
                    glow="rgba(14,165,233,0.35)"
                    onClick={() => go('/books')} delay={0.4}
                  />
                </Stack>
                <Box sx={{ height: 8 }} />
              </Paper>
            </motion.div>


          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
