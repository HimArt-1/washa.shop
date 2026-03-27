import { motion } from 'motion/react';
import { History, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDesign } from '../context/DesignContext';
import { siteAsset } from '../lib/assets';

interface HeaderProps {
  onOpenGallery: () => void;
}

export default function Header({ onOpenGallery }: HeaderProps) {
  const { step } = useDesign();

  const steps = [
    { num: 1, label: 'القطعة', icon: '👕' },
    { num: 2, label: 'الفكرة', icon: '💡' },
    { num: 3, label: 'الأسلوب', icon: '🎨' },
    { num: 4, label: 'النتيجة', icon: '✨' },
  ];

  return (
    <header className="border-b border-washa-border/50 bg-washa-surface/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between relative">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-washa-gold/15 bg-[radial-gradient(circle_at_35%_35%,rgba(201,168,106,0.18),rgba(11,11,12,0.95)_72%)] shadow-[0_0_20px_rgba(201,168,106,0.3)] animate-glow-pulse">
            <img src={siteAsset('logo.png')} alt="وشّى" className="w-full h-full object-contain p-1.5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-serif text-xl tracking-wider text-washa-gold leading-none">وشّى</h1>
            <p className="text-[10px] text-washa-text-faint tracking-[0.2em] uppercase leading-none mt-0.5">DTF STUDIO</p>
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

        {/* Gallery Button */}
        <button
          onClick={onOpenGallery}
          className="flex items-center gap-2 text-sm text-washa-text-sec hover:text-washa-gold transition-all duration-300 px-3 py-2 rounded-xl hover:bg-washa-gold/5 border border-transparent hover:border-washa-gold/20"
          title="تصاميمي السابقة"
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">تصاميمي</span>
        </button>
      </div>
    </header>
  );
}
