import { motion } from 'motion/react';
import { LayoutDashboard, Search, FileImage, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';
import { studioAsset } from '../../lib/assets';
import { getPrintPlacementCopy, resolvePrintPlacementFromOption, SUPPORTED_PRINT_DESIGN_POSITIONS } from '../../lib/placement';
import type { PrintPosition, PrintSize } from '../../types';
import { DEFAULT_PRINT_ADJUSTMENT } from '../../lib/printPreview';
import StepNavigationBar from './StepNavigationBar';
import InteractivePlacementPreview from './InteractivePlacementPreview';

const SHOW_INTERACTIVE_PRINT_PREVIEW = false;

type PositionCard = {
  id: string;
  printOptionId?: string | null;
  title: string;
  description: string | null;
  designPosition: string;
  printPosition: PrintPosition;
  printSize: PrintSize;
  price?: number;
  icon: ReactNode;
  visual?: (isSelected: boolean) => ReactNode;
};

export default function StepPosition() {
  const { state, updateState, nextStep, prevStep, positionOptions, selectedGarment, selectedColor, selectedSize } = useDesign();
  const adjustment = {
    scale: state.printScale ?? DEFAULT_PRINT_ADJUSTMENT.scale,
    offsetX: state.printOffsetX ?? DEFAULT_PRINT_ADJUSTMENT.offsetX,
    offsetY: state.printOffsetY ?? DEFAULT_PRINT_ADJUSTMENT.offsetY,
  };
  const garmentImageUrl = state.printPosition === 'back'
    ? selectedSize?.imageBackUrl || selectedGarment?.aiReferenceBackUrl || selectedGarment?.imageUrl
    : selectedSize?.imageFrontUrl || selectedColor?.imageUrl || selectedGarment?.aiReferenceFrontUrl || selectedGarment?.imageUrl;

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
    if (printPosition === 'shoulder_right') return { x: 35, y: 48, w: 18, h: 18 };
    if (printPosition === 'shoulder_left') return { x: 67, y: 48, w: 18, h: 18 };
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
      title: 'تصميم أمامي كبير',
      description: 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.',
      designPosition: 'front_large',
      printPosition: 'chest',
      printSize: 'large',
      icon: <LayoutDashboard className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 35, y: 42, w: 50, h: 55 }} isSelected={isSelected} />
    },
    {
      id: 'back_large',
      title: 'تصميم خلفي كبير',
      description: 'يظهر في الظهر بحجم كبير ومميز ليمنح التصميم حضورًا واضحًا.',
      designPosition: 'back_large',
      printPosition: 'back',
      printSize: 'large',
      icon: <FileImage className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 33, y: 48, w: 54, h: 60 }} isSelected={isSelected} />
    },
    {
      id: 'logo_right',
      title: 'لوقو صغير في الصدر (يمين)',
      description: 'يظهر كلوقو صغير في أعلى الصدر من الجهة اليمنى.',
      designPosition: 'logo_right',
      printPosition: 'shoulder_right',
      printSize: 'small',
      icon: <Search className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 35, y: 48, w: 18, h: 18 }} isSelected={isSelected} />
    },
    {
      id: 'logo_left',
      title: 'لوقو صغير في الصدر (يسار)',
      description: 'يظهر كلوقو صغير في أعلى الصدر من الجهة اليسرى، جهة القلب.',
      designPosition: 'logo_left',
      printPosition: 'shoulder_left',
      printSize: 'small',
      icon: <Search className="h-6 w-6" />,
      visual: (isSelected: boolean) => <TShirtDiagram highlightRect={{ x: 67, y: 48, w: 18, h: 18 }} isSelected={isSelected} />
    },
  ];

  const catalogPositions: PositionCard[] = positionOptions.map(p => {
        const placement = resolvePrintPlacementFromOption(p);
        const copy = getPrintPlacementCopy(placement.printPosition, placement.printSize);
        return {
          id: p.id,
          printOptionId: p.id,
          title: copy.title,
          description: copy.description,
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
      });
  const displayPositions = SUPPORTED_PRINT_DESIGN_POSITIONS.map((designPosition) =>
    catalogPositions.find((position) => position.designPosition === designPosition) ??
    defaultPositions.find((position) => position.designPosition === designPosition)!
  );

  return (
    <>
      <motion.div
        key="step-position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="glass-card-strong wizard-panel"
      >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="h-1.5 w-1.5 rounded-full bg-washa-gold" aria-hidden="true" />
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
          اختر مكان الطباعة بدقة؛ سيُطبّق الاختيار نفسه عند التوليد
        </motion.p>
      </div>

      <div className="min-h-72 space-y-5">
        {SHOW_INTERACTIVE_PRINT_PREVIEW ? <InteractivePlacementPreview
          adjustment={adjustment}
          garmentImage={garmentImageUrl ? studioAsset(garmentImageUrl) : null}
          garmentColor={state.garmentColorHex}
          position={state.printPosition}
          designMethod={state.designMethod}
          prompt={state.prompt}
          calligraphyText={state.calligraphyText}
          referenceImage={state.referenceImage}
          referenceImageMimeType={state.referenceImageMimeType}
          onChange={(next) => updateState({
            printScale: next.scale,
            printOffsetX: next.offsetX,
            printOffsetY: next.offsetY,
          })}
        /> : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-t border-washa-border/35 pt-5">
            <span className="text-xs text-washa-text-faint">أربع مناطق معتمدة</span>
            <h3 className="text-sm font-bold text-washa-text">اختر منطقة الطباعة</h3>
          </div>
        <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-4" role="group" aria-label="مناطق الطباعة المتاحة">
        {displayPositions.map((pos) => {
          const isSelected = state.designPosition === pos.designPosition && (!state.printOptionId || state.printOptionId === pos.printOptionId);
          return (
            <button
              key={pos.id}
              aria-pressed={isSelected}
              onClick={() => updateState({
                designPosition: pos.designPosition,
                printOptionId: pos.printOptionId ?? null,
                printPosition: pos.printPosition,
                printSize: pos.printSize,
                printPositionLabel: pos.title,
                printScale: DEFAULT_PRINT_ADJUSTMENT.scale,
                printOffsetX: DEFAULT_PRINT_ADJUSTMENT.offsetX,
                printOffsetY: DEFAULT_PRINT_ADJUSTMENT.offsetY,
              })}
              className={cn(
                'group relative flex min-h-[12rem] flex-col overflow-hidden rounded-2xl border bg-washa-ivory text-washa-text transition-[border-color,box-shadow,transform] duration-300 shadow-depth-sm active:scale-[0.985]',
                isSelected
                  ? 'border-washa-gold shadow-[0_20px_55px_rgba(64,48,40,0.16)] ring-1 ring-washa-gold'
                  : 'border-washa-border/80 hover:border-washa-gold/45'
              )}
            >
              {/* Visual Indicator Area */}
              <div className="relative flex min-h-[7.25rem] w-full items-center justify-center overflow-hidden border-b border-washa-border/35 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.94),rgba(232,221,203,0.82)_48%,rgba(64,48,40,0.42)_100%)] p-3">
                {/* Background glow when selected */}
                {isSelected && <div className="absolute inset-0 bg-washa-gold/10 blur-xl" />}

                {'visual' in pos && typeof pos.visual === 'function' ? (
                  <div className="absolute inset-0">
                    {pos.visual(isSelected)}
                  </div>
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
            </button>
          );
        })}
        </div>
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
