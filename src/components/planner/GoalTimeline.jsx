import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab, List, ListItem, ListItemIcon, ListItemText, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle as CheckCircleIcon, RadioButtonUnchecked as UncheckedIcon } from '@mui/icons-material';
import { useStudyContext } from '../../contexts/StudyContext';

export default function GoalTimeline({ goals }) {
    const { tickGoal } = useStudyContext();
    const [tabIndex, setTabIndex] = useState(0);
    const [ticking, setTicking] = useState(null); // goalId being processed

    const tabs = [
        { label: 'Weekly', key: 'weekly' },
        { label: 'Monthly', key: 'monthly' },
        { label: 'Quarterly', key: 'quarterly' }
    ];

    const currentKey = tabs[tabIndex].key;
    const currentList = goals?.[currentKey] || [];

    const handleTick = async (g) => {
        if (ticking) return;
        setTicking(g.id);
        await tickGoal(currentKey, g.id);
        setTicking(null);
    };

    return (
        <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={tabIndex}
                    onChange={(e, v) => setTabIndex(v)}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ minHeight: 40 }}
                >
                    {tabs.map((t, idx) => (
                        <Tab
                            key={t.key}
                            label={t.label}
                            sx={{
                                fontWeight: tabIndex === idx ? 800 : 500,
                                textTransform: 'none', px: 3, letterSpacing: '-0.5px'
                            }}
                        />
                    ))}
                </Tabs>
            </Box>

            {currentList.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary" fontStyle="italic">No pending milestones for this period.</Typography>
                </Box>
            ) : (
                <List sx={{ pt: 0, px: 1 }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentKey}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {currentList.map((g, idx) => (
                                <ListItem
                                    key={g.id || idx}
                                    disablePadding
                                    sx={{
                                        bgcolor: g.done ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                                        borderRadius: 3, mb: 1.5, p: 1,
                                        border: '1px solid',
                                        borderColor: g.done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': { bgcolor: g.done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)' }
                                    }}
                                    onClick={() => handleTick(g)}
                                >
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        <Tooltip title={g.done ? 'Mark incomplete' : 'Mark complete'}>
                                            <IconButton
                                                size="small"
                                                disabled={ticking === g.id}
                                                onClick={(e) => { e.stopPropagation(); handleTick(g); }}
                                                sx={{ p: 0.5 }}
                                            >
                                                {g.done
                                                    ? <CheckCircleIcon sx={{ color: '#10b981' }} />
                                                    : <UncheckedIcon color="action" />
                                                }
                                            </IconButton>
                                        </Tooltip>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={g.text}
                                        secondary={`Target: ${g.due || 'TBD'}`}
                                        primaryTypographyProps={{
                                            fontWeight: 600,
                                            color: g.done ? 'text.secondary' : 'text.primary',
                                            sx: { textDecoration: g.done ? 'line-through' : 'none', transition: 'all 0.2s' }
                                        }}
                                        secondaryTypographyProps={{ variant: 'caption', color: 'primary.main', fontWeight: 600 }}
                                    />
                                </ListItem>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </List>
            )}
        </Paper>
    );
}
