import React, { useState } from 'react';
import { Box, Typography, Stack, Chip, Tooltip, CircularProgress } from '@mui/material';
import { useStudyContext } from '../../contexts/StudyContext';

const METRIC_CONFIG = [
    {
        key: 'exam_readiness',
        label: 'Readiness',
        tooltip: 'How on-track you are to cover all planned material before your exam.',
        actionable: false,
    },
    {
        key: 'consistency',
        label: 'Consistency',
        tooltip: 'Your daily completion streak and schedule adherence over the last 7 days.',
        actionable: false,
    },
    {
        key: 'review_coverage',
        label: 'Review',
        tooltip: 'How well spaced-repetition review sessions are distributed across your plan.',
        actionable: false,
    },
    {
        key: 'weak_topic_exposure',
        label: 'Weak Exposure',
        tooltip: 'Coverage of your self-identified weak topics. Click to rebalance and add more weak-topic sessions.',
        actionable: true,
    },
];

function barColor(value) {
    if (value >= 70) return '#10b981';
    if (value >= 40) return '#f59e0b';
    return '#ef4444';
}

export default function PlanHealthPanel({ health }) {
    const { rebalancePlan } = useStudyContext();
    const [rebalancing, setRebalancing] = useState(false);

    const handleWeakExposureClick = async () => {
        if (rebalancing) return;
        setRebalancing(true);
        try {
            await rebalancePlan({ reason: 'weak_topic_boost' });
        } catch {
            // StudyContext surfaces the error.
        } finally {
            setRebalancing(false);
        }
    };

    return (
        <Box className="glass-panel" sx={{ p: { xs: 2, md: 3 }, bgcolor: 'transparent' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={900}>Plan Health</Typography>
                <Chip
                    size="small"
                    label={health?.status || 'steady'}
                    sx={{ borderRadius: 1.5, textTransform: 'capitalize', fontWeight: 800 }}
                />
            </Stack>
            <Stack spacing={1.5}>
                {METRIC_CONFIG.map(({ key, label, tooltip, actionable }) => {
                    const value = health?.[key] ?? 0;
                    const isWeak = actionable && value < 60;
                    return (
                        <Tooltip
                            key={key}
                            title={tooltip}
                            placement="left"
                            arrow
                        >
                            <Box
                                onClick={actionable ? handleWeakExposureClick : undefined}
                                sx={{
                                    cursor: actionable ? 'pointer' : 'default',
                                    borderRadius: 2,
                                    p: actionable ? 0.75 : 0,
                                    mx: actionable ? -0.75 : 0,
                                    transition: 'all 0.2s',
                                    ...(actionable && {
                                        '&:hover': {
                                            bgcolor: isWeak ? 'rgba(239,68,68,0.06)' : 'rgba(99,102,241,0.06)',
                                            '& .health-label': { color: isWeak ? '#fca5a5' : '#a5b4fc' },
                                        }
                                    })
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                    <Stack direction="row" alignItems="center" gap={0.75}>
                                        <Typography
                                            className="health-label"
                                            variant="caption"
                                            color="text.secondary"
                                            fontWeight={700}
                                            sx={{ transition: 'color 0.2s' }}
                                        >
                                            {label}
                                        </Typography>
                                        {actionable && isWeak && (
                                            <Typography variant="caption" sx={{ fontSize: '0.58rem', color: '#fca5a5', fontWeight: 800 }}>
                                                {rebalancing ? '...' : 'tap to boost'}
                                            </Typography>
                                        )}
                                    </Stack>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {actionable && rebalancing && (
                                            <CircularProgress size={10} sx={{ color: '#a5b4fc' }} />
                                        )}
                                        <Typography variant="caption" color="text.secondary" fontWeight={800}>
                                            {Math.round(value)}%
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <Box sx={{
                                        width: `${Math.max(0, Math.min(100, value))}%`,
                                        height: '100%',
                                        bgcolor: barColor(value),
                                        borderRadius: 3,
                                        transition: 'width 0.6s ease',
                                    }} />
                                </Box>
                            </Box>
                        </Tooltip>
                    );
                })}
                <Typography variant="caption" color="text.disabled" sx={{ pt: 0.25, lineHeight: 1.5 }}>
                    Catch-up debt: {Math.round(health?.catch_up_debt || 0)} min
                    {' · '}
                    Workload pressure: {Math.round(health?.workload_pressure || 0)}%
                </Typography>
            </Stack>
        </Box>
    );
}
