import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { siteAsset } from '../lib/assets';

// 14 particles — varied size, speed, position, and lateral drift
const PARTICLES = [
  { x: 7,  size: 2.5, delay: 0.5,  speed: 5.2, drift:  9 },
  { x: 16, size: 1.5, delay: 1.0,  speed: 4.4, drift: -6 },
  { x: 26, size: 1,   delay: 0.25, speed: 6.1, drift:  13 },
  { x: 35, size: 3,   delay: 1.4,  speed: 4.9, drift: -9 },
  { x: 44, size: 1.5, delay: 0.7,  speed: 5.7, drift:  7 },
  { x: 52, size: 1,   delay: 1.15, speed: 4.3, drift: -11 },
  { x: 61, size: 2,   delay: 0.35, speed: 5.9, drift:  10 },
  { x: 69, size: 2.5, delay: 0.85, speed: 4.7, drift: -7 },
  { x: 77, size: 1,   delay: 1.55, speed: 5.5, drift:  8 },
  { x: 84, size: 1.5, delay: 0.55, speed: 5.0, drift: -13 },
  { x: 91, size: 2,   delay: 1.05, speed: 5.1, drift:  6 },
  { x: 13, size: 1,   delay: 1.75, speed: 6.3, drift: -5 },
  { x: 57, size: 2,   delay: 0.75, speed: 5.6, drift:  12 },
  { x: 73, size: 1.5, delay: 1.45, speed: 4.5, drift: -10 },
];

