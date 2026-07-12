import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Check, ShieldCheck, Wand2, Loader2, X, LockKeyhole } from 'lucide-react';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';
import { CUSTOM_PALETTE_ID, CUSTOM_PALETTE_LABEL } from '../../types';
import StepNavigationBar from './StepNavigationBar';
import { isCleanOutputEnabled } from '../../lib/outputPreferences';

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
    <div className="space-y-4 rounded-2xl border border-washa-gold/15 bg-washa-bg/35 p-4 sm:p-5">
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
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
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
                'relative aspect-square w-full rounded-lg border-2 transition-all duration-300',
                isActive
                  ? 'border-washa-gold scale-110 shadow-[0_0_12px_rgba(64,48,40,0.5)] z-10'
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
  const cleanOutputEnabled = isCleanOutputEnabled(state);
  const canGenerate = Boolean(
    state.styleId &&
    state.paletteId &&
    (!customPaletteSelected || state.customPalette?.trim())
  );

  const generateHint = (
    <span className="inline-flex items-center justify-center gap-1.5 sm:justify-end">
      <LockKeyhole className="h-3.5 w-3.5 text-washa-gold/70" />
      يتطلب التوليد تسجيل الدخول لحفظ التصميم وربطه بطلبك
    </span>
  );

  return (
    <>
      <motion.div
        key="step-palette"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="glass-card-strong wizard-panel"
      >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="h-1.5 w-1.5 rounded-full bg-washa-gold" aria-hidden="true" />
          الخطوة ٥ من ٦
        </div>
      </div>

      <div className="text-center space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="step-title-heading bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          الألوان
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="wizard-copy text-washa-text-sec"
        >
          اختر لوحة الألوان المناسبة لتصميمك
        </motion.p>
      </div>

      {configLoading ? (
        <div className="rounded-2xl border border-washa-border/30 bg-washa-bg/40 p-7 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-washa-gold" />
          <p className="mt-4 text-sm text-washa-text-sec">جاري التحميل...</p>
        </div>
      ) : (
        <div className="space-y-7">
          {configError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {configError}
            </div>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-washa-gold/60">{paletteOptions.length + 1} خيارات لونية</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paletteOptions.map((palette, index) => (
                <motion.button
                  key={palette.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 + index * 0.04, duration: 0.35 }}
                  onClick={() => updateState({ paletteId: palette.id, palette: palette.name, customPalette: '' })}
                  className={cn(
                    'group relative flex flex-col gap-3 rounded-2xl border p-4 text-right transition-all duration-500',
                    state.paletteId === palette.id
                      ? 'border-washa-gold bg-washa-ivory shadow-[0_0_30px_rgba(64,48,40,0.15)] ring-1 ring-washa-gold'
                      : 'border-washa-border/45 bg-washa-bg/45 hover:border-washa-gold/40 hover:bg-washa-ivory'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex -space-x-2">
                      {palette.colors.slice(0, 4).map((color, cIdx) => (
                        <div
                          key={`${palette.id}-${color.hex}-${cIdx}`}
                          className="h-8 w-8 rounded-full border-2 border-washa-bg shadow-lg"
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
                  
                  <div className="space-y-1.5 pt-1">
                    <p className="text-base font-bold text-washa-text transition-colors group-hover:text-washa-gold-deep">{palette.name}</p>
                    <p className="text-xs text-washa-text-sec line-clamp-2 leading-relaxed">
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
                  'group relative flex flex-col gap-3 rounded-2xl border p-4 text-right transition-all duration-500',
                  customPaletteSelected
                    ? 'border-washa-gold bg-washa-ivory shadow-[0_0_30px_rgba(64,48,40,0.15)] ring-1 ring-washa-gold'
                    : 'border-washa-border/45 bg-washa-bg/45 hover:border-washa-gold/40 hover:bg-washa-ivory'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-washa-gold to-washa-gold-dark text-washa-bg shadow-lg">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  {customPaletteSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="text-base font-bold text-washa-text transition-colors group-hover:text-washa-gold-deep">{CUSTOM_PALETTE_LABEL}</p>
                  <p className="text-xs leading-relaxed text-washa-text-sec">
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

          <section className="border-t border-washa-border/35 pt-4" aria-labelledby="output-preference-title">
            <button
              type="button"
              aria-pressed={cleanOutputEnabled}
              onClick={() => updateState({
                removeBackground: !cleanOutputEnabled,
                avoidHardEdges: !cleanOutputEnabled,
              })}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-right transition-[border-color,background-color,transform] duration-200 active:scale-[0.99]',
                cleanOutputEnabled
                  ? 'border-washa-gold/35 bg-washa-gold/[0.07]'
                  : 'border-washa-border/45 bg-washa-bg/35 hover:border-washa-gold/30',
              )}
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', cleanOutputEnabled ? 'bg-washa-gold text-washa-bg' : 'bg-washa-elevated text-washa-text-faint')}>
                <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span id="output-preference-title" className="block text-sm font-bold text-washa-text">إخراج نظيف للطباعة</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-washa-text-sec">
                  {cleanOutputEnabled ? 'بدون خلفية وبدون حواف خارجية — مضمّن في التوليد' : 'يسمح بخلفية وحدود خارجية عند الحاجة'}
                </span>
              </span>
              <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200', cleanOutputEnabled ? 'bg-washa-gold' : 'bg-washa-border')} aria-hidden="true">
                <span className={cn('absolute left-1 top-1 h-4 w-4 rounded-full bg-washa-ivory shadow-sm transition-transform duration-200', cleanOutputEnabled ? 'translate-x-5' : 'translate-x-0')} />
              </span>
            </button>
          </section>
        </div>
      )}

      </motion.div>
      <StepNavigationBar
        onBack={prevStep}
        onNext={() => void handleGenerate()}
        nextLabel="توليد التصميم"
        nextDisabled={!canGenerate || configLoading}
        hint={generateHint}
      />
    </>
  );
}
