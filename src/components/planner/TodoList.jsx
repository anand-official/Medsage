import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Checkbox, IconButton,
    List, ListItem, ListItemIcon,
    Grow, TextField, Tooltip, Collapse, Button, LinearProgress, Alert, Divider, CircularProgress,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    LocalFireDepartment as FireIcon,
    Repeat as RepeatIcon,
    FactCheck as FactCheckIcon,
    School as LearnIcon,
    Edit as EditIcon,
    Add as AddIcon,
    MenuBook as BookIcon,
    YouTube as YouTubeIcon,
    Star as StarIcon,
    Bookmark as ReferenceIcon,
    ExpandLess as ExpandLessIcon,
    SmartToy as AiIcon,
    OpenInNew as OpenIcon,
    AutoStories as ResourcesIcon,
    Refresh as RefreshIcon,
    SearchOff as NoResultsIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from '../../utils/navigation';
import { useStudyContext } from '../../contexts/StudyContext';
import { plannerAPI } from '../../services/plannerService';

// ── Resource type config ──────────────────────────────────────────────────────
const RESOURCE_CONFIG = {
    gold_standard: {
        Icon: StarIcon,
        iconColor: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.25)',
        badge: 'Gold Standard',
        badgeColor: '#f59e0b',
        badgeBg: 'rgba(245,158,11,0.18)',
    },
    video: {
        Icon: YouTubeIcon,
        iconColor: '#ef4444',
        bg: 'rgba(239,68,68,0.06)',
        border: 'rgba(239,68,68,0.18)',
        badge: 'Video Lecture',
        badgeColor: '#f87171',
        badgeBg: 'rgba(239,68,68,0.14)',
    },
    reference: {
        Icon: ReferenceIcon,
        iconColor: '#22d3ee',
        bg: 'rgba(34,211,238,0.06)',
        border: 'rgba(34,211,238,0.18)',
        badge: 'Reference',
        badgeColor: '#67e8f9',
        badgeBg: 'rgba(34,211,238,0.14)',
    },
    textbook: {
        Icon: BookIcon,
        iconColor: '#818cf8',
        bg: 'rgba(99,102,241,0.06)',
        border: 'rgba(99,102,241,0.18)',
        badge: 'Textbook',
        badgeColor: '#a5b4fc',
        badgeBg: 'rgba(99,102,241,0.14)',
    },
    guideline: {
        Icon: BookIcon,
        iconColor: '#34d399',
        bg: 'rgba(52,211,153,0.06)',
        border: 'rgba(52,211,153,0.18)',
        badge: 'Guideline',
        badgeColor: '#6ee7b7',
        badgeBg: 'rgba(52,211,153,0.14)',
    },
};

