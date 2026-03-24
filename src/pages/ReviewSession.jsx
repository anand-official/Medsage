import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, CircularProgress, Alert, Button, Stack,
    Card, Divider, Skeleton
} from '@mui/material';
import {
    School as DeckIcon,
    CheckCircle as DoneIcon,
    Refresh as RefreshIcon,
    TrendingUp as StatsIcon,
    FlashOn as FlashIcon,
    Bolt as BoltIcon
} from '@mui/icons-material';
import ReviewCard from '../components/study/ReviewCard';
import sm2API from '../services/sm2Service';

/**
 * ReviewSession — the main SM-2 daily study page.
 *
 * Flow:
 *   1. On mount: fetch due cards from /api/sm2/due
 *   2. Show cards one at a time using ReviewCard component
 *   3. As user submits quality ratings, call /api/sm2/review
 *   4. When all cards done: show session summary with stats
 */

// Stat card widget
function StatWidget({ label, value, unit = '', color = '#6366f1', loading }) {
    return (
        <Card elevation={0} sx={{
            p: { xs: 2, md: 2.5 }, borderRadius: 3, flex: '1 1 auto', minWidth: { xs: '45%', sm: 110 },
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            textAlign: 'center',
        }}>
            {loading ? (
                <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
            ) : (
                <>
                    <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1 }}>
                        {value ?? '—'}{unit}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mt: 0.5, display: 'block' }}>
                        {label}
                    </Typography>
                </>
            )}
        </Card>
    );
}

