import React, { useMemo } from 'react';
import { Box, Typography, Stack, Chip } from '@mui/material';
import {
    WbSunny as SunIcon,
    LocalFireDepartment as FireIcon,
    CalendarMonth as CalendarIcon,
    Schedule as TimeIcon,
    TrendingUp as TrendIcon,
    AutoAwesome as SparkleIcon,
} from '@mui/icons-material';
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { useStudyContext } from '../../contexts/StudyContext';

function StatPill({ label, value, sublabel, color = '#6366f1', icon: Icon }) {
    return (
        <Box sx={{
            flex: '1 1 80px', minWidth: 80, maxWidth: 160,
            px: { xs: 1.25, md: 1.75 }, py: { xs: 1, md: 1.25 }, borderRadius: 3,
            bgcolor: `${color}12`, border: `1px solid ${color}28`,
            display: 'flex', flexDirection: 'column', gap: 0.2,
        }}>
            {Icon && <Icon sx={{ color, fontSize: 15, mb: 0.15, opacity: 0.85 }} />}
            <Typography
                variant="h6" fontWeight={900}
                sx={{ color, lineHeight: 1.1, fontSize: { xs: '1.05rem', md: '1.2rem' }, letterSpacing: '-0.5px' }}
            >
                {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={700}
                sx={{ lineHeight: 1.1, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.4 }}
            >
                {label}
            </Typography>
            {sublabel && (
                <Typography variant="caption" color="text.disabled"
                    sx={{ fontSize: '0.6rem', lineHeight: 1.1, mt: 0.1 }}
                >
                    {sublabel}
                </Typography>
            )}
        </Box>
    );
}

export default function MorningBriefing() {
    const { todayData, analyticsData, studyPlan, dailyAdvisory } = useStudyContext();

    const metrics = useMemo(() => {
        if (!todayData) return null;

        // Yesterday's completion from plan daily_plan
        const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
        const yesterdayDay = studyPlan?.daily_plan?.find(d => d.date === yesterdayStr);
        let yesterdayLabel = null;
        if (yesterdayDay?.tasks?.length > 0) {
            const done = yesterdayDay.tasks.filter(t => t.completed).length;
            const total = yesterdayDay.tasks.length;
            yesterdayLabel = { done, total };
        }

        // Today stats
        const tasks = todayData.tasks || [];
        const completed = tasks.filter(t => t.completed).length;
        const totalMinutes = tasks.reduce((sum, t) => sum + (Number(t.estimated_minutes) || 30), 0);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const timeStr = hours > 0
            ? (mins > 0 ? `${hours}h ${mins}m` : `${hours}h`)
            : `${mins}m`;

        // Subject breakdown for today
        const subjectCounts = {};
        tasks.forEach(t => {
            const key = (t.subject && t.subject !== 'Custom') ? t.subject : (t.topic || 'Other');
            subjectCounts[key] = (subjectCounts[key] || 0) + 1;
        });
        const topSubjects = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        // Days until exam
        let daysUntilExam = null;
        if (studyPlan?.exam_date) {
            const examDate = typeof studyPlan.exam_date === 'string'
                ? parseISO(studyPlan.exam_date)
                : new Date(studyPlan.exam_date);
            daysUntilExam = Math.max(0, differenceInDays(examDate, startOfDay(new Date())));
        }

        const streak = todayData.streak?.current || 0;
        const longestStreak = todayData.streak?.longest || 0;
        const catchUpCount = tasks.filter(t => t.type === 'catch_up').length;

        // 7-day avg from heatmap
        const heatmap = analyticsData?.heatmap || [];
        const pastDays = heatmap.filter(h => h.date < todayStr && h.rate > 0);
        const avg7 = pastDays.length
            ? Math.round(pastDays.reduce((s, h) => s + h.rate, 0) / pastDays.length)
            : null;

        return {
            yesterdayLabel, timeStr, topSubjects,
            daysUntilExam, streak, longestStreak,
            taskCount: tasks.length, completed, catchUpCount, avg7,
        };
    }, [todayData, analyticsData, studyPlan]);

    if (!metrics || metrics.taskCount === 0) return null;

    const hour = new Date().getHours();
    const greeting = hour < 5 ? 'Still at it' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const examColor = metrics.daysUntilExam !== null
        ? (metrics.daysUntilExam <= 7 ? '#ef4444' : metrics.daysUntilExam <= 30 ? '#f59e0b' : '#10b981')
        : '#10b981';

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        >
            <Box sx={{
                mb: { xs: 2.5, md: 4 },
                p: { xs: 2, md: 3 },
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(8px)',
            }}>
                {/* Header row */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SunIcon sx={{ color: '#f59e0b', fontSize: 18, opacity: 0.9 }} />
                        <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '-0.3px' }}>
                            {greeting} — here's your day
                        </Typography>
                        {metrics.catchUpCount > 0 && (
                            <Chip
                                label={`${metrics.catchUpCount} catch-up`}
                                size="small"
                                sx={{
                                    height: 18, fontSize: '0.6rem', fontWeight: 800,
                                    bgcolor: 'rgba(251,113,133,0.12)', color: '#fca5a5',
                                    border: '1px solid rgba(251,113,133,0.25)',
                                    '& .MuiChip-label': { px: 0.75 },
                                }}
                            />
                        )}
                    </Box>
                    <Typography variant="caption" color="text.disabled" fontWeight={600}>
                        {format(new Date(), 'EEEE, MMM do')}
                    </Typography>
                </Stack>

                {/* Stat pills */}
                <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.5 }, flexWrap: 'wrap', mb: 2 }}>
                    <StatPill
                        icon={FireIcon}
                        label="Streak"
                        value={`${metrics.streak}d`}
                        sublabel={metrics.streak >= metrics.longestStreak && metrics.streak > 0 ? 'Personal best!' : `Best: ${metrics.longestStreak}d`}
                        color="#ef4444"
                    />
                    <StatPill
                        icon={TimeIcon}
                        label="Study Load"
                        value={metrics.timeStr}
                        sublabel={`${metrics.taskCount} task${metrics.taskCount !== 1 ? 's' : ''}`}
                        color="#6366f1"
                    />
                    {metrics.daysUntilExam !== null && (
                        <StatPill
                            icon={CalendarIcon}
                            label="To Exam"
                            value={`${metrics.daysUntilExam}d`}
                            sublabel={
                                metrics.daysUntilExam <= 3 ? 'Final sprint!' :
                                metrics.daysUntilExam <= 14 ? 'Almost there' :
                                metrics.daysUntilExam <= 30 ? 'Sprint mode' : 'Keep building'
                            }
                            color={examColor}
                        />
                    )}
                    {metrics.yesterdayLabel && (
                        <StatPill
                            icon={TrendIcon}
                            label="Yesterday"
                            value={`${metrics.yesterdayLabel.done}/${metrics.yesterdayLabel.total}`}
                            sublabel={
                                metrics.yesterdayLabel.done === metrics.yesterdayLabel.total ? 'Full day!' :
                                metrics.yesterdayLabel.done === 0 ? 'Missed' : 'tasks done'
                            }
                            color={
                                metrics.yesterdayLabel.done === metrics.yesterdayLabel.total ? '#10b981' :
                                metrics.yesterdayLabel.done === 0 ? '#ef4444' : '#f59e0b'
                            }
                        />
                    )}
                    {metrics.avg7 !== null && (
                        <StatPill
                            label="7-Day Avg"
                            value={`${metrics.avg7}%`}
                            sublabel="completion"
                            color={metrics.avg7 >= 80 ? '#10b981' : metrics.avg7 >= 50 ? '#f59e0b' : '#ef4444'}
                        />
                    )}
                </Box>

                {/* Subject chips */}
                {metrics.topSubjects.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: dailyAdvisory?.text ? 2 : 0 }}>
                        <Typography variant="caption" color="text.disabled" fontWeight={700}
                            sx={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.62rem', flexShrink: 0 }}
                        >
                            Today's focus:
                        </Typography>
                        {metrics.topSubjects.map(([subject, count]) => (
                            <Chip
                                key={subject}
                                label={`${subject} ×${count}`}
                                size="small"
                                sx={{
                                    height: 20, fontSize: '0.67rem', fontWeight: 700,
                                    bgcolor: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    '& .MuiChip-label': { px: 0.85 },
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* AI advisory */}
                {dailyAdvisory?.text && (
                    <Box sx={{
                        mt: 1.75, px: 1.5, py: 1.1, borderRadius: 2.5,
                        bgcolor: 'rgba(168,85,247,0.05)',
                        borderLeft: '2.5px solid rgba(168,85,247,0.45)',
                        display: 'flex', alignItems: 'flex-start', gap: 1,
                    }}>
                        <SparkleIcon sx={{ color: '#a855f7', fontSize: 14, mt: 0.25, flexShrink: 0, opacity: 0.8 }} />
                        <Typography variant="caption"
                            sx={{ color: 'rgba(255,255,255,0.72)', fontStyle: 'italic', lineHeight: 1.55, fontSize: '0.78rem' }}
                        >
                            {dailyAdvisory.text}
                        </Typography>
                    </Box>
                )}
            </Box>
        </motion.div>
    );
}
