import { useRef } from 'react';
import { motion } from 'motion/react';
import { Shirt, CheckCircle2, Loader2, Package2, Ruler } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDesign } from '../../context/DesignContext';
import { LIGHT_GARMENT_COLORS } from '../../types';
import { siteAsset } from '../../lib/assets';
import StepNavigationBar from './StepNavigationBar';

export default function StepGarment() {
  const garmentListRef = useRef<HTMLDivElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const {
    state,
    updateState,
    nextStep,
    configLoading,
    configError,
    garmentOptions,
    selectedGarment,
    colorOptions,
    sizeOptions,
  } = useDesign();

  const selectedSize = sizeOptions.find((size) => size.id === state.garmentSizeId);
  const canProceed = Boolean(state.garmentId && state.garmentColorId && state.garmentSizeId && selectedSize && selectedSize.stockStatus !== 'out');
  const revealOptions = () => {
    window.setTimeout(() => {
      optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };
  const revealGarments = () => {
    window.setTimeout(() => {
      garmentListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
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
              <span className="text-xs text-washa-gold/60">{garmentOptions.length} قطع متاحة</span>
              <label className="flex items-center gap-3 text-lg text-washa-text font-medium">
                <Package2 className="h-5 w-5 text-washa-gold" />
                نوع القطعة
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {garmentOptions.map((garment, index) => {
                const isSelected = state.garmentId === garment.id;
                return (
                  <motion.button
                    key={garment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.05, duration: 0.35 }}
                    onClick={() => {
                      const nextColor = garment.colors[0] || null;
                      const nextSize =
                        garment.sizes.find((item) => item.colorId === nextColor?.id) ||
                        garment.sizes.find((item) => item.colorId === null) ||
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
                      revealOptions();
                    }}
                    className={cn(
                      'group relative flex flex-col overflow-hidden rounded-2xl border bg-washa-surface/70 text-washa-text shadow-depth-sm transition-all duration-500',
                      isSelected
                        ? 'border-washa-gold bg-washa-ivory shadow-[0_20px_55px_rgba(154,123,61,0.16)] ring-1 ring-washa-gold'
                        : 'border-washa-border/70 hover:border-washa-gold/45 hover:bg-washa-ivory'
                    )}
                  >
                    <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-b border-washa-border/25 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.96),rgba(241,232,215,0.78)_62%,rgba(154,123,61,0.18)_100%)] p-2.5">
                      {isSelected && <div className="absolute inset-0 bg-washa-gold/10 blur-xl" />}
                      {garment.imageUrl ? (
                        <img 
                          src={siteAsset(garment.imageUrl)} 
                          alt={garment.name} 
                          className={cn(
                            'relative z-[1] h-full w-full object-contain object-center drop-shadow-[0_18px_30px_rgba(44,36,24,0.18)] transition-transform duration-700',
                            isSelected ? 'scale-[1.05]' : 'scale-100 group-hover:scale-[1.06]'
                          )}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-washa-surface/20">
                          <Shirt className="h-12 w-12 text-washa-gold/25" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute left-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg shadow-lg">
                          <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="z-10 flex-1 space-y-2 bg-washa-bg/90 p-3 text-right backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          'min-w-0 text-sm font-bold leading-tight transition-colors',
                          isSelected ? 'text-washa-gold-deep' : 'text-washa-text group-hover:text-washa-gold-deep'
                        )}>{garment.name}</p>
                        <div className={cn(
                          'rounded-lg p-1.5 transition-colors',
                          isSelected ? 'bg-washa-gold/[0.18] text-washa-gold-deep' : 'bg-washa-gold/[0.08] text-washa-text-sec group-hover:text-washa-gold-deep'
                        )}>
                          <Shirt className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px] font-bold">
                        <span className={cn(
                          "rounded-md border px-2 py-0.5 backdrop-blur-md",
                          isSelected
                            ? "border-washa-gold/30 bg-washa-gold/15 text-washa-gold"
                            : "border-washa-border bg-washa-bg/85 text-washa-text-sec"
                        )}>{garment.colors.length} ألوان</span>
                        <span className={cn(
                          "rounded-md border px-2 py-0.5 backdrop-blur-md",
                          isSelected
                            ? "border-washa-gold/30 bg-washa-gold/15 text-washa-gold"
                            : "border-washa-border bg-washa-bg/85 text-washa-text-sec"
                        )}>{garment.sizes.length} مقاسات</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-washa-gold shadow-[0_-4px_10px_rgba(201,168,106,0.35)]" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div
            ref={optionsRef}
            className="scroll-mt-24 space-y-5 rounded-2xl border border-washa-border/55 bg-washa-bg/45 p-4 shadow-[0_16px_44px_rgba(154,123,61,0.08)] sm:scroll-mt-28 sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-washa-border/30 pb-3">
              <div className="text-right">
                <p className="text-sm font-bold text-washa-text">{state.garmentType || 'القطعة'}</p>
                <p className="text-xs text-washa-text-faint">
                  {state.garmentColor || 'اختر اللون'}{state.garmentSize ? ` · ${state.garmentSize}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={revealGarments}
                className="rounded-xl border border-washa-gold/25 bg-washa-gold/5 px-3 py-2 text-xs font-bold text-washa-gold transition-colors hover:bg-washa-gold/10"
              >
                تغيير القطعة
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-washa-gold/60">{colorOptions.length} لوناً متوفراً</span>
                <label className="text-base font-medium text-washa-text">لون القطعة</label>
              </div>
              {colorOptions.length > 0 ? (
                <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
                  {colorOptions.map((color, index) => (
                    <motion.button
                      key={color.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.22 + index * 0.03, duration: 0.25 }}
                      onClick={() => {
                        const orderableSizes = selectedGarment?.sizes.filter((item) => item.stockStatus !== 'out') || [];
                        const nextSize =
                          orderableSizes.find((item) => item.colorId === color.id) ||
                          orderableSizes.find((item) => item.colorId === null) ||
                          orderableSizes[0] ||
                          selectedGarment?.sizes.find((item) => item.colorId === color.id) ||
                          null;

                        updateState({
                          garmentColorId: color.id,
                          garmentColor: color.name,
                          garmentColorHex: color.hexCode,
                          garmentSizeId: nextSize?.id || null,
                          garmentSize: nextSize?.name || '',
                        });
                      }}
                      className={cn(
                        'group/color flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all duration-300',
                        state.garmentColorId === color.id
                          ? 'border-washa-gold bg-washa-ivory text-washa-gold-deep shadow-[0_10px_28px_rgba(154,123,61,0.14)]'
                          : 'border-washa-border/45 bg-washa-ivory/55 text-washa-text-sec hover:border-washa-gold/35 hover:bg-washa-ivory'
                      )}
                      title={color.name}
                    >
                      <span
                        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-washa-border/40 shadow-sm"
                        style={{ backgroundColor: color.hexCode }}
                      >
                        {state.garmentColorId === color.id && (
                          <CheckCircle2
                            className={cn(
                              'h-5 w-5 drop-shadow-lg',
                              LIGHT_GARMENT_COLORS.includes(color.name)
                                ? 'text-black'
                                : 'text-white'
                            )}
                            strokeWidth={3}
                          />
                        )}
                      </span>
                      <span className="block max-w-full truncate text-[10px] font-medium leading-4">
                        {color.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-washa-border/30 bg-washa-bg/30 px-4 py-6 text-center text-sm text-washa-text-faint">
                  لا توجد ألوان متاحة لهذه القطعة حالياً.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-washa-gold/60">{sizeOptions.length} مقاسات متاحة</span>
                <label className="flex items-center gap-2 text-base font-medium text-washa-text">
                  <Ruler className="h-4 w-4 text-washa-gold" />
                  المقاس
                </label>
              </div>
              {sizeOptions.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                  {sizeOptions.map((size, index) => {
                    const isOut = size.stockStatus === 'out';
                    const isLow = size.stockStatus === 'low';
                    return (
                      <motion.button
                        key={size.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.32 + index * 0.03, duration: 0.25 }}
                        onClick={() => {
                          if (!isOut) updateState({ garmentSizeId: size.id, garmentSize: size.name });
                        }}
                        disabled={isOut}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-center text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40',
                          state.garmentSizeId === size.id
                            ? 'border-washa-gold bg-washa-ivory text-washa-gold-deep shadow-[0_10px_28px_rgba(154,123,61,0.14)]'
                            : 'border-washa-border/45 bg-washa-ivory/55 text-washa-text-sec hover:border-washa-gold/35 hover:bg-washa-ivory',
                          isOut && 'border-red-500/30 bg-red-500/5 text-red-200',
                          isLow && 'border-amber-400/30 bg-amber-400/5'
                        )}
                      >
                        <span>{size.name}</span>
                        {size.stockStatus && size.stockStatus !== 'untracked' && (
                          <span className="mt-1 block text-[10px] font-medium text-washa-text-faint">
                            {isOut ? 'نفد' : `متبقي ${size.availableQuantity ?? 0}`}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-washa-border/30 bg-washa-bg/30 px-4 py-6 text-center text-sm text-washa-text-faint">
                  لا توجد مقاسات متاحة لهذه القطعة/اللون حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </motion.div>
      <StepNavigationBar
        onNext={nextStep}
        nextDisabled={!canProceed || configLoading}
      />
    </>
  );
}
