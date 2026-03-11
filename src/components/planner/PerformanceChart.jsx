import React from 'react';
import { Box, Typography, Tooltip, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { format, parseISO, isToday } from 'date-fns';

export default function PerformanceChart({ heatmap = [] }) {
    // Pad if less than 7 days
    const data = Array.isArray(heatmap) ? [...heatmap] : [];
    while (data.length < 7) {
        data.unshift({ date: null, rate: 0 });
    }
    const last7 = data.slice(-7);

    return (
        <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Weekly Heatmap
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, mb: 1 }}>
                {last7.map((day, idx) => {
                    const isTdy = day.date ? isToday(parseISO(day.date)) : false;
                    const lbl = day.date ? format(parseISO(day.date), 'EEE') : '-';
                    const rate = day.rate || 0;
                    const color = rate > 80 ? '#10b981' : rate > 40 ? '#f59e0b' : '#ef4444';

                    return (
                        <Tooltip key={idx} title={day.date ? `${day.date}: ${rate.toFixed()}%` : 'No data'}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%', height: '100%' }}>
                                <Box sx={{
                                    flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end',
                                    bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, overflow: 'hidden', mb: 1
                                }}>
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${rate}%` }}
                                        transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                                        style={{ width: '100%', background: color, borderRadius: 8, opacity: isTdy ? 1 : 0.7 }}
                                    />
                                </Box>
                                <Typography variant="caption" color={isTdy ? 'primary.main' : 'text.secondary'} fontWeight={isTdy ? 800 : 500}>
                                    {lbl}
                                </Typography>
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>
        </Paper>
    );
}
