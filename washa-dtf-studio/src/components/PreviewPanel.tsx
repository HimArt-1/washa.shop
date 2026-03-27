import { motion, AnimatePresence } from 'motion/react';
import { Shirt, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDesign } from '../context/DesignContext';
import { LIGHT_GARMENT_COLORS } from '../types';

export default function PreviewPanel() {
  const { step, state, isGenerating, mockupImage, error } = useDesign();

  return (
    <div className="lg:col-span-5 order-2 lg:order-1">
      <div className="sticky top-32 rounded-2xl border border-washa-border bg-washa-surface overflow-hidden aspect-[4/5] relative flex flex-col items-center justify-center p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-washa-bg/80 pointer-events-none z-0" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-washa-gold/5 rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-washa-gold-deep/10 rounded-full blur-[100px] pointer-events-none transition-opacity duration-700 opacity-50 group-hover:opacity-100" />

        {step < 4 ? (
          <motion.div
            key="preview-placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 flex flex-col items-center text-center space-y-8"
          >
            <div
              className="w-56 h-56 rounded-full border border-washa-border/30 flex items-center justify-center shadow-[0_0_50px_rgba(201,168,106,0.05)] transition-all duration-700 relative"
              style={{
                backgroundColor: state.garmentColorHex || 'transparent',
              }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
              <Shirt
                className={cn(
                  'w-24 h-24 relative z-10 transition-colors duration-700',
                  LIGHT_GARMENT_COLORS.includes(state.garmentColor)
                    ? 'text-black/80'
                    : 'text-white/80'
                )}
                strokeWidth={1}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-serif text-washa-gold tracking-wide">
                {state.garmentType}
              </h3>
              <div className="flex flex-wrap justify-center gap-2 text-xs font-medium text-washa-text-sec/80">
                <span className="px-3 py-1 rounded-full border border-washa-border/30 bg-washa-bg/50 backdrop-blur-sm">
                  {state.garmentColor}
                </span>
                {state.garmentSize ? (
                  <span className="px-3 py-1 rounded-full border border-washa-border/30 bg-washa-bg/50 backdrop-blur-sm">
                    {state.garmentSize}
                  </span>
                ) : null}
                <span className="px-3 py-1 rounded-full border border-washa-border/30 bg-washa-bg/50 backdrop-blur-sm">
                  {state.style}
                </span>
                <span className="px-3 py-1 rounded-full border border-washa-border/30 bg-washa-bg/50 backdrop-blur-sm">
                  {state.technique}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center space-y-6 relative z-10"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full border-2 border-washa-gold/20 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-washa-gold animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-washa-gold/10 animate-ping" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-washa-gold font-medium animate-pulse">جاري تصميم الموكب...</p>
                  <p className="text-xs text-washa-text-faint">قد يستغرق الأمر بضع ثوانٍ</p>
                </div>
              </motion.div>
            ) : mockupImage ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0 w-full h-full"
              >
                <img src={mockupImage} alt="Mockup" className="w-full h-full object-cover" />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-center px-6 relative z-10"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