// ── Task type config ──────────────────────────────────────────────────────────
const TASK_TYPE_CONFIG = {
    learn: { label: 'Learn', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', taskBg: 'rgba(255,255,255,0.02)', taskBorder: 'rgba(255,255,255,0.08)', textColor: 'text.primary', Icon: LearnIcon },
    learning: { label: 'Learn', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', taskBg: 'rgba(255,255,255,0.02)', taskBorder: 'rgba(255,255,255,0.08)', textColor: 'text.primary', Icon: LearnIcon },
    active_recall: { label: 'Recall', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.28)', taskBg: 'rgba(16,185,129,0.05)', taskBorder: 'rgba(16,185,129,0.18)', textColor: '#bbf7d0', Icon: FactCheckIcon },
    review: { label: 'Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)', taskBg: 'rgba(245,158,11,0.05)', taskBorder: 'rgba(245,158,11,0.25)', textColor: '#fde68a', Icon: RepeatIcon },
    catch_up: { label: 'Catch Up', color: '#fb7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.28)', taskBg: 'rgba(251,113,133,0.05)', taskBorder: 'rgba(251,113,133,0.22)', textColor: '#fecdd3', Icon: RepeatIcon },
    resource_drill: { label: 'Drill', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.28)', taskBg: 'rgba(34,211,238,0.05)', taskBorder: 'rgba(34,211,238,0.2)', textColor: '#cffafe', Icon: ResourcesIcon },
    flashcard_review: { label: 'Cards', color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.28)', taskBg: 'rgba(192,132,252,0.05)', taskBorder: 'rgba(192,132,252,0.2)', textColor: '#f3e8ff', Icon: RepeatIcon },
    mock: { label: 'Mock', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)', taskBg: 'rgba(139,92,246,0.05)', taskBorder: 'rgba(139,92,246,0.25)', textColor: '#ddd6fe', Icon: FactCheckIcon },
    mock_exam: { label: 'Mock', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)', taskBg: 'rgba(139,92,246,0.05)', taskBorder: 'rgba(139,92,246,0.25)', textColor: '#ddd6fe', Icon: FactCheckIcon },
};

function ResourceCard({ resource: r, isTop }) {
    const cfg = RESOURCE_CONFIG[r.resourceType] || RESOURCE_CONFIG.reference;
    const { Icon, iconColor, bg, border, badge, badgeColor, badgeBg } = cfg;
    const link = r.freeLinks?.[0];

    return (
        <Box
            sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.5, borderRadius: 2.5,
                bgcolor: bg, border: `1px solid ${border}`,
                transition: 'all 0.2s',
                position: 'relative',
                '&:hover': { filter: 'brightness(1.15)', transform: 'translateX(2px)' }
            }}
        >
            {isTop && (
                <Box sx={{
                    position: 'absolute', top: -1, right: 8,
                    px: 0.7, py: 0.05, borderRadius: '0 0 4px 4px',
                    bgcolor: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.35)',
                    borderTop: 'none',
                }}>
                    <Typography sx={{ fontSize: '0.55rem', fontWeight: 900, color: '#a5b4fc', letterSpacing: 0.5 }}>
                        TOP PICK
                    </Typography>
                </Box>
            )}
            <Box sx={{
                width: 32, height: 32, borderRadius: 1.5,
                bgcolor: `${iconColor}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Icon sx={{ color: iconColor, fontSize: 17 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mb: 0.25 }}>
                    <Typography variant="body2" fontWeight={700} color="text.primary" noWrap sx={{ fontSize: '0.8rem' }}>
                        {r.platform}
                    </Typography>
                    <Box sx={{
                        px: 0.75, py: 0.1, borderRadius: 1,
                        bgcolor: badgeBg, fontSize: '0.6rem', fontWeight: 800,
                        color: badgeColor, letterSpacing: 0.6, textTransform: 'uppercase', flexShrink: 0,
                    }}>
                        {badge}
                    </Box>
                    {r.access && (
                        <Box sx={{
                            px: 0.65, py: 0.1, borderRadius: 1,
                            bgcolor: 'rgba(255,255,255,0.06)', fontSize: '0.58rem',
                            color: 'text.secondary', textTransform: 'uppercase', fontWeight: 800,
                        }}>
                            {r.access}
                        </Box>
                    )}
                </Box>
                {(r.why || r.note || r.author) && (
                    <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.35, display: 'block', fontSize: '0.68rem' }}>
                        {r.why || r.note || r.author}
                    </Typography>
                )}
                {r.estimated_minutes && (
                    <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.35, display: 'block', fontSize: '0.64rem' }}>
                        ~{r.estimated_minutes} min
                    </Typography>
                )}
            </Box>
            {link && (
                <Button
                    component="a"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="small"
                    endIcon={<OpenIcon sx={{ fontSize: '12px !important' }} />}
                    sx={{
                        flexShrink: 0,
                        fontSize: '0.7rem', fontWeight: 700,
                        px: 1.25, py: 0.4, borderRadius: 1.5,
                        color: iconColor,
                        bgcolor: 'transparent',
                        border: `1px solid ${border}`,
                        textTransform: 'none',
                        minWidth: 0,
                        '&:hover': { bgcolor: bg, filter: 'brightness(1.3)' }
                    }}
                >
                    Open
                </Button>
            )}
        </Box>
    );
}

function StudyKitPanel({ task, isExpanded, dynamicResources, isLoadingResources, onRefresh }) {
    const resources = dynamicResources ?? (task.resources || []);
    const isDynamic = dynamicResources != null;
    const showEmpty = !isLoadingResources && resources.length === 0;

    return (
        <Collapse in={isExpanded} unmountOnExit>
            <Box sx={{ mt: 1.5, ml: { xs: 1, sm: 5.5 }, mr: 0.5 }}>
                <Box sx={{
                    p: 1.5, borderRadius: 2.5,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                        <Typography variant="caption" sx={{
                            color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
                            letterSpacing: 1.1, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.75,
                        }}>
                            <ResourcesIcon sx={{ fontSize: 13, opacity: 0.6 }} />
                            Study Kit
                            {task.topic && task.topic !== 'Custom' && (
                                <Box component="span" sx={{ color: 'rgba(255,255,255,0.65)', textTransform: 'none', letterSpacing: 0.2 }}>
                                    · {task.topic}
                                </Box>
                            )}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {isDynamic && (
                                <Box sx={{ px: 0.75, py: 0.1, borderRadius: 1, bgcolor: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}>
                                    <Typography sx={{ fontSize: '0.55rem', fontWeight: 900, color: '#c084fc', letterSpacing: 0.5 }}>
                                        AI-CURATED
                                    </Typography>
                                </Box>
                            )}
                            {!isLoadingResources && (
                                <Tooltip title="Refresh resources">
                                    <IconButton size="small" onClick={onRefresh} sx={{ p: 0.3, opacity: 0.5, '&:hover': { opacity: 1 } }}>
                                        <RefreshIcon sx={{ fontSize: 13 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    </Box>

                    {isLoadingResources ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5, justifyContent: 'center' }}>
                            <CircularProgress size={16} sx={{ color: '#6366f1' }} />
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>
                                Finding best resources for this topic…
                            </Typography>
                        </Box>
                    ) : showEmpty ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 1 }}>
                            <NoResultsIcon sx={{ color: 'text.disabled', fontSize: 22, opacity: 0.5 }} />
                            <Typography variant="caption" color="text.disabled" textAlign="center" sx={{ fontSize: '0.72rem' }}>
                                No curated resources found for this topic yet.
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {resources.map((r, ri) => (
                                <ResourceCard key={ri} resource={r} isTop={ri === 0 && resources.length > 1} />
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>
        </Collapse>
    );
}

export default function TodoList() {
    const { todayData, todayError, todayState, tickTask, addNewTask, updateTaskText, userProfile } = useStudyContext();
    const navigate = useNavigate();

    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editDraft, setEditDraft] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [addingTask, setAddingTask] = useState(false);
    const [newTaskDraft, setNewTaskDraft] = useState('');
    const [expandedResources, setExpandedResources] = useState(new Set());
    const [loadingResources, setLoadingResources] = useState(new Set());
    const [fetchedResources, setFetchedResources] = useState({});

    const editInputRef = useRef(null);
    const addInputRef = useRef(null);

    useEffect(() => {
        if (editingTaskId && editInputRef.current) editInputRef.current.focus();
    }, [editingTaskId]);

    useEffect(() => {
        if (addingTask && addInputRef.current) addInputRef.current.focus();
    }, [addingTask]);

    const fetchResourcesForTask = useCallback(async (task, force = false) => {
        if (!force && fetchedResources[task.id] !== undefined) return;
        if (loadingResources.has(task.id)) return;

        setLoadingResources(prev => new Set(prev).add(task.id));
        try {
            const searchTopic = (task.topic && task.topic !== 'Custom') ? task.topic : task.text;
            const searchSubject = (task.subject && task.subject !== 'Custom') ? task.subject : undefined;
            const res = await plannerAPI.getResources({
                subject: searchSubject,
                topic: searchTopic,
                country: userProfile?.country,
                year: userProfile?.mbbs_year,
            });
            setFetchedResources(prev => ({ ...prev, [task.id]: res?.data?.resources || [] }));
        } catch {
            setFetchedResources(prev => ({ ...prev, [task.id]: [] }));
        } finally {
            setLoadingResources(prev => { const next = new Set(prev); next.delete(task.id); return next; });
        }
    }, [fetchedResources, loadingResources, userProfile]);

    const toggleResources = useCallback((task) => {
        const taskId = task.id;
        const willExpand = !expandedResources.has(taskId);
        setExpandedResources(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
        if (willExpand && (task.resources?.length === 0 || !task.resources) && fetchedResources[taskId] === undefined) {
            fetchResourcesForTask(task);
        }
    }, [expandedResources, fetchedResources, fetchResourcesForTask]);

    const refreshResources = useCallback((task) => {
        fetchResourcesForTask(task, true);
    }, [fetchResourcesForTask]);

    if (todayState === 'loading' || (!todayData && todayState === 'idle')) {
        return (
            <Paper sx={{ p: { xs: 2, md: 3.5 }, borderRadius: 4, bgcolor: 'background.paper', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1.5, textAlign: 'center' }} role="status" aria-live="polite">
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary">
                    Loading today's checkpoints...
                </Typography>
            </Paper>
        );
    }

    if (!todayData || !todayData.tasks) {
        return (
            <Paper sx={{ p: { xs: 2, md: 3.5 }, borderRadius: 4, bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }} role={todayError ? 'alert' : 'status'} aria-live="polite">
                {todayError && <Alert severity="warning" sx={{ borderRadius: 2.5, width: '100%', mb: 1 }}>{todayError}</Alert>}
                <Typography variant="h6" fontWeight={800}>No checkpoints for today</Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
                    Your planner did not return a task list for today. Refresh the plan, or add a custom task to keep momentum.
                </Typography>
            </Paper>
        );
    }

    const tasks = todayData.tasks;
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const allDone = completedCount === totalCount && totalCount > 0;

    const handleToggle = async (taskId, completed) => {
        try {
            await tickTask(todayData.date, taskId, completed);
        } catch {
            // StudyContext surfaces the error in the planner alert.
        }
    };

    const startEditing = (task) => {
        if (task.completed) return;
        setEditingTaskId(task.id);
        setEditDraft(task.text);
    };

    const saveEdit = async () => {
        if (!editingTaskId || !editDraft.trim()) { setEditingTaskId(null); return; }
        const originalTask = tasks.find(t => t.id === editingTaskId);
        if (originalTask && originalTask.text === editDraft.trim()) { setEditingTaskId(null); return; }
        try {
            setIsSaving(true);
            await updateTaskText(todayData.date, editingTaskId, editDraft.trim());
        } catch {
            // StudyContext surfaces the error in the planner alert.
        } finally {
            setEditingTaskId(null);
            setIsSaving(false);
        }
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') setEditingTaskId(null);
    };

    const saveNewTask = async () => {
        if (!newTaskDraft.trim()) { setAddingTask(false); return; }
        try {
            setIsSaving(true);
            await addNewTask(todayData.date, newTaskDraft.trim());
            setNewTaskDraft('');
        } catch {
            // StudyContext surfaces the error in the planner alert.
        } finally {
            setAddingTask(false);
            setIsSaving(false);
        }
    };

    const handleAddKeyDown = (e) => {
        if (e.key === 'Enter') saveNewTask();
        if (e.key === 'Escape') setAddingTask(false);
    };

    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    return (
        <Paper sx={{
            p: { xs: 2, md: 3.5 }, borderRadius: 4,
            bgcolor: 'background.paper', height: '100%',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
            {/* ── Header ── */}
            <Box sx={{ mb: 2.5 }}>
                {todayError && (
                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2.5 }}>
                        {todayError}
                    </Alert>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                            Today's Checkpoints
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {allDone
                                ? 'All done — great work today!'
                                : `${completedCount} of ${totalCount} tasks completed`}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 0.6,
                            bgcolor: 'rgba(239,68,68,0.1)', px: 1.5, py: 0.5,
                            borderRadius: 5, border: '1px solid rgba(239,68,68,0.18)',
                        }}>
                            <FireIcon sx={{ color: '#ef4444', fontSize: 16 }} />
                            <Typography variant="caption" sx={{ color: '#f87171', fontWeight: 800, fontSize: '0.78rem' }}>
                                {todayData.streak?.current || 0}d
                            </Typography>
                        </Box>
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 0.5,
                            bgcolor: allDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                            px: 1.25, py: 0.5, borderRadius: 5,
                            border: `1px solid ${allDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                            transition: 'all 0.3s ease',
                        }}>
                            {allDone && <CheckCircleIcon sx={{ color: '#10b981', fontSize: 14 }} />}
                            <Typography variant="caption" sx={{
                                fontWeight: 800, fontSize: '0.75rem',
                                color: allDone ? '#34d399' : 'text.secondary',
                            }}>
                                {completedCount}/{totalCount}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ position: 'relative' }}>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 5, borderRadius: 10,
                            bgcolor: 'rgba(255,255,255,0.07)',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 10,
                                background: allDone
                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                    : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                transition: 'transform 0.5s ease',
                            },
                        }}
                    />
                </Box>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, mr: -0.5 }}>
                {totalCount === 0 && (
                    <Box sx={{ minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, textAlign: 'center', px: 2, '& > p:first-of-type': { display: 'none' } }} role="status" aria-live="polite">
                        <Typography variant="h6" fontWeight={800}>
                            No checkpoints scheduled today
                        </Typography>
                        <Typography fontSize="2rem">🎉</Typography>
                        <Typography color="text.secondary" sx={{ maxWidth: 360 }}>
                            Use the custom task row below to add a focused review block, or keep today open for catch-up.
                        </Typography>
                    </Box>
                )}

                <List sx={{ width: '100%', bgcolor: 'transparent', p: 0 }}>
                    <AnimatePresence>
                        {pendingTasks.map((t, idx) => (
                            <TaskRow
                                key={t.id}
                                t={t}
                                idx={idx}
                                editingTaskId={editingTaskId}
                                editDraft={editDraft}
                                setEditDraft={setEditDraft}
                                editInputRef={editInputRef}
                                isSaving={isSaving}
                                saveEdit={saveEdit}
                                handleEditKeyDown={handleEditKeyDown}
                                expandedResources={expandedResources}
                                toggleResources={toggleResources}
                                refreshResources={refreshResources}
                                loadingResources={loadingResources}
                                fetchedResources={fetchedResources}
                                startEditing={startEditing}
                                handleToggle={handleToggle}
                                navigate={navigate}
                            />
                        ))}
                    </AnimatePresence>

                    {completedTasks.length > 0 && (
                        <Box sx={{ mt: pendingTasks.length > 0 ? 2 : 0.5, mb: 1 }}>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 1 }} />
                            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                                Completed today
                            </Typography>
                        </Box>
                    )}

                    <AnimatePresence>
                        {completedTasks.map((t, idx) => (
                            <TaskRow
                                key={t.id}
                                t={t}
                                idx={pendingTasks.length + idx}
                                editingTaskId={editingTaskId}
                                editDraft={editDraft}
                                setEditDraft={setEditDraft}
                                editInputRef={editInputRef}
                                isSaving={isSaving}
                                saveEdit={saveEdit}
                                handleEditKeyDown={handleEditKeyDown}
                                expandedResources={expandedResources}
                                toggleResources={toggleResources}
                                refreshResources={refreshResources}
                                loadingResources={loadingResources}
                                fetchedResources={fetchedResources}
                                startEditing={startEditing}
                                handleToggle={handleToggle}
                                navigate={navigate}
                            />
                        ))}
                    </AnimatePresence>

                    <AddTaskRow
                        addingTask={addingTask}
                        setAddingTask={setAddingTask}
                        addInputRef={addInputRef}
                        newTaskDraft={newTaskDraft}
                        setNewTaskDraft={setNewTaskDraft}
                        saveNewTask={saveNewTask}
                        handleAddKeyDown={handleAddKeyDown}
                        isSaving={isSaving}
                    />
                </List>
            </Box>
        </Paper>
    );
}

