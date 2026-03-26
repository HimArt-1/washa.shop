import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { studioAsset } from '../lib/assets';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-washa-bg flex items-center justify-center overflow-hidden"
        >
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-40" />

          {/* Ambient Orbs */}
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-washa-gold/5 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-washa-gold-deep/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

          {/* Floating Particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-washa-gold/30"
              style={{
                left: `${20 + i * 12}%`,
                top: `${30 + (i % 3) * 15}%`,
              }}
              initial={{ opacity: 0, y: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                y: [-20, -100],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeOut',
              }}
            />
          ))}

          <div className="flex flex-col items-center space-y-8 relative z-10">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="w-36 h-36 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(201,168,106,0.5)] overflow-hidden">
                <img src={studioAsset('washa-logo.png')} alt="وشّى" className="w-full h-full object-cover" />
              </div>
              {/* Glow Rings */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1.5 + i * 0.4, opacity: 0 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                    delay: i * 0.3,
                  }}
                  className="absolute inset-0 rounded-full border border-washa-gold/20"
                />
              ))}
            </motion.div>

            {/* Brand Name */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-3"
            >
              <h1 className="font-serif text-6xl tracking-[0.15em] text-washa-gold">وشّى</h1>
              <p className="text-sm text-washa-text-faint tracking-[0.4em] uppercase">DTF Studio</p>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 128 }}
              transition={{ delay: 0.8, duration: 0.4 }}
              className="h-[2px] bg-washa-surface rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="h-full w-full bg-gradient-to-r from-transparent via-washa-gold to-transparent"
              />
            </motion.div>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="text-xs text-washa-text-faint/50 tracking-widest"
            >
              صمم · أبدع · اطبع
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
