import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getViewportWidth, subscribeToMediaQuery } from '../../utils/browser';

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => getViewportWidth() < breakpoint);
    useEffect(() => {
        return subscribeToMediaQuery(`(max-width: ${breakpoint - 1}px)`, setIsMobile);
    }, [breakpoint]);
    return isMobile;
}

const FOUNDERS = [
    {
        name: 'Ujjawal Anand',
        role: 'Co-Founder & Lead Engineer',
        tag: 'Vision & Engineering',
        photo: '/ujjawal_anand_new.png',
        color: '#6366f1',
        colorRgb: '99,102,241',
        bio: 'The driving force behind Medsage. Ujjawal built the AI study platform he wished existed when he was a student — combining a deep understanding of medicine with hands-on engineering leadership to turn a real problem into an elegant, scalable solution.',
        linkedin: 'https://www.linkedin.com/in/ujjawalanandofficial/',
        github: 'https://github.com/anand-official',
        email: 'anandujjawal993@gmail.com',
    },
    {
        name: 'Koyna Dutta',
        role: 'Developer',
        tag: 'Design & Development',
        photo: '/koyna_dutta.jpeg',
        color: '#ec4899',
        colorRgb: '236,72,153',
        bio: 'Koyna brings creativity and technical depth to Medsage — crafting experiences that are as intuitive as they are impactful. She thrives at the intersection of design and engineering, turning ideas into features that students genuinely enjoy using.',
        linkedin: 'https://www.linkedin.com/in/koyna-dutta',
        github: 'https://github.com/koynadutta',
        email: '',
    },
    {
        name: 'Bikash Yadav',
        role: 'Lead AI Integrations Engineer',
        tag: 'Fullstack & AI',
        photo: '/Bikash_yadav.png',
        color: '#a855f7',
        colorRgb: '168,85,247',
        bio: 'Bikash engineers the features that make Medsage work — from the retrieval pipeline and study analytics to the adaptive quiz engine. He brings fullstack depth and a builder\'s mindset to every part of the product.',
        linkedin: 'https://www.linkedin.com/in/bikash-yadav-0a3215291',
        github: 'https://github.com/Bikashydv1',
        email: 'ybikash919@gmail.com',
    },
    {
        name: 'Kapish Tuwani',
        role: 'Growth & Operations',
        tag: 'Data & Marketing',
        photo: '/Kapish_Tulwani.png',
        color: '#f59e0b',
        colorRgb: '245,158,11',
        bio: 'Skilled in Python, NumPy, Pandas, Matplotlib, and Scikit-learn. Kapish drives Medsage\'s growth strategy, partnerships, and outreach — connecting the platform with every aspiring doctor who needs it.',
        linkedin: 'https://www.linkedin.com/in/kapish-tuwani-211491371/',
        github: 'https://github.com/tuwanikapish-ctrl',
        email: 'kapishtuwani@gmail.com',
    },
];

function LinkedInIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>;
}
function GitHubIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>;
}
function MailIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
}