export default function ReviewSession() {
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [sessionResults, setSessionResults] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionDone, setSessionDone] = useState(false);

    const loadCards = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSessionDone(false);
        setCurrentIndex(0);
        setSessionResults([]);
        try {
            const data = await sm2API.getDueCards({}, 20);
            setCards(data.cards || []);
            if (!data.cards || data.cards.length === 0) setSessionDone(true);
        } catch (e) {
            setError(e.response?.data?.error || e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const data = await sm2API.getStats();
            setStats(data);
        } catch (e) {
            // Non-fatal
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCards();
        loadStats();
    }, [loadCards, loadStats]);

    const handleReview = async (cardId, quality) => {
        const result = await sm2API.submitReview(cardId, quality);
        setSessionResults(prev => [...prev, { cardId, quality, nextReview: result.next_review, interval: result.interval_days }]);

        // Short delay then advance
        setTimeout(() => {
            const nextIdx = currentIndex + 1;
            if (nextIdx >= cards.length) {
                setSessionDone(true);
                loadStats(); // refresh stats after session
            } else {
                setCurrentIndex(nextIdx);
            }
        }, 800);
    };

    const handleSuspend = async (cardId) => {
        try {
            await sm2API.suspendCard(cardId);
            setCards(prev => prev.filter(c => c._id !== cardId));
            if (currentIndex >= cards.length - 1) {
                setSessionDone(true);
            }
        } catch (e) {
            console.error('Suspend failed:', e);
        }
    };

    const handleDelete = async (cardId) => {
        try {
            await sm2API.deleteCard(cardId);
            setCards(prev => prev.filter(c => c._id !== cardId));
            if (currentIndex >= cards.length - 1) {
                setSessionDone(true);
            }
        } catch (e) {
            console.error('Delete failed:', e);
        }
    };

    // ── Session Summary ─────────────────────────────────────────────────────────
    if (sessionDone) {
        const correct = sessionResults.filter(r => r.quality >= 3).length;
        const retention = sessionResults.length > 0
            ? Math.round((correct / sessionResults.length) * 100)
            : null;

        return (
            <Box sx={{ maxWidth: 700, mx: 'auto', py: 6, px: 2, textAlign: 'center' }}>
                {/* Done hero */}
                <Box sx={{
                    width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 40px rgba(99,102,241,0.4)',
                }}>
                    <DoneIcon sx={{ fontSize: 40, color: '#fff' }} />
                </Box>

                <Typography variant="h4" fontWeight={800} sx={{ mb: 1, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    {sessionResults.length === 0 ? 'Nothing due today!' : 'Session Complete!'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    {sessionResults.length === 0
                        ? 'Your SM-2 deck is fully reviewed. Come back tomorrow.'
                        : `You reviewed ${sessionResults.length} card${sessionResults.length !== 1 ? 's' : ''} — great work.`}
                </Typography>

                {/* Session stats */}
                {sessionResults.length > 0 && (
                    <Stack direction="row" spacing={1.5} sx={{ mb: 4, flexWrap: 'wrap', justifyContent: 'center' }} useFlexGap>
                        <StatWidget label="Reviewed" value={sessionResults.length} color="#6366f1" />
                        <StatWidget label="Correct" value={correct} color="#22c55e" />
                        <StatWidget label="Session Retention" value={retention} unit="%" color="#a855f7" />
                        <StatWidget label="Deck Retention" value={stats?.avg_retention} unit="%" color="#f59e0b" loading={statsLoading} />
                    </Stack>
                )}

                {/* Deck-wide stats */}
                {stats && (
                    <>
                        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.07)' }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                            Your Deck
                        </Typography>
                        <Stack direction="row" spacing={1.5} sx={{ mt: 2, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }} useFlexGap>
                            <StatWidget label="Total Cards" value={stats.total_cards} color="#6366f1" />
                            <StatWidget label="Due Tomorrow" value={stats.due_now} color="#f97316" />
                            <StatWidget label="Avg Ease Factor" value={stats.avg_ease_factor} color="#22c55e" />
                            <StatWidget label="Total Reviews" value={stats.total_reviews} color="#a855f7" />
                        </Stack>
                    </>
                )}

                <Button
                    variant="contained"
                    size="large"
                    startIcon={<RefreshIcon />}
                    onClick={loadCards}
                    sx={{
                        px: 4, py: 1.5, borderRadius: 3,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        fontWeight: 700,
                        '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #9333ea)' }
                    }}
                >
                    Check Again
                </Button>
            </Box>
        );
    }

    // ── Loading ─────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Box sx={{ maxWidth: 680, mx: 'auto', py: 6, px: 2 }}>
                <Skeleton variant="rounded" height={320} sx={{ borderRadius: 4 }} />
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={48} sx={{ flex: 1, borderRadius: 2 }} />)}
                </Stack>
            </Box>
        );
    }

    // ── Error ───────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <Box sx={{ maxWidth: 680, mx: 'auto', py: 6, px: 2 }}>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
                    {error}
                </Alert>
                <Button variant="outlined" onClick={loadCards} startIcon={<RefreshIcon />}>Retry</Button>
            </Box>
        );
    }

    // ── Active study session ────────────────────────────────────────────────────
    return (
        <Box sx={{ py: 4, px: 2 }}>
            {/* Header */}
            <Box sx={{ maxWidth: 680, mx: 'auto', mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <BoltIcon sx={{ color: '#6366f1', fontSize: 28 }} />
                <Box>
                    <Typography variant="h5" fontWeight={800}>Daily Review</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {cards.length} card{cards.length !== 1 ? 's' : ''} due · SM-2 Spaced Repetition
                    </Typography>
                </Box>
                {/* Live deck stats strip */}
                <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
                    {!statsLoading && stats && (
                        <StatChip value={`${stats.avg_retention}% retention`} />
                    )}
                </Box>
            </Box>

            {/* Active card */}
            {cards.length > 0 && currentIndex < cards.length && (
                <ReviewCard
                    key={cards[currentIndex]._id}
                    card={cards[currentIndex]}
                    cardIndex={currentIndex}
                    totalCards={cards.length}
                    onReview={handleReview}
                    onSuspend={handleSuspend}
                    onDelete={handleDelete}
                />
            )}
        </Box>
    );
}

// StatChip helper (inline small stat)
function StatChip({ value }) {
    return (
        <Box sx={{
            px: 1.5, py: 0.5,
            borderRadius: 2,
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
        }}>
            <Typography variant="caption" color="primary.light" fontWeight={700}>{value}</Typography>
        </Box>
    );
}
