import { motion } from 'motion/react';
import { ArrowUpLeft, FlaskConical, History, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDesign } from '../context/DesignContext';
import { siteAsset } from '../lib/assets';

interface HeaderProps {
  onOpenGallery: () => void;
}

const BRAND_MARK_SRC = 'header-logo-identity.png';
const DEV_STUDIO_PATH = '/design/washa-ai/dev';
const DEV_STUDIO_V2_PATH = '/design/washa-ai/dev-v2';

export default function Header({ onOpenGallery }: HeaderProps) {
  const { step } = useDesign();

  const steps = [
    { num: 1, label: 'القطعة', icon: '👕' },
    { num: 2, label: 'الفكرة', icon: '💡' },
    { num: 3, label: 'المكان', icon: '🎯' },
    { num: 4, label: 'الأسلوب', icon: '🎨' },
    { num: 5, label: 'الألوان', icon: '🌈' },
    { num: 6, label: 'النتيجة', icon: '✨' },
  ];

  return (
    <header className="border-b border-washa-border/50 bg-washa-surface/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-20 md:h-20 py-3 md:py-0 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 relative">
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden border border-washa-gold/18 bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.14),rgba(201,168,106,0.16)_38%,rgba(11,11,12,0.95)_78%)] shadow-[0_0_24px_rgba(201,168,106,0.28)] animate-glow-pulse">
              <img src={siteAsset(BRAND_MARK_SRC)} alt="وشّى" className="w-full h-full object-contain px-1.5 py-2" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-serif text-xl tracking-wider text-washa-gold leading-none">وشّى</h1>
              <p className="text-[10px] text-washa-text-faint tracking-[0.2em] uppercase leading-none mt-0.5">WASHA STUDIO</p>
            </div>
          </div>

          {/* Mobile Step Indicator */}
          <div className="md:hidden flex items-center gap-2">
            {steps.map(s => (
              <div
                key={s.num}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  step === s.num
                    ? 'bg-washa-gold w-6 shadow-[0_0_10px_rgba(201,168,106,0.5)]'
                    : step > s.num
                    ? 'bg-washa-gold/40'
                    : 'bg-washa-border/50'
                )}
              />
            ))}
          </div>
        </div>

        {/* Interactive Stepper */}
        <div className="hidden md:flex items-center gap-0">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              {/* Step Node */}
              <div className="flex flex-col items-center relative">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 relative',
                    step === s.num
                      ? 'bg-washa-gold text-washa-bg shadow-[0_0_25px_rgba(201,168,106,0.5)] stepper-node-active scale-110'
                      : step > s.num
                      ? 'bg-washa-gold/20 text-washa-gold border border-washa-gold/40'
                      : 'bg-washa-surface text-washa-text-faint border border-washa-border/50'
                  )}
                >
                  {step > s.num ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{s.icon}</span>
                  )}
                  {step === s.num && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-washa-gold/30"
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1.5 font-medium transition-colors duration-300 whitespace-nowrap',
                    step >= s.num ? 'text-washa-gold' : 'text-washa-text-faint'
                  )}
                >
                  {s.label}
                </span>
              </div>

              {/* Connecting Line */}
              {i < steps.length - 1 && (
                <div className="w-10 lg:w-16 h-[2px] mx-1 bg-washa-border/30 relative overflow-hidden rounded-full mt-[-14px]">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-washa-gold rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: step > s.num ? '100%' : '0%' }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 md:justify-end">
          <a
            href={DEV_STUDIO_V2_PATH}
            className="group relative flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#123C36]/20 bg-[#123C36] px-3 py-2 text-sm font-bold text-white shadow-[0_12px_28px_rgba(18,60,54,0.14)] transition-all duration-300 hover:bg-[#0D2D28] active:scale-[0.98] md:flex-none md:px-4"
            aria-label="افتح النسخة التطويرية 2"
          >
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/40 to-transparent opacity-70" />
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="truncate">النسخة التطويرية 2</span>
            <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          <a
            href={DEV_STUDIO_PATH}
            className="group relative flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl border border-washa-gold/25 bg-washa-gold/10 px-3 py-2 text-sm font-bold text-washa-gold shadow-[0_12px_28px_rgba(154,123,61,0.08)] transition-all duration-300 hover:border-washa-gold/50 hover:bg-washa-gold/15 hover:text-washa-gold-deep active:scale-[0.98] md:flex-none md:px-4"
            aria-label="جرب النسخة التطويرية"
          >
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-washa-gold/55 to-transparent opacity-70" />
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="truncate">جرب النسخة التطويرية</span>
            <ArrowUpLeft className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>

          {/* Gallery Button */}
          <button
            onClick={onOpenGallery}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm text-washa-text-sec transition-all duration-300 hover:border-washa-gold/20 hover:bg-washa-gold/5 hover:text-washa-gold"
            title="تصاميمي السابقة"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">تصاميمي</span>
          </button>
        </div>
      </div>
    </header>
  );
}
