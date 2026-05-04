import React, { useEffect, useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, CircularProgress, Stack, Tabs, Tab,
    Paper, List, ListItem, ListItemIcon, ListItemText, Alert, Checkbox, Grow,
    Collapse, Divider, Tooltip, IconButton, Chip
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon, RadioButtonUnchecked as UncheckedIcon,
    Repeat as RepeatIcon, FactCheck as FactCheckIcon,
    MenuBook as BookIcon, OpenInNew as OpenIcon, SmartToy as AiIcon, ExpandMore as ExpandMoreIcon,
    YouTube as YouTubeIcon, Star as StarIcon, Bookmark as ReferenceIcon
} from '@mui/icons-material';
import { DateCalendar, PickersDay } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useNavigate } from '../utils/navigation';

import { useStudyContext } from '../contexts/StudyContext';
import { useAuth } from '../contexts/AuthContext';
import PlannerSetup from '../components/planner/PlannerSetup';
import TodoList from '../components/planner/TodoList';
import ProgressRing from '../components/planner/ProgressRing';
import PerformanceChart from '../components/planner/PerformanceChart';
import StreakCounter from '../components/planner/StreakCounter';
import GoalTimeline from '../components/planner/GoalTimeline';
import PlanCoach from '../components/planner/PlanCoach';
import MorningBriefing from '../components/planner/MorningBriefing';
import PlanHealthPanel from '../components/planner/PlanHealthPanel';
import SystemDiagnosticsPanel from '../components/system/SystemDiagnosticsPanel';

// Stable component reference so MUI DateCalendar doesn't remount all days on every render.
// Extra props (dateStatusMap) are injected via slotProps.day and destructured here before
// spreading the remainder into PickersDay to avoid unknown-prop warnings.
function CustomDay({ day, outsideCurrentMonth, dateStatusMap, ...other }) {
  const dateStr = format(day, 'yyyy-MM-dd');
  const status = !outsideCurrentMonth ? dateStatusMap?.[dateStr] : null;

  let dotColor = null;
  if (status) {
    if (status.done === status.total) dotColor = '#10b981';
    else if (status.done > 0) dotColor = '#f59e0b';
    else dotColor = '#6366f1';
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <PickersDay day={day} outsideCurrentMonth={outsideCurrentMonth} {...other} />
      {dotColor && (
        <Box sx={{
          position: 'absolute', bottom: 2, left: '50%',
          transform: 'translateX(-50%)',
          width: 5, height: 5, borderRadius: '50%',
          bgcolor: dotColor,
          pointerEvents: 'none',
        }} />
      )}
    </Box>
  );
}