function AddTaskRow({
    addingTask, setAddingTask, addInputRef,
    newTaskDraft, setNewTaskDraft, saveNewTask, handleAddKeyDown, isSaving,
}) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <ListItem
                disablePadding
                sx={{
                    mt: 1.5, borderRadius: 3, p: 1.25,
                    border: '1.5px dashed rgba(255,255,255,0.1)',
                    cursor: addingTask ? 'default' : 'text',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: 'rgba(99,102,241,0.35)', bgcolor: 'rgba(99,102,241,0.03)' },
                }}
                onClick={() => !addingTask && setAddingTask(true)}
            >
                <ListItemIcon sx={{ pl: 0.5, minWidth: 40 }}>
                    <Box sx={{
                        width: 26, height: 26, borderRadius: 1.5,
                        bgcolor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <AddIcon sx={{ fontSize: 15, color: '#6366f1' }} />
                    </Box>
                </ListItemIcon>
                {addingTask ? (
                    <TextField
                        inputRef={addInputRef}
                        fullWidth
                        variant="standard"
                        placeholder="Type your task and press Enter..."
                        value={newTaskDraft}
                        onChange={(e) => setNewTaskDraft(e.target.value)}
                        onBlur={saveNewTask}
                        onKeyDown={handleAddKeyDown}
                        disabled={isSaving}
                        sx={{
                            '& .MuiInput-underline:before': { borderBottom: '1px solid rgba(99,102,241,0.3)' },
                            '& .MuiInput-underline:after': { borderBottom: '2px solid #6366f1' },
                            '& .MuiInput-root': { color: '#fff', fontSize: '0.88rem', fontWeight: 500 },
                        }}
                    />
                ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ py: 0.5, fontSize: '0.85rem', fontWeight: 500 }}>
                        Add a custom task for today...
                    </Typography>
                )}
            </ListItem>
        </motion.div>
    );
}

