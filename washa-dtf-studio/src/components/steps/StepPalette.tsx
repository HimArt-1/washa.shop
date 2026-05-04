import { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { Palette, Check, Sparkles, Wand2, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';
import { CUSTOM_PALETTE_ID, CUSTOM_PALETTE_LABEL } from '../../types';

/* ── Color Swatch Picker ── */
const COLOR_SWATCHES = [
  { hex: '#FF6B6B', name: 'أحمر وردي' },
  { hex: '#EE5A24', name: 'برتقالي' },
  { hex: '#FFD93D', name: 'أصفر ذهبي' },
  { hex: '#6BCB77', name: 'أخضر فاتح' },
  { hex: '#4ECDC4', name: 'تركوازي' },
  { hex: '#45B7D1', name: 'أزرق سماوي' },
  { hex: '#4169E1', name: 'أزرق ملكي' },
  { hex: '#6C5CE7', name: 'بنفسجي' },
  { hex: '#A78BFA', name: 'لافندر' },
  { hex: '#FF6FB5', name: 'وردي صاخب' },
  { hex: '#FFFFFF', name: 'أبيض' },
  { hex: '#F5F5DC', name: 'بيج' },
  { hex: '#C9A86C', name: 'ذهبي' },
  { hex: '#CD853F', name: 'برونزي' },
  { hex: '#8B4513', name: 'بني' },
  { hex: '#556B2F', name: 'زيتي' },
  { hex: '#2F4F4F', name: 'رمادي داكن' },
  { hex: '#191970', name: 'كحلي' },
  { hex: '#800020', name: 'عنابي' },
  { hex: '#36454F', name: 'فحم' },
  { hex: '#FF00C1', name: 'فوشيا' },
  { hex: '#00FF87', name: 'نيون أخضر' },
  { hex: '#00D4FF', name: 'نيون أزرق' },
  { hex: '#111111', name: 'أسود' },
];

const MAX_COLORS = 4;

function CustomColorPicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [selected, setSelected] = useState<string[]>(() => {
    // Parse existing value to pre-select swatches
    if (!value) return [];
    const matched = COLOR_SWATCHES.filter((s) => value.includes(s.name)).map((s) => s.hex);
    return matched.slice(0, MAX_COLORS);
  });

  const syncToParent = useCallback((hexes: string[]) => {
    const names = hexes
      .map((h) => COLOR_SWATCHES.find((s) => s.hex === h)?.name)
      .filter(Boolean);
    onChange(names.length > 0 ? names.join('، ') : '');
  }, [onChange]);

  const toggleColor = (hex: string) => {
    setSelected((prev) => {
      let next: string[];
      if (prev.includes(hex)) {
        next = prev.filter((h) => h !== hex);
      } else if (prev.length < MAX_COLORS) {
        next = [...prev, hex];
      } else {
        return prev;
      }
      syncToParent(next);
      return next;
    });
  };

  const removeColor = (hex: string) => {
    setSelected((prev) => {
      const next = prev.filter((h) => h !== hex);
      syncToParent(next);
      return next;
    });
  };

  return (
    <div className="rounded-3xl border border-washa-gold/15 bg-washa-bg/35 p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-bold text-washa-text">اختر حتى {MAX_COLORS} ألوان</p>
          <p className="text-xs text-washa-text-faint">
            اضغط على الألوان لتحديدها — ستُستخدم في التصميم
          </p>
        </div>
        <span className="text-xs text-washa-gold font-mono">{selected.length}/{MAX_COLORS}</span>
      </div>

      {/* Selected Preview */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selected.map((hex) => {
            const swatch = COLOR_SWATCHES.find((s) => s.hex === hex);
            return (
              <motion.div
                key={hex}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5"
              >
                <span className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: hex }} />
                <span className="text-xs text-washa-text">{swatch?.name}</span>
                <button onClick={() => removeColor(hex)} className="text-washa-text-faint hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Color Grid */}
      <div className="grid grid-cols-8 sm:grid-cols-12 gap-2">
        {COLOR_SWATCHES.map((swatch) => {
          const isActive = selected.includes(swatch.hex);
          const isFull = selected.length >= MAX_COLORS && !isActive;

          return (
            <button
              key={swatch.hex}
              onClick={() => toggleColor(swatch.hex)}
              disabled={isFull}
              title={swatch.name}
              className={cn(
                'relative w-full aspect-square rounded-xl border-2 transition-all duration-300',
                isActive
                  ? 'border-washa-gold scale-110 shadow-[0_0_12px_rgba(201,168,106,0.5)] z-10'
                  : isFull
                    ? 'border-transparent opacity-30 cursor-not-allowed'
                    : 'border-transparent hover:border-white/40 hover:scale-105'
              )}
              style={{ backgroundColor: swatch.hex }}
            >
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StepPalette() {
  const {
    state,
    updateState,
    prevStep,
    handleGenerate,
    configLoading,
    configError,
    paletteOptions,
  } = useDesign();

  const customPaletteSelected = state.paletteId === CUSTOM_PALETTE_ID;
  const canGenerate = Boolean(
    state.styleId &&
    state.paletteId &&
    (!customPaletteSelected || state.customPalette?.trim())
  );

  return (
    <motion.div
      key="step-palette"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-strong p-6 sm:p-10 space-y-10"
    >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ٥ من ٦
        </div>
      </div>

      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          الألوان وتفضيلات الإخراج
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-washa-text-sec text-lg"
        >
          اختر لوحة الألوان وتفضيلات الإخراج لضمان طباعة أنظف على القطعة
        </motion.p>
      </div>

      {configLoading ? (
        <div className="rounded-3xl border border-washa-border/30 bg-washa-bg/40 p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-washa-gold" />
          <p className="mt-4 text-sm text-washa-text-sec">جاري التحميل...</p>
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
              <span className="text-xs text-washa-gold/60">{paletteOptions.length + 1} خيارات لونية</span>
            </div>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {paletteOptions.map((palette, index) => (
                <motion.button
                  key={palette.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + index * 0.04, duration: 0.35 }}
                  onClick={() => updateState({ paletteId: palette.id, palette: palette.name, customPalette: '' })}
                  className={cn(
                    'group relative flex flex-col gap-4 rounded-2xl border p-5 text-right transition-all duration-500',
                    state.paletteId === palette.id
                      ? 'border-washa-gold bg-washa-gold/10 shadow-[0_0_30px_rgba(201,168,106,0.15)] ring-1 ring-washa-gold'
                      : 'border-white/10 bg-white/[0.02] hover:border-washa-gold/40 hover:bg-white/[0.04]'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex -space-x-2">
                      {palette.colors.slice(0, 4).map((color, cIdx) => (
                        <div
                          key={`${palette.id}-${color.hex}-${cIdx}`}
                          className="h-10 w-10 rounded-full border-2 border-washa-bg shadow-lg"
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                    {state.paletteId === palette.id && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 pt-2">
                    <p className="text-lg font-bold text-white group-hover:text-washa-gold transition-colors">{palette.name}</p>
                    <p className="text-xs text-washa-text-faint line-clamp-2 leading-relaxed">
                      {palette.description || 'لوحة ألوان متوازنة ومصممة بدقة للطباعة.'}
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
                  'group relative flex flex-col gap-4 rounded-2xl border p-5 text-right transition-all duration-500',
                  customPaletteSelected
                    ? 'border-washa-gold bg-washa-gold/10 shadow-[0_0_30px_rgba(201,168,106,0.15)] ring-1 ring-washa-gold'
                    : 'border-white/10 bg-white/[0.02] hover:border-washa-gold/40 hover:bg-white/[0.04]'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-washa-gold to-washa-gold-dark text-washa-bg shadow-lg">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  {customPaletteSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 pt-2">
                  <p className="text-lg font-bold text-white group-hover:text-washa-gold transition-colors">{CUSTOM_PALETTE_LABEL}</p>
                  <p className="text-xs text-washa-text-faint leading-relaxed">
                    حدد ألوانك الخاصة بدقة لتحصل على نتيجة فريدة ومخصصة.
                  </p>
                </div>
              </motion.button>
            </div>

            {customPaletteSelected ? (
              <CustomColorPicker
                value={state.customPalette || ''}
                onChange={(val) => updateState({ customPalette: val })}
              />
            ) : null}
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">مفعّلة افتراضيًا لنتيجة أنظف</span>
              <label className="flex items-center gap-3 text-lg text-washa-text font-medium">
                <Wand2 className="h-5 w-5 text-washa-gold" />
                تفضيلات الإخراج
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.35 }}
                onClick={() => updateState({ removeBackground: !state.removeBackground })}
                className={cn(
                  'rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
                  state.removeBackground
                    ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                    : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold',
                      state.removeBackground
                        ? 'border border-washa-gold/30 bg-washa-gold/10 text-washa-gold'
                        : 'border border-white/10 bg-white/[0.03] text-washa-text-faint'
                    )}
                  >
                    {state.removeBackground ? <Check className="h-3 w-3" /> : null}
                    {state.removeBackground ? 'مفعّل' : 'غير مفعّل'}
                  </span>
                </div>
                <div className="mt-5 space-y-1.5">
                  <p className="text-base font-bold">بدون خلفية</p>
                  <p className="text-xs leading-6 text-washa-text-faint">
                    يمنع أي مربع لوني أو مساحة مصمتة خلف العنصر حتى يظهر التصميم كطباعة مباشرة ونظيفة على القطعة.
                  </p>
                </div>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.35 }}
                onClick={() => updateState({ avoidHardEdges: !state.avoidHardEdges })}
                className={cn(
                  'rounded-2xl border p-5 text-right transition-all duration-500 card-interactive',
                  state.avoidHardEdges
                    ? 'border-washa-gold bg-washa-gold/10 text-washa-gold shadow-[0_0_35px_rgba(201,168,106,0.15)]'
                    : 'border-white/5 bg-white/[0.02] text-washa-text-sec hover:border-washa-gold/30 hover:bg-white/[0.05]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <Wand2 className="h-6 w-6" />
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold',
                      state.avoidHardEdges
                        ? 'border border-washa-gold/30 bg-washa-gold/10 text-washa-gold'
                        : 'border border-white/10 bg-white/[0.03] text-washa-text-faint'
                    )}
                  >
                    {state.avoidHardEdges ? <Check className="h-3 w-3" /> : null}
                    {state.avoidHardEdges ? 'مفعّل' : 'غير مفعّل'}
                  </span>
                </div>
                <div className="mt-5 space-y-1.5">
                  <p className="text-base font-bold">بدون حواف إلزامية</p>
                  <p className="text-xs leading-6 text-washa-text-faint">
                    يمنع الإطار أو القصّة المربعة أو حدود الصورة القسرية ما لم تكن جزءًا مقصودًا من الفكرة نفسها.
                  </p>
                </div>
              </motion.button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs leading-6 text-washa-text-faint">
              هذه التفضيلات تُضمَّن تلقائيًا داخل وصف التوليد قبل إرسال الطلب إلى النموذج.
            </div>
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
