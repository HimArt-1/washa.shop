import { motion } from 'motion/react';
import {
  BrushCleaning,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Palette,
  Sparkles,
  SwatchBook,
  Wand2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';
import { CUSTOM_PALETTE_ID, CUSTOM_PALETTE_LABEL } from '../../types';

export default function StepStyle() {
  const {
    state,
    updateState,
    prevStep,
    handleGenerate,
    configLoading,
    configError,
    styleOptions,
    techniqueOptions,
    paletteOptions,
  } = useDesign();

  const customPaletteSelected = state.paletteId === CUSTOM_PALETTE_ID;
  const canGenerate = Boolean(
    state.styleId &&
    state.techniqueId &&
    state.paletteId &&
    (!customPaletteSelected || state.customPalette?.trim())
  );

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-strong p-6 sm:p-10 space-y-10"
    >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ٣ من ٤
        </div>
      </div>

      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          الهوية الفنية
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-washa-text-sec text-lg"
        >
          حدّد أسلوب DTF والتقنية ولوحة الألوان من الإعدادات المفعلة داخل المتجر الذكي
        </motion.p>
      </div>

      {configLoading ? (
        <div className="rounded-3xl border border-washa-border/30 bg-washa-bg/40 p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-washa-gold" />
          <p className="mt-4 text-sm text-washa-text-sec">جاري تحميل خيارات التصميم المتقدمة...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {configError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {configError}
            </div>
          ) : null}

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">{techniqueOptions.length} تقنيات متاحة</span>
              <label className="flex items-center gap-3 text-lg text-washa-text font-medium">
                <BrushCleaning className="h-5 w-5 text-washa-gold" />
                التقنية الفنية
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {techniqueOptions.map((technique, index) => (
                <motion.button
                  key={technique.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.04, duration: 0.35 }}
                  onClick={() => updateState({ techniqueId: technique.id, technique: technique.name })}
                  className={cn(
                    'rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
                    state.techniqueId === technique.id
                      ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                      : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    {technique.imageUrl ? (
                      <img src={technique.imageUrl} alt={technique.name} className="h-14 w-14 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                        <BrushCleaning className="h-6 w-6" />
                      </span>
                    )}
                    {state.techniqueId === technique.id ? (
                      <span className="rounded-full border border-washa-gold/30 bg-washa-gold/10 px-2.5 py-1 text-[10px] font-semibold text-washa-gold">
                        نشط
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-5 space-y-1.5">
                    <p className="text-base font-bold">{technique.name}</p>
                    <p className="text-xs leading-6 text-washa-text-faint line-clamp-2">
                      {technique.description || 'تقنية تنفيذ وتعبير مرئي مخصصة للطباعة DTF.'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">{styleOptions.length} ستايلات متاحة</span>
              <label className="flex items-center gap-3 text-lg text-washa-text font-medium">
                <Sparkles className="h-5 w-5 text-washa-gold" />
                ستايل التصميم
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {styleOptions.map((style, index) => (
                <motion.button
                  key={style.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.04, duration: 0.35 }}
                  onClick={() => updateState({ styleId: style.id, style: style.name })}
                  className={cn(
                    'rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
                    state.styleId === style.id
                      ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                      : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    {style.imageUrl ? (
                      <img src={style.imageUrl} alt={style.name} className="h-14 w-14 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                        <Sparkles className="h-6 w-6" />
                      </span>
                    )}
                    {state.styleId === style.id ? (
                      <span className="rounded-full border border-washa-gold/30 bg-washa-gold/10 px-2.5 py-1 text-[10px] font-semibold text-washa-gold">
                        مختار
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-5 space-y-1.5">
                    <p className="text-base font-bold">{style.name}</p>
                    <p className="text-xs leading-6 text-washa-text-faint line-clamp-2">
                      {style.description || 'اتجاه بصري يحدد شخصية القطعة وشكلها النهائي.'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">{paletteOptions.length + 1} خيارات لونية</span>
              <label className="flex items-center gap-3 text-lg text-washa-text font-medium">
                <SwatchBook className="h-5 w-5 text-washa-gold" />
                لوحة الألوان
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paletteOptions.map((palette, index) => (
                <motion.button
                  key={palette.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + index * 0.04, duration: 0.35 }}
                  onClick={() => updateState({ paletteId: palette.id, palette: palette.name, customPalette: '' })}
                  className={cn(
                    'rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
                    state.paletteId === palette.id
                      ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                      : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    {palette.imageUrl ? (
                      <img src={palette.imageUrl} alt={palette.name} className="h-14 w-14 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                        <Palette className="h-6 w-6" />
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {palette.colors.slice(0, 4).map((color) => (
                        <span
                          key={`${palette.id}-${color.hex}-${color.name}`}
                          className="h-5 w-5 rounded-full border border-white/10"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 space-y-1.5">
                    <p className="text-base font-bold">{palette.name}</p>
                    <p className="text-xs leading-6 text-washa-text-faint line-clamp-2">
                      {palette.description || 'لوحة ألوان جاهزة ومهيأة للتوليد والطباعة.'}
                    </p>
                  </div>
                </motion.button>
              ))}

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26 + paletteOptions.length * 0.04, duration: 0.35 }}
                onClick={() => updateState({ paletteId: CUSTOM_PALETTE_ID, palette: CUSTOM_PALETTE_LABEL })}
                className={cn(
                  'rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
                  customPaletteSelected
                    ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                    : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <Wand2 className="h-6 w-6" />
                  </span>
                  {customPaletteSelected ? (
                    <span className="rounded-full border border-washa-gold/30 bg-washa-gold/10 px-2.5 py-1 text-[10px] font-semibold text-washa-gold">
                      مخصص
                    </span>
                  ) : null}
                </div>
                <div className="mt-5 space-y-1.5">
                  <p className="text-base font-bold">{CUSTOM_PALETTE_LABEL}</p>
                  <p className="text-xs leading-6 text-washa-text-faint">
                    اكتب ألوانك بالكلمات مثل: أسود مطفي، ذهبي قديم، أحمر عنابي عميق.
                  </p>
                </div>
              </motion.button>
            </div>

            {customPaletteSelected ? (
              <div className="rounded-3xl border border-washa-gold/15 bg-washa-bg/35 p-5 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-washa-text">تعليمات لوحة الألوان المخصصة</p>
                  <p className="text-xs leading-6 text-washa-text-faint">
                    صف الجو اللوني بدقة. مثال: أبيض عاجي مع ذهبي باهت ولمسات زيتية داكنة.
                  </p>
                </div>
                <Textarea
                  value={state.customPalette || ''}
                  onChange={(event) => updateState({ customPalette: event.target.value })}
                  placeholder="اكتب وصف لوحة الألوان المخصصة هنا..."
                  className="min-h-[120px] text-base resize-none rounded-xl bg-washa-bg/60 border-washa-border/40 focus:border-washa-gold/50 focus:shadow-[0_0_30px_rgba(201,168,106,0.08)] transition-shadow"
                />
              </div>
            ) : null}
          </section>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          size="lg"
          onClick={prevStep}
          className="gap-2 rounded-xl"
        >
          <ChevronRight className="w-5 h-5" /> رجوع
        </Button>
        <Button
          variant="gold"
          size="lg"
          onClick={handleGenerate}
          disabled={!canGenerate || configLoading}
          className="gap-2 btn-shimmer-effect h-12 px-8 text-base rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
        >
          توليد التصميم <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
