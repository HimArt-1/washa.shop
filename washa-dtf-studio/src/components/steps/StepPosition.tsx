import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, LayoutDashboard, Search, FileImage } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';

export default function StepPosition() {
  const { state, updateState, nextStep, prevStep } = useDesign();

  const positions = [
    {
      id: 'front_large',
      title: 'تصميم أمامي',
      description: 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.',
      icon: <LayoutDashboard className="h-6 w-6" />,
    },
    {
      id: 'back_large',
      title: 'تصميم خلفي',
      description: 'يظهر في الظهر بشكل كبير، مثالي للتصاميم المعقدة والملفتة.',
      icon: <FileImage className="h-6 w-6" />,
    },
    {
      id: 'logo_left',
      title: 'تصميم شعار بسيط (يسار)',
      description: 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليسرى (جهة القلب).',
      icon: <Search className="h-6 w-6" />,
    },
    {
      id: 'logo_right',
      title: 'تصميم شعار بسيط (يمين)',
      description: 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليمنى.',
      icon: <Search className="h-6 w-6" />,
    },
  ];

  return (
    <motion.div
      key="step-position"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-strong p-6 sm:p-10 space-y-10"
    >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ٣ من ٧
        </div>
      </div>

      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          مكان التصميم
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-washa-text-sec text-lg"
        >
          أين تفضل أن يظهر تصميمك على القطعة؟
        </motion.p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {positions.map((pos, index) => (
          <motion.button
            key={pos.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
            onClick={() => updateState({ designPosition: pos.id as any })}
            className={cn(
              'rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
              state.designPosition === pos.id
                ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                {pos.icon}
              </span>
              {state.designPosition === pos.id && (
                <span className="rounded-full border border-washa-gold/30 bg-washa-gold/10 px-2.5 py-1 text-[10px] font-semibold text-washa-gold">
                  مختار
                </span>
              )}
            </div>
            <div className="mt-5 space-y-1.5">
              <p className="text-base font-bold">{pos.title}</p>
              <p className="text-xs leading-6 text-washa-text-faint">{pos.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="lg" onClick={prevStep} className="gap-2 rounded-xl">
          <ArrowRight className="w-5 h-5" /> رجوع
        </Button>
        <Button variant="gold" size="lg" onClick={nextStep} className="gap-2 btn-shimmer-effect h-12 px-8 text-base rounded-xl">
          التالي <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
