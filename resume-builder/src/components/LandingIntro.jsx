import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const TOTAL_MS = 4800;

/* ── Social icons ─────────────────────────────────────────────── */
function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.184 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.2 22 16.447 22 12.021 22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}

/* ── Social button — decorative only, not clickable or navigable ── */
function SocialBtn({ icon }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 44, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 12,
        border: `1.5px solid ${hovered ? '#A5B4FC' : '#E5E7EB'}`,
        background: hovered ? '#EEF2FF' : '#ffffff',
        color: hovered ? '#4F46E5' : '#6B7280',
        transform: hovered ? 'scale(1.13) translateY(-2px)' : 'scale(1)',
        boxShadow: hovered
          ? '0 0 0 4px rgba(99,102,241,.14), 0 8px 20px rgba(79,70,229,.18)'
          : '0 1px 4px rgba(0,0,0,.06)',
        transition: 'all .22s cubic-bezier(.4,0,.2,1)',
        cursor: 'default',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {icon}
    </div>
  );
}

/* ── Mini resume skeleton line ────────────────────────────────── */
function SkeletonLine({ width = '100%', height = 6, color = '#E5E7EB', style = {} }) {
  return (
    <div style={{
      height,
      width,
      borderRadius: 4,
      background: color,
      ...style,
    }} />
  );
}

/* ── Mini resume section ──────────────────────────────────────── */
function MiniSection({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <span style={{
          fontSize: 6.5, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: 1, color: '#9CA3AF',
        }}>{title}</span>
        <div style={{ flex: 1, height: 0.5, background: '#D1D5DB' }} />
      </div>
      {children}
    </motion.div>
  );
}

