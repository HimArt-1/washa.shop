import { useRef } from 'react';
import { motion } from 'motion/react';
import { Shirt, CheckCircle2, Loader2, Package2, Ruler } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDesign } from '../../context/DesignContext';
import { LIGHT_GARMENT_COLORS, type DtfStudioColorOption, type DtfStudioGarmentOption, type DtfStudioSizeOption } from '../../types';
import { siteAsset } from '../../lib/assets';
import StepNavigationBar from './StepNavigationBar';

function cleanOptionName(value: string) {
  return value.trim().replace(/\s+/g, ' ').replace(/^ابيض$/i, 'أبيض');
}

function arabicCount(count: number, singular: string, dual: string, plural: string) {
  if (count === 1) return `${count} ${singular}`;
  if (count === 2) return `${count} ${dual}`;
  return `${count} ${plural}`;
}

function stockLabel(size: DtfStudioSizeOption) {
  if (size.stockStatus === 'out') return 'نفد';
  if (size.stockStatus === 'low') return `متبقي ${size.availableQuantity ?? 0}`;
  if (typeof size.availableQuantity === 'number') return `متبقي ${size.availableQuantity}`;
  return 'متاح';
}

export default function StepGarment() {
  const garmentListRef = useRef<HTMLDivElement | null>(null);
  const selectedCardRef = useRef<HTMLElement | null>(null);
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

  const selectedSize = sizeOptions.find((size) => size.id === state.garmentSizeId);
  const canProceed = Boolean(state.garmentId && state.garmentColorId && state.garmentSizeId && selectedSize && selectedSize.stockStatus !== 'out');
  const orderedGarmentOptions = state.garmentId
    ? [
        ...garmentOptions.filter((garment) => garment.id === state.garmentId),
        ...garmentOptions.filter((garment) => garment.id !== state.garmentId),
      ]
    : garmentOptions;

  const revealSelectedCard = () => {
    window.setTimeout(() => {
      selectedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const selectGarment = (garment: DtfStudioGarmentOption) => {
    const nextColor = garment.colors[0] || null;
    const orderableSizes = garment.sizes.filter((item) => item.stockStatus !== 'out');
    const nextSize =
      orderableSizes.find((item) => item.colorId === nextColor?.id) ||
      orderableSizes.find((item) => item.colorId === null) ||
      orderableSizes[0] ||
      garment.sizes[0] ||
      null;

    updateState({
      garmentId: garment.id,
      garmentType: garment.name,
      garmentColorId: nextColor?.id || null,
      garmentColor: nextColor?.name || '',
      garmentColorHex: nextColor?.hexCode || '#111111',
      garmentSizeId: nextSize?.id || null,
      garmentSize: nextSize?.name || '',
    });
    revealSelectedCard();
  };

  const selectColor = (garment: DtfStudioGarmentOption, color: DtfStudioColorOption) => {
    const orderableSizes = garment.sizes.filter((item) => item.stockStatus !== 'out');
    const nextSize =
      orderableSizes.find((item) => item.colorId === color.id) ||
      orderableSizes.find((item) => item.colorId === null) ||
      orderableSizes[0] ||
      garment.sizes.find((item) => item.colorId === color.id) ||
      null;

    updateState({
      garmentColorId: color.id,
      garmentColor: color.name,
      garmentColorHex: color.hexCode,
      garmentSizeId: nextSize?.id || null,
      garmentSize: nextSize?.name || '',
    });
  };

  return (
    <>
      <motion.div
        key="step1"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.97 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card-strong wizard-panel"
      >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ١ من ٦
        </div>
      </div>

      <div className="text-center space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="step-title-heading bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          اختر القطعة
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="wizard-copy text-washa-text-sec"
        >
          اختر القالب واللون والمقاس المناسب قبل بدء تصميمك.
        </motion.p>
      </div>

      {configLoading ? (
        <div className="rounded-2xl border border-washa-border/30 bg-washa-bg/40 p-7 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-washa-gold" />
          <p className="mt-4 text-sm text-washa-text-sec">جاري تجهيز خيارات القطع...</p>
        </div>
      ) : (
        <div className="space-y-7">
          {configError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {configError}
            </div>
          ) : null}

          <div ref={garmentListRef} className="scroll-mt-24 space-y-4 sm:scroll-mt-28">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-washa-gold/75">
                {arabicCount(garmentOptions.length, 'قطعة متاحة', 'قطعتان متاحتان', 'قطع متاحة')}
              </span>
              <label className="flex items-center gap-3 text-lg text-washa-text font-medium">
                <Package2 className="h-5 w-5 text-washa-gold" />
                نوع القطعة
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {orderedGarmentOptions.map((garment, index) => {
                const isSelected = state.garmentId === garment.id;
                const visibleColors = isSelected ? colorOptions : garment.colors;
                const visibleSizes = isSelected ? sizeOptions : garment.sizes;
                return (
                  <motion.article
                    key={garment.id}
                    ref={isSelected ? selectedCardRef : undefined}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.05, duration: 0.35 }}
                    className={cn(
                      'group relative scroll-mt-28 overflow-hidden rounded-2xl border bg-washa-surface/70 text-washa-text shadow-depth-sm transition-all duration-500 sm:scroll-mt-32',
                      isSelected
                        ? 'col-span-2 border-washa-gold bg-washa-ivory shadow-[0_20px_55px_rgba(64,48,40,0.16)] ring-1 ring-washa-gold lg:col-span-3'
                        : 'border-washa-border/70 hover:border-washa-gold/45 hover:bg-washa-ivory'
                    )}
                  >
                    <div className={cn(isSelected && 'sm:grid sm:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)]')}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (!isSelected) selectGarment(garment);
                        }}
                        className={cn(
                          'flex w-full flex-col text-right outline-none transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-washa-gold/45',
                          isSelected && 'grid grid-cols-[minmax(0,0.43fr)_minmax(0,0.57fr)] sm:flex sm:flex-col',
                          !isSelected && 'active:scale-[0.99]'
                        )}
                      >
                        <div className={cn(
                          'relative flex w-full items-center justify-center overflow-hidden border-b border-washa-border/25 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.96),rgba(241,232,215,0.78)_62%,rgba(64,48,40,0.18)_100%)] p-2.5',
                          isSelected ? 'aspect-square border-b-0 border-l sm:aspect-[4/3]' : 'aspect-square'
                        )}>
                          {isSelected && <div className="absolute inset-0 bg-washa-gold/10 blur-xl" />}
                          {garment.imageUrl ? (
                            <img
                              src={siteAsset(garment.imageUrl)}
                              alt={garment.name}
                              className={cn(
                                'relative z-[1] h-full w-full object-contain object-center drop-shadow-[0_18px_30px_rgba(44,36,24,0.18)] transition-transform duration-700',
                                isSelected ? 'scale-[1.04]' : 'scale-100 group-hover:scale-[1.06]'
                              )}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-washa-surface/20">
                              <Shirt className="h-12 w-12 text-washa-gold/25" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg shadow-lg">
                              <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                            </div>
                          )}
                        </div>

                        <div className={cn(
                          'z-10 flex-1 space-y-2 bg-washa-bg/90 p-3 text-right backdrop-blur-sm',
                          isSelected && 'flex min-w-0 flex-col justify-center border-washa-border/25 bg-washa-bg/70 sm:border-l sm:p-4'
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn(
                              'min-w-0 text-sm font-bold leading-tight transition-colors',
                              isSelected ? 'text-washa-gold-deep sm:text-base' : 'text-washa-text group-hover:text-washa-gold-deep'
                            )}>{cleanOptionName(garment.name)}</p>
                            <div className={cn(
                              'rounded-lg p-1.5 transition-colors',
                              isSelected ? 'bg-washa-gold/[0.18] text-washa-gold-deep' : 'bg-washa-gold/[0.08] text-washa-text-sec group-hover:text-washa-gold-deep'
                            )}>
                              <Shirt className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px] font-bold">
                            {isSelected ? (
                              <>
                                <span className="rounded-md border border-washa-gold/30 bg-washa-gold/15 px-2 py-0.5 text-washa-gold">
                                  {state.garmentColor ? cleanOptionName(state.garmentColor) : 'اختر اللون'}
                                </span>
                                <span className="rounded-md border border-washa-gold/30 bg-washa-gold/15 px-2 py-0.5 text-washa-gold">
                                  {state.garmentSize || 'اختر المقاس'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="rounded-md border border-washa-border bg-washa-bg/85 px-2 py-0.5 text-washa-text-sec backdrop-blur-md">
                                  {arabicCount(garment.colors.length, 'لون', 'لونان', 'ألوان')}
                                </span>
                                <span className="rounded-md border border-washa-border bg-washa-bg/85 px-2 py-0.5 text-washa-text-sec backdrop-blur-md">
                                  {arabicCount(garment.sizes.length, 'مقاس', 'مقاسان', 'مقاسات')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      {isSelected ? (
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-4 border-t border-washa-border/30 bg-[linear-gradient(155deg,rgba(255,255,255,0.72),rgba(250,247,240,0.72))] p-3 sm:border-t-0 sm:p-5"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-washa-gold/80">
                                {arabicCount(visibleColors.length, 'لون متوفر', 'لونان متوفران', 'ألوان متوفرة')}
                              </span>
                              <label className="text-sm font-bold text-washa-text">لون القطعة</label>
                            </div>
                            {visibleColors.length > 0 ? (
                              <div className="flex flex-wrap justify-end gap-2.5">
                                {visibleColors.map((color) => {
                                  const colorSelected = state.garmentColorId === color.id;
                                  return (
                                    <button
                                      key={color.id}
                                      type="button"
                                      onClick={() => selectColor(garment, color)}
                                      className={cn(
                                        'relative flex h-12 w-12 items-center justify-center rounded-2xl border bg-washa-ivory text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.96]',
                                        colorSelected
                                          ? 'border-washa-gold shadow-[0_12px_28px_rgba(64,48,40,0.18)] ring-2 ring-washa-gold/15'
                                          : 'border-washa-border/55 hover:border-washa-gold/45'
                                      )}
                                      title={cleanOptionName(color.name)}
                                      aria-label={`اختر لون ${cleanOptionName(color.name)}`}
                                    >
                                      <span
                                        className="h-8 w-8 rounded-xl border border-washa-border/45 shadow-inner"
                                        style={{ backgroundColor: color.hexCode }}
                                      />
                                      {colorSelected && (
                                        <CheckCircle2
                                          className={cn(
                                            'absolute h-5 w-5 drop-shadow-lg',
                                            LIGHT_GARMENT_COLORS.includes(color.name) ? 'text-black' : 'text-white'
                                          )}
                                          strokeWidth={3}
                                        />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-washa-border/30 bg-washa-bg/30 px-4 py-5 text-center text-sm text-washa-text-faint">
                                لا توجد ألوان متاحة لهذه القطعة حالياً.
                              </div>
                            )}
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-bold text-washa-gold/80">
                                {arabicCount(visibleSizes.length, 'مقاس متاح', 'مقاسان متاحان', 'مقاسات متاحة')}
                              </span>
                              <label className="flex items-center gap-2 text-sm font-bold text-washa-text">
                                <Ruler className="h-4 w-4 text-washa-gold" />
                                المقاس
                              </label>
                            </div>
                            {visibleSizes.length > 0 ? (
                              <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-4 sm:gap-2">
                                {visibleSizes.map((size) => {
                                  const sizeSelected = state.garmentSizeId === size.id;
                                  const isOut = size.stockStatus === 'out';
                                  const isLow = size.stockStatus === 'low';
                                  return (
                                    <button
                                      key={size.id}
                                      type="button"
                                      onClick={() => {
                                        if (!isOut) updateState({ garmentSizeId: size.id, garmentSize: size.name });
                                      }}
                                      disabled={isOut}
                                      className={cn(
                                        'rounded-2xl border px-2 py-2.5 text-center text-xs font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-3 sm:text-sm',
                                        sizeSelected
                                          ? 'border-washa-gold bg-washa-gold text-washa-bg shadow-[0_12px_28px_rgba(64,48,40,0.16)]'
                                          : 'border-washa-border/50 bg-washa-ivory/85 text-washa-text hover:border-washa-gold/45 hover:bg-washa-ivory',
                                        isOut && 'border-red-500/30 bg-red-500/5 text-red-300',
                                        isLow && !sizeSelected && 'border-amber-400/40 bg-amber-400/5'
                                      )}
                                    >
                                      <span className="block">{size.name}</span>
                                      <span className={cn(
                                        'mt-1 block text-[9px] font-medium leading-3 sm:text-[10px]',
                                        sizeSelected ? 'text-washa-bg/75' : 'text-washa-text-faint'
                                      )}>
                                        {stockLabel(size)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-washa-border/30 bg-washa-bg/30 px-4 py-5 text-center text-sm text-washa-text-faint">
                                لا توجد مقاسات متاحة لهذه القطعة/اللون حالياً.
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ) : null}
                    </div>

                    {isSelected && (
                      <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-washa-gold shadow-[0_-4px_10px_rgba(64,48,40,0.35)]" />
                    )}
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      )}

      </motion.div>
      <StepNavigationBar
        onNext={nextStep}
        nextDisabled={!canProceed || configLoading}
        hint={canProceed ? `${cleanOptionName(state.garmentType)} · ${cleanOptionName(state.garmentColor)} · ${state.garmentSize}` : 'اختر القطعة واللون والمقاس للمتابعة'}
      />
    </>
  );
}
