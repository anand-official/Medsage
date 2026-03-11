import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { LocalFireDepartment as FireIcon, EmojiEvents as TrophyIcon } from '@mui/icons-material';

export default function StreakCounter({ streakData }) {
    const current = streakData?.current || 0;
    const longest = streakData?.longest || 0;

    const isMilestone = [7, 30, 100].includes(current);

    return (
        <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                <FireIcon sx={{ fontSize: 120, color: '#f97316' }} />
            </Box>
            <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
                    Consistency Streak
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <motion.div
                        animate={{ scale: isMilestone ? [1, 1.2, 1] : 1 }}
                        transition={{ repeat: isMilestone ? Infinity : 0, duration: 2 }}
                    >
                        <Box sx={{
                            width: 72, height: 72, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #f97316, #ef4444)',
                            boxShadow: '0 8px 25px rgba(239,68,68,0.4)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            color: 'white'
                        }}>
                            <FireIcon fontSize="medium" sx={{ mb: -0.5 }} />
                            <Typography variant="h5" fontWeight={900}>{current}</Typography>
                        </Box>
                    </motion.div>
                    <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase' }}>
                            Current Days
                        </Typography>
                        {isMilestone && <Typography variant="caption" color="#10b981" fontWeight={700}>🎉 Milestone Target Reached!</Typography>}
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1, pt: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <TrophyIcon color="disabled" fontSize="small" />
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Longest Streak: <span style={{ color: '#f59e0b', fontWeight: 800 }}>{longest}</span> days
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
}
