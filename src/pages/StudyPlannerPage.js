import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Button, CircularProgress, Stack, Tabs, Tab, Paper, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Refresh as RefreshIcon, AutoAwesome as SparkleIcon, CheckCircle as CheckCircleIcon, RadioButtonUnchecked as UncheckedIcon, Repeat as RepeatIcon, FactCheck as FactCheckIcon } from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';

import { useStudyContext } from '../contexts/StudyContext';
import PlannerSetup from '../components/planner/PlannerSetup';
import TodoList from '../components/planner/TodoList';
import ProgressRing from '../components/planner/ProgressRing';
import PerformanceChart from '../components/planner/PerformanceChart';
import StreakCounter from '../components/planner/StreakCounter';
import GoalTimeline from '../components/planner/GoalTimeline';

export default function StudyPlannerPage() {
  const {
    studyPlan, getStudyPlan, fetchToday, fetchAnalytics,
    todayData, analyticsData, loading
  } = useStudyContext();

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | plan
  const [showSetup, setShowSetup] = useState(false);
  const [initLoad, setInitLoad] = useState(true);

  const [selectedPlanDate, setSelectedPlanDate] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      try {
        const plan = await getStudyPlan();
        if (!plan) {
          setShowSetup(true);
        } else {
          await fetchToday();
          await fetchAnalytics();
        }
      } catch (e) {
        console.error("Failed to load plan", e);
      } finally {
        setInitLoad(false);
      }
    };
    loadData();
  }, [getStudyPlan, fetchToday, fetchAnalytics]);

  // If plan is newly generated, hide setup
  useEffect(() => {
    if (studyPlan && showSetup) {
      setShowSetup(false);
      fetchToday();
      fetchAnalytics();
    }
  }, [studyPlan]);

  if (initLoad || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (showSetup || !studyPlan) {
    return (
      <Box sx={{ pb: 10, maxWidth: 1000, mx: 'auto' }}>
        <PlannerSetup onCancel={studyPlan ? () => setShowSetup(false) : undefined} />
      </Box>
    );
  }

  // Calculate today's completion percentage
  const totalToday = todayData?.tasks?.length || 0;
  const doneToday = todayData?.tasks?.filter(t => t.completed).length || 0;
  const completionRate = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

  return (
    <Box sx={{ pb: 10, maxWidth: 1400, mx: 'auto' }}>

      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-end' }} justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-2px', lineHeight: 1, mb: 0.5 }}>
            Study{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              Propulsion
            </Box>
          </Typography>
          <Typography variant="body1" color="text.secondary">
            AI‑optimised trajectory for your MBBS excellence.
          </Typography>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mt: { xs: 2, sm: 0 } }}>
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Dashboard" value="dashboard" sx={{ fontWeight: 700, px: 4, textTransform: 'none' }} />
          <Tab label="Full Plan Calendar" value="plan" sx={{ fontWeight: 700, px: 4, textTransform: 'none' }} />
        </Tabs>
      </Box>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* AI Advisory Block */}
            {studyPlan?.advisory_text && (
              <Box sx={{ mb: 4, p: 3, borderRadius: 4, bgcolor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', gap: 3 }}>
                <SparkleIcon sx={{ color: '#a855f7', mt: 0.5 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="primary.main" sx={{ mb: 0.5 }}>AI Strategy Insight</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    "{studyPlan.advisory_text}"
                  </Typography>
                </Box>
              </Box>
            )}

            <Grid container spacing={4}>
              {/* Daily Checklist */}
              <Grid item xs={12} md={7} lg={8}>
                <Box className="glass-panel" sx={{ height: '100%' }}>
                  <TodoList />
                </Box>
              </Grid>

              {/* Sidebar Stats */}
              <Grid item xs={12} md={5} lg={4}>
                <Stack spacing={4}>
                  {/* Ring & Streak */}
                  <Box sx={{ display: 'flex', gap: 4 }}>
                    <Box className="glass-panel" sx={{ flex: 1, display: 'flex', justifyContent: 'center', p: 3, bgcolor: 'transparent' }}>
                      <ProgressRing percentage={completionRate} size={140} />
                    </Box>
                    <Box className="glass-panel" sx={{ flex: 1, p: 0, bgcolor: 'transparent' }}>
                      <StreakCounter streakData={analyticsData?.streak} />
                    </Box>
                  </Box>

                  {/* Heatmap */}
                  <Box className="glass-panel" sx={{ height: 220, p: 0, bgcolor: 'transparent' }}>
                    <PerformanceChart heatmap={analyticsData?.heatmap} />
                  </Box>

                  {/* Goals */}
                  <Box className="glass-panel" sx={{ height: 280, p: 0, bgcolor: 'transparent' }}>
                    <GoalTimeline goals={studyPlan?.goals} />
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {activeTab === 'plan' && (
          <motion.div key="plan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Grid container spacing={4} sx={{ height: '100%', minHeight: 600 }}>
              {/* Calendar Sidebar */}
              <Grid item xs={12} md={5} lg={4}>
                <Paper className="glass-panel" sx={{ p: 3, borderRadius: 5, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateCalendar
                      value={selectedPlanDate}
                      onChange={(newDate) => setSelectedPlanDate(newDate)}
                      showDaysOutsideCurrentMonth
                      sx={{
                        width: '100%',
                        '& .MuiPickersDay-root': {
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.9rem'
                        },
                        '& .MuiPickersDay-root.Mui-selected': {
                          bgcolor: '#6366f1',
                          '&:focus, &:hover': { bgcolor: '#4f46e5' }
                        },
                        '& .MuiPickersDay-today': {
                          borderColor: '#a855f7'
                        },
                        '& .MuiDayCalendar-weekDayLabel': {
                          color: 'rgba(255,255,255,0.5)',
                          fontWeight: 800
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Paper>
              </Grid>

              {/* Tasks List */}
              <Grid item xs={12} md={7} lg={8}>
                <Paper className="glass-panel" sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(255,255,255,0.06)', height: '100%' }}>
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
                    {format(selectedPlanDate, 'EEEE, MMMM do, yyyy')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Study execution targets for the selected date.
                  </Typography>

                  {(() => {
                    const dateStr = format(selectedPlanDate, 'yyyy-MM-dd');
                    const dayData = studyPlan?.daily_plan?.find(d => d.date === dateStr);

                    if (!dayData || !dayData.tasks || dayData.tasks.length === 0) {
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, opacity: 0.5 }}>
                          <Typography fontStyle="italic">No tasks scheduled. Enjoy your rest or plan an exam.</Typography>
                        </Box>
                      );
                    }

                    return (
                      <List sx={{ width: '100%' }}>
                        {dayData.tasks.map(t => (
                          <ListItem
                            key={t.id}
                            disablePadding
                            sx={{
                              mb: 2, borderRadius: 3, p: 1.5,
                              bgcolor: t.completed ? 'rgba(16,185,129,0.05)' :
                                t.type === 'review' ? 'rgba(245,158,11,0.05)' :
                                  t.type === 'mock_exam' ? 'rgba(139,92,246,0.05)' : 'rgba(255,255,255,0.02)',
                              border: '1px solid',
                              borderColor: t.completed ? 'rgba(16,185,129,0.2)' :
                                t.type === 'review' ? 'rgba(245,158,11,0.3)' :
                                  t.type === 'mock_exam' ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)'
                            }}
                          >
                            <ListItemIcon sx={{ pl: 1, minWidth: 48 }}>
                              {t.completed ? <CheckCircleIcon sx={{ color: '#10b981' }} /> : <UncheckedIcon color="disabled" />}
                            </ListItemIcon>

                            {t.type === 'review' && !t.completed && <RepeatIcon sx={{ color: '#f59e0b', mr: 2, ml: -1, fontSize: 20 }} />}
                            {t.type === 'mock_exam' && !t.completed && <FactCheckIcon sx={{ color: '#8b5cf6', mr: 2, ml: -1, fontSize: 20 }} />}

                            <ListItemText
                              primary={t.text}
                              secondary={t.topic}
                              primaryTypographyProps={{
                                fontWeight: 700,
                                color: t.completed ? 'text.secondary' :
                                  t.type === 'review' ? '#fde68a' :
                                    t.type === 'mock_exam' ? '#ddd6fe' : '#fff',
                                sx: { textDecoration: t.completed ? 'line-through' : 'none' }
                              }}
                              secondaryTypographyProps={{ variant: 'caption', color: 'text.disabled' }}
                            />
                          </ListItem>
                        ))}
                      </List>
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