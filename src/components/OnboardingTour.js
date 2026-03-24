import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Button, Paper, LinearProgress } from '@mui/material';
import { Close as CloseIcon, ArrowForward as NextIcon, ArrowBack as BackIcon } from '@mui/icons-material';

const TOUR_STORAGE_KEY = 'cortex_tour_completed';

const STEPS = [
    {
        target: null, // centre-screen splash
        title: 'Welcome to Cortex 👋',
        content:
            'Your AI professor panel for all 12 MBBS subjects. ' +
            "Let's take a quick tour so you know where everything is.",
    },
    {
        target: '#tour-quick-prompts',
        title: 'Quick-start prompts',
        content:
            'Tap any card to instantly ask a high-yield question across ' +
            'Anatomy, Pathology, Pharmacology, and more.',
        placement: 'top',
    },
    {
        target: '#tour-input',
        title: 'Ask anything',
        content:
            'Type your question here — a clinical scenario, a drug mechanism, ' +
            'an exam viva question, or paste an MCQ. Cortex retrieves answers ' +
            'directly from your MBBS textbooks.',
        placement: 'top',
    },
    {
        target: '#tour-image-attach',
        title: 'Upload images',
        content:
            'Attach a histology slide, X-ray, ECG, or any medical image. ' +
            'Cortex will analyse it alongside your question.',
        placement: 'top',
    },
    {
        target: '#tour-mode-toggle',
        title: 'Study mode',
        content:
            'Switch between Conceptual (deep explanations) and Exam ' +
            '(bullet-point, viva-ready answers). Both modes cite the source textbook.',
        placement: 'top',
    },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function getTargetRect(selector) {
    if (!selector) return null;
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

function getTooltipPosition(rect, placement = 'top', tooltipW = 300, tooltipH = 160) {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const vw = window.innerWidth;
    const margin = 12;

    let top, left;

    if (placement === 'top') {
        top  = rect.top + window.scrollY - tooltipH - margin;
        left = rect.left + rect.width / 2 - tooltipW / 2;
    } else {
        top  = rect.bottom + window.scrollY + margin;
        left = rect.left + rect.width / 2 - tooltipW / 2;
    }

    // Clamp to viewport
    left = Math.max(margin, Math.min(left, vw - tooltipW - margin));
    if (top < window.scrollY + margin) {
        top = rect.bottom + window.scrollY + margin; // flip to bottom
    }

    return { top, left, position: 'absolute' };
}

// ── Spotlight overlay ──────────────────────────────────────────────────────────

function Spotlight({ rect }) {
    if (!rect) {
        return (
            <Box sx={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.6)',
                pointerEvents: 'none',
            }} />
        );
    }

    const pad = 6;
    const r = {
        top:    rect.top    - pad,
        left:   rect.left   - pad,
        width:  rect.width  + pad * 2,
        height: rect.height + pad * 2,
    };

    return (
        <svg
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9998, pointerEvents: 'none' }}
        >
            <defs>
                <mask id="spotlight-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                        x={r.left} y={r.top}
                        width={r.width} height={r.height}
                        rx={10} ry={10}
                        fill="black"
                    />
                </mask>
            </defs>
            <rect
                width="100%" height="100%"
                fill="rgba(0,0,0,0.6)"
                mask="url(#spotlight-mask)"
            />
            {/* Highlight border */}
            <rect
                x={r.left} y={r.top}
                width={r.width} height={r.height}
                rx={10} ry={10}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
                opacity={0.9}
            />
        </svg>
    );
}

// ── Tooltip card ───────────────────────────────────────────────────────────────

