import { motion } from 'motion/react';
import { LayoutDashboard, Search, FileImage, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';
import { studioAsset } from '../../lib/assets';
import { resolvePrintPlacementFromOption } from '../../lib/placement';
import type { PrintPosition, PrintSize } from '../../types';
import StepNavigationBar from './StepNavigationBar';

type PositionCard = {
  id: string;
  title: string;
  description: string | null;
  imageUrl?: string | null;
  designPosition: string;
  printPosition: PrintPosition;
  printSize: PrintSize;
  price?: number;
  icon: ReactNode;
  visual?: (isSelected: boolean) => ReactNode;
};

export default function StepPosition() {
  const { state, updateState, nextStep, prevStep, positionOptions } = useDesign();

  /* ── Reusable SVG T-Shirt with configurable highlight zone ── */
  const TShirtDiagram = ({ highlightRect, isSelected }: { highlightRect: { x: number; y: number; w: number; h: number }; isSelected: boolean }) => (
    <div className="relative flex h-full min-h-32 w-full items-center justify-center p-3">
      <svg viewBox="0 0 120 140" className="h-[86%] w-[74%] max-w-36 drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* T-shirt body */}
        <path
          d="M30 25 L10 45 L25 55 L25 130 L95 130 L95 55 L110 45 L90 25 L75 35 C70 40 50 40 45 35 L30 25Z"
          fill="rgba(18,18,18,0.86)"
          stroke="rgba(64,48,40,0.45)"
          strokeWidth="1.8"
        />
        {/* Collar */}
        <path
          d="M45 35 C50 42 70 42 75 35"
          fill="none"
          stroke="rgba(255,255,255,0.34)"
          strokeWidth="1.4"
        />
        <path
          d="M25 55 L33 60 M95 55 L87 60 M33 126 H87"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
        />
        {/* Design zone highlight */}
        <rect
          x={highlightRect.x}
          y={highlightRect.y}
          width={highlightRect.w}
          height={highlightRect.h}
          rx="4"
          fill={isSelected ? 'rgba(64,48,40,0.35)' : 'rgba(64,48,40,0.15)'}
          stroke="rgba(64,48,40,0.7)"
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
          fill="rgba(64,48,40,0.8)"
        >✦</text>
      </svg>
    </div>
  );

  const getHighlightRect = (printPosition: PrintPosition, printSize: PrintSize) => {
    if (printPosition === 'shoulder_right') return { x: 67, y: 48, w: 18, h: 18 };
    if (printPosition === 'shoulder_left') return { x: 35, y: 48, w: 18, h: 18 };
    if (printPosition === 'back') {
      return printSize === 'small'
        ? { x: 50, y: 52, w: 20, h: 20 }
        : { x: 33, y: 48, w: 54, h: 60 };
    }
    return printSize === 'small'
      ? { x: 50, y: 48, w: 20, h: 20 }
      : { x: 35, y: 42, w: 50, h: 55 };
  };

  const defaultPositions: PositionCard[] = [
    {
      id: 'front_large',
      title: 'تصميم أمامي',
      description: 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.',
      designPosition: 'front_large',
      printPosition: 'chest',
      printSize: 'large',
      icon: <LayoutDashboard className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 35, y: 42, w: 50, h: 55 }} isSelected={isSelected} />
    },
    {
      id: 'back_large',
      title: 'تصميم خلفي',
      description: 'يظهر في الظهر بشكل كبير، مثالي للتصاميم المعقدة والملفتة.',
      designPosition: 'back_large',
      printPosition: 'back',
      printSize: 'large',
      icon: <FileImage className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 33, y: 48, w: 54, h: 60 }} isSelected={isSelected} />
    },
    {
      id: 'logo_right',
      title: 'تصميم شعار بسيط (يمين)',
      description: 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليمنى.',
      designPosition: 'logo_right',
      printPosition: 'shoulder_right',
      printSize: 'small',
      icon: <Search className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 67, y: 48, w: 18, h: 18 }} isSelected={isSelected} />
    },
    {
      id: 'logo_left',
      title: 'تصميم شعار بسيط (يسار)',
      description: 'يظهر مثل اللوقو في منطقة الصدر من الجهة اليسرى (جهة القلب).',
      designPosition: 'logo_left',
      printPosition: 'shoulder_left',
      printSize: 'small',
      icon: <Search className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 35, y: 48, w: 18, h: 18 }} isSelected={isSelected} />
    },
  ];

  const displayPositions: PositionCard[] = positionOptions.length > 0
    ? positionOptions.map(p => {
        const placement = resolvePrintPlacementFromOption(p);
        return {
          id: p.id,
          title: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          designPosition: placement.designPosition,
          printPosition: placement.printPosition,
          printSize: placement.printSize,
          price: p.price,
          icon: <LayoutDashboard className="h-5 w-5" />,
          visual: (isSelected: boolean) => (
            <TShirtDiagram
              highlightRect={getHighlightRect(placement.printPosition, placement.printSize)}
              isSelected={isSelected}
            />
          ),
        };
      })
    : defaultPositions;

  return (
    <>
      <motion.div
        key="step-position"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.97 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card-strong wizard-panel"
      >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ٣ من ٦
        </div>
      </div>

      <div className="text-center space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="step-title-heading bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          مكان التصميم
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="wizard-copy text-washa-text-sec"
        >
          أين تفضل أن يظهر تصميمك على القطعة؟
        </motion.p>
      </div>

      <div className="max-h-[calc(100dvh-20rem)] min-h-72 overflow-y-auto overscroll-contain pb-28 touch-pan-y sm:max-h-none sm:pb-0">
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-4">
        {displayPositions.map((pos, index) => {
          const isSelected = state.printOptionId ? state.printOptionId === pos.id : state.designPosition === pos.designPosition;
          return (
            <motion.button
              key={pos.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05, duration: 0.35 }}
              onClick={() => updateState({
                designPosition: pos.designPosition,
                printOptionId: pos.id,
                printPosition: pos.printPosition,
                printSize: pos.printSize,
                printPositionLabel: pos.title,
              })}
              className={cn(
                'group relative flex min-h-[15rem] flex-col overflow-hidden rounded-2xl border bg-washa-ivory text-washa-text transition-all duration-500 shadow-depth-sm sm:min-h-[16rem]',
                isSelected
                  ? 'border-washa-gold shadow-[0_20px_55px_rgba(64,48,40,0.16)] ring-1 ring-washa-gold'
                  : 'border-washa-border/80 hover:border-washa-gold/45'
              )}
            >
              {/* Visual Indicator Area */}
              <div className="relative flex min-h-[8.75rem] w-full items-center justify-center overflow-hidden border-b border-washa-border/35 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.94),rgba(232,221,203,0.82)_48%,rgba(64,48,40,0.42)_100%)] p-3 sm:min-h-[9.5rem]">
                {/* Background glow when selected */}
                {isSelected && <div className="absolute inset-0 bg-washa-gold/10 blur-xl" />}

                {'visual' in pos && typeof pos.visual === 'function' ? (
                  <div className={cn(
                    "absolute inset-0 z-0 transition-opacity duration-300",
                    'imageUrl' in pos && pos.imageUrl ? "opacity-55" : "opacity-100"
                  )}>
                    {pos.visual(isSelected)}
                  </div>
                ) : null}
                
                {('imageUrl' in pos && pos.imageUrl) ? (
                  <img 
                    src={studioAsset(pos.imageUrl as string)} 
                    alt={pos.title} 
                    className={cn(
                      "relative z-[1] h-full w-full object-contain object-center drop-shadow-[0_18px_30px_rgba(0,0,0,0.4)] transition-transform duration-700",
                      isSelected ? "scale-[1.05]" : "scale-100 group-hover:scale-[1.05]"
                    )} 
                  />
                ) : null}
                
                {isSelected && (
                  <div className="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg shadow-lg">
                    <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="z-10 flex flex-1 flex-col gap-1.5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,245,237,0.98))] p-3 text-right backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "min-w-0 text-sm font-bold leading-snug transition-colors",
                    isSelected ? "text-washa-gold-deep" : "text-washa-text group-hover:text-washa-gold-deep"
                  )}>
                    {pos.title}
                  </p>
                  <div className={cn(
                    "rounded-lg p-1.5 transition-colors",
                    isSelected ? "bg-washa-gold/[0.18] text-washa-gold-deep" : "bg-washa-gold/[0.08] text-washa-text-sec group-hover:text-washa-gold-deep"
                  )}>
                    {pos.icon}
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-washa-text-sec transition-colors">
                  {pos.description}
                </p>
                {typeof pos.price === 'number' && (
                  <p className="mt-auto pt-1 text-xs font-bold text-washa-gold">
                    {pos.price > 0 ? `${pos.price} ر.س` : 'مجاني'}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
        </div>
      </div>

      </motion.div>
      <StepNavigationBar
        onBack={prevStep}
        onNext={nextStep}
      />
    </>
  );
}
