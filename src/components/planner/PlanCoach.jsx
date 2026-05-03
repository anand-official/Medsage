import React, { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import {
    AutoFixHigh as ApplyIcon,
    SmartToy as CoachIcon,
    Send as SendIcon
} from '@mui/icons-material';
import { useStudyContext } from '../../contexts/StudyContext';

const CHANGE_LABELS = {
    rebalance: 'Catch-up rebalance',
    lighten_day: 'Lighter day',
    add_focus_review: 'Focus review',
    refresh_resources: 'Refresh resources'
};

function describeChange(change) {
    if (change.type === 'lighten_day') return `${CHANGE_LABELS[change.type]}: ${change.date}`;
    if (change.type === 'add_focus_review') return `${CHANGE_LABELS[change.type]}: ${change.focus}`;
    if (change.type === 'rebalance') return CHANGE_LABELS[change.type];
    if (change.type === 'refresh_resources') return CHANGE_LABELS[change.type];
    return change.type;
}

export default function PlanCoach() {
    const { chatWithPlannerAssistant, applyAssistantProposal } = useStudyContext();
    const [message, setMessage] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState(null);

    const sendMessage = async () => {
        if (!message.trim()) return;
        setLoading(true);
        setError(null);
        setResponse(null); // clear stale response while new request is in flight
        try {
            const nextResponse = await chatWithPlannerAssistant(message.trim());
            setResponse(nextResponse);
            setMessage('');
        } catch (err) {
            setError(err.message || 'Planner coach failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            sendMessage();
        }
    };

    const applyProposal = async () => {
        if (!response?.proposal_id) return;
        setApplying(true);
        setError(null);
        try {
            await applyAssistantProposal(response.proposal_id);
            setResponse(prev => prev ? { ...prev, applied: true } : prev);
        } catch (err) {
            setError(err.message || 'Could not apply proposal.');
        } finally {
            setApplying(false);
        }
    };

    return (
        <Box className="glass-panel" sx={{ p: { xs: 2, md: 3 }, bgcolor: 'transparent' }}>
            <Stack spacing={2}>
                <Stack direction="row" alignItems="center" spacing={1.25}>
                    <CoachIcon sx={{ color: '#a855f7' }} />
                    <Box>
                        <Typography variant="subtitle1" fontWeight={900}>Plan Coach</Typography>
                        <Typography variant="caption" color="text.secondary">Approval-based plan edits</Typography>
                    </Box>
                </Stack>

                {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

                <TextField
                    multiline
                    minRows={3}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Make tomorrow lighter, I missed 3 days, focus more on pathology… (Ctrl+Enter to send)"
                    fullWidth
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    onClick={sendMessage}
                    disabled={loading || !message.trim()}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                >
                    Ask Coach
                </Button>

                {response && (
                    <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(168,85,247,0.22)', bgcolor: 'rgba(168,85,247,0.06)' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {response.message}
                        </Typography>
                        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
                            {(response.proposed_changes || []).map((change, index) => (
                                <Chip
                                    key={`${change.type}-${index}`}
                                    size="small"
                                    label={describeChange(change)}
                                    sx={{ fontWeight: 700, borderRadius: 1.5 }}
                                />
                            ))}
                        </Stack>
                        {(response.reasons || []).map((reason, index) => (
                            <Typography key={index} variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5 }}>
                                {reason}
                            </Typography>
                        ))}
                        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                            <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={applying ? <CircularProgress size={14} color="inherit" /> : <ApplyIcon />}
                                onClick={applyProposal}
                                disabled={applying || response.applied}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                            >
                                {response.applied ? 'Applied' : 'Apply'}
                            </Button>
                            <Button
                                size="small"
                                onClick={() => setResponse(null)}
                                disabled={applying}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                                Cancel
                            </Button>
                        </Stack>
                    </Box>
                )}
            </Stack>
        </Box>
    );
}
