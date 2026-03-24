import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../animations.css';
import CanvasParticles from '../components/landing/CanvasParticles';
import TeamSection from '../components/landing/TeamSection';

// ─── Mobile detection hook ──────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [breakpoint]);
    return isMobile;
}

// ─── Icons (SVG inline for zero-dependency) ────────────────────────────────
const IconBrain = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
);
const IconFlash = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);
const IconTarget = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
);
const IconChart = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);
const IconClock = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
);
const IconBook = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);
const IconCheck = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const IconArrow = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
);
const IconStar = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

// ─── Fade-up animation wrapper ────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = '' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ─── Animated number counter ──────────────────────────────────────────────
function CountUp({ end, suffix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const observed = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !observed.current) {
                observed.current = true;
                let start = 0;
                const duration = 1800;
                const step = (timestamp) => {
                    if (!start) start = timestamp;
                    const progress = Math.min((timestamp - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.floor(eased * end));
                    if (progress < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            }
        }, { threshold: 0.5 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [end]);

    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ─── LIVING BACKGROUND ───────────────────────────────────────────────────
function LivingBackground() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {/* Canvas particles layer */}
            <CanvasParticles />

            {/* Noise grain overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
                opacity: 0.8, zIndex: 1,
            }} />

            {/* 1. Hero center breathing glow — indigo */}
            <motion.div
                animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute', top: '25%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 1100, height: 800, borderRadius: '50%',
                    background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.22) 0%, rgba(99,102,241,0.12) 40%, rgba(168,85,247,0.05) 70%, transparent 100%)',
                    filter: 'blur(50px)',
                }}
            />

            {/* 2. Upper-left — vivid purple */}
            <motion.div
                animate={{ x: [0, 50, -30, 0], y: [0, -40, 30, 0], opacity: [0.35, 0.65, 0.35] }}
                transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute', top: '-5%', left: '5%',
                    width: 700, height: 700, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.16) 0%, transparent 70%)',
                    filter: 'blur(70px)',
                }}
            />

            {/* 3. Lower-right — indigo */}
            <motion.div
                animate={{ x: [0, -40, 25, 0], y: [0, 30, -20, 0], opacity: [0.3, 0.55, 0.3] }}
                transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                style={{
                    position: 'absolute', bottom: '5%', right: '5%',
                    width: 650, height: 650, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
                    filter: 'blur(70px)',
                }}
            />

            {/* 4. Mid-right — rose accent for life */}
            <motion.div
                animate={{ x: [0, -30, 40, 0], y: [0, 50, -30, 0], opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
                style={{
                    position: 'absolute', top: '50%', right: '8%',
                    width: 500, height: 500, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* 5. Bottom center — cyan accent */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                style={{
                    position: 'absolute', bottom: '-10%', left: '35%',
                    width: 600, height: 400, borderRadius: '50%',
                    background: 'radial-gradient(ellipse, rgba(6,182,212,0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* Subtle grid lines overlay */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 2,
                backgroundImage: `
                    linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
                maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black 0%, transparent 100%)',
            }} />
        </div>
    );
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────
// Inspired by Glint: minimal, airy, transparent-first. Logo left, links center, CTA right.
function Navbar({ onSignIn }) {
    const [scrolled, setScrolled] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    return (
        <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                padding: scrolled ? '0' : '8px 0',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Inner pill — appears on scroll, Glint-style */}
            <div style={{
                maxWidth: scrolled ? '100%' : 1160,
                margin: '0 auto',
                padding: scrolled
                    ? (isMobile ? '12px 16px' : '14px 48px')
                    : (isMobile ? '14px 16px' : '16px 40px'),
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: scrolled ? 'rgba(4,4,6,0.82)' : 'transparent',
                borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
                backdropFilter: scrolled ? 'blur(24px) saturate(180%)' : 'none',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}>
                {/* Logo — Glint-style: small icon + wordmark, very clean */}
                <motion.div
                    style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}
                    whileHover={{ opacity: 0.8 }}
                >
                    {/* Premium Medical + AI geometric logo */}
                    <div style={{
                        position: 'relative', width: 24, height: 24,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="3" fill="#ec4899" filter="drop-shadow(0 0 8px rgba(236,72,153,0.8))" />
                            <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#nav-logo-grad-1)" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" stroke="url(#nav-logo-grad-2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                            <defs>
                                <linearGradient id="nav-logo-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#6366f1" />
                                    <stop offset="1" stopColor="#a855f7" />
                                </linearGradient>
                                <linearGradient id="nav-logo-grad-2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#ec4899" />
                                    <stop offset="1" stopColor="#6366f1" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <span style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 17,
                        color: '#f1f5f9', letterSpacing: '-0.4px',
                    }}>Medsage</span>
                </motion.div>

                {/* Center nav links — hidden on mobile */}
                <div style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: 40 }}>
                    {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Testimonials', '#testimonials']].map(([label, href]) => (
                        <a key={label} href={href} style={{
                            color: 'rgba(255,255,255,0.5)', textDecoration: 'none',
                            fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: 14,
                            letterSpacing: '0.1px', transition: 'color 0.2s',
                        }}
                            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.95)'}
                            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
                        >{label}</a>
                    ))}
                </div>

                {/* CTA — dark pill like Glint's App Store button, adapted */}
                <motion.button
                    onClick={onSignIn}
                    whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.12)' }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                        padding: isMobile ? '10px 18px' : '9px 22px', borderRadius: 100,
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#f1f5f9', fontFamily: 'Inter, sans-serif',
                        fontWeight: 600, fontSize: 13,
                        cursor: 'pointer', letterSpacing: '0.1px',
                        display: 'flex', alignItems: 'center', gap: 7,
                        backdropFilter: 'blur(8px)',
                        transition: 'background 0.2s',
                        minHeight: 44,
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Get Started
                </motion.button>
            </div>
        </motion.nav>
    );
}

// ─── HERO ─────────────────────────────────────────────────────────────────
function HeroSection({ onSignIn }) {
    const isMobile = useIsMobile();
    const words = ['Faster.', 'Smarter.', 'Better.'];
    const [wordIdx, setWordIdx] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setWordIdx(i => (i + 1) % words.length), 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <section style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
            padding: isMobile ? '100px 16px 60px' : '120px 32px 80px',
        }}>
            {/* Background handled globally by LivingBackground */}

            <div style={{ maxWidth: 900, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 36,
                        padding: '8px 20px', borderRadius: 100,
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    <span style={{ fontSize: 16 }}>✨</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>
                        Your smartest ally to master medical mystery
                    </span>
                    <span style={{
                        padding: '2px 10px', borderRadius: 100, background: 'rgba(99,102,241,0.2)',
                        fontSize: 11, fontWeight: 700, color: '#818cf8', letterSpacing: '0.5px'
                    }}>LIVE</span>
                </motion.div>

                {/* Headline */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h1 style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 900, margin: 0, lineHeight: 1.05,
                        fontSize: 'clamp(36px, 8vw, 90px)', letterSpacing: isMobile ? '-1.5px' : '-3px', color: '#f8fafc',
                    }}>
                        Master Medicine,
                        <br />
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={wordIdx}
                                initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                                    WebkitBackgroundClip: 'text', backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                {words[wordIdx]}
                            </motion.span>
                        </AnimatePresence>
                    </h1>
                </motion.div>

                {/* Sub */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 'clamp(16px, 2vw, 21px)',
                        color: 'rgba(255,255,255,0.55)', maxWidth: 620, margin: '28px auto 48px',
                        lineHeight: 1.7, letterSpacing: '-0.2px',
                    }}
                >
                    The AI-powered clinical intelligence platform built exclusively for MBBS students.
                    Adaptive study plans, SM-2 flashcards, and high-yield Q&A — personalized to your syllabus, your year, your exam.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', gap: isMobile ? 12 : 16, justifyContent: 'center', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center' }}
                >
                    <motion.button
                        onClick={onSignIn}
                        whileHover={{ scale: 1.04, boxShadow: '0 20px 50px rgba(99,102,241,0.5)' }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: isMobile ? '16px 32px' : '18px 40px', borderRadius: 16,
                            width: isMobile ? '100%' : 'auto', minHeight: 48,
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            color: 'white', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 17,
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}
                    >
                        Start Studying Free <IconArrow />
                    </motion.button>
                    <motion.a
                        href="#features"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: isMobile ? '14px 28px' : '18px 36px', borderRadius: 16,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: isMobile ? 15 : 17,
                            textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            backdropFilter: 'blur(12px)', minHeight: 48,
                            width: isMobile ? '100%' : 'auto',
                        }}
                    >
                        See Features
                    </motion.a>
                </motion.div>

            </div>
        </section>
    );
}

// ─── VISION SECTION ───────────────────────────────────────────────────────
function VisionSection() {
    const isMobile = useIsMobile();
    return (
        <section id="vision" style={{ padding: isMobile ? '24px 16px 60px' : '40px 32px 100px', position: 'relative', zIndex: 10 }}>
            <FadeUp>
                <div style={{
                    maxWidth: 1100, margin: '0 auto', textAlign: 'center',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: isMobile ? 20 : 32, padding: isMobile ? '40px 20px' : '70px 40px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.2)',
                }}>
                    <span style={{
                        display: 'inline-block', marginBottom: 20, padding: '6px 18px', borderRadius: 100,
                        background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.25)',
                        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: '#f472b6', letterSpacing: '1.5px',
                    }}>OUR MISSION</span>
                    <h2 style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 800, margin: '0 0 32px',
                        fontSize: 'clamp(32px, 4vw, 44px)', letterSpacing: '-1px', color: '#f8fafc',
                    }}>
                        We lived the problem. <span style={{
                            background: 'linear-gradient(135deg, #f472b6, #a855f7)',
                            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Now we're fixing it.</span>
                    </h2>
                    <p style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 'clamp(17px, 2vw, 20px)', color: 'rgba(255,255,255,0.7)',
                        maxWidth: 780, margin: '0 auto', lineHeight: 1.8,
                    }}>
                        One of our closest friends, a medical student, used to tell us how overwhelming it was to prepare for exams with limited guidance. She'd struggle with last-minute doubts and couldn't find any AI-based tool tailored specifically to her needs.
                        Her repeated frustration made us realize how underserved medical students are when it comes to intelligent academic support.
                        <br /><br />
                        <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>That&apos;s what inspired us to build Cortex—an AI-powered study companion built <em>just</em> for med students.</strong> We believe every medical student deserves a reliable digital mentor, and we&apos;re committed to making that vision real.
                    </p>
                </div>
            </FadeUp>
        </section>
    );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────
function StatsBar() {
    const isMobile = useIsMobile();
    const stats = [
        { value: 24, suffix: '/7', label: 'Availability' },
        { value: 10000, suffix: '+', label: 'Practice Questions' },
        { value: 98, suffix: '%', label: 'Accuracy Rating' },
        { value: 5, suffix: '', label: 'MBBS Years Covered' },
    ];

    return (
        <section style={{ padding: isMobile ? '0 16px 48px' : '0 32px 80px', position: 'relative' }}>
            <FadeUp>
                <div style={{
                    maxWidth: 1100, margin: '0 auto',
                    background: 'rgba(99,102,241,0.04)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: isMobile ? 16 : 24, padding: isMobile ? '24px 16px' : '40px 60px',
                    backdropFilter: 'blur(20px)',
                    display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                    gap: 16,
                }}>
                    {stats.map((s, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={{
                                fontFamily: 'Inter, sans-serif', fontWeight: 900,
                                fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: '-2px',
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                                <CountUp end={s.value} suffix={s.suffix} />
                            </div>
                            <div style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 500, marginTop: 4 }}>
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>
            </FadeUp>
        </section>
    );
}

// ─── FEATURES ─────────────────────────────────────────────────────────────
const features = [
    {
        icon: <IconBrain />, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.03))',
        title: 'AI-Powered Study Plans', tag: 'Core',
        desc: 'Tell us your exam date. Medsage generates a week-by-week adaptive curriculum tailored exactly to your MBBS year, weak subjects, and available time.',
        points: ['Syllabus-aware scheduling', 'Auto-adjusts to your pace', 'Exam-day countdown mode'],
        wide: true,
    },
    {
        icon: <IconFlash />, color: '#a855f7', gradient: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.03))',
        title: 'SM-2 Spaced Repetition', tag: 'Memory',
        desc: 'Scientifically-proven flashcard algorithm. Review topics at exactly the right moment — when you\'re about to forget them.',
        points: ['Evidence-based SM-2 algorithm', 'Zero wasted review time', 'Never forget a concept'],
    },
    {
        icon: <IconTarget />, color: '#10b981', gradient: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.03))',
        title: 'High-Yield Q&A Engine', tag: 'Practice',
        desc: 'AI-generated MCQs and structured questions filtered to exactly your MBBS year. Explanations sourced from Robbins, Harrison, and standard Indian textbooks.',
        points: ['NEET-PG & FMGE aligned', 'Detailed AI explanations', 'Topic-wise performance tracking'],
    },
    {
        icon: <IconChart />, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.03))',
        title: 'Deep Performance Analytics', tag: 'Insights',
        desc: 'Know exactly where you stand. Streak tracking, subject-wise heatmaps, and completion analytics give you an honest mirror of your preparation.',
        points: ['Daily streak tracking', 'Subject heatmap', 'Completion percentages'],
    },
    {
        icon: <IconClock />, color: '#ec4899', gradient: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(236,72,153,0.03))',
        title: 'Smart Daily Planner', tag: 'Organization',
        desc: 'A clean, actionable task list generated fresh every morning. Check off topics, track progress visually, and never wonder what to study next.',
        points: ['Auto-generated daily tasks', 'Progress bar per day', 'One-tap completion'],
    },
    {
        icon: <IconBook />, color: '#06b6d4', gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.03))',
        title: 'Textbook Reference Layer', tag: 'Resources',
        desc: 'Verified Cortex answers are grounded in standard medical references with visible chapter-level citations and transparent trust signals.',
        points: ['Cited to Robbins, Harrison', 'Chapter-level citation details', 'Visible verification status'],
    },
];

function FeaturesSection() {
    const isMobile = useIsMobile();
    return (
        <section id="features" style={{ padding: isMobile ? '60px 16px' : '100px 32px', position: 'relative' }}>
            <div style={{ maxWidth: 1140, margin: '0 auto' }}>
                <FadeUp>
                    <div style={{ textAlign: 'center', marginBottom: 72 }}>
                        <span style={{
                            display: 'inline-block', marginBottom: 16, padding: '6px 18px', borderRadius: 100,
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: '#a5b4fc', letterSpacing: '1.5px',
                        }}>PLATFORM FEATURES</span>
                        <h2 style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 900, margin: '0 0 20px',
                            fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: '-1.5px', color: '#f8fafc',
                        }}>
                            Everything you need to{' '}
                            <span style={{
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>ace your exams</span>
                        </h2>
                        <p style={{
                            fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)', maxWidth: 540, margin: '0 auto',
                            fontSize: 18, lineHeight: 1.7,
                        }}>
                            Six powerful tools working together in one unified clinical intelligence suite.
                        </p>
                    </div>
                </FadeUp>

                {/* Bento grid */}
                <div style={{
                    display: 'grid', gap: isMobile ? 16 : 20,
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                    gridTemplateRows: 'auto',
                }}>
                    {features.map((f, i) => (
                        <FadeUp key={i} delay={i * 0.07}>
                            <motion.div
                                whileHover={isMobile ? {} : { y: -6, scale: 1.01 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                    padding: isMobile ? '24px' : '36px', borderRadius: isMobile ? 16 : 24,
                                    background: f.gradient,
                                    border: `1px solid rgba(255,255,255,0.07)`,
                                    backdropFilter: 'blur(20px)',
                                    height: '100%', display: 'flex', flexDirection: 'column',
                                    gridColumn: (f.wide && !isMobile) ? 'span 2' : 'span 1',
                                    cursor: 'default',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 16,
                                        background: `rgba(${f.color === '#6366f1' ? '99,102,241' : f.color === '#a855f7' ? '168,85,247' : f.color === '#10b981' ? '16,185,129' : f.color === '#f59e0b' ? '245,158,11' : f.color === '#ec4899' ? '236,72,153' : '6,182,212'},0.15)`,
                                        border: `1px solid ${f.color}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: f.color,
                                    }}>
                                        {f.icon}
                                    </div>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                                        background: `${f.color}15`, border: `1px solid ${f.color}30`,
                                        color: f.color, fontFamily: 'Inter, sans-serif', letterSpacing: '0.5px',
                                    }}>{f.tag}</span>
                                </div>
                                <h3 style={{
                                    fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 22,
                                    letterSpacing: '-0.5px', color: '#f8fafc', margin: '0 0 12px',
                                }}>{f.title}</h3>
                                <p style={{
                                    fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.5)',
                                    fontSize: 15, lineHeight: 1.7, margin: '0 0 24px', flex: 1,
                                }}>{f.desc}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {f.points.map((pt, j) => (
                                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ color: f.color, flexShrink: 0 }}><IconCheck /></div>
                                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{pt}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </FadeUp>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────
const steps = [
    {
        num: '01', color: '#6366f1',
        title: 'Create Your Profile',
        desc: 'Sign in with Google in one click. Tell Medsage your MBBS year, target exam, medical college and weak subjects.',
    },
    {
        num: '02', color: '#a855f7',
        title: 'Get Your AI Study Plan',
        desc: 'The engine builds a hyper-personalized day-by-day curriculum from your exam date backwards, weighted to your weak spots.',
    },
    {
        num: '03', color: '#10b981',
        title: 'Study, Practice & Repeat',
        desc: 'Work through daily tasks, answer high-yield MCQs, review flashcards, and watch your analytics trending upward.',
    },
];

function HowItWorksSection() {
    const isMobile = useIsMobile();
    return (
        <section id="how-it-works" style={{ padding: isMobile ? '60px 16px' : '100px 32px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 800, height: 800,
                background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
                <FadeUp>
                    <div style={{ textAlign: 'center', marginBottom: 80 }}>
                        <span style={{
                            display: 'inline-block', marginBottom: 16, padding: '6px 18px', borderRadius: 100,
                            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)',
                            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: '#c084fc', letterSpacing: '1.5px',
                        }}>HOW IT WORKS</span>
                        <h2 style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 900, margin: '0 0 20px',
                            fontSize: 'clamp(34px, 5vw, 52px)', letterSpacing: '-1.5px', color: '#f8fafc',
                        }}>
                            From signup to{' '}
                            <span style={{
                                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>studying smarter</span>
                            {' '}in minutes
                        </h2>
                    </div>
                </FadeUp>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 40 : 32, position: 'relative' }}>
                    {/* Connecting line — hidden on mobile */}
                    <div style={{
                        position: 'absolute', top: 44, left: '17%', right: '17%', height: 1,
                        background: 'linear-gradient(90deg, #6366f1, #a855f7, #10b981)',
                        opacity: 0.3, zIndex: 0,
                        display: isMobile ? 'none' : 'block',
                    }} />

                    {steps.map((s, i) => (
                        <FadeUp key={i} delay={i * 0.15}>
                            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 16px' }}>
                                <motion.div
                                    whileHover={{ scale: 1.08 }}
                                    style={{
                                        width: 88, height: 88, borderRadius: '50%', margin: '0 auto 28px',
                                        background: `${s.color}10`,
                                        border: `2px solid ${s.color}40`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: `0 0 30px ${s.color}15`,
                                    }}
                                >
                                    <span style={{
                                        fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 22,
                                        color: s.color, letterSpacing: '-1px',
                                    }}>{s.num}</span>
                                </motion.div>
                                <h3 style={{
                                    fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 20,
                                    color: '#f8fafc', margin: '0 0 14px', letterSpacing: '-0.3px',
                                }}>{s.title}</h3>
                                <p style={{
                                    fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.45)',
                                    fontSize: 15, lineHeight: 1.7, margin: 0,
                                }}>{s.desc}</p>
                            </div>
                        </FadeUp>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── TESTIMONIALS ─────────────────────────────────────────────────────────
const testimonials = [
    {
        name: 'Priya Sharma', role: '3rd Year MBBS, AIIMS Delhi', emoji: '👩‍⚕️',
        color: '#6366f1',
        quote: 'Medsage changed how I study completely. The AI study plan cut my prep time in half and I actually remember what I study now. This is the tool every med student needs.',
        rating: 5,
    },
    {
        name: 'Arjun Mehta', role: 'NEET-PG Aspirant, Bangalore', emoji: '👨‍⚕️',
        color: '#a855f7',
        quote: 'The SM-2 flashcard system is insane. I went from failing revision sessions to having nearly perfect recall on topics I reviewed 3 weeks ago. Absolutely unreal.',
        rating: 5,
    },
    {
        name: 'Divya Nair', role: '4th Year MBBS, KMC Manipal', emoji: '👩‍⚕️',
        color: '#10b981',
        quote: 'The high-yield Q&A engine with citations from actual textbooks is a game-changer. I trust the answers because I can verify them. First time I actually enjoy revising.',
        rating: 5,
    },
];

function TestimonialsSection() {
    const isMobile = useIsMobile();
    return (
        <section id="testimonials" style={{ padding: isMobile ? '60px 16px' : '100px 32px' }}>
            <div style={{ maxWidth: 1140, margin: '0 auto' }}>
                <FadeUp>
                    <div style={{ textAlign: 'center', marginBottom: 72 }}>
                        <span style={{
                            display: 'inline-block', marginBottom: 16, padding: '6px 18px', borderRadius: 100,
                            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: '#6ee7b7', letterSpacing: '1.5px',
                        }}>STUDENT STORIES</span>
                        <h2 style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 900, margin: '0 0 20px',
                            fontSize: 'clamp(32px, 5vw, 50px)', letterSpacing: '-1.5px', color: '#f8fafc',
                        }}>
                            What our students are{' '}
                            <span style={{
                                background: 'linear-gradient(135deg, #10b981, #6366f1)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>saying</span>
                        </h2>
                    </div>
                </FadeUp>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 16 : 24 }}>
                    {testimonials.map((t, i) => (
                        <FadeUp key={i} delay={i * 0.1}>
                            <motion.div
                                whileHover={isMobile ? {} : { y: -6 }}
                                transition={{ duration: 0.25 }}
                                style={{
                                    padding: isMobile ? '24px' : '36px', borderRadius: isMobile ? 16 : 24,
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    backdropFilter: 'blur(20px)',
                                    display: 'flex', flexDirection: 'column', height: '100%',
                                }}
                            >
                                {/* Stars */}
                                <div style={{ display: 'flex', gap: 3, color: '#fbbf24', marginBottom: 24 }}>
                                    {[...Array(t.rating)].map((_, j) => <IconStar key={j} />)}
                                </div>

                                {/* Quote */}
                                <p style={{
                                    fontFamily: 'Inter, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.75)',
                                    lineHeight: 1.75, margin: '0 0 28px', flex: 1,
                                    fontStyle: 'italic',
                                }}>
                                    "{t.quote}"
                                </p>

                                {/* Author */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24 }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '50%',
                                        background: `${t.color}20`, border: `2px solid ${t.color}40`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 22,
                                    }}>{t.emoji}</div>
                                    <div>
                                        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>{t.name}</div>
                                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{t.role}</div>
                                    </div>
                                </div>
                            </motion.div>
                        </FadeUp>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── EXAMS STRIP ─────────────────────────────────────────────────────────
function ExamsStrip() {
    const exams = ['NEET-PG', 'FMGE / MCI', 'USMLE Step 1', 'PLAB UK', 'AMC Australia', 'INICET', 'State PG', 'AIIMS PG'];
    return (
        <section style={{ padding: '60px 0', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <motion.div
                animate={{ x: [0, -1200] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'flex', gap: 60, whiteSpace: 'nowrap', width: 'max-content' }}
            >
                {[...exams, ...exams].map((exam, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <span style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 16,
                            color: 'rgba(255,255,255,0.2)', letterSpacing: '1px',
                        }}>{exam}</span>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(99,102,241,0.4)' }} />
                    </div>
                ))}
            </motion.div>
        </section>
    );
}

// ─── FINAL CTA ────────────────────────────────────────────────────────────
function FinalCTA({ onSignIn }) {
    const isMobile = useIsMobile();
    return (
        <section style={{ padding: isMobile ? '60px 16px' : '120px 32px' }}>
            <FadeUp>
                <div style={{
                    maxWidth: 900, margin: '0 auto', textAlign: 'center',
                    padding: isMobile ? '48px 20px' : '80px 60px', borderRadius: isMobile ? 20 : 32, position: 'relative', overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)',
                    border: '1px solid rgba(99,102,241,0.2)',
                }}>
                    {/* BG orbs */}
                    <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
                    <div style={{ position: 'absolute', bottom: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: 48, marginBottom: 24 }}>🎓</div>
                        <h2 style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 900, margin: '0 0 20px',
                            fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-1.5px', color: '#f8fafc',
                        }}>
                            Your exam won't wait.<br />
                            <span style={{
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>
                                Neither should you.
                            </span>
                        </h2>
                        <p style={{
                            fontFamily: 'Inter, sans-serif', fontSize: 18, color: 'rgba(255,255,255,0.5)',
                            maxWidth: 480, margin: '0 auto 44px', lineHeight: 1.7,
                        }}>
                            Join the next generation of doctors who are already studying smarter with Medsage. Free to start, no credit card required.
                        </p>

                        <motion.button
                            onClick={onSignIn}
                            whileHover={{ scale: 1.04, boxShadow: '0 24px 60px rgba(99,102,241,0.55)' }}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                padding: isMobile ? '16px 36px' : '20px 52px', borderRadius: 18,
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                color: 'white', fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: isMobile ? 16 : 18,
                                border: 'none', cursor: 'pointer',
                                boxShadow: '0 12px 40px rgba(99,102,241,0.45)',
                                display: 'inline-flex', alignItems: 'center', gap: 12,
                                minHeight: 48, width: isMobile ? '100%' : 'auto', justifyContent: 'center',
                            }}
                        >
                            Start Studying Free<IconArrow />
                        </motion.button>

                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
                            {['✓ Free to start', '✓ No credit card', '✓ Cancel anytime'].map(pt => (
                                <span key={pt} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{pt}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </FadeUp>
        </section>
    );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────
function Footer() {
    const isMobile = useIsMobile();
    return (
        <footer style={{
            position: 'relative',
            marginTop: 40,
            overflow: 'hidden'
        }}>
            {/* Subtle top border gradient */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.25), transparent)' }} />

            <div style={{
                padding: isMobile ? '48px 16px 32px' : '80px 32px 40px',
                maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 40,
                    marginBottom: 60
                }}>
                    {/* Brand */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <div style={{
                                position: 'relative', width: 28, height: 28,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="3" fill="#a855f7" filter="drop-shadow(0 0 6px rgba(168,85,247,0.8))" />
                                    <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#footer-grad-1)" strokeWidth="2.5" strokeLinecap="round" />
                                    <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" stroke="url(#footer-grad-2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                                    <defs>
                                        <linearGradient id="footer-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#6366f1" />
                                            <stop offset="1" stopColor="#a855f7" />
                                        </linearGradient>
                                        <linearGradient id="footer-grad-2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
                                            <stop stopColor="#ec4899" />
                                            <stop offset="1" stopColor="#6366f1" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                            </div>
                            <span style={{ fontWeight: 900, fontSize: 24, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                                Medsage
                            </span>
                        </div>
                        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: 0, fontWeight: 500 }}>
                            Built for the next generation of doctors.
                        </p>
                    </div>

                    {/* Links - Horizontal row */}
                    <div style={{ display: 'flex', gap: isMobile ? 24 : 40, flexWrap: 'wrap' }}>
                        {['Privacy', 'Terms', 'Contact'].map(link => (
                            <a key={link} href="#" style={{
                                fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.55)',
                                textDecoration: 'none', transition: 'color 0.2s',
                            }}
                                onMouseEnter={e => e.target.style.color = '#fff'}
                                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.55)'}
                            >{link}</a>
                        ))}
                    </div>
                </div>

                {/* Bottom line */}
                <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: 32,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 20
                }}>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: 500, letterSpacing: '0.3px' }}>
                        © 2025 Medsage. All rights reserved.
                    </span>

                    {/* Social icons */}
                    <div style={{ display: 'flex', gap: 20 }}>
                        <a href="#" style={{ color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.52 1.52 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>
                        </a>
                        <a href="#" style={{ color: 'rgba(255,255,255,0.3)', transition: 'color 0.2s', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────
export default function LandingPage() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // If already signed in, send to dashboard
    useEffect(() => {
        if (currentUser) navigate('/');
    }, [currentUser, navigate]);

    const handleSignIn = () => navigate('/signin');

    return (
        <div style={{ background: '#040406', minHeight: '100vh', color: '#f8fafc', overflowX: 'hidden', position: 'relative' }}>
            <LivingBackground />
            <div style={{ position: 'relative', zIndex: 1 }}>
                <Navbar onSignIn={handleSignIn} />
                <HeroSection onSignIn={handleSignIn} />
                <VisionSection />
                <StatsBar />
                <ExamsStrip />
                <FeaturesSection />
                <HowItWorksSection />
                <TestimonialsSection />
                <FinalCTA onSignIn={handleSignIn} />
                <TeamSection />
                <Footer />
            </div>
        </div>
    );
}