function TaskRow({
    t, idx,
    editingTaskId, editDraft, setEditDraft, editInputRef, isSaving, saveEdit, handleEditKeyDown,
    expandedResources, toggleResources, refreshResources, loadingResources, fetchedResources,
    startEditing, handleToggle, navigate,
}) {
    const typeCfg = TASK_TYPE_CONFIG[t.type] || TASK_TYPE_CONFIG.learning;
    const hasStaticResources = t.resources && t.resources.length > 0;
    const hasTopic = Boolean(t.topic && t.topic !== 'Custom');
    const showResourcesButton = (hasStaticResources || hasTopic) && !t.completed;
    const isExpanded = expandedResources.has(t.id);
    const isEditing = editingTaskId === t.id;
    const isLoadingResources = loadingResources.has(t.id);
    const dynamicResources = fetchedResources[t.id];

    return (
        <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: t.completed ? 0.55 : 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ delay: idx * 0.05, duration: 0.25 }}
            layout
        >
            <ListItem
                disablePadding
                sx={{
                    mb: 1, borderRadius: 2.5, p: 0,
                    flexDirection: 'column', alignItems: 'stretch',
                    bgcolor: t.completed ? 'rgba(16,185,129,0.04)' : typeCfg.taskBg,
                    border: '1px solid',
                    borderColor: t.completed ? 'rgba(16,185,129,0.15)' : typeCfg.taskBorder,
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                }}
            >
                {!t.completed && (
                    <Box sx={{
                        height: 2.5, width: '100%',
                        background: `linear-gradient(90deg, ${typeCfg.color}60, transparent)`,
                        borderRadius: '2.5px 2.5px 0 0',
                    }} />
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', px: 1.25, py: 1 }}>
                    <Checkbox
                        edge="start"
                        checked={t.completed}
                        onChange={(e) => handleToggle(t.id, e.target.checked)}
                        icon={<UncheckedIcon sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 20 }} />}
                        checkedIcon={<Grow in={true}><CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} /></Grow>}
                        disableRipple
                        sx={{ p: 0.75, mr: 0.25 }}
                    />

                    <Box sx={{ flex: 1, minWidth: 0, mx: 0.5 }}>
                        {isEditing ? (
                            <TextField
                                inputRef={editInputRef}
                                fullWidth
                                variant="standard"
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={handleEditKeyDown}
                                disabled={isSaving}
                                sx={{
                                    '& .MuiInput-underline:before': { borderBottom: '1px solid rgba(255,255,255,0.2)' },
                                    '& .MuiInput-root': { color: '#fff', fontSize: '0.88rem', fontWeight: 600 }
                                }}
                            />
                        ) : (
                            <>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: t.completed ? 500 : 700,
                                        color: t.completed ? 'text.secondary' : typeCfg.textColor,
                                        textDecoration: t.completed ? 'line-through' : 'none',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.45,
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    {t.text}
                                </Typography>
                                {t.topic && t.topic !== 'Custom' && (
                                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', lineHeight: 1.2, display: 'block' }}>
                                        {t.topic}
                                    </Typography>
                                )}
                            </>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 0.5 }}>
                        {!t.completed && !isEditing && (
                            <Box sx={{
                                px: 0.75, py: 0.25, borderRadius: 1.5,
                                bgcolor: typeCfg.bg, border: `1px solid ${typeCfg.border}`,
                                display: 'flex', alignItems: 'center', gap: 0.4,
                            }}>
                                <typeCfg.Icon sx={{ fontSize: 11, color: typeCfg.color }} />
                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: typeCfg.color, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    {typeCfg.label}
                                </Typography>
                            </Box>
                        )}

                        {t.topic && !t.completed && !isEditing && (
                            <Tooltip title="Ask AI about this topic">
                                <IconButton
                                    size="small"
                                    onClick={() => navigate(`/question?topic=${encodeURIComponent(t.topic)}`)}
                                    sx={{ color: '#a855f7', opacity: 0.65, p: 0.5, '&:hover': { opacity: 1, bgcolor: 'rgba(168,85,247,0.12)' } }}
                                >
                                    <AiIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}

                        {showResourcesButton && !isEditing && (
                            <Tooltip title={isExpanded ? 'Hide study kit' : hasTopic ? `Study kit · ${t.topic}` : 'View study kit'}>
                                <IconButton
                                    size="small"
                                    onClick={() => toggleResources(t)}
                                    sx={{
                                        p: 0.5,
                                        color: isExpanded ? '#818cf8' : '#6366f1',
                                        opacity: isExpanded ? 1 : 0.7,
                                        bgcolor: isExpanded ? 'rgba(99,102,241,0.12)' : 'transparent',
                                        borderRadius: 1.5,
                                        '&:hover': { opacity: 1, bgcolor: 'rgba(99,102,241,0.15)' },
                                    }}
                                >
                                    {isLoadingResources
                                        ? <CircularProgress size={16} sx={{ color: '#6366f1' }} />
                                        : isExpanded
                                            ? <ExpandLessIcon sx={{ fontSize: 16 }} />
                                            : <ResourcesIcon sx={{ fontSize: 16 }} />
                                    }
                                </IconButton>
                            </Tooltip>
                        )}

                        {!t.completed && !isEditing && (
                            <Tooltip title="Edit task">
                                <IconButton
                                    size="small"
                                    onClick={() => startEditing(t)}
                                    sx={{
                                        p: 0.5, opacity: 0,
                                        '.MuiListItem-root:hover &': { opacity: 0.5 },
                                        '@media (hover: none)': { opacity: 0.4 },
                                        '&:hover': { opacity: 0.9 },
                                    }}
                                >
                                    <EditIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                {showResourcesButton && (
                    <Box sx={{ px: 1.25, pb: isExpanded ? 1.25 : 0 }}>
                        <StudyKitPanel
                            task={t}
                            isExpanded={isExpanded}
                            dynamicResources={dynamicResources}
                            isLoadingResources={isLoadingResources}
                            onRefresh={() => refreshResources(t)}
                        />
                    </Box>
                )}
            </ListItem>
        </motion.div>
    );
}