// Easing for the brush stroke reveal
const BRUSH_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.07, filter: 'blur(12px)' }}
          transition={{ duration: 0.75, ease: [0.4, 0, 0.6, 1] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden select-none"
          style={{ background: '#060607' }}
        >
          {/* Subtle grid texture */}
          <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

          {/* Central radial atmosphere — blooms in with the logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 2.2, delay: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 65% 50% at 50% 46%, rgba(201,168,106,0.09) 0%, transparent 70%)',
            }}
          />

          {/* Top-right warm bloom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.8, delay: 0.5 }}
            className="absolute pointer-events-none"
            style={{
              top: '-8%', right: '-4%',
              width: '55vw', height: '55vw',
              maxWidth: 580, maxHeight: 580,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(201,168,106,0.07) 0%, transparent 68%)',
              filter: 'blur(50px)',
            }}
          />

          {/* Bottom-left cool bloom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.8, delay: 0.8 }}
            className="absolute pointer-events-none"
            style={{
              bottom: '-12%', left: '-8%',
              width: '48vw', height: '48vw',
              maxWidth: 500, maxHeight: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(142,107,53,0.06) 0%, transparent 68%)',
              filter: 'blur(50px)',
            }}
          />

          {/* ── Floating particles ── */}
          {PARTICLES.map((p, i) => (
            <motion.span
              key={i}
              className="absolute bottom-0 rounded-full pointer-events-none"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                background:
                  i % 4 === 0 ? 'rgba(226,196,142,0.72)' :
                  i % 4 === 1 ? 'rgba(201,168,106,0.52)' :
                  i % 4 === 2 ? 'rgba(255,255,255,0.28)' :
                               'rgba(201,168,106,0.38)',
                boxShadow:
                  i % 3 === 0 ? `0 0 ${p.size * 3.5}px rgba(201,168,106,0.55)` : 'none',
              }}
              initial={{ y: 0, x: 0, opacity: 0 }}
              animate={{ y: -920, x: p.drift, opacity: [0, 0.95, 0.95, 0] }}
              transition={{
                duration: p.speed,
                delay: p.delay,
                repeat: Infinity,
                ease: 'linear',
                opacity: { times: [0, 0.04, 0.88, 1] },
              }}
            />
          ))}

          {/* ══════════════ Main content ══════════════ */}
          <div
            className="relative z-10 flex flex-col items-center"
            style={{ gap: '2.25rem' }}
          >
            {/* ── Logo ring system ── */}
            <motion.div
              initial={{ y: 28, opacity: 0, scale: 0.84 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.95, ease: BRUSH_EASE }}
              className="relative"
              style={{ width: 168, height: 168 }}
            >
              {/* Distant glow bloom */}
              <span
                className="absolute pointer-events-none"
                style={{
                  inset: '-40%',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(201,168,106,0.16) 0%, transparent 62%)',
                  filter: 'blur(18px)',
                }}
              />

              {/* 4 expanding pulse rings */}
              {[0, 1, 2, 3].map(i => (
                <motion.span
                  key={i}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: '1px solid rgba(201,168,106,0.14)' }}
                  initial={{ scale: 0.65, opacity: 0 }}
                  animate={{ scale: 2.4 + i * 0.28, opacity: 0 }}
                  transition={{
                    duration: 2.9,
                    repeat: Infinity,
                    delay: 0.35 + i * 0.62,
                    ease: 'easeOut',
                  }}
                />
              ))}

              {/* Static outer trim ring */}
              <motion.span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ border: '1px solid rgba(201,168,106,0.09)' }}
                initial={{ scale: 0.78, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.65, delay: 0.18 }}
              />

              {/* Mid ring */}
              <motion.span
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: 10,
                  border: '1px solid rgba(201,168,106,0.17)',
                }}
                initial={{ scale: 0.72, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.22 }}
              />

              {/* Main circle — gold gradient face */}
              <motion.span
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: 18,
                  background:
                    'linear-gradient(148deg, rgba(201,168,106,0.24) 0%, rgba(10,10,11,0.97) 100%)',
                  border: '1px solid rgba(201,168,106,0.28)',
                  boxShadow:
                    '0 0 52px rgba(201,168,106,0.2), 0 0 100px rgba(201,168,106,0.06), inset 0 1px 0 rgba(255,255,255,0.07)',
                }}
                initial={{ scale: 0.68, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.75, delay: 0.16, ease: BRUSH_EASE }}
              />

              {/* Logo image chamber */}
              <motion.div
                className="absolute rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  inset: 27,
                  background:
                    'radial-gradient(circle at 31% 31%, rgba(255,255,255,0.065), rgba(7,7,8,0.98) 68%)',
                  border: '1px solid rgba(255,255,255,0.045)',
                }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.28, ease: BRUSH_EASE }}
              >
                <img
                  src={siteAsset('logo.png')}
                  alt="وشّى"
                  draggable={false}
                  style={{
                    width: '70%',
                    height: '70%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 8px 22px rgba(0,0,0,0.55))',
                  }}
                />
              </motion.div>
            </motion.div>

            {/* ── Typography block ── */}
            <div className="flex flex-col items-center" style={{ gap: '0.85rem' }}>

              {/* Eyebrow: WASHA */}
              <motion.p
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.52 }}
                style={{
                  fontSize: '8.5px',
                  letterSpacing: '0.62em',
                  color: 'rgba(201,168,106,0.48)',
                  textTransform: 'uppercase',
                  fontWeight: 300,
                }}
              >
                WASHA
              </motion.p>

              {/* ─ وشّى — calligraphy brush-stroke reveal (RTL: reveals right → left) ─ */}
              <div style={{ position: 'relative', isolation: 'isolate' }}>
                {/* Clip wrapper */}
                <div style={{ overflow: 'hidden', borderRadius: 2 }}>
                  <motion.h1
                    initial={{ clipPath: 'inset(0 0 0 100%)' }}
                    animate={{ clipPath: 'inset(0 0 0 0%)' }}
                    transition={{ delay: 0.72, duration: 0.98, ease: BRUSH_EASE }}
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 'clamp(2.8rem, 9vw, 4.5rem)',
                      fontWeight: 400,
                      color: '#C9A86A',
                      letterSpacing: '0.14em',
                      lineHeight: 1.05,
                      margin: 0,
                      textShadow:
                        '0 0 36px rgba(201,168,106,0.38), 0 0 72px rgba(201,168,106,0.12)',
                    }}
                  >
                    وشّى
                  </motion.h1>
                </div>

                {/* Trailing glow travels right → left with the pen */}
                <motion.span
                  initial={{ right: '-2%', opacity: 1 }}
                  animate={{ right: '103%', opacity: 0 }}
                  transition={{ delay: 0.72, duration: 0.98, ease: BRUSH_EASE }}
                  style={{
                    position: 'absolute',
                    top: '-10%',
                    bottom: '-10%',
                    width: '38%',
                    background:
                      'linear-gradient(to left, rgba(226,196,142,0.42) 0%, rgba(201,168,106,0.18) 55%, transparent 100%)',
                    filter: 'blur(10px)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* DTF Studio — tracks out */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.16, duration: 0.72, ease: 'easeOut' }}
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.32em',
                  color: 'rgba(245,239,228,0.58)',
                  textTransform: 'uppercase',
                  fontWeight: 300,
                }}
              >
                DTF STUDIO
              </motion.p>

              {/* Divider line — draws from center out */}
              <motion.span
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 1.44, duration: 0.62, ease: 'easeOut' }}
                style={{
                  display: 'block',
                  height: 1,
                  width: 88,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(201,168,106,0.55) 50%, transparent 100%)',
                  transformOrigin: 'center',
                }}
              />

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.64, duration: 0.56 }}
                style={{
                  fontSize: '9.5px',
                  letterSpacing: '0.22em',
                  color: 'rgba(245,239,228,0.3)',
                  textAlign: 'center',
                }}
              >
                تهيئة بيئة التصميم الاحترافية
              </motion.p>
            </div>

            {/* ── Segmented progress indicator ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.92 }}
              className="flex items-center"
              style={{ gap: '6px' }}
            >
              {[0, 1, 2, 3].map(i => (
                <motion.span
                  key={i}
                  initial={{ scaleX: 0, opacity: 0.25 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{
                    delay: 2.02 + i * 0.22,
                    duration: 0.38,
                    ease: 'easeOut',
                  }}
                  style={{
                    display: 'block',
                    height: 2,
                    width: i === 3 ? 32 : 22,
                    borderRadius: 999,
                    background:
                      i < 3
                        ? 'linear-gradient(90deg, rgba(201,168,106,0.55), rgba(226,196,142,0.92))'
                        : 'linear-gradient(90deg, rgba(201,168,106,0.28), rgba(201,168,106,0.52))',
                    boxShadow: '0 0 7px rgba(201,168,106,0.38)',
                    transformOrigin: 'left',
                  }}
                />
              ))}
            </motion.div>

            {/* ── Tagline ── */}
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.72, duration: 0.62 }}
              style={{
                fontSize: '8px',
                letterSpacing: '0.44em',
                color: 'rgba(245,239,228,0.22)',
                marginTop: '-0.75rem',
              }}
            >
              صمم · أبدع · اطبع
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