export default function StudyPlannerPage() {
  const {
    studyPlan, getStudyPlan, fetchToday, fetchAnalytics, fetchDailyAdvisory, tickTask,
    todayData, analyticsData,
    planState, todayState, analyticsState,
    planLoading, generateError, planError, todayError, analyticsError,
    rebalancePlan,
  } = useStudyContext();
  const { authStatus } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSetup, setShowSetup] = useState(false);
  const [initLoad, setInitLoad] = useState(true);
  const [selectedPlanDate, setSelectedPlanDate] = useState(new Date());
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [generatedPlanSnapshot, setGeneratedPlanSnapshot] = useState(null);

  // Track which calendar tasks have expanded resources
  const [expandedCalResources, setExpandedCalResources] = useState(new Set());
  const resolvedStudyPlan = studyPlan || generatedPlanSnapshot;

  // Map dateStr → { total, done } for dot indicators
  const dateStatusMap = useMemo(() => {
    const map = {};
    (resolvedStudyPlan?.daily_plan || []).forEach(d => {
      if (d.tasks && d.tasks.length > 0) {
        const done = d.tasks.filter(t => t.completed).length;
        map[d.date] = { total: d.tasks.length, done };
      }
    });
    return map;
  }, [resolvedStudyPlan]);

  useEffect(() => {
    if (studyPlan) {
      setGeneratedPlanSnapshot(null);
    }
  }, [studyPlan]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const plan = await getStudyPlan();
        if (plan === null) {
          setShowSetup(true);
        } else if (plan) {
          await Promise.all([fetchToday(), fetchAnalytics()]);
          fetchDailyAdvisory();
        }
      } catch (e) {
        console.error("Failed to load plan", e);
      } finally {
        setInitLoad(false);
      }
    };
    loadData();
  }, [getStudyPlan, fetchToday, fetchAnalytics]);

  if ((initLoad || planLoading) && !resolvedStudyPlan) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2, py: 10 }} role="status" aria-live="polite">
        <CircularProgress />
        <Box sx={{ textAlign: 'center', px: 2 }}>
          <Typography variant="h6" fontWeight={800}>
            Preparing your study planner
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
            Loading your plan, today's schedule, and progress signals from the Medsage backend.
          </Typography>
        </Box>
      </Box>
    );
  }

  if (showSetup || (!resolvedStudyPlan && planState !== 'error')) {
    return (
      <Box sx={{ pb: 10, maxWidth: 1000, mx: 'auto' }}>
        {!resolvedStudyPlan && (
          <Box sx={{ mb: 3, px: { xs: 1, sm: 0 } }} role="status" aria-live="polite">
            <Typography variant="h4" fontWeight={900} sx={{ mb: 1, fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
              Build your first college-ready study plan
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 720 }}>
              Choose your year, exam horizon, and high-priority topics. Medsage will turn that into daily checkpoints you can actually finish.
            </Typography>
          </Box>
        )}
        <PlannerSetup
          onCancel={resolvedStudyPlan ? () => setShowSetup(false) : undefined}
          onGenerated={(nextPlan) => {
            if (nextPlan) {
              setGeneratedPlanSnapshot(nextPlan);
              const firstPlanDate = nextPlan?.daily_plan?.[0]?.date;
              if (firstPlanDate) {
                setSelectedPlanDate(new Date(firstPlanDate));
              }
            }
            setShowSetup(false);
          }}
        />
      </Box>
    );
  }

  if (!resolvedStudyPlan && planState === 'error') {
    return (
      <Box sx={{ maxWidth: 760, mx: 'auto', py: 8 }} role="alert">
        <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
          Planner could not load
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Your account and study data are still safe. Retry the load, or open System Status if the issue persists.
        </Typography>
        <Alert severity="error" sx={{ borderRadius: 3, mb: 3 }}>
          {planError || 'We could not load your planner.'}
        </Alert>
        <Button variant="contained" onClick={() => getStudyPlan()}>
          Retry Planner Load
        </Button>
      </Box>
    );
  }

  const totalToday = todayData?.tasks?.length || 0;
  const doneToday = todayData?.tasks?.filter(t => t.completed).length || 0;
  const completionRate = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;
  const partialFailure = todayState === 'error' || analyticsState === 'error';
  const failureCount = [planState, todayState, analyticsState].filter((state) => state === 'error').length;
  const diagnosticsError = planError || todayError || analyticsError || generateError || null;

  const toggleCalResource = (taskId) => {
    setExpandedCalResources(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleRebalance = async () => {
    setIsRebalancing(true);
    try {
      await rebalancePlan({ reason: 'manual dashboard rebalance' });
      // rebalancePlan in StudyContext already calls fetchToday + fetchAnalytics.
    } catch {
      // StudyContext surfaces the planner error banner.
    } finally {
      setIsRebalancing(false);
    }
  };

  return (
    <Box sx={{ pb: { xs: 4, md: 10 }, px: { xs: 1, sm: 2, md: 0 }, maxWidth: 1400, mx: 'auto' }}>

      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} justifyContent="space-between" sx={{ mb: { xs: 2, md: 4 } }}>
        <Box>
          <Typography
            component={motion.h3}
            variant="h3"
            fontWeight={900}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem', md: '3rem' }, letterSpacing: { xs: '-1px', md: '-2px' }, lineHeight: 1, mb: 0.5 }}
          >
            Study{' '}
            <Box component="span" className="text-gradient-animate" sx={{ fontWeight: 900 }}>
              Propulsion
            </Box>
          </Typography>
          <Typography variant="body1" color="text.secondary">
            College-ready daily execution for your MBBS study plan.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: { xs: 2, sm: 0 } }}>
          <Button
            startIcon={isRebalancing ? <CircularProgress size={18} /> : <RepeatIcon />}
            onClick={handleRebalance}
            variant="contained"
            disabled={isRebalancing}
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 800 }}
          >
            Rebalance
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => setShowSetup(true)}
            variant="outlined"
            sx={{ borderRadius: 3, borderColor: 'rgba(255,255,255,0.12)', color: 'text.secondary' }}
          >
            Reconfigure
          </Button>
        </Stack>
      </Stack>

      {generateError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {generateError}
        </Alert>
      )}
      {partialFailure && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          {[
            todayState === 'error' && (todayError || 'Today view is temporarily unavailable.'),
            analyticsState === 'error' && (analyticsError || 'Analytics are temporarily unavailable.'),
          ].filter(Boolean).join(' ')}
        </Alert>
      )}
      <Box sx={{ mb: { xs: 3, md: 4 } }}>
        <SystemDiagnosticsPanel
          dataTestId="planner-diagnostics"
          authStatus={authStatus}
          planState={planState}
          todayState={todayState}
          analyticsState={analyticsState}
          latestIssue={diagnosticsError}
          failureCount={failureCount}
          actions={(
            <Button size="small" variant="text" onClick={() => navigate('/status')}>
              Open Full Status
            </Button>
          )}
        />
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: { xs: 2, md: 4 } }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary" variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
          <Tab label="Dashboard" value="dashboard" sx={{ fontWeight: 700, px: { xs: 2, md: 4 }, textTransform: 'none' }} />
          <Tab label="Full Plan Calendar" value="plan" sx={{ fontWeight: 700, px: { xs: 2, md: 4 }, textTransform: 'none' }} />
        </Tabs>
      </Box>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dash"
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.85 }}
          >
            <MorningBriefing />

            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
              }}
            >
              <Grid container spacing={{ xs: 2, md: 4 }}>
                <Grid size={{ xs: 12, md: 7, lg: 8 }}
                  component={motion.div}
                  variants={{
                    hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
                    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 26 } },
                  }}
                >
                  <Box className="glass-panel glow-card" sx={{ height: '100%' }}>
                    <TodoList />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                  <Stack spacing={4} component={motion.div}
                    initial="hidden" animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.07, delayChildren: 0.18 } },
                    }}
                  >
                    <Box component={motion.div}
                      variants={{
                        hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 26 } },
                      }}
                      sx={{ display: 'flex', gap: { xs: 2, md: 4 }, flexDirection: { xs: 'column', sm: 'row' } }}
                    >
                      <Box className="glass-panel glow-card" sx={{ flex: 1, display: 'flex', justifyContent: 'center', p: { xs: 2, md: 3 }, bgcolor: 'transparent' }}>
                        <ProgressRing percentage={todayState === 'ready' ? completionRate : 0} size={140} />
                      </Box>
                      <Box className="glass-panel glow-card" sx={{ flex: 1, p: 0, bgcolor: 'transparent' }}>
                        <StreakCounter streakData={analyticsData?.streak} />
                      </Box>
                    </Box>
                    <motion.div variants={{
                      hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
                      visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 26 } },
                    }}>
                      <PlanHealthPanel health={analyticsData?.plan_health || resolvedStudyPlan?.plan_health} />
                    </motion.div>
                    <Box component={motion.div}
                      variants={{
                        hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 26 } },
                      }}
                      className="glass-panel glow-card" sx={{ height: 220, p: 0, bgcolor: 'transparent' }}
                    >
                      <PerformanceChart heatmap={analyticsData?.heatmap} />
                    </Box>
                    <Box component={motion.div}
                      variants={{
                        hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 26 } },
                      }}
                      className="glass-panel glow-card" sx={{ height: 280, p: 0, bgcolor: 'transparent' }}
                    >
                      <GoalTimeline goals={resolvedStudyPlan?.goals} />
                    </Box>
                    <motion.div variants={{
                      hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
                      visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 26 } },
                    }}>
                      <PlanCoach />
                    </motion.div>
                  </Stack>
                </Grid>
              </Grid>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'plan' && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.85 }}
          >
            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              {[
                { color: '#10b981', label: 'All done' },
                { color: '#f59e0b', label: 'In progress' },
                { color: '#6366f1', label: 'Not started' }
              ].map(({ color, label }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
              ))}
            </Box>

            <Grid container spacing={{ xs: 2, md: 4 }} sx={{ minHeight: 600 }}>
              {/* Calendar */}
              <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                <Paper className="glass-panel" sx={{ p: { xs: 2, md: 3 }, borderRadius: 5, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateCalendar
                      value={selectedPlanDate}
                      onChange={(newDate) => newDate && setSelectedPlanDate(newDate)}
                      showDaysOutsideCurrentMonth
                      slots={{ day: CustomDay }}
                      slotProps={{ day: { dateStatusMap } }}
                      sx={{
                        width: '100%', maxWidth: '100%', overflowX: 'auto',
                        '& .MuiPickersDay-root': { color: '#fff', fontWeight: 700, fontSize: '0.9rem' },
                        '& .MuiPickersDay-root.Mui-selected': { bgcolor: '#6366f1', '&:focus, &:hover': { bgcolor: '#4f46e5' } },
                        '& .MuiPickersDay-today': { borderColor: '#a855f7' },
                        '& .MuiDayCalendar-weekDayLabel': { color: 'rgba(255,255,255,0.5)', fontWeight: 800 }
                      }}
                    />
                  </LocalizationProvider>
                </Paper>
              </Grid>

              {/* Tasks for selected date */}
              <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                <Paper className="glass-panel" sx={{ p: { xs: 2, md: 4 }, borderRadius: 5, border: '1px solid rgba(255,255,255,0.06)', height: '100%' }}>
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 1, fontSize: { xs: '1.1rem', md: '1.5rem' } }}>
                    {format(selectedPlanDate, 'EEEE, MMMM do, yyyy')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 2, md: 3 } }}>
                    Study execution targets for the selected date.
                  </Typography>

                  {(() => {
                    const dateStr = format(selectedPlanDate, 'yyyy-MM-dd');
                    const dayData = resolvedStudyPlan?.daily_plan?.find(d => d.date === dateStr);

                    if (!dayData || !dayData.tasks || dayData.tasks.length === 0) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, opacity: 0.78, textAlign: 'center', px: 2 }} role="status" aria-live="polite">
                          <Typography color="text.secondary">No tasks scheduled for this date. Use Reconfigure to adjust scope, or keep it as protected review time.</Typography>
                        </Box>
                      );
                    }

                    const done = dayData.tasks.filter(t => t.completed).length;
                    const total = dayData.tasks.length;

                    return (
                      <>
                        {/* Progress summary */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                            <Box sx={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%`, height: '100%', borderRadius: 3, bgcolor: done === total && total > 0 ? '#10b981' : '#6366f1', transition: 'width 0.5s ease' }} />
                          </Box>
                          <Typography variant="caption" fontWeight={700} color="text.secondary">
                            {done}/{total} done
                          </Typography>
                        </Box>

                        <List sx={{ width: '100%' }}>
                          {dayData.tasks.map(t => {
                            const hasResources = t.resources && t.resources.length > 0;
                            const isExpanded = expandedCalResources.has(t.id);
                            return (
                              <ListItem
                                key={t.id}
                                disablePadding
                                sx={{
                                  mb: 1.5, borderRadius: 3, p: 1.5,
                                  flexDirection: 'column', alignItems: 'stretch',
                                  bgcolor: t.completed ? 'rgba(16,185,129,0.05)' :
                                    ['review', 'active_recall', 'flashcard_review', 'catch_up'].includes(t.type) ? 'rgba(245,158,11,0.05)' :
                                      ['mock_exam', 'mock'].includes(t.type) ? 'rgba(139,92,246,0.05)' : 'rgba(255,255,255,0.02)',
                                  border: '1px solid',
                                  borderColor: t.completed ? 'rgba(16,185,129,0.2)' :
                                    ['review', 'active_recall', 'flashcard_review', 'catch_up'].includes(t.type) ? 'rgba(245,158,11,0.3)' :
                                      ['mock_exam', 'mock'].includes(t.type) ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                                  transition: 'all 0.3s ease',
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                  <ListItemIcon sx={{ pl: 1, minWidth: 48 }}>
                                    <Checkbox
                                      edge="start"
                                      checked={t.completed}
                                      onChange={(e) => tickTask(dateStr, t.id, e.target.checked).catch(() => {})}
                                      icon={<UncheckedIcon color="action" />}
                                      checkedIcon={<Grow in={true}><CheckCircleIcon sx={{ color: '#10b981' }} /></Grow>}
                                      disableRipple
                                    />
                                  </ListItemIcon>

                                  {['review', 'active_recall', 'flashcard_review', 'catch_up'].includes(t.type) && !t.completed && <RepeatIcon sx={{ color: '#f59e0b', mr: 2, ml: -1, fontSize: 20, flexShrink: 0 }} />}
                                  {['mock_exam', 'mock'].includes(t.type) && !t.completed && <FactCheckIcon sx={{ color: '#8b5cf6', mr: 2, ml: -1, fontSize: 20, flexShrink: 0 }} />}

                                  <ListItemText
                                    primary={t.text}
                                    secondary={t.topic}
                                    primaryTypographyProps={{
                                      fontWeight: 700,
                                      color: t.completed ? 'text.secondary' :
                                        ['review', 'active_recall', 'flashcard_review', 'catch_up'].includes(t.type) ? '#fde68a' :
                                          ['mock_exam', 'mock'].includes(t.type) ? '#ddd6fe' : '#fff',
                                      sx: { textDecoration: t.completed ? 'line-through' : 'none' }
                                    }}
                                    secondaryTypographyProps={{ variant: 'caption', color: 'text.disabled' }}
                                  />

                                  <Box sx={{ display: 'flex', gap: 0.5, ml: 1, flexShrink: 0 }}>
                                    {t.topic && !t.completed && (
                                      <Tooltip title="Ask AI about this topic">
                                        <IconButton
                                          size="small"
                                          onClick={() => navigate(`/question?topic=${encodeURIComponent(t.topic)}`)}
                                          sx={{ color: '#a855f7', opacity: 0.7, '&:hover': { opacity: 1 } }}
                                        >
                                          <AiIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    {hasResources && (
                                      <Tooltip title={isExpanded ? 'Hide resources' : 'View resources'}>
                                        <IconButton
                                          size="small"
                                          onClick={() => toggleCalResource(t.id)}
                                          sx={{ color: '#6366f1', opacity: 0.8, '&:hover': { opacity: 1 } }}
                                        >
                                          {isExpanded ? <ExpandMoreIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} /> : <BookIcon fontSize="small" />}
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Box>
                                </Box>

                                {/* Resources Collapse */}
                                {hasResources && (
                                  <Collapse in={isExpanded} unmountOnExit>
                                    <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.06)' }} />
                                    <Box sx={{ pl: 6, pr: 1 }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, mb: 1.5, display: 'block' }}>
                                        Curated resources for: <Box component="span" sx={{ color: 'rgba(255,255,255,0.7)' }}>{t.topic}</Box>
                                      </Typography>
                                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {t.resources.map((r, ri) => {
                                          const typeMap = {
                                            gold_standard: { Icon: StarIcon, color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.22)', badge: 'Gold Standard', badgeBg: 'rgba(245,158,11,0.15)' },
                                            video:         { Icon: YouTubeIcon, color: '#ef4444', bg: 'rgba(239,68,68,0.05)', border: 'rgba(239,68,68,0.15)', badge: 'Video', badgeBg: 'rgba(239,68,68,0.12)' },
                                            reference:     { Icon: ReferenceIcon, color: '#22d3ee', bg: 'rgba(34,211,238,0.05)', border: 'rgba(34,211,238,0.15)', badge: 'Reference', badgeBg: 'rgba(34,211,238,0.12)' },
                                            textbook:      { Icon: BookIcon, color: '#818cf8', bg: 'rgba(99,102,241,0.05)', border: 'rgba(99,102,241,0.15)', badge: 'Textbook', badgeBg: 'rgba(99,102,241,0.12)' },
                                          };
                                          const cfg = typeMap[r.resourceType] || typeMap.reference;
                                          const link = r.freeLinks?.[0];
                                          return (
                                            <Box key={ri} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2.5, bgcolor: cfg.bg, border: `1px solid ${cfg.border}`, '&:hover': { filter: 'brightness(1.15)' }, transition: 'all 0.2s' }}>
                                              <cfg.Icon sx={{ color: cfg.color, fontSize: 20, flexShrink: 0 }} />
                                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.2 }}>
                                                  <Typography variant="body2" fontWeight={700} color="text.primary" noWrap sx={{ fontSize: '0.82rem' }}>{r.platform}</Typography>
                                                  <Box sx={{ px: 0.75, py: 0.1, borderRadius: 1, bgcolor: cfg.badgeBg, fontSize: '0.65rem', fontWeight: 800, color: cfg.color, letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0 }}>{cfg.badge}</Box>
                                                  {r.access && (
                                                    <Box sx={{ px: 0.75, py: 0.1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', fontSize: '0.62rem', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', flexShrink: 0 }}>{r.access}</Box>
                                                  )}
                                                </Box>
                                                {(r.why || r.note) && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', display: 'block' }}>{r.why || r.note}</Typography>}
                                                {!r.note && r.author && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>{r.author}</Typography>}
                                                {r.estimated_minutes && <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.66rem', display: 'block' }}>Expected time: {r.estimated_minutes} min</Typography>}
                                              </Box>
                                              {link && (
                                                <Button component="a" href={link.url} target="_blank" rel="noopener noreferrer" size="small" endIcon={<OpenIcon sx={{ fontSize: '13px !important' }} />}
                                                  sx={{ flexShrink: 0, fontSize: '0.72rem', fontWeight: 700, px: 1.5, py: 0.5, borderRadius: 2, color: cfg.color, bgcolor: 'transparent', border: `1px solid ${cfg.border}`, textTransform: 'none', minWidth: 0, '&:hover': { bgcolor: cfg.bg } }}>
                                                  Open
                                                </Button>
                                              )}
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Box>
                                  </Collapse>
                                )}
                              </ListItem>
                            );
                          })}
                        </List>
                      </>
                    );
                  })()}
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
