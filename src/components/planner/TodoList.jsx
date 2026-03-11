import React, { useState, useRef, useEffect } from 'react';
import {
    Box, Typography, Paper, Checkbox, IconButton,
    List, ListItem, ListItemIcon, ListItemText,
    Grow, TextField, CircularProgress, Tooltip
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    RadioButtonUnchecked as UncheckedIcon,
    LocalFireDepartment as FireIcon,
    Repeat as RepeatIcon,
    FactCheck as FactCheckIcon,
    Edit as EditIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudyContext } from '../../contexts/StudyContext';

export default function TodoList() {
    const { todayData, tickTask, addNewTask, updateTaskText } = useStudyContext();

    // Local State for Inline Editing
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editDraft, setEditDraft] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Local State for Adding tasks
    const [addingTask, setAddingTask] = useState(false);
    const [newTaskDraft, setNewTaskDraft] = useState('');

    const editInputRef = useRef(null);
    const addInputRef = useRef(null);

    // Focus management
    useEffect(() => {
        if (editingTaskId && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingTaskId]);

    useEffect(() => {
        if (addingTask && addInputRef.current) {
            addInputRef.current.focus();
        }
    }, [addingTask]);

    if (!todayData || !todayData.tasks) return null;

    const handleToggle = (taskId, completed) => {
        tickTask(todayData.date, taskId, completed);
    };

    // --- Edit Task Logic ---
    const startEditing = (task) => {
        if (task.completed) return; // Prevent editing completed tasks to keep history clean
        setEditingTaskId(task.id);
        setEditDraft(task.text);
    };

    const saveEdit = async () => {
        if (!editingTaskId || !editDraft.trim()) {
            setEditingTaskId(null);
            return;
        }

        const originalTask = todayData.tasks.find(t => t.id === editingTaskId);
        if (originalTask && originalTask.text === editDraft.trim()) {
            setEditingTaskId(null); // No changes made
            return;
        }

        try {
            setIsSaving(true);
            await updateTaskText(todayData.date, editingTaskId, editDraft.trim());
        } catch (error) {
            console.error(error);
        } finally {
            setEditingTaskId(null);
            setIsSaving(false);
        }
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter') saveEdit();
        if (e.key === 'Escape') setEditingTaskId(null);
    };

    // --- Add Task Logic ---
    const saveNewTask = async () => {
        if (!newTaskDraft.trim()) {
            setAddingTask(false);
            return;
        }
        try {
            setIsSaving(true);
            await addNewTask(todayData.date, newTaskDraft.trim());
            setNewTaskDraft('');
        } catch (error) {
            console.error(error);
        } finally {
            setAddingTask(false);
            setIsSaving(false);
        }
    };

    const handleAddKeyDown = (e) => {
        if (e.key === 'Enter') saveNewTask();
        if (e.key === 'Escape') setAddingTask(false);
    };

    return (
        <Paper sx={{ p: 4, borderRadius: 4, bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
                    Today's Checkpoints
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(239,68,68,0.1)', px: 2, py: 0.5, borderRadius: 5 }}>
                    <FireIcon color="error" fontSize="small" />
                    <Typography variant="subtitle2" color="error.main" fontWeight={700}>
                        {todayData.streak?.current || 0} Day Streak
                    </Typography>
                </Box>
            </Box>

            {todayData.tasks.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary" fontStyle="italic">No tasks for today. Exam day or rest day?</Typography>
                </Box>
            ) : (
                <List sx={{ width: '100%', bgcolor: 'transparent' }}>
                    <AnimatePresence>
                        {todayData.tasks.map((t, idx) => (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <ListItem
                                    disablePadding
                                    sx={{
                                        mb: 2, borderRadius: 3, p: 1.5,
                                        bgcolor: t.completed ? 'rgba(16,185,129,0.05)' :
                                            t.type === 'review' ? 'rgba(245,158,11,0.05)' :
                                                t.type === 'mock_exam' ? 'rgba(139,92,246,0.05)' : 'rgba(255,255,255,0.02)',
                                        border: '1px solid',
                                        borderColor: t.completed ? 'rgba(16,185,129,0.2)' :
                                            t.type === 'review' ? 'rgba(245,158,11,0.3)' :
                                                t.type === 'mock_exam' ? 'rgba(139,92,246,0.3)' : 'divider',
                                        transition: 'all 0.3s ease',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                                    }}
                                >
                                    <ListItemIcon sx={{ pl: 1, minWidth: 48 }}>
                                        <Checkbox
                                            edge="start"
                                            checked={t.completed}
                                            onChange={(e) => handleToggle(t.id, e.target.checked)}
                                            icon={<UncheckedIcon color="action" />}
                                            checkedIcon={
                                                <Grow in={true}>
                                                    <CheckCircleIcon sx={{ color: '#10b981' }} />
                                                </Grow>
                                            }
                                            disableRipple
                                        />
                                    </ListItemIcon>

                                    {t.type === 'review' && !t.completed && (
                                        <RepeatIcon sx={{ color: '#f59e0b', mr: 2, ml: -1, fontSize: 20 }} />
                                    )}
                                    {t.type === 'mock_exam' && !t.completed && (
                                        <FactCheckIcon sx={{ color: '#8b5cf6', mr: 2, ml: -1, fontSize: 20 }} />
                                    )}

                                    {/* Edit Mode Toggle View */}
                                    {editingTaskId === t.id ? (
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
                                                '& .MuiInput-root': { color: '#fff', fontSize: '1rem', fontWeight: 600 }
                                            }}
                                        />
                                    ) : (
                                        <ListItemText
                                            primary={t.text}
                                            secondary={t.topic}
                                            primaryTypographyProps={{
                                                fontWeight: t.completed ? 500 : 700,
                                                color: t.completed ? 'text.secondary' :
                                                    t.type === 'review' ? '#fde68a' :
                                                        t.type === 'mock_exam' ? '#ddd6fe' : 'text.primary',
                                                sx: { textDecoration: t.completed ? 'line-through' : 'none', transition: 'all 0.3s ease' }
                                            }}
                                            secondaryTypographyProps={{ variant: 'caption', color: 'text.disabled' }}
                                        />
                                    )}

                                    {!t.completed && editingTaskId !== t.id && (
                                        <Tooltip title="Edit Task">
                                            <IconButton
                                                size="small"
                                                onClick={() => startEditing(t)}
                                                sx={{ opacity: 0, transition: 'opacity 0.2s', '.MuiListItem-root:hover &': { opacity: 0.6 } }}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </ListItem>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Add Custom Task Row */}
                    <ListItem disablePadding sx={{ mt: 1, borderRadius: 3, p: 1.5, border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <ListItemIcon sx={{ pl: 1, minWidth: 48 }}>
                            <AddIcon color="disabled" />
                        </ListItemIcon>
                        {addingTask ? (
                            <TextField
                                inputRef={addInputRef}
                                fullWidth
                                variant="standard"
                                placeholder="E.g., Review weak pathology concepts..."
                                value={newTaskDraft}
                                onChange={(e) => setNewTaskDraft(e.target.value)}
                                onBlur={saveNewTask}
                                onKeyDown={handleAddKeyDown}
                                disabled={isSaving}
                                sx={{
                                    '& .MuiInput-underline:before': { borderBottom: '1px solid rgba(255,255,255,0.2)' },
                                    '& .MuiInput-root': { color: '#fff', fontSize: '0.9rem' }
                                }}
                            />
                        ) : (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ cursor: 'text', width: '100%', py: 1 }}
                                onClick={() => setAddingTask(true)}
                            >
                                Add a custom task for today...
                            </Typography>
                        )}
                    </ListItem>
                </List>
            )}
        </Paper>
    );
}
