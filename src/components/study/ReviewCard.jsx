import React, { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Button, Chip,
    LinearProgress, Collapse, IconButton, Tooltip, Stack
} from '@mui/material';
import {
    Visibility as RevealIcon,
    BookmarkBorder as SuspendIcon,
    Delete as DeleteIcon,
    Psychology as BrainIcon,
    AutoAwesome as SparkIcon
} from '@mui/icons-material';

/**
 * ReviewCard — the core SM-2 study card component.
 *
 * States: hidden → revealed → submitted
 * Quality buttons: 0 (Again) 1 (Hard) 3 (Good) 5 (Easy)
 * Simplified scale shown to user: Again / Hard / Good / Easy
 */

const QUALITY_BUTTONS = [
    { label: 'Again', quality: 0, color: '#ef4444', desc: 'Total blank' },
    { label: 'Hard', quality: 1, color: '#f97316', desc: 'Remembered with effort' },
    { label: 'Good', quality: 3, color: '#6366f1', desc: 'Recalled correctly' },
    { label: 'Easy', quality: 5, color: '#22c55e', desc: 'Perfect recall' },
];

const CONFIDENCE_TIER_STYLES = {
    HIGH: { color: '#22c55e', label: '🟢 High' },
    MEDIUM: { color: '#f59e0b', label: '🟡 Moderate' },
    LOW: { color: '#ef4444', label: '🔴 Low' },
};

export default function ReviewCard({ card, onReview, onSuspend, onDelete, cardIndex, totalCards }) {
    const [revealed, setRevealed] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const tierStyle = CONFIDENCE_TIER_STYLES[card.source_tier] || CONFIDENCE_TIER_STYLES.MEDIUM;

    const handleReveal = () => setRevealed(true);

    const handleQuality = async (quality) => {
        setSubmitting(true);
        try {
            await onReview(card._id, quality);
            setSubmitted(true);
        } finally {
            setSubmitting(false);
        }
    };

    const progressPct = totalCards > 0 ? ((cardIndex) / totalCards) * 100 : 0;

    return (
        <Box sx={{ width: '100%', maxWidth: 680, mx: 'auto' }}>
            {/* Progress bar */}
            <Box sx={{ mb: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                        Card {cardIndex + 1} of {totalCards}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {Math.round(progressPct)}% complete
                    </Typography>
                </Stack>
                <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    sx={{
                        height: 4,
                        borderRadius: 4,
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        '& .MuiLinearProgress-bar': {
                            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                            borderRadius: 4,
                        }
                    }}
                />
            </Box>

            {/* Main card */}
            <Card
                elevation={0}
                sx={{
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: submitted ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.08)',
                    background: submitted
                        ? 'rgba(99, 102, 241, 0.05)'
                        : 'rgba(15, 15, 20, 0.75)',
                    backdropFilter: 'blur(20px)',
                    transition: 'all 0.3s ease',
                    minHeight: 320,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Card header */}
                <Box sx={{
                    px: { xs: 2, md: 3 }, pt: 2.5, pb: 1.5,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <BrainIcon sx={{ fontSize: 16, color: '#6366f1' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {card.chapter || card.topic_id}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                            label={tierStyle.label}
                            size="small"
                            sx={{
                                fontSize: 11, fontWeight: 700,
                                backgroundColor: `${tierStyle.color}15`,
                                color: tierStyle.color,
                                border: `1px solid ${tierStyle.color}30`,
                                height: 22,
                            }}
                        />
                        <Tooltip title="Suspend card">
                            <IconButton size="small" onClick={() => onSuspend(card._id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                <SuspendIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete card">
                            <IconButton size="small" onClick={() => onDelete(card._id)} sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: '#ef4444' } }}>
                                <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>

                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 2, md: 3 } }}>
                    {/* Question */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="caption" color="primary.light" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>
                            Question
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 1, fontWeight: 500, lineHeight: 1.5, color: 'text.primary' }}>
                            {card.question}
                        </Typography>
                    </Box>

                    {/* Reveal / Answer section */}
                    {!revealed ? (
                        <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<RevealIcon />}
                                onClick={handleReveal}
                                disabled={submitted}
                                sx={{
                                    px: 5, py: 1.5,
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                    borderRadius: 3,
                                    fontWeight: 700,
                                    fontSize: 15,
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                                    },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                Reveal Answer
                            </Button>
                        </Box>
                    ) : (
                        <Collapse in={revealed} timeout={400}>
                            {/* Answer */}
                            <Box sx={{
                                p: 2.5,
                                borderRadius: 3,
                                background: 'rgba(99, 102, 241, 0.08)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                mb: 3
                            }}>
                                <Typography variant="caption" color="primary.light" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>
                                    Answer
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 1, lineHeight: 1.7, color: 'text.primary' }}>
                                    {card.answer_summary}
                                </Typography>
                                {card.source_book && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                                        📚 {card.source_book}{card.source_pages ? ` · pp. ${card.source_pages}` : ''}
                                    </Typography>
                                )}
                            </Box>

                            {/* Quality buttons */}
                            {!submitted ? (
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
                                        How well did you recall this?
                                    </Typography>
                                    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                                        {QUALITY_BUTTONS.map(({ label, quality, color, desc }) => (
                                            <Tooltip key={quality} title={desc} arrow>
                                                <Button
                                                    variant="outlined"
                                                    disabled={submitting}
                                                    onClick={() => handleQuality(quality)}
                                                    sx={{
                                                        flex: '1 1 auto', minWidth: { xs: '45%', sm: 80 },
                                                        borderColor: `${color}50`,
                                                        color: color,
                                                        borderRadius: 2.5,
                                                        fontWeight: 700,
                                                        fontSize: 13,
                                                        py: 1.2,
                                                        '&:hover': {
                                                            backgroundColor: `${color}12`,
                                                            borderColor: color,
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: `0 4px 12px ${color}25`,
                                                        },
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                >
                                                    {label}
                                                </Button>
                                            </Tooltip>
                                        ))}
                                    </Stack>
                                </Box>
                            ) : (
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    p: 2, borderRadius: 2,
                                    background: 'rgba(34, 197, 94, 0.08)',
                                    border: '1px solid rgba(34, 197, 94, 0.2)',
                                }}>
                                    <SparkIcon sx={{ color: '#22c55e', fontSize: 18 }} />
                                    <Typography variant="body2" color="#22c55e" fontWeight={600}>
                                        Review submitted — loading next card…
                                    </Typography>
                                </Box>
                            )}
                        </Collapse>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
