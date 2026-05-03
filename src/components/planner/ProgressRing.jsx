import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

export default function ProgressRing({ percentage, size = 150, strokeWidth = 10, color, trackColor = "rgba(255,255,255,0.05)" }) {
    const safePercentage = Math.min(100, Math.max(0, Number.isFinite(Number(percentage)) ? Number(percentage) : 0));
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (safePercentage / 100) * circumference;

    // Dynamic colour: explicit prop overrides; otherwise tracks completion level.
    const resolvedColor = color ?? (
        safePercentage === 100 ? '#10b981' :
        safePercentage >= 60  ? '#f59e0b' :
        safePercentage > 0    ? '#6366f1' :
                                'rgba(255,255,255,0.15)'
    );

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
                    stroke={resolvedColor}
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
                <Typography variant="h4" fontWeight={900} color={resolvedColor} sx={{ letterSpacing: '-1px' }}>
                    {safePercentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Done
                </Typography>
            </Box>
        </Box>
    );
}