/* ── Main LandingIntro component ──────────────────────────────── */
export default function LandingIntro({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [phase, setPhase] = useState(0);
  const doneRef = useRef(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setTimeout(onComplete, 700);
  };

  useEffect(() => {
    const start = Date.now();

    // Phase timers — resume sections appear one by one
    const timers = [
      setTimeout(() => setPhase(1), 150),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1100),
      setTimeout(() => setPhase(4), 1600),
      setTimeout(() => setPhase(5), 2100),
      setTimeout(() => setPhase(6), 2600),
    ];

    // Smooth progress via rAF
    let raf;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / TOTAL_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.015 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(145deg, #ffffff 0%, #F8FAFC 55%, #EEF2FF 100%)',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            overflow: 'hidden',
          }}
        >
          {/* ── Decorative blobs ────────────────────────────── */}
          <div style={{
            position: 'absolute', top: -120, right: -120,
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -80, left: -80,
            width: 320, height: 320, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* ── Skip button ──────────────────────────────────── */}
          <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 20 }}>
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              onClick={finish}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px',
                background: 'rgba(255,255,255,.85)',
                backdropFilter: 'blur(10px)',
                border: '1.5px solid #E5E7EB',
                borderRadius: 20,
                fontSize: 12.5, fontWeight: 600,
                color: '#6B7280', cursor: 'pointer',
                transition: 'all .18s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4F46E5';
                e.currentTarget.style.color = '#4F46E5';
                e.currentTarget.style.background = '#EEF2FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.color = '#6B7280';
                e.currentTarget.style.background = 'rgba(255,255,255,.85)';
              }}
            >
              Skip Intro
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </motion.button>
          </div>

          {/* ── Main body ────────────────────────────────────── */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? 0 : 72,
            padding: isMobile ? '60px 24px 24px' : '40px 60px',
            flexDirection: isMobile ? 'column' : 'row',
          }}>

            {/* ── Left: animated mini resume ───────────────── */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0, x: -40, rotate: -2 }}
                animate={{ opacity: 1, x: 0, rotate: -1 }}
                transition={{ duration: 0.7, delay: 0.1, type: 'spring', stiffness: 120, damping: 20 }}
                style={{
                  width: 230,
                  background: '#fff',
                  borderRadius: 14,
                  boxShadow: '0 2px 4px rgba(0,0,0,.04), 0 20px 60px rgba(0,0,0,.12), 0 1px 0 rgba(0,0,0,.02)',
                  padding: '22px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  flexShrink: 0,
                  border: '1px solid rgba(0,0,0,.06)',
                  position: 'relative',
                }}
              >
                {/* Page corner fold */}
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 0, height: 0,
                  borderStyle: 'solid',
                  borderWidth: '0 18px 18px 0',
                  borderColor: `transparent #EEF2FF transparent transparent`,
                }} />

                {/* Name block */}
                {phase >= 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <SkeletonLine width="58%" height={12} color="#1F2937" style={{ marginBottom: 5, borderRadius: 3 }} />
                    <SkeletonLine width="82%" height={5} color="#D1D5DB" />
                  </motion.div>
                )}

                {/* Divider */}
                {phase >= 2 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    style={{ height: 0.75, background: '#E5E7EB', transformOrigin: 'left' }}
                  />
                )}

                {/* Summary */}
                {phase >= 3 && (
                  <MiniSection title="Summary">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                      <SkeletonLine width="100%" height={5} />
                      <SkeletonLine width="90%" height={5} />
                      <SkeletonLine width="74%" height={5} />
                    </div>
                  </MiniSection>
                )}

                {/* Skills */}
                {phase >= 4 && (
                  <MiniSection title="Skills">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {['React', 'Node.js', 'Python', 'AWS', 'Docker', 'TypeScript'].map((s, i) => (
                        <motion.div
                          key={s}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06, duration: 0.25 }}
                          style={{
                            padding: '2px 7px',
                            fontSize: 7,
                            fontWeight: 600,
                            background: '#EEF2FF',
                            color: '#4338CA',
                            borderRadius: 20,
                            border: '1px solid #C7D2FE',
                          }}
                        >{s}</motion.div>
                      ))}
                    </div>
                  </MiniSection>
                )}

                {/* Experience */}
                {phase >= 5 && (
                  <MiniSection title="Experience">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <SkeletonLine width="52%" height={6} color="#374151" />
                        <SkeletonLine width="24%" height={6} color="#D1D5DB" />
                      </div>
                      {[100, 88, 76].map((w, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                          <SkeletonLine width={`${w}%`} height={4.5} />
                        </motion.div>
                      ))}
                    </div>
                  </MiniSection>
                )}

                {/* Projects */}
                {phase >= 6 && (
                  <MiniSection title="Projects">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <SkeletonLine width="50%" height={6} color="#374151" style={{ marginBottom: 3 }} />
                      <SkeletonLine width="92%" height={4.5} />
                      <SkeletonLine width="78%" height={4.5} />
                    </div>
                  </MiniSection>
                )}
              </motion.div>
            )}

            {/* ── Right: branding ──────────────────────────── */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isMobile ? 'center' : 'flex-start',
              textAlign: isMobile ? 'center' : 'left',
              maxWidth: 400,
            }}>
              {/* Logo icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 180, damping: 16 }}
                style={{
                  width: 60, height: 60,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, fontWeight: 800, color: '#fff',
                  boxShadow: '0 4px 24px rgba(79,70,229,.40), 0 1px 0 rgba(255,255,255,.2) inset',
                  marginBottom: 22,
                  userSelect: 'none',
                }}
              >R</motion.div>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{
                  margin: '0 0 10px',
                  fontSize: isMobile ? 34 : 42,
                  fontWeight: 800,
                  color: '#0F172A',
                  lineHeight: 1.12,
                  letterSpacing: '-1.5px',
                }}
              >
                Resume{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5, #7C3AED)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Builder AI</span>
              </motion.h1>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.45 }}
                style={{
                  margin: '0 0 30px',
                  fontSize: 15,
                  color: '#64748B',
                  lineHeight: 1.65,
                  fontWeight: 400,
                }}
              >
                Build professional, ATS-ready resumes<br />
                with AI assistance — in minutes.
              </motion.p>

              {/* Social icons */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 38,
                  paddingBottom: 16,
                }}
              >
                <SocialBtn href="https://github.com"   label="GitHub"    icon={<GithubIcon />} />
                <SocialBtn href="https://linkedin.com" label="LinkedIn"  icon={<LinkedInIcon />} />
                <SocialBtn href="#"                    label="Portfolio" icon={<GlobeIcon />} />
                <SocialBtn href="mailto:"              label="Email"     icon={<EmailIcon />} />
              </motion.div>

              {/* Progress */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
                style={{ width: '100%', maxWidth: 340 }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: 8,
                  fontSize: 12, fontWeight: 600, color: '#94A3B8',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#10B981',
                      boxShadow: '0 0 0 2px rgba(16,185,129,.2)',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite',
                    }} />
                    Preparing your workspace…
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(progress)}%</span>
                </div>

                {/* Progress track */}
                <div style={{
                  height: 5,
                  background: '#E2E8F0',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #6366F1, #4F46E5, #7C3AED)',
                    borderRadius: 10,
                    transition: 'width 0.08s linear',
                    boxShadow: '0 0 10px rgba(99,102,241,.5)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Shimmer */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.35) 50%, transparent 100%)',
                      animation: 'shimmer 1.4s ease infinite',
                      backgroundSize: '200% 100%',
                    }} />
                  </div>
                </div>

                {/* Phase label */}
                <div style={{ marginTop: 8, fontSize: 11.5, color: '#CBD5E1', fontWeight: 500 }}>
                  {phase < 3 && 'Setting up editor…'}
                  {phase === 3 && 'Loading summary…'}
                  {phase === 4 && 'Loading skills…'}
                  {phase === 5 && 'Loading experience…'}
                  {phase >= 6 && 'Almost ready…'}
                </div>
              </motion.div>
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────── */}
          <motion.footer
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1 }}
            style={{
              textAlign: 'center',
              padding: '16px 24px 20px',
              fontSize: 13,
              color: '#CBD5E1',
              fontWeight: 500,
              letterSpacing: '0.2px',
              flexShrink: 0,
            }}
          >
            ~ Built by Dev &amp; Preet
          </motion.footer>

          {/* ── Inline keyframes ─────────────────────────────── */}
          <style>{`
            @keyframes shimmer {
              0%   { background-position: -200% 0; }
              100% { background-position:  200% 0; }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
