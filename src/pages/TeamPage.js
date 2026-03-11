import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── Canvas Particles Background ──────────────────────────────────────────
function CanvasParticles() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        let particles = [];
        const particleCount = 70;

        const mouse = { x: null, y: null, radius: 150 };
        const handleMouseMove = (e) => { mouse.x = e.x; mouse.y = e.y; };
        const handleMouseLeave = () => { mouse.x = null; mouse.y = null; };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);
        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init();
        });

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.size = Math.random() * 1.5 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.4;
                this.speedY = (Math.random() - 0.5) * 0.4;
                this.baseX = this.x;
                this.baseY = this.y;
                const colors = ['rgba(99, 102, 241, 0.4)', 'rgba(168, 85, 247, 0.4)', 'rgba(236, 72, 153, 0.4)'];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > width) this.x = 0;
                else if (this.x < 0) this.x = width;
                if (this.y > height) this.y = 0;
                else if (this.y < 0) this.y = height;

                if (mouse.x != null && mouse.y != null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < mouse.radius) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const force = (mouse.radius - distance) / mouse.radius;
                        this.x -= forceDirectionX * force * 2;
                        this.y -= forceDirectionY * force * 2;
                    }
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        function init() {
            particles = [];
            for (let i = 0; i < particleCount; i++) particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                for (let j = i; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(168, 85, 247, ${0.12 * (1 - dist / 100)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        }

        init();
        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed', inset: 0, zIndex: 0,
                pointerEvents: 'none', background: 'transparent'
            }}
        />
    );
}

const TEAM = [
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
        name: 'Shagun Vyas',
        role: 'Co-Founder & Product Lead',
        tag: 'UX & Growth',
        photo: '/Shagun_vyas.png',
        color: '#ec4899',
        colorRgb: '236,72,153',
        bio: 'A versatile problem-solver who rarely stays in one lane. Curiosity drives Shagun to explore far beyond routine responsibilities — continuously expanding her skills and stepping confidently beyond familiar boundaries to shape a product students actually love.',
        linkedin: 'https://www.linkedin.com/in/shagun-vyas',
        github: 'https://github.com/shagunvyas',
        email: 'shagun.vyas217@gmail.com',
    },
    {
        name: 'Ashwini Kumar',
        role: 'Co-Founder & AI Lead',
        tag: 'ML & Analytics',
        photo: '/ashwii_kumar.jpeg',
        color: '#10b981',
        colorRgb: '16,185,129',
        bio: 'Second-year Information Science Engineering student at CMR Institute of Technology, Bengaluru. With a sharp focus on Data Science and Machine Learning, Ashwini brings data-driven problem solving and analytical precision to everything Medsage builds.',
        linkedin: 'https://www.linkedin.com/in/ashwinikumar2006/',
        github: 'https://github.com/theashwinikumar',
        email: 'kumarshahashwini012@gmail.com',
    },
    {
        name: 'Bikash Yadav',
        role: 'Developer',
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

function TeamCard({ member, index, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onClick(member)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
        >
            <motion.div
                animate={{ y: hovered ? -10 : 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    borderRadius: 24, overflow: 'hidden', height: 380, position: 'relative',
                    border: `1px solid rgba(${member.colorRgb},${hovered ? '0.35' : '0.1'})`,
                    boxShadow: hovered ? `0 28px 64px rgba(0,0,0,0.5), 0 0 40px rgba(${member.colorRgb},0.15)` : '0 4px 24px rgba(0,0,0,0.4)',
                    transition: 'border-color 0.3s, box-shadow 0.3s', background: '#08080f',
                }}
            >
                <img src={member.photo} alt={member.name} style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center top',
                    transform: hovered ? 'scale(1.07)' : 'scale(1)', transition: 'transform 0.55s ease',
                }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 25%, rgba(6,6,14,0.6) 62%, rgba(6,6,14,0.97) 100%)` }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(145deg, rgba(${member.colorRgb},0.08) 0%, transparent 50%)` }} />

                <div style={{
                    position: 'absolute', top: 14, left: 14, padding: '4px 12px', borderRadius: 100,
                    background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(${member.colorRgb},0.45)`,
                    color: member.color, fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '1.2px',
                    backdropFilter: 'blur(10px)',
                }}>{member.tag.toUpperCase()}</div>

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

                <div style={{ position: 'absolute', bottom: 20, left: 18, right: 18 }}>
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 18, color: '#fff', margin: '0 0 5px', letterSpacing: '-0.3px' }}>{member.name}</h3>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: member.color, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>{member.role}</p>
                </div>
                <motion.div
                    animate={{ scaleX: hovered ? 1 : 0.2, opacity: hovered ? 1 : 0.35 }}
                    transition={{ duration: 0.35 }}
                    style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${member.color}, transparent)`, transformOrigin: 'left' }}
                />
            </motion.div>
        </motion.div>
    );
}

