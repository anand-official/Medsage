import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../animations.css';

// ─── SVGs ────────────────────────────────────────────────────────────────
const IconGoogle = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const IconSparkles = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.12-6.12l-2.12 2.12M8.12 16.12l-2.12 2.12m14.12 0l-2.12-2.12M8.12 7.88L6 5.76" />
  </svg>
);

const IconBook = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const IconBrain = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

const features = [
  {
    icon: <IconSparkles />,
    color: '#f472b6', // vibrant pink
    title: 'Adaptive AI Plans',
    desc: 'Schedules that evolve based on your exact exam date and weak areas.'
  },
  {
    icon: <IconBook />,
    color: '#60a5fa', // vibrant blue
    title: 'Textbook Verified',
    desc: 'Zero hallucinations. Every response cited to core medical literature.'
  },
  {
    icon: <IconBrain />,
    color: '#34d399', // vibrant emerald
    title: 'SM-2 Repetition',
    desc: 'Scientifically proven flashcard algorithm for perfect memory recall.'
  }
];

// ─── COMPONENT ──────────────────────────────────────────────────────────
export default function SignIn() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090514', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
            @media (max-width: 900px) {
                .signin-left {
                    display: none !important;
                }
                .mobile-logo-only {
                    display: flex !important;
                }
            }
            @keyframes spinner {
                to { transform: rotate(360deg); }
            }
        `}</style>

      {/* VIBRANT LIVING BACKGROUND */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Grid Texture */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)'
        }} />

        {/* Glowing Orbs - High saturation */}
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.25, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-10%', left: '-10%',
            width: 800, height: 800, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 60%)',
            filter: 'blur(90px)',
          }}
        />
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute', bottom: '-20%', right: '-10%',
            width: 900, height: 900, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 60%)',
            filter: 'blur(100px)',
          }}
        />
        <motion.div
          animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.4, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          style={{
            position: 'absolute', top: '20%', left: '40%',
            width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 60%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Content Container (Full Width Split Screen) */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', width: '100%', minHeight: '100vh' }}>

        {/* FLOATING BACK BUTTON */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ position: 'absolute', top: 'max(env(safe-area-inset-top, 16px), 16px)', left: 16, zIndex: 100 }}
        >
          <div
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              background: 'rgba(255,255,255,0.05)', borderRadius: 100,
              border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
              cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Home
          </div>
        </motion.div>

        {/* Left Side: Branding & Features (Hidden on mobile) */}
        <div className="signin-left" style={{
          flex: 1.2, padding: '60px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, rgba(20, 15, 35, 0.45) 0%, rgba(20, 15, 35, 0.2) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          boxShadow: 'inset -2px 0 0 rgba(255,255,255,0.02)',
        }}>
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            {/* Logo Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 70, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{
                position: 'relative', width: 36, height: 36,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" fill="#ec4899" filter="drop-shadow(0 0 8px rgba(236,72,153,0.8))" />
                  <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#logo-grad-1)" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" stroke="url(#logo-grad-2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                  <defs>
                    <linearGradient id="logo-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#6366f1" />
                      <stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="logo-grad-2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ec4899" />
                      <stop offset="1" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span style={{ fontWeight: 900, fontSize: 26, letterSpacing: '-0.5px' }}>Medsage.ai</span>
            </div>

            <h1 style={{ fontSize: 'clamp(44px, 4.5vw, 64px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 24 }}>
              Your medical journey,<br />
              <span style={{
                background: 'linear-gradient(135deg, #a855f7, #ec4899, #f43f5e)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>expertly guided.</span>
            </h1>

            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', maxWidth: '480px', lineHeight: 1.7, marginBottom: 56 }}>
              Join the elite clinical intelligence platform designed strictly for medical students. No distractions, just high-yield mastering.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (idx * 0.1), duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', gap: 20, alignItems: 'center' }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 16,
                    background: `linear-gradient(135deg, ${feature.color}25, ${feature.color}05)`,
                    border: `1px solid ${feature.color}50`,
                    boxShadow: `0 8px 24px ${feature.color}20, inset 0 1px 0 ${feature.color}80`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: feature.color, flexShrink: 0,
                  }}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: '#f8fafc' }}>{feature.title}</h3>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5, maxWidth: 360 }}>{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Side: Sign In Form */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 4vw, 40px)',
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(30px)',
          position: 'relative',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '100%', maxWidth: 440,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 32, padding: 'clamp(28px, 5vw, 56px) clamp(24px, 5vw, 48px)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <div className="mobile-logo-only" style={{ display: 'none', justifyContent: 'center', marginBottom: 24, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))',
                border: '1px solid rgba(168,85,247,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" fill="#a855f7" filter="drop-shadow(0 0 6px rgba(168,85,247,0.8))" />
                  <path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="url(#mobile-logo-grad-1)" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M19.07 4.93l-4.24 4.24M9.17 14.83l-4.24 4.24" stroke="url(#mobile-logo-grad-2)" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                  <defs>
                    <linearGradient id="mobile-logo-grad-1" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#6366f1" />
                      <stop offset="1" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="mobile-logo-grad-2" x1="22" y1="2" x2="2" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ec4899" />
                      <stop offset="1" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            <h2 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Welcome back</h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', margin: '0 0 40px', lineHeight: 1.6 }}>
              Sign in to continue your Medsage journey.
            </p>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5', padding: '12px 16px', borderRadius: 12, fontSize: 14,
                    marginBottom: 24, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* VIBRANT GOOGLE BUTTON */}
            <motion.button
              onClick={handleGoogleSignIn}
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.03, boxShadow: '0 12px 30px rgba(255,255,255,0.25)' }}
              whileTap={{ scale: loading ? 1 : 0.97 }}
              style={{
                width: '100%', padding: '16px 24px', borderRadius: 16, minHeight: 52,
                background: '#ffffff',
                border: 'none',
                color: '#090514', fontSize: 17, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <div style={{ width: 22, height: 22, border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%', animation: 'spinner 1s linear infinite' }} />
              ) : (
                <>
                  <IconGoogle />
                  Continue with Google
                </>
              )}
            </motion.button>

            <div style={{ marginTop: 40, fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              By continuing, you agree to Medsage's<br />
              <a href="#" style={{ color: '#c084fc', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#e879f9'} onMouseLeave={e => e.target.style.color = '#c084fc'}>Terms of Service</a> &bull; <a href="#" style={{ color: '#c084fc', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#e879f9'} onMouseLeave={e => e.target.style.color = '#c084fc'}>Privacy Policy</a>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}