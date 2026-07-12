import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Package2, Ruler, Shirt } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useDesign } from '../../context/DesignContext';
import { siteAsset } from '../../lib/assets';
import { cn } from '../../lib/utils';
import {
  LIGHT_GARMENT_COLORS,
  type DtfStudioColorOption,
  type DtfStudioGarmentOption,
  type DtfStudioSizeOption,
} from '../../types';
import StepNavigationBar from './StepNavigationBar';

function cleanOptionName(value: string) {
  return value.trim().replace(/\s+/g, ' ').replace(/^ابيض$/i, 'أبيض');
}

function arabicCount(count: number, singular: string, dual: string, plural: string) {
  if (count === 1) return `${count} ${singular}`;
  if (count === 2) return dual;
  return `${count} ${plural}`;
}

function stockLabel(size: DtfStudioSizeOption) {
  if (size.stockStatus === 'out') return 'نفد';
  if (size.stockStatus === 'low') return `متبقي ${size.availableQuantity ?? 0}`;
  if (typeof size.availableQuantity === 'number') return `متبقي ${size.availableQuantity}`;
  return 'متاح';
}

type GarmentRailProps = {
  garments: DtfStudioGarmentOption[];
  selectedId: string | null;
  onSelect: (garment: DtfStudioGarmentOption) => void;
};

