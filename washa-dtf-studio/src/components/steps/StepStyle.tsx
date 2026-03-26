import { motion } from 'motion/react';
import { Wand2, Palette, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useDesign } from '../../context/DesignContext';
import { ArtisticStyle, Technique, ColorPalette, STYLE_PROMPTS, TECHNIQUE_PROMPTS, PALETTE_PROMPTS } from '../../types';

const STYLES = Object.keys(STYLE_PROMPTS) as ArtisticStyle[];
const TECHNIQUES = Object.keys(TECHNIQUE_PROMPTS) as Technique[];
const PALETTES = Object.keys(PALETTE_PROMPTS) as ColorPalette[];

const TECHNIQUE_ICONS: Record<string, string> = {
  'رسم رقمي': '🖥️',
  'ألوان مائية': '🎨',
  'ألوان زيتية': '🖌️',
  'رسم بالقلم': '✏️',
  'ايربراش': '💨',
  'حبر': '🖋️',
  'طباعة ريزوغراف': '📠',
};

const STYLE_ICONS: Record<string, string> = {
  'ملصق': '🏷️',
  'أنمي/مانغا': '🎌',
  'بوب آرت': '🎭',
  'جرافيتي': '🎨',
  'فن الخطوط': '〰️',
  'هندسي': '🔷',
  'بكسل آرت': '👾',
  'فينتيج': '📷',
  'سايبر بانك': '🤖',
  'بسيط': '⬜',
  'ثلاثي الأبعاد': '🧊',
};

const PALETTE_COLORS: Record<ColorPalette, string[]> = {
  'تلقائي (Auto)': ['#CCCCCC', '#999999', '#666666'],
  'نيون ساطع (Neon)': ['#00FFFF', '#FF00FF', '#00FF00'],
  'باستيل هادئ (Pastel)': ['#FFB6C1', '#ADD8E6', '#98FB98'],
  'أحادي اللون (Monochrome)': ['#FFFFFF', '#888888', '#000000'],
  'ألوان ترابية (Earth)': ['#8B4513', '#CD853F', '#556B2F'],
  'ريترو 80s (Retro)': ['#FF69B4', '#FF8C00', '#8A2BE2'],
  'فيبورويف (Vaporwave)': ['#00d4ff', '#ff00c1', '#9d00ff'],
  'تخصيص... (Custom)': ['#FFFFFF', '#CCCCCC', '#999999'],
};

