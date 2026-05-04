import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, LayoutDashboard, Search, FileImage, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';

export default function StepPosition() {
  const { state, updateState, nextStep, prevStep, positionOptions } = useDesign();

  /* ── Reusable SVG T-Shirt with configurable highlight zone ── */
  const TShirtDiagram = ({ highlightRect, isSelected }: { highlightRect: { x: number; y: number; w: number; h: number }; isSelected: boolean }) => (
    <div className="relative w-full aspect-[4/3] flex items-center justify-center p-3">
      <svg viewBox="0 0 120 140" className="w-24 h-24 drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* T-shirt body */}
        <path
          d="M30 25 L10 45 L25 55 L25 130 L95 130 L95 55 L110 45 L90 25 L75 35 C70 40 50 40 45 35 L30 25Z"
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5"
        />
        {/* Collar */}
        <path
          d="M45 35 C50 42 70 42 75 35"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.2"
        />
        {/* Design zone highlight */}
        <rect
          x={highlightRect.x}
          y={highlightRect.y}
          width={highlightRect.w}
          height={highlightRect.h}
          rx="4"
          fill={isSelected ? 'rgba(201,168,106,0.35)' : 'rgba(201,168,106,0.15)'}
          stroke="rgba(201,168,106,0.7)"
          strokeWidth="1.5"
          strokeDasharray={isSelected ? 'none' : '4 2'}
          className="animate-pulse"
        />
        {/* Design zone icon - sparkle */}
        <text
          x={highlightRect.x + highlightRect.w / 2}
          y={highlightRect.y + highlightRect.h / 2 + 4}
          textAnchor="middle"
          fontSize="10"
          fill="rgba(201,168,106,0.8)"
        >✦</text>
      </svg>
    </div>
  );

  const defaultPositions = [
    {
      id: 'front_large',
      title: 'تصميم أمامي',
      description: 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.',
      icon: <LayoutDashboard className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 35, y: 42, w: 50, h: 55 }} isSelected={isSelected} />
    },
    {
      id: 'back_large',
      title: 'تصميم خلفي',
      description: 'يظهر في الظهر بشكل كبير، مثالي للتصاميم المعقدة والملفتة.',
      icon: <FileImage className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 33, y: 48, w: 54, h: 60 }} isSelected={isSelected} />
    },
    {
      id: 'logo_right',
      title: 'تصميم شعار بسيط (يمين)',
      description: 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليمنى.',
      icon: <Search className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 35, y: 48, w: 18, h: 18 }} isSelected={isSelected} />
    },
    {
      id: 'logo_left',
      title: 'تصميم شعار بسيط (يسار)',
      description: 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليسرى (جهة القلب).',
      icon: <Search className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 67, y: 48, w: 18, h: 18 }} isSelected={isSelected} />
    },
  ];

  const displayPositions = positionOptions.length > 0 
    ? positionOptions.map(p => ({
        id: p.id,
        title: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        icon: <LayoutDashboard className="h-5 w-5" />
      }))
    : defaultPositions;

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
          الخطوة ٣ من ٦
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {displayPositions.map((pos, index) => {
          const isSelected = state.designPosition === pos.id;
          return (
            <motion.button
              key={pos.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
              onClick={() => updateState({ designPosition: pos.id as any })}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-3xl border transition-all duration-500',
                isSelected
                  ? 'border-washa-gold bg-washa-gold/10 shadow-[0_0_40px_rgba(201,168,106,0.2)] ring-1 ring-washa-gold'
                  : 'border-white/10 bg-white/[0.02] hover:border-washa-gold/30 hover:bg-white/[0.05]'
              )}
            >
              {/* Visual Indicator Area */}
              <div className="relative bg-black/40 border-b border-white/5 w-full aspect-[4/3] flex items-center justify-center overflow-hidden">
                {/* Background glow when selected */}
                {isSelected && <div className="absolute inset-0 bg-washa-gold/10 blur-xl" />}
                
                {'imageUrl' in pos && pos.imageUrl ? (
                  <img 
                    src={pos.imageUrl} 
                    alt={pos.title} 
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover transition-transform duration-700",
                      isSelected ? "scale-105" : "group-hover:scale-110"
                    )} 
                  />
                ) : 'visual' in pos && typeof pos.visual === 'function' ? (
                  pos.visual(isSelected)
                ) : null}
                
                {isSelected && (
                  <div className="absolute top-4 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg z-10 shadow-lg">
                    <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="p-5 text-right space-y-2 z-10 bg-washa-surface/40 backdrop-blur-sm flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-lg font-bold transition-colors",
                    isSelected ? "text-washa-gold" : "text-white group-hover:text-washa-gold/80"
                  )}>
                    {pos.title}
                  </p>
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    isSelected ? "bg-washa-gold/20 text-washa-gold" : "bg-white/5 text-washa-text-faint group-hover:text-washa-gold/60"
                  )}>
                    {pos.icon}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-washa-text-faint group-hover:text-washa-text-sec transition-colors">
                  {pos.description}
                </p>
              </div>
            </motion.button>
          );
        })}
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