function FounderCard({ member, index, onClick }) {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onClick(member)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
        >
            <motion.div
                animate={{ y: hovered ? -10 : 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    borderRadius: 24, overflow: 'hidden',
                    height: 380, position: 'relative',
                    border: `1px solid rgba(${member.colorRgb},${hovered ? '0.3' : '0.08'})`,
                    boxShadow: hovered
                        ? `0 28px 64px rgba(0,0,0,0.55), 0 0 40px rgba(${member.colorRgb},0.14)`
                        : '0 4px 24px rgba(0,0,0,0.4)',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                    background: '#08080f',
                }}
            >
                {/* Photo */}
                <img
                    src={member.photo}
                    alt={member.name}
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover', objectPosition: 'center top',
                        transform: hovered ? 'scale(1.06)' : 'scale(1)',
                        transition: 'transform 0.55s ease',
                    }}
                />

                {/* Gradient */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to bottom, transparent 25%, rgba(6,6,14,0.55) 60%, rgba(6,6,14,0.97) 100%)`,
                }} />
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(145deg, rgba(${member.colorRgb},0.08) 0%, transparent 50%)`,
                }} />

                {/* Tag */}
                <div style={{
                    position: 'absolute', top: 14, left: 14,
                    padding: '4px 12px', borderRadius: 100,
                    background: 'rgba(0,0,0,0.6)',
                    border: `1px solid rgba(${member.colorRgb},0.45)`,
                    color: member.color,
                    fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
                    backdropFilter: 'blur(10px)',
                }}>{member.tag.toUpperCase()}</div>

                {/* Hover view badge */}
                <motion.div
                    animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 5 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'absolute', top: 14, right: 14, padding: '5px 12px', borderRadius: 100,
                        background: `rgba(${member.colorRgb},0.18)`, border: `1px solid rgba(${member.colorRgb},0.4)`,
                        color: member.color, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
                        backdropFilter: 'blur(8px)', pointerEvents: 'none',
                    }}
                >View ↗</motion.div>

                {/* Name / role */}
                <div style={{ position: 'absolute', bottom: 20, left: 18, right: 18 }}>
                    <h3 style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 18,
                        color: '#fff', margin: '0 0 5px', letterSpacing: '-0.3px',
                    }}>{member.name}</h3>
                    <p style={{
                        fontFamily: 'Inter, sans-serif', fontSize: 12,
                        color: member.color, fontWeight: 600, margin: 0, lineHeight: 1.4,
                    }}>{member.role}</p>
                </div>

                {/* Accent bar */}
                <motion.div
                    animate={{ scaleX: hovered ? 1 : 0.2, opacity: hovered ? 1 : 0.35 }}
                    transition={{ duration: 0.35 }}
                    style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg, ${member.color}, transparent)`,
                        transformOrigin: 'left',
                    }}
                />
            </motion.div>
        </motion.div>
    );
}

// Split-view Modal
export function SplitModal({ member, onClose }) {
    const isMobile = useIsMobile();
    if (!member) return null;

    return (
        <AnimatePresence>
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
                display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
                padding: isMobile ? '0' : '24px',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: isMobile ? 100 : 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: isMobile ? 100 : 10 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: isMobile ? '100%' : 860,
                        borderRadius: isMobile ? '20px 20px 0 0' : 24, overflow: isMobile ? 'auto' : 'hidden',
                        background: '#0a0a14',
                        border: `1px solid rgba(${member.colorRgb}, 0.25)`,
                        boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(${member.colorRgb},0.15)`,
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        position: 'relative',
                        maxHeight: isMobile ? '90vh' : 'none',
                    }}
                >
                    {/* Left/Top side: Photo */}
                    <div style={{
                        width: isMobile ? '100%' : '42%',
                        minHeight: isMobile ? 240 : 450,
                        position: 'relative',
                        background: `linear-gradient(135deg, rgba(${member.colorRgb},0.15), #0a0a14)`,
                        flexShrink: 0,
                    }}>
                        <img
                            src={member.photo}
                            alt={member.name}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover', objectPosition: 'center top',
                                display: 'block'
                            }}
                        />
                        {/* Edge fade */}
                        <div style={{
                            position: 'absolute',
                            ...(isMobile
                                ? { left: 0, right: 0, bottom: 0, height: 60, background: `linear-gradient(to bottom, transparent, #0a0a14)` }
                                : { right: 0, top: 0, bottom: 0, width: 40, background: `linear-gradient(to right, transparent, #0a0a14)` }),
                            pointerEvents: 'none',
                        }} />
                    </div>

                    {/* Right/Bottom side: Content */}
                    <div style={{
                        flex: 1,
                        padding: isMobile ? '24px 20px calc(env(safe-area-inset-bottom, 16px) + 24px)' : '44px 48px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                        {/* Close button */}
                        <button onClick={onClose} style={{
                            position: 'absolute', top: isMobile ? 12 : 20, right: isMobile ? 12 : 20,
                            width: 44, height: 44, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        >×</button>

                        <span style={{
                            display: 'inline-block', marginBottom: 14, alignSelf: 'flex-start',
                            padding: '6px 14px', borderRadius: 100,
                            background: `rgba(${member.colorRgb},0.1)`,
                            border: `1px solid rgba(${member.colorRgb},0.3)`,
                            fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700,
                            color: member.color, letterSpacing: '2px',
                        }}>{member.tag.toUpperCase()}</span>

                        <h3 style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: isMobile ? 24 : 32,
                            color: '#f8fafc', margin: '0 0 6px', letterSpacing: '-1px'
                        }}>{member.name}</h3>

                        <p style={{
                            fontFamily: 'Inter, sans-serif', fontSize: 15,
                            color: member.color, fontWeight: 600, margin: '0 0 24px'
                        }}>{member.role}</p>

                        <div style={{
                            height: 1, marginBottom: 24, width: '100%',
                            background: `linear-gradient(90deg, rgba(${member.colorRgb},0.3), transparent)`
                        }} />

                        <p style={{
                            fontFamily: 'Inter, sans-serif', fontSize: 16, lineHeight: 1.8,
                            color: 'rgba(255,255,255,0.7)', margin: '0 0 36px'
                        }}>{member.bio}</p>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 'auto' }}>
                            {[
                                { href: member.linkedin, icon: <LinkedInIcon />, label: 'LinkedIn', accent: true },
                                { href: member.github, icon: <GitHubIcon />, label: 'GitHub', accent: false },
                                { href: `mailto:${member.email}`, icon: <MailIcon />, label: 'Email', accent: false },
                            ].map(({ href, icon, label, accent }) => (
                                <a key={label} href={href} target="_blank" rel="noreferrer" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 100,
                                    background: accent ? `rgba(${member.colorRgb},0.15)` : 'rgba(255,255,255,0.06)',
                                    border: accent ? `1px solid rgba(${member.colorRgb},0.4)` : '1px solid rgba(255,255,255,0.12)',
                                    color: accent ? member.color : 'rgba(255,255,255,0.7)',
                                    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                                    transition: 'all 0.2s',
                                }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = accent ? `rgba(${member.colorRgb},0.25)` : 'rgba(255,255,255,0.12)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = accent ? `rgba(${member.colorRgb},0.15)` : 'rgba(255,255,255,0.06)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >{icon}{label}</a>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default function TeamSection() {
    const navigate = useNavigate();
    const [selected, setSelected] = useState(null);
    const isMobile = useIsMobile();

    return (
        <section id="team" style={{ padding: isMobile ? '60px 16px 80px' : '100px 32px 120px' }}>
            <div style={{ maxWidth: 1140, margin: '0 auto' }}>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    style={{ textAlign: 'center', marginBottom: 60 }}
                >
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        marginBottom: 16, padding: '7px 20px', borderRadius: 100,
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
                        color: '#a5b4fc', letterSpacing: '1.5px',
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                        THE FOUNDERS
                    </span>

                    <h2 style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 900, margin: '0 0 16px',
                        fontSize: 'clamp(34px, 5vw, 54px)', letterSpacing: '-1.5px', color: '#f8fafc',
                    }}>
                        Built by students,{' '}
                        <span style={{
                            background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
                            WebkitBackgroundClip: 'text', backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>for students</span>
                    </h2>

                    <p style={{
                        fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)',
                        maxWidth: 600, margin: '0 auto', fontSize: 17, lineHeight: 1.7,
                    }}>
                        Driven by a relentless obsession, we are engineering the definitive study platform to democratize elite medical education. We aren't just building a product - we're building the future of medical learning.
                    </p>
                </motion.div>

                {/* 4-card grid — no scroll */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 20,
                    marginBottom: 48,
                }}>
                    {FOUNDERS.map((m, i) => (
                        <FounderCard key={m.name} member={m} index={i} onClick={setSelected} />
                    ))}
                </div>

                {/* Meet full team CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{ textAlign: 'center' }}
                >
                    <motion.button
                        onClick={() => navigate('/team')}
                        whileHover={{ scale: 1.04, boxShadow: '0 16px 40px rgba(99,102,241,0.3)' }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            padding: '14px 36px', borderRadius: 100,
                            background: 'rgba(99,102,241,0.08)',
                            border: '1px solid rgba(99,102,241,0.25)',
                            color: '#a5b4fc',
                            fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 15,
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10,
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        Meet our entire team
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                    </motion.button>
                </motion.div>

            </div>

            {selected && <SplitModal member={selected} onClose={() => setSelected(null)} />}
        </section>
    );
}
