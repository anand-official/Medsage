import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── Responsive Styles (injected once) ──────────────────────────────────────
const RESPONSIVE_STYLE_ID = 'team-page-responsive';
function useResponsiveStyles() {
    useEffect(() => {
        if (document.getElementById(RESPONSIVE_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = RESPONSIVE_STYLE_ID;
        style.textContent = `
            .team-card-inner { height: 380px; }
            .team-back-btn-wrap { padding-top: 40px; margin-bottom: 80px; }
            .team-header { margin-bottom: 80px; }
            .team-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 22px;
                padding-bottom: 100px;
            }
            .team-modal-container {
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(0,0,0,0.85); backdrop-filter: blur(16px);
                display: flex; align-items: center; justify-content: center; padding: 24px;
            }
            .team-modal-content {
                width: 100%; max-width: 860px;
                border-radius: 24px; overflow: hidden;
                background: #0a0a14;
                display: flex; position: relative;
                flex-direction: row;
            }
            .team-modal-photo {
                width: 42%; min-height: 450px; position: relative;
            }
            .team-modal-fade {
                position: absolute; right: 0; bottom: 0;
                width: 40px; height: 100%;
                background: linear-gradient(to right, transparent, #0a0a14);
                pointer-events: none;
            }
            .team-modal-body {
                flex: 1; padding: 44px 48px;
                display: flex; flex-direction: column; justify-content: center; position: relative;
            }
            .team-modal-close {
                position: absolute; top: 20px; right: 20px;
                width: 44px; height: 44px; border-radius: 50%;
                background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                color: rgba(255,255,255,0.6); font-size: 22px;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; transition: all 0.2s; z-index: 10;
                min-width: 44px; min-height: 44px;
            }
            .team-modal-close:hover {
                background: rgba(255,255,255,0.1); color: #fff;
            }
            .team-modal-name { font-size: 32px; }

            @media (max-width: 900px) {
                .team-grid { grid-template-columns: repeat(2, 1fr); }
            }
            @media (max-width: 768px) {
                .team-card-inner { height: 300px; }
                .team-back-btn-wrap { padding-top: 20px; margin-bottom: 40px; }
                .team-header { margin-bottom: 40px; }
                .team-modal-container {
                    align-items: flex-end; padding: 0;
                }
                .team-modal-content {
                    flex-direction: column;
                    max-height: 90vh; overflow-y: auto;
                    border-radius: 24px 24px 0 0;
                    max-width: 100%;
                }
                .team-modal-photo {
                    width: 100%; min-height: 260px;
                }
                .team-modal-fade {
                    width: 100%; height: 40px;
                    right: 0; bottom: 0; top: auto; left: 0;
                    background: linear-gradient(to bottom, transparent, #0a0a14);
                }
                .team-modal-body {
                    padding: 24px 20px 32px;
                }
                .team-modal-name { font-size: 26px; }
            }
            @media (max-width: 560px) {
                .team-grid { grid-template-columns: 1fr; }
            }
        `;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, []);
}

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
        hidden: true,
        name: 'Koyna Dutta',
        role: 'Product & Design',
        tag: 'Product & Design',
        photo: '/koyna_dutta.jpeg',
        color: '#ec4899',
        colorRgb: '236,72,153',
        bio: 'Koyna brings creativity and technical depth to Medsage — crafting experiences that are as intuitive as they are impactful. She thrives at the intersection of design and engineering, turning ideas into features that students genuinely enjoy using.',
        linkedin: 'https://www.linkedin.com/in/koyna-dutta-54b050210/',
        github: 'https://github.com/koynadutta',
        email: '',
    },
    {
        hidden: true,
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
        hidden: true,
        name: 'Kapish Tuwani',
        role: 'Data & Platform Engineer',
        tag: 'Data & Platform',
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
                className="team-card-inner"
                animate={{ y: hovered ? -10 : 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    borderRadius: 24, overflow: 'hidden', position: 'relative',
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
            <div onClick={onClose} className="team-modal-container">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    onClick={e => e.stopPropagation()}
                    className="team-modal-content"
                    style={{
                        border: `1px solid rgba(${member.colorRgb}, 0.25)`,
                        boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(${member.colorRgb},0.15)`,
                    }}
                >
                    {/* Left side: Photo */}
                    <div className="team-modal-photo" style={{
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
                        <div className="team-modal-fade" />
                    </div>

                    {/* Right side: Content */}
                    <div className="team-modal-body">
                        {/* Close button */}
                        <button onClick={onClose} className="team-modal-close">×</button>

                        <span style={{
                            display: 'inline-block', marginBottom: 14, alignSelf: 'flex-start',
                            padding: '6px 14px', borderRadius: 100,
                            background: `rgba(${member.colorRgb},0.1)`,
                            border: `1px solid rgba(${member.colorRgb},0.3)`,
                            fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700,
                            color: member.color, letterSpacing: '2px',
                        }}>{member.tag.toUpperCase()}</span>

                        <h3 className="team-modal-name" style={{
                            fontFamily: 'Inter, sans-serif', fontWeight: 900,
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
    useResponsiveStyles();

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

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 1140, margin: '0 auto', padding: '0 clamp(16px, 4vw, 32px)' }}>

                {/* Back button */}
                <div className="team-back-btn-wrap">
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
                    className="team-header"
                    style={{ textAlign: 'center' }}
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
                        Medsage.ai
                    </h1>

                    <p style={{
                        fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.6)',
                        maxWidth: 700, margin: '0 auto', fontSize: 18, lineHeight: 1.7,
                    }}>
                        We are a relentless collective of students and engineers united by a singular obsession: to democratize elite medical education. We saw a broken system, and now we are engineering the definitive platform to fix it.
                    </p>
                </motion.div>

                {/* Responsive team grid */}
                <div className="team-grid">
                    {TEAM.filter(m => !m.hidden).map((m, i) => <TeamCard key={m.name} member={m} index={i} onClick={setSelected} />)}
                </div>

            </div>

            {selected && <Modal member={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