function GarmentRail({ garments, selectedId, onSelect }: GarmentRailProps) {
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!selectedId || !window.matchMedia('(max-width: 639px)').matches) return;
    selectedButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedId]);

  return (
    <div
      className="grid snap-x snap-mandatory grid-flow-col auto-cols-[minmax(9.25rem,44vw)] gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-3 sm:overflow-visible sm:pb-0"
      aria-label="أنواع القطع المتاحة"
      role="group"
    >
      {garments.map((garment, index) => {
        const selected = garment.id === selectedId;

        return (
          <motion.button
            key={garment.id}
            ref={selected ? selectedButtonRef : undefined}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(garment)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22, delay: index * 0.04 }}
            className={cn(
              'group relative snap-start overflow-hidden rounded-2xl border bg-washa-surface text-right shadow-[0_10px_28px_rgba(44,36,24,0.07)] transition-[border-color,background-color,transform,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-washa-gold/45 active:scale-[0.98]',
              selected
                ? 'border-washa-gold bg-washa-ivory shadow-[0_14px_34px_rgba(44,36,24,0.13)]'
                : 'border-washa-border/65 hover:border-washa-gold/45 hover:bg-washa-ivory',
            )}
          >
            <div className="relative aspect-[4/3] overflow-hidden border-b border-washa-border/25 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.98),rgba(241,232,215,0.76)_70%,rgba(64,48,40,0.13)_100%)] p-2">
              {garment.imageUrl ? (
                <img
                  src={siteAsset(garment.imageUrl)}
                  alt=""
                  width={320}
                  height={240}
                  loading="lazy"
                  className="h-full w-full object-contain drop-shadow-[0_12px_22px_rgba(44,36,24,0.14)] transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Shirt className="h-10 w-10 text-washa-gold/30" aria-hidden="true" />
                </div>
              )}
              {selected ? (
                <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-washa-gold text-washa-bg shadow-[0_5px_14px_rgba(44,36,24,0.22)]">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                </span>
              ) : null}
            </div>

            <div className="space-y-2 px-3 py-3">
              <p className="min-w-0 text-sm font-bold leading-5 text-washa-text">
                {cleanOptionName(garment.name)}
              </p>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-washa-text-sec">
                <span>{arabicCount(garment.colors.length, 'لون', 'لونان', 'ألوان')}</span>
                <span aria-hidden="true">·</span>
                <span>{arabicCount(garment.sizes.length, 'مقاس', 'مقاسان', 'مقاسات')}</span>
              </div>
            </div>

            {selected ? (
              <motion.span
                layoutId="selected-garment-indicator"
                className="absolute inset-x-3 bottom-0 h-1 rounded-t-full bg-washa-gold"
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              />
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

type GarmentConfigurationProps = {
  garment: DtfStudioGarmentOption;
  colors: DtfStudioColorOption[];
  sizes: DtfStudioSizeOption[];
  selectedColorId: string | null;
  selectedSizeId: string | null;
  onColorSelect: (color: DtfStudioColorOption) => void;
  onSizeSelect: (size: DtfStudioSizeOption) => void;
};

function GarmentConfiguration({
  garment,
  colors,
  sizes,
  selectedColorId,
  selectedSizeId,
  onColorSelect,
  onSizeSelect,
}: GarmentConfigurationProps) {
  return (
    <motion.section
      key={garment.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
      aria-label={`خيارات ${cleanOptionName(garment.name)}`}
      className="overflow-hidden rounded-2xl border border-washa-gold/35 bg-washa-ivory shadow-[0_18px_48px_rgba(44,36,24,0.1)]"
    >
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center border-b border-washa-border/35 bg-[linear-gradient(135deg,rgba(250,247,240,0.96),rgba(255,255,255,0.98))] sm:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="relative aspect-square overflow-hidden border-l border-washa-border/25 bg-[radial-gradient(circle_at_50%_25%,#fff,rgba(241,232,215,0.72)_72%)] p-2 sm:aspect-[4/3] sm:p-4">
          {garment.imageUrl ? (
            <img
              src={siteAsset(garment.imageUrl)}
              alt={`معاينة ${cleanOptionName(garment.name)}`}
              width={420}
              height={315}
              fetchPriority="high"
              className="h-full w-full object-contain drop-shadow-[0_16px_28px_rgba(44,36,24,0.16)]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Shirt className="h-12 w-12 text-washa-gold/30" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-2 px-4 py-4 sm:px-6">
          <p className="text-[11px] font-bold text-washa-gold/65">اختيارك</p>
          <h3 className="text-lg font-bold leading-6 text-washa-gold-deep sm:text-xl">
            {cleanOptionName(garment.name)}
          </h3>
          <p className="text-xs leading-5 text-washa-text-sec">خصص اللون والمقاس، ويمكنك تغيير القطعة من القائمة أعلاه.</p>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <fieldset className="space-y-3">
          <legend className="sr-only">لون القطعة</legend>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-washa-gold/75">
              {arabicCount(colors.length, 'لون متوفر', 'لونان متوفران', 'ألوان متوفرة')}
            </span>
            <span className="text-sm font-bold text-washa-text" aria-hidden="true">لون القطعة</span>
          </div>
          {colors.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2.5">
              {colors.map((color) => {
                const selected = selectedColorId === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    aria-label={`اختر لون ${cleanOptionName(color.name)}`}
                    aria-pressed={selected}
                    onClick={() => onColorSelect(color)}
                    className={cn(
                      'relative flex h-12 w-12 items-center justify-center rounded-xl border bg-washa-ivory shadow-sm transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-washa-gold/45 active:scale-[0.96]',
                      selected
                        ? 'border-washa-gold shadow-[0_8px_20px_rgba(44,36,24,0.14)] ring-2 ring-washa-gold/15'
                        : 'border-washa-border/60 hover:border-washa-gold/45',
                    )}
                  >
                    <span
                      className="h-8 w-8 rounded-lg border border-washa-border/45 shadow-inner"
                      style={{ backgroundColor: color.hexCode }}
                    />
                    {selected ? (
                      <CheckCircle2
                        className={cn(
                          'absolute h-5 w-5 drop-shadow-sm',
                          LIGHT_GARMENT_COLORS.includes(color.name) ? 'text-washa-gold-deep' : 'text-white',
                        )}
                        strokeWidth={3}
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-washa-border/50 bg-washa-bg/55 px-4 py-4 text-center text-sm text-washa-text-sec">
              لا توجد ألوان متاحة لهذه القطعة حاليًا.
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="sr-only">المقاس</legend>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-washa-gold/75">
              {arabicCount(sizes.length, 'مقاس متاح', 'مقاسان متاحان', 'مقاسات متاحة')}
            </span>
            <span className="flex items-center gap-2 text-sm font-bold text-washa-text" aria-hidden="true">
              <Ruler className="h-4 w-4 text-washa-gold" aria-hidden="true" />
              المقاس
            </span>
          </div>
          {sizes.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {sizes.map((size) => {
                const selected = selectedSizeId === size.id;
                const unavailable = size.stockStatus === 'out';
                const lowStock = size.stockStatus === 'low';

                return (
                  <button
                    key={size.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSizeSelect(size)}
                    disabled={unavailable}
                    className={cn(
                      'min-h-14 rounded-xl border px-2 py-2 text-center text-xs font-bold transition-[border-color,background-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-washa-gold/45 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm',
                      selected
                        ? 'border-washa-gold bg-washa-gold text-washa-bg shadow-[0_8px_20px_rgba(44,36,24,0.13)]'
                        : 'border-washa-border/55 bg-washa-bg/65 text-washa-text hover:border-washa-gold/45 hover:bg-washa-ivory',
                      unavailable && 'border-red-500/25 bg-red-500/5 text-red-500',
                      lowStock && !selected && 'border-amber-500/35 bg-amber-500/5',
                    )}
                  >
                    <span className="block">{size.name}</span>
                    <span className={cn('mt-1 block text-[9px] font-medium leading-3', selected ? 'text-washa-bg/75' : 'text-washa-text-sec')}>
                      {stockLabel(size)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-washa-border/50 bg-washa-bg/55 px-4 py-4 text-center text-sm text-washa-text-sec">
              لا توجد مقاسات متاحة لهذا اللون حاليًا.
            </p>
          )}
        </fieldset>
      </div>
    </motion.section>
  );
}

function GarmentSkeleton() {
  return (
    <div className="space-y-4" aria-label="جاري تجهيز خيارات القطع" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className={cn('overflow-hidden rounded-2xl border border-washa-border/35 bg-washa-surface', item === 2 && 'hidden sm:block')}>
            <div className="aspect-[4/3] animate-pulse bg-washa-elevated" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-washa-elevated" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-washa-elevated" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-2xl border border-washa-border/35 bg-washa-surface" />
    </div>
  );
}

export default function StepGarment() {
  const {
    state,
    updateState,
    nextStep,
    configLoading,
    configError,
    garmentOptions,
    colorOptions,
    sizeOptions,
  } = useDesign();

  const selectedGarment = garmentOptions.find((garment) => garment.id === state.garmentId) ?? null;
  const selectedSize = sizeOptions.find((size) => size.id === state.garmentSizeId);
  const canProceed = Boolean(
    selectedGarment &&
      state.garmentColorId &&
      state.garmentSizeId &&
      selectedSize &&
      selectedSize.stockStatus !== 'out',
  );

  const selectGarment = (garment: DtfStudioGarmentOption) => {
    const nextColor = garment.colors[0] ?? null;
    const orderableSizes = garment.sizes.filter((item) => item.stockStatus !== 'out');
    const nextSize =
      orderableSizes.find((item) => item.colorId === nextColor?.id) ??
      orderableSizes.find((item) => item.colorId === null) ??
      orderableSizes[0] ??
      garment.sizes[0] ??
      null;

    updateState({
      garmentId: garment.id,
      garmentType: garment.name,
      garmentColorId: nextColor?.id ?? null,
      garmentColor: nextColor?.name ?? '',
      garmentColorHex: nextColor?.hexCode ?? '#111111',
      garmentSizeId: nextSize?.id ?? null,
      garmentSize: nextSize?.name ?? '',
    });
  };

  const selectColor = (color: DtfStudioColorOption) => {
    if (!selectedGarment) return;

    const orderableSizes = selectedGarment.sizes.filter((item) => item.stockStatus !== 'out');
    const nextSize =
      orderableSizes.find((item) => item.colorId === color.id) ??
      orderableSizes.find((item) => item.colorId === null) ??
      orderableSizes[0] ??
      selectedGarment.sizes.find((item) => item.colorId === color.id) ??
      null;

    updateState({
      garmentColorId: color.id,
      garmentColor: color.name,
      garmentColorHex: color.hexCode,
      garmentSizeId: nextSize?.id ?? null,
      garmentSize: nextSize?.name ?? '',
    });
  };

  const selectSize = (size: DtfStudioSizeOption) => {
    if (size.stockStatus === 'out') return;
    updateState({ garmentSizeId: size.id, garmentSize: size.name });
  };

  return (
    <>
      <motion.div
        key="step1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="glass-card-strong wizard-panel"
      >
        <div className="flex items-center justify-between">
          <div className="step-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-washa-gold" aria-hidden="true" />
            الخطوة ١ من ٦
          </div>
        </div>

        <div className="space-y-2 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.06 }}
            className="step-title-heading text-washa-gold-deep"
          >
            اختر القطعة
          </motion.h2>
          <p className="wizard-copy text-washa-text-sec">اختر القالب، ثم خصص اللون والمقاس المناسبين لتصميمك.</p>
        </div>

        {configLoading ? (
          <GarmentSkeleton />
        ) : (
          <div className="space-y-5">
            {configError ? (
              <p role="alert" className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
                {configError}
              </p>
            ) : null}

            {garmentOptions.length > 0 ? (
              <>
                <section className="space-y-3" aria-labelledby="garment-type-heading">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-washa-gold/75">
                      {arabicCount(garmentOptions.length, 'قطعة متاحة', 'قطعتان متاحتان', 'قطع متاحة')}
                    </span>
                    <h3 id="garment-type-heading" className="flex items-center gap-2 text-base font-bold text-washa-text">
                      <Package2 className="h-5 w-5 text-washa-gold" aria-hidden="true" />
                      نوع القطعة
                    </h3>
                  </div>
                  <GarmentRail garments={garmentOptions} selectedId={state.garmentId} onSelect={selectGarment} />
                </section>

                <AnimatePresence mode="wait">
                  {selectedGarment ? (
                    <GarmentConfiguration
                      key={selectedGarment.id}
                      garment={selectedGarment}
                      colors={colorOptions}
                      sizes={sizeOptions}
                      selectedColorId={state.garmentColorId}
                      selectedSizeId={state.garmentSizeId}
                      onColorSelect={selectColor}
                      onSizeSelect={selectSize}
                    />
                  ) : (
                    <motion.div
                      key="select-garment-empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-2xl border border-dashed border-washa-border/65 bg-washa-bg/50 px-5 py-8 text-center"
                    >
                      <Shirt className="mx-auto h-9 w-9 text-washa-gold/35" aria-hidden="true" />
                      <p className="mt-3 text-sm font-bold text-washa-text">اختر قطعة لعرض الألوان والمقاسات</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-washa-border/65 bg-washa-bg/50 px-5 py-9 text-center">
                <Shirt className="mx-auto h-10 w-10 text-washa-gold/35" aria-hidden="true" />
                <p className="mt-3 font-bold text-washa-text">لا توجد قطع متاحة حاليًا</p>
                <p className="mt-1 text-sm text-washa-text-sec">جرّب مجددًا لاحقًا أو تواصل معنا للمساعدة.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <StepNavigationBar
        onNext={nextStep}
        nextDisabled={!canProceed || configLoading}
        hint={
          canProceed
            ? `${cleanOptionName(state.garmentType)} · ${cleanOptionName(state.garmentColor)} · ${state.garmentSize}`
            : 'اختر القطعة واللون والمقاس للمتابعة'
        }
      />
    </>
  );
}