function TourTooltip({ step, stepIndex, total, onNext, onBack, onSkip, rect }) {
    const TOOLTIP_W = 300;
    const pos = getTooltipPosition(rect, step.placement, TOOLTIP_W);

    return (
        <Paper
            elevation={12}
            sx={{
                position: pos.position || 'fixed',
                top: pos.top,
                left: pos.left,
                transform: pos.transform,
                zIndex: 9999,
                width: TOOLTIP_W,
                borderRadius: 3,
                p: 2.5,
                background: '#1e293b',
                border: '1px solid rgba(99,102,241,0.35)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.2)',
            }}
        >
            {/* Progress bar */}
            <LinearProgress
                variant="determinate"
                value={((stepIndex + 1) / total) * 100}
                sx={{
                    mb: 1.5, borderRadius: 4, height: 3,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#6366f1', borderRadius: 4 },
                }}
            />

            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.3 }}>
                    {step.title}
                </Typography>
                <CloseIcon
                    onClick={onSkip}
                    sx={{ fontSize: 16, color: '#64748b', cursor: 'pointer', ml: 1, mt: '2px', flexShrink: 0,
                        '&:hover': { color: '#94a3b8' } }}
                />
            </Box>

            {/* Body */}
            <Typography sx={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.65, mb: 2 }}>
                {step.content}
            </Typography>

            {/* Footer */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>
                    {stepIndex + 1} / {total}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {stepIndex > 0 && (
                        <Button
                            size="small" onClick={onBack} startIcon={<BackIcon sx={{ fontSize: 13 }} />}
                            sx={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'none', minWidth: 0,
                                '&:hover': { color: '#94a3b8' } }}
                        >
                            Back
                        </Button>
                    )}
                    {stepIndex === 0 && (
                        <Button
                            size="small" onClick={onSkip}
                            sx={{ fontSize: '0.75rem', color: '#475569', textTransform: 'none', minWidth: 0,
                                '&:hover': { color: '#64748b' } }}
                        >
                            Skip tour
                        </Button>
                    )}
                    <Button
                        size="small" variant="contained" onClick={onNext}
                        endIcon={stepIndex < total - 1 ? <NextIcon sx={{ fontSize: 13 }} /> : null}
                        sx={{
                            fontSize: '0.78rem', textTransform: 'none', borderRadius: 1.5,
                            px: 1.5, py: 0.5,
                            bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' },
                            boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                        }}
                    >
                        {stepIndex < total - 1 ? 'Next' : 'Done'}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OnboardingTour({ run: forcedRun = false, onFinish }) {
    const [active, setActive]       = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect]           = useState(null);
    const rafRef = useRef(null);

    const step = STEPS[stepIndex];

    // Measure target element each time step changes
    useEffect(() => {
        if (!active) return;
        const measure = () => {
            const r = getTargetRect(step?.target);
            setRect(r);
            if (r && step?.target) {
                // Scroll element into view if needed
                const el = document.querySelector(step.target);
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        };
        rafRef.current = requestAnimationFrame(measure);
        return () => cancelAnimationFrame(rafRef.current);
    }, [active, stepIndex, step]);

    // Auto-start on first visit
    useEffect(() => {
        if (forcedRun) { setStepIndex(0); setActive(true); return; }
        if (!localStorage.getItem(TOUR_STORAGE_KEY)) {
            const t = setTimeout(() => setActive(true), 900);
            return () => clearTimeout(t);
        }
    }, [forcedRun]);

    const finish = useCallback(() => {
        setActive(false);
        localStorage.setItem(TOUR_STORAGE_KEY, '1');
        onFinish?.();
    }, [onFinish]);

    const handleNext = useCallback(() => {
        if (stepIndex < STEPS.length - 1) setStepIndex(i => i + 1);
        else finish();
    }, [stepIndex, finish]);

    const handleBack = useCallback(() => {
        if (stepIndex > 0) setStepIndex(i => i - 1);
    }, [stepIndex]);

    if (!active) return null;

    return (
        <>
            {/* Block clicks on the rest of the page */}
            <Box
                onClick={finish}
                sx={{ position: 'fixed', inset: 0, zIndex: 9997, cursor: 'default' }}
            />

            <Spotlight rect={rect} />

            <TourTooltip
                step={step}
                stepIndex={stepIndex}
                total={STEPS.length}
                rect={rect}
                onNext={handleNext}
                onBack={handleBack}
                onSkip={finish}
            />
        </>
    );
}

/** Returns true if the user has not yet completed the tour */
export function isTourPending() {
    return !localStorage.getItem(TOUR_STORAGE_KEY);
}

/** Resets the tour so it will show again on next mount */
export function resetTour() {
    localStorage.removeItem(TOUR_STORAGE_KEY);
}
