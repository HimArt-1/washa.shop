import { motion } from 'motion/react';
import { BrushCleaning, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';

export default function StepTechnique() {
  const {
    state,
    updateState,
    nextStep,
    prevStep,
    configLoading,
    configError,
    techniqueOptions,
  } = useDesign();

  return (
    <motion.div
      key="step-technique"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-strong p-6 sm:p-10 space-y-10"
    >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ٥ من ٧
        </div>
      </div>

      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          التقنية الفنية
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-washa-text-sec text-lg"
        >
          حدد تقنية التنفيذ والتعبير المرئي المخصصة للطباعة
        </motion.p>
      </div>

      {configLoading ? (
        <div className="rounded-3xl border border-washa-border/30 bg-washa-bg/40 p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-washa-gold" />
          <p className="mt-4 text-sm text-washa-text-sec">جاري تحميل التقنيات المتاحة...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {configError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {configError}
            </div>
          ) : null}

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">{techniqueOptions.length} تقنيات متاحة</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {techniqueOptions.map((technique, index) => (
                <motion.button
                  key={technique.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.04, duration: 0.35 }}
                  onClick={() => updateState({ techniqueId: technique.id, technique: technique.name })}
                  className={cn(
                    'rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
                    state.techniqueId === technique.id
                      ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                      : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    {technique.imageUrl ? (
                      <img src={technique.imageUrl} alt={technique.name} className="h-14 w-14 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                        <BrushCleaning className="h-6 w-6" />
                      </span>
                    )}
                    {state.techniqueId === technique.id ? (
                      <span className="rounded-full border border-washa-gold/30 bg-washa-gold/10 px-2.5 py-1 text-[10px] font-semibold text-washa-gold">
                        نشط
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-5 space-y-1.5">
                    <p className="text-base font-bold">{technique.name}</p>
                    <p className="text-xs leading-6 text-washa-text-faint line-clamp-2">
                      {technique.description || 'تقنية تنفيذ وتعبير مرئي مخصصة للطباعة DTF.'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="lg" onClick={prevStep} className="gap-2 rounded-xl">
          <ArrowRight className="w-5 h-5" /> رجوع
        </Button>
        <Button
          variant="gold"
          size="lg"
          onClick={nextStep}
          disabled={!state.techniqueId || configLoading}
          className="gap-2 btn-shimmer-effect h-12 px-8 text-base rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          التالي <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
