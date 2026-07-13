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
  imageUrl: string;
  imageAlt: string;
};

const PLACEMENT_VISUALS: Record<string, Pick<PositionCard, 'imageUrl' | 'imageAlt'>> = {
  front_large: {
    imageUrl: '/placements/placement-front-large.webp',
    imageAlt: 'قميص يوضح مساحة التصميم الأمامي الكبير',
  },
  back_large: {
    imageUrl: '/placements/placement-back-large.webp',
    imageAlt: 'قميص يوضح مساحة التصميم الخلفي الكبير',
  },
  logo_right: {
    imageUrl: '/placements/placement-logo-right.webp',
    imageAlt: 'قميص يوضح مساحة اللوقو الصغير في يمين الصدر',
  },
  logo_left: {
    imageUrl: '/placements/placement-logo-left-heart.webp',
    imageAlt: 'قميص يوضح مساحة اللوقو الصغير في يسار الصدر جهة القلب',
  },
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

  const defaultPositions: PositionCard[] = [
    {
      id: 'front_large',
      title: 'تصميم أمامي كبير',
      description: 'يظهر في الصدر بحجم كبير ومميز ليكون واجهة القطعة الأساسية.',
      designPosition: 'front_large',
      printPosition: 'chest',
      printSize: 'large',
      icon: <LayoutDashboard className="h-6 w-6" />,
      ...PLACEMENT_VISUALS.front_large,
    },
    {
      id: 'back_large',
      title: 'تصميم خلفي كبير',
      description: 'يظهر في الظهر بحجم كبير ومميز ليمنح التصميم حضورًا واضحًا.',
      designPosition: 'back_large',
      printPosition: 'back',
      printSize: 'large',
      icon: <FileImage className="h-6 w-6" />,
      ...PLACEMENT_VISUALS.back_large,
    },
    {
      id: 'logo_right',
      title: 'لوقو صغير في الصدر (يمين)',
      description: 'يظهر كلوقو صغير في أعلى الصدر من الجهة اليمنى.',
      designPosition: 'logo_right',
      printPosition: 'shoulder_right',
      printSize: 'small',
      icon: <Search className="h-6 w-6" />,
      ...PLACEMENT_VISUALS.logo_right,
    },
    {
      id: 'logo_left',
      title: 'لوقو صغير في الصدر (يسار)',
      description: 'يظهر كلوقو صغير في أعلى الصدر من الجهة اليسرى، جهة القلب.',
      designPosition: 'logo_left',
      printPosition: 'shoulder_left',
      printSize: 'small',
      icon: <Search className="h-6 w-6" />,
      ...PLACEMENT_VISUALS.logo_left,
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
          ...(PLACEMENT_VISUALS[placement.designPosition] ?? PLACEMENT_VISUALS.front_large),
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
              <div className="relative flex aspect-[1.15/1] min-h-[8rem] w-full items-center justify-center overflow-hidden border-b border-washa-border/35 bg-[#f5efe4] p-2">
                {/* Background glow when selected */}
                {isSelected && <div className="absolute inset-0 bg-washa-gold/[0.08]" />}

                <img
                  src={studioAsset(pos.imageUrl)}
                  alt={pos.imageAlt}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                  className="relative h-full w-full select-none object-contain brightness-[0.72] contrast-[1.28] drop-shadow-[0_14px_22px_rgba(64,48,40,0.16)] transition-transform duration-300 group-hover:scale-[1.02]"
                />
                
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
