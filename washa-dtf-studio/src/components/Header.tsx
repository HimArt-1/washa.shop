import { motion } from 'motion/react';
import { History, Home, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDesign } from '../context/DesignContext';
import { siteAsset } from '../lib/assets';

interface HeaderProps {
  onOpenGallery: () => void;
}

const BRAND_MARK_SRC = 'header-logo-wordmark.png';

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
    <header className="sticky top-0 z-50 border-b border-washa-border/50 bg-washa-surface/30 backdrop-blur-xl">
      <div className="relative mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:gap-3 sm:px-6 md:h-20 md:gap-4 md:py-0">
        {/* Logo */}
        <div className="flex min-w-0 shrink-0 items-center">
          <div className="flex h-12 w-[86px] shrink-0 items-center justify-center overflow-visible sm:h-14 sm:w-24">
            <img
              src={siteAsset(BRAND_MARK_SRC)}
              alt="وشّى"
              className="max-h-12 w-auto max-w-full object-contain drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] sm:max-h-14"
            />
          </div>
        </div>

        {/* Mobile Step Indicator */}
        <div className="flex flex-1 items-center justify-center gap-1.5 px-1 md:hidden">
          {steps.map(s => (
            <div
              key={s.num}
              className={cn(
                'h-2 w-2 rounded-full transition-all duration-300',
                step === s.num
                  ? 'w-6 bg-washa-gold shadow-[0_0_10px_rgba(64,48,40,0.5)]'
                  : step > s.num
                  ? 'bg-washa-gold/40'
                  : 'bg-washa-border/50'
              )}
            />
          ))}
        </div>

        {/* Interactive Stepper */}
        <div className="hidden flex-1 items-center justify-center gap-0 md:flex">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              {/* Step Node */}
              <div className="flex flex-col items-center relative">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 relative',
                    step === s.num
                      ? 'bg-washa-gold text-washa-bg shadow-[0_0_25px_rgba(64,48,40,0.5)] stepper-node-active scale-110'
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

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <a
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent text-sm text-washa-text-sec transition-all duration-300 hover:border-washa-gold/20 hover:bg-washa-gold/5 hover:text-washa-gold sm:h-auto sm:w-auto sm:px-3 sm:py-2"
            title="الرئيسية"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">الرئيسية</span>
          </a>

          {/* Gallery Button */}
          <button
            onClick={onOpenGallery}
            className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent text-sm text-washa-text-sec transition-all duration-300 hover:border-washa-gold/20 hover:bg-washa-gold/5 hover:text-washa-gold sm:h-auto sm:w-auto sm:px-3 sm:py-2"
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
