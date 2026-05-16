import { motion } from 'motion/react';
import { Shirt, CheckCircle2, ChevronLeft, Loader2, Package2, Ruler } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';
import { LIGHT_GARMENT_COLORS } from '../../types';
import { siteAsset } from '../../lib/assets';

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

  const selectedSize = sizeOptions.find((size) => size.id === state.garmentSizeId);
  const canProceed = Boolean(state.garmentId && state.garmentColorId && state.garmentSizeId && selectedSize && selectedSize.stockStatus !== 'out');

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
          الخطوة ١ من ٦
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    }}
                    className={cn(
                      'group relative h-64 overflow-hidden rounded-3xl border transition-all duration-500',
                      isSelected
                        ? 'border-washa-gold bg-washa-gold/10 shadow-[0_0_40px_rgba(201,168,106,0.15)] ring-1 ring-washa-gold'
                        : 'border-white/10 bg-white/[0.02] hover:border-washa-gold/30 hover:bg-white/[0.05]'
                    )}
                  >
                    {/* Garment Image */}
                    <div className="absolute inset-0 z-0">
                      {garment.imageUrl ? (
                        <img 
                          src={siteAsset(garment.imageUrl)} 
                          alt={garment.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-washa-surface/20">
                          <Shirt className="w-16 h-16 text-white/5" />
                        </div>
                      )}
                    </div>

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-washa-bg via-washa-bg/60 to-transparent z-10 opacity-90" />

                    {/* Content */}
                    <div className="absolute inset-x-0 bottom-0 z-20 p-5 space-y-2 text-right">
                      <div className="flex items-center justify-between">
                        {isSelected && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg">
                            <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                          </div>
                        )}
                        <p className={cn(
                          "text-xl font-bold transition-colors w-full",
                          isSelected ? "text-washa-gold" : "text-white group-hover:text-washa-gold/80"
                        )}>{garment.name}</p>
                      </div>
                      <div className="flex items-center justify-end gap-3 text-xs text-washa-text-faint/80">
                        <span className="bg-black/40 px-2 py-1 rounded-md backdrop-blur-md">{garment.colors.length} ألوان</span>
                        <span className="bg-black/40 px-2 py-1 rounded-md backdrop-blur-md">{garment.sizes.length} مقاسات</span>
                      </div>
                    </div>

                    {/* Subtle bottom accent for selected state */}
                    {isSelected && (
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-washa-gold shadow-[0_-4px_10px_rgba(201,168,106,0.5)] z-20" />
                    )}
                  </motion.button>
                );
              })}
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
                        'rounded-2xl border px-4 py-4 text-center text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40',
                        state.garmentSizeId === size.id
                          ? 'border-washa-gold bg-washa-gold/12 text-washa-gold'
                          : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]',
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
