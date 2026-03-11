import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function ProgressRing({ percentage, size = 150, strokeWidth = 10, color = "#10b981", trackColor = "rgba(255,255,255,0.05)" }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <Box sx={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ position: 'absolute' }}>
                {/* Track */}
                <circle
                    stroke={trackColor}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress */}
                <motion.circle
                    stroke={color}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference + ' ' + circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
            </svg>
            <Box sx={{ textAlign: 'center', zIndex: 1 }}>
                <Typography variant="h4" fontWeight={900} color={color} sx={{ letterSpacing: '-1px' }}>
                    {percentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Done
                </Typography>
            </Box>
        </Box>
    );
}