// Split-view Modal
function Modal({ member, onClose }) {
    if (!member) return null;

    return (
        <AnimatePresence>
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: 860,
                        borderRadius: 24, overflow: 'hidden',
                        background: '#0a0a14',
                        border: `1px solid rgba(${member.colorRgb}, 0.25)`,
                        boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(${member.colorRgb},0.15)`,
                        display: 'flex',
                        position: 'relative',
                        flexDirection: window.innerWidth < 768 ? 'column' : 'row'
                    }}
                >
                    {/* Left side: Photo */}
                    <div style={{
                        width: window.innerWidth < 768 ? '100%' : '42%',
                        minHeight: window.innerWidth < 768 ? 300 : 450,
                        position: 'relative',
                        background: `linear-gradient(135deg, rgba(${member.colorRgb},0.15), #0a0a14)`
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
                        {/* Edge fade for seamless blend */}
                        <div style={{
                            position: 'absolute',
                            right: window.innerWidth < 768 ? 0 : 0,
                            bottom: window.innerWidth < 768 ? 0 : 0,
                            width: window.innerWidth < 768 ? '100%' : 40,
                            height: window.innerWidth < 768 ? 40 : '100%',
                            background: window.innerWidth < 768
                                ? `linear-gradient(to bottom, transparent, #0a0a14)`
                                : `linear-gradient(to right, transparent, #0a0a14)`,
                            pointerEvents: 'none',
                        }} />
                    </div>

                    {/* Right side: Content */}
                    <div style={{
                        flex: 1,
                        padding: window.innerWidth < 768 ? '24px 32px 32px' : '44px 48px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                        {/* Close button */}
                        <button onClick={onClose} style={{
                            position: 'absolute', top: 20, right: 20,
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s', zIndex: 10,
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
                            fontFamily: 'Inter, sans-serif', fontWeight: 900,
                            fontSize: window.innerWidth < 768 ? 26 : 32,
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
                                >
                                    {icon}{label}
                                </a>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default function TeamPage() {
    const navigate = useNavigate();
    const [selected, setSelected] = useState(null);

    return (
        <div style={{ background: '#040406', minHeight: '100vh', color: '#f8fafc', overflowX: 'hidden' }}>
            {/* Living Background Effects */}
            <CanvasParticles />

            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                {/* Purple core glow */}
                <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, rgba(168,85,247,0.06) 0%, transparent 60%)', filter: 'blur(80px)' }} />
                {/* Blue edge glow */}
                <div style={{ position: 'absolute', top: '60%', left: '-10%', width: '50vw', height: '50vh', background: 'radial-gradient(circle at center, rgba(99,102,241,0.04) 0%, transparent 60%)', filter: 'blur(60px)' }} />
                {/* Grid overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)',
                }} />
            </div>

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 1140, margin: '0 auto', padding: '0 32px' }}>

                {/* Back button */}
                <div style={{ paddingTop: 40, marginBottom: 80 }}>
                    <motion.button
                        onClick={() => navigate('/landing')}
                        whileHover={{ x: -4 }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                            fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer', padding: 0,
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                        Back to home
                    </motion.button>
                </div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    style={{ textAlign: 'center', marginBottom: 80 }}
                >
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        marginBottom: 20, padding: '7px 20px', borderRadius: 100,
                        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                        fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
                        color: '#a5b4fc', letterSpacing: '1.5px',
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                        THE MEDSAGE TEAM
                    </span>

                    <h1 style={{
                        fontFamily: 'Inter, sans-serif', fontWeight: 900, margin: '0 0 20px',
                        fontSize: 'clamp(40px, 6vw, 68px)', letterSpacing: '-2px', color: '#f8fafc', lineHeight: 1.05,
                    }}>
                        The people{' '}
                        <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            behind
                        </span>{' '}
                        Medsage
                    </h1>

                    <p style={{
                        fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)',
                        maxWidth: 700, margin: '0 auto', fontSize: 18, lineHeight: 1.7,
                    }}>
                        We are a relentless collective of students and engineers united by a singular obsession: to democratize elite medical education. We saw a broken system, and now we are engineering the definitive platform to fix it.
                    </p>
                </motion.div>

                {/* 3+2 grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22, marginBottom: 22 }}>
                    {TEAM.slice(0, 3).map((m, i) => <TeamCard key={m.name} member={m} index={i} onClick={setSelected} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 22, maxWidth: 760, margin: '0 auto', paddingBottom: 100 }}>
                    {TEAM.slice(3).map((m, i) => <TeamCard key={m.name} member={m} index={i + 3} onClick={setSelected} />)}
                </div>

            </div>

            {selected && <Modal member={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
