import { motion } from 'motion/react';
import { Shirt, CheckCircle2, ChevronLeft, Loader2, Package2, Ruler } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';
import { LIGHT_GARMENT_COLORS } from '../../types';

export default function StepGarment() {
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

  const canProceed = Boolean(state.garmentId && state.garmentColorId && state.garmentSizeId);

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-strong p-6 sm:p-10 space-y-10"
    >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ١ من ٤
        </div>
      </div>

      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          اختر القطعة
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-washa-text-sec text-lg"
        >
          هذه الخيارات تأتي مباشرة من إعدادات المتجر الذكي في لوحة الإدارة
        </motion.p>
      </div>

      {configLoading ? (
        <div className="rounded-3xl border border-washa-border/30 bg-washa-bg/40 p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-washa-gold" />
          <p className="mt-4 text-sm text-washa-text-sec">جاري تحميل إعدادات DTF من المتجر الذكي...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {configError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {configError}
            </div>
          ) : null}

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">{garmentOptions.length} قطع مفعّلة</span>
              <label className="flex items-center gap-3 text-lg text-washa-text font-medium">
                <Package2 className="h-5 w-5 text-washa-gold" />
                نوع القطعة
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {garmentOptions.map((garment, index) => (
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
                  }}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
                    state.garmentId === garment.id
                      ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                      : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    {garment.imageUrl ? (
                      <img src={garment.imageUrl} alt={garment.name} className="h-14 w-14 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                        <Shirt className="h-6 w-6" />
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-washa-text-sec">
                      {garment.colors.length} لون
                    </span>
                  </div>
                  <div className="mt-5 space-y-1">
                    <p className="text-base font-bold">{garment.name}</p>
                    <p className="text-xs text-washa-text-faint">{garment.sizes.length} مقاس متاح</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">{colorOptions.length} لوناً متوفراً</span>
              <label className="text-lg text-washa-text font-medium">لون القطعة</label>
            </div>
            {colorOptions.length > 0 ? (
              <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                {colorOptions.map((color, index) => (
                  <motion.button
                    key={color.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.22 + index * 0.03, duration: 0.25 }}
                    onClick={() => {
                      const nextSize =
                        selectedGarment?.sizes.find((item) => item.colorId === color.id) ||
                        selectedGarment?.sizes.find((item) => item.colorId === null) ||
                        selectedGarment?.sizes[0] ||
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
                      'w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 transition-all duration-500 relative group/color',
                      state.garmentColorId === color.id
                        ? 'border-washa-gold scale-115 shadow-[0_0_25px_rgba(201,168,106,0.5)] ring-2 ring-washa-gold/20 ring-offset-2 ring-offset-washa-bg'
                        : 'border-white/10 hover:border-white/30 hover:scale-110'
                    )}
                    style={{ backgroundColor: color.hexCode }}
                    title={color.name}
                  >
                    {state.garmentColorId === color.id && (
                      <CheckCircle2
                        className={cn(
                          'absolute inset-0 m-auto w-6 h-6 drop-shadow-lg',
                          LIGHT_GARMENT_COLORS.includes(color.name)
                            ? 'text-black'
                            : 'text-white'
                        )}
                      />
                    )}
                    <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] sm:text-[11px] text-washa-text opacity-0 group-hover/color:opacity-100 transition-all transform translate-y-1 group-hover/color:translate-y-0 whitespace-nowrap font-medium pointer-events-none bg-washa-surface/90 px-2 py-0.5 rounded-md backdrop-blur-sm">
                      {color.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-washa-border/30 bg-washa-bg/30 px-4 py-6 text-center text-sm text-washa-text-faint">
                لا توجد ألوان مفعّلة لهذه القطعة داخل المتجر الذكي.
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">{sizeOptions.length} مقاسات نشطة</span>
              <label className="flex items-center gap-3 text-lg text-washa-text font-medium">
                <Ruler className="h-5 w-5 text-washa-gold" />
                المقاس
              </label>
            </div>
            {sizeOptions.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {sizeOptions.map((size, index) => (
                  <motion.button
                    key={size.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 + index * 0.03, duration: 0.25 }}
                    onClick={() => updateState({ garmentSizeId: size.id, garmentSize: size.name })}
                    className={cn(
                      'rounded-2xl border px-4 py-4 text-center text-sm font-semibold transition-all duration-300',
                      state.garmentSizeId === size.id
                        ? 'border-washa-gold bg-washa-gold/12 text-washa-gold'
                        : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                    )}
                  >
                    {size.name}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-washa-border/30 bg-washa-bg/30 px-4 py-6 text-center text-sm text-washa-text-faint">
                لا توجد مقاسات مفعّلة لهذه القطعة/اللون.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          variant="gold"
          size="lg"
          onClick={nextStep}
          disabled={!canProceed || configLoading}
          className="gap-2 btn-shimmer-effect h-12 px-8 text-base rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          التالي <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