export default function StepStyle() {
  const { state, updateState, prevStep, handleGenerate } = useDesign();

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-strong p-6 sm:p-10 space-y-10"
    >
      {/* Step Badge */}
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ٣ من ٤
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          لمسة الإبداع الأخيرة
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-washa-text-sec text-lg"
        >
          خصص الأسلوب والألوان لتوليد قطعة فنية فريدة
        </motion.p>
      </div>

      <div className="space-y-10">
        {/* Artistic Technique */}
        <div className="space-y-5">
          <div className="flex items-center justify-end gap-3">
            <span className="text-lg text-washa-text font-semibold">الأسلوب الفني</span>
            <Wand2 className="w-5 h-5 text-washa-gold" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TECHNIQUES.map((tech, i) => {
              const nameAr = tech.split(' (')[0];
              const nameEn = tech.match(/\((.*?)\)/)?.[1] || '';
              return (
                <motion.button
                  key={tech}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04, duration: 0.35 }}
                  onClick={() => updateState({ technique: tech })}
                  className={cn(
                    'p-4 rounded-2xl border text-sm transition-all duration-500 text-center relative overflow-hidden group card-interactive',
                    state.technique === tech
                      ? 'border-washa-gold bg-washa-gold/12 text-washa-gold shadow-[0_0_30px_rgba(201,168,106,0.12)]'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-washa-text-sec hover:border-washa-gold/30'
                  )}
                >
                  <span className="text-xl block mb-1.5">{TECHNIQUE_ICONS[nameAr] || '🎨'}</span>
                  <span className="relative z-10 font-medium text-sm block">{nameAr}</span>
                  <span className="block text-[9px] opacity-40 mt-0.5 uppercase tracking-wide">
                    {nameEn}
                  </span>
                  {state.technique === tech && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-gradient-to-t from-washa-gold/8 to-transparent pointer-events-none"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Design Pattern (Artistic Style) */}
        <div className="space-y-5">
          <div className="flex items-center justify-end gap-3">
            <span className="text-lg text-washa-text font-semibold">نمط التصميم</span>
            <Palette className="w-5 h-5 text-washa-gold" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {STYLES.map((style, i) => {
              const nameAr = style.split(' (')[0];
              return (
                <motion.button
                  key={style}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.04, duration: 0.35 }}
                  onClick={() => updateState({ style })}
                  className={cn(
                    'p-4 rounded-2xl border text-sm transition-all duration-500 text-center relative group card-interactive',
                    state.style === style
                      ? 'border-washa-gold bg-washa-gold/12 text-washa-gold shadow-[0_0_30px_rgba(201,168,106,0.12)]'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-washa-text-sec hover:border-washa-gold/30'
                  )}
                >
                  <span className="text-xl block mb-1.5">{STYLE_ICONS[nameAr] || '🎨'}</span>
                  <span className="font-medium text-sm">{nameAr}</span>
                  {state.style === style && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-gradient-to-t from-washa-gold/8 to-transparent pointer-events-none rounded-2xl"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Color Palette */}
        <div className="space-y-5">
          <div className="flex items-center justify-end gap-3">
            <span className="text-lg text-washa-text font-semibold">ألوان التصميم</span>
            <Sparkles className="w-5 h-5 text-washa-gold" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PALETTES.map((palette, i) => (
              <motion.button
                key={palette}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.04, duration: 0.35 }}
                onClick={() => updateState({ palette })}
                className={cn(
                  'p-4 rounded-2xl border text-sm transition-all duration-500 text-center flex flex-col items-center gap-3 group card-interactive',
                  state.palette === palette
                    ? 'border-washa-gold bg-washa-gold/12 text-washa-gold shadow-[0_0_30px_rgba(201,168,106,0.12)]'
                    : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-washa-text-sec hover:border-washa-gold/30'
                )}
              >
                <div className="flex gap-1.5 justify-center">
                  {PALETTE_COLORS[palette].map((color, ci) => (
                    <div
                      key={ci}
                      className={cn(
                        'w-4 h-4 rounded-full border border-white/15 shadow-sm transition-transform duration-300',
                        state.palette === palette && 'scale-110'
                      )}
                      style={{
                        backgroundColor: color,
                        boxShadow: state.palette === palette ? `0 0 8px ${color}40` : 'none',
                      }}
                    />
                  ))}
                </div>
                <span className="font-medium text-sm">{palette.split(' (')[0]}</span>
              </motion.button>
            ))}
          </div>

          {/* Custom Palette Input */}
          {state.palette === 'تخصيص... (Custom)' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-4"
            >
              <textarea
                value={state.customPalette || ''}
                onChange={(e) => updateState({ customPalette: e.target.value })}
                placeholder="مثلاً: أزرق سماوي مع لمسات ذهبية غامقة..."
                className="w-full bg-washa-bg/50 border border-washa-gold/30 rounded-2xl p-6 text-washa-text text-right focus:outline-none focus:border-washa-gold focus:shadow-[0_0_30px_rgba(201,168,106,0.08)] transition-all min-h-[100px] text-lg placeholder:text-white/20"
              />
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={prevStep} className="gap-2 rounded-xl hover:bg-washa-gold/5">
          <ChevronRight className="w-4 h-4" /> السابق
        </Button>
        <Button
          variant="gold"
          size="lg"
          onClick={handleGenerate}
          className="gap-3 btn-shimmer-effect h-14 px-10 text-lg rounded-xl font-bold shadow-[0_0_30px_rgba(201,168,106,0.3)]"
        >
          <Wand2 className="w-5 h-5" /> توليد التصميم
        </Button>
      </div>
    </motion.div>
  );
}
