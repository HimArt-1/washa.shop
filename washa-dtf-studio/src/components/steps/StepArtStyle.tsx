import { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Loader2, Palette, Brush } from 'lucide-react';
import { useDesign } from '../../context/DesignContext';
import { cn } from '../../lib/utils';
import { studioAsset } from '../../lib/assets';
import StepNavigationBar from './StepNavigationBar';

const STYLE_THUMBNAILS: Record<string, string> = {
  'ملصق (Sticker)': 'thumbnails/styles/sticker.png',
  'أنمي/مانغا (Anime/Manga)': 'thumbnails/styles/anime.png',
  'بوب آرت (Pop Art)': 'thumbnails/styles/pop_art.png',
  'جرافيتي (Graffiti)': 'thumbnails/styles/graffiti.png',
  'فن الخطوط (Line Art)': 'thumbnails/styles/line_art.png',
  'هندسي (Geometric)': 'thumbnails/styles/geometric.png',
  'بكسل آرت (Pixel Art)': 'thumbnails/styles/pixel_art.png',
  'فينتيج (Vintage)': 'thumbnails/styles/vintage.png',
  'سايبر بانك (Cyberpunk)': 'thumbnails/styles/cyberpunk.png',
  'بسيط (Minimalist)': 'thumbnails/styles/minimalist.png',
  'ثلاثي الأبعاد (3D)': 'thumbnails/styles/3d.png',
};

const TECHNIQUE_THUMBNAILS: Record<string, string> = {
  'رسم رقمي (Digital)': 'thumbnails/techniques/digital.png',
  'ألوان مائية (Watercolor)': 'thumbnails/techniques/watercolor.png',
  'ألوان زيتية (Oil)': 'thumbnails/techniques/oil.png',
  'رسم بالقلم (Pen)': 'thumbnails/techniques/pen.png',
  'ايربراش (Airbrush)': 'thumbnails/techniques/airbrush.png',
  'حبر (Ink)': 'thumbnails/techniques/ink.png',
  'طباعة ريزوغراف (Risograph)': 'thumbnails/techniques/risograph.png',
};

/* ── Gradient overlays per category for visual differentiation ── */
const STYLE_GRADIENT = 'from-purple-900/90 via-purple-900/40 to-transparent';
const TECHNIQUE_GRADIENT = 'from-emerald-900/90 via-emerald-900/40 to-transparent';

type TabFilter = 'all' | 'styles' | 'techniques';

export default function StepArtStyle() {
  const {
    state,
    updateState,
    nextStep,
    prevStep,
    configLoading,
    configError,
    styleOptions,
    techniqueOptions,
  } = useDesign();

  const [tab, setTab] = useState<TabFilter>('all');

  // Build a unified list — first styles, then techniques
  const allOptions = [
    ...styleOptions.map((s) => ({
      ...s,
      kind: 'style' as const,
      bgImage: (s.imageUrl ? studioAsset(s.imageUrl) : studioAsset(STYLE_THUMBNAILS[s.name] || '')),
      gradient: STYLE_GRADIENT,
      badge: 'أسلوب',
      badgeIcon: <Palette className="w-3 h-3" />,
    })),
    ...techniqueOptions.map((t) => ({
      ...t,
      kind: 'technique' as const,
      bgImage: (t.imageUrl ? studioAsset(t.imageUrl) : studioAsset(TECHNIQUE_THUMBNAILS[t.name] || '')),
      gradient: TECHNIQUE_GRADIENT,
      badge: 'تقنية',
      badgeIcon: <Brush className="w-3 h-3" />,
    })),
  ];

  const filtered = tab === 'all'
    ? allOptions
    : tab === 'styles'
      ? allOptions.filter((o) => o.kind === 'style')
      : allOptions.filter((o) => o.kind === 'technique');

  const handleSelect = (option: typeof allOptions[0]) => {
    if (option.kind === 'style') {
      updateState({
        styleId: option.id,
        style: option.name,
      });
    } else {
      updateState({
        techniqueId: option.id,
        technique: option.name,
      });
    }
  };

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: allOptions.length },
    { key: 'styles', label: 'الأساليب', count: styleOptions.length },
    { key: 'techniques', label: 'التقنيات', count: techniqueOptions.length },
  ];

  return (
    <>
      <motion.div
        key="step-artstyle"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.97 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card-strong p-6 sm:p-10 space-y-10"
      >
      <div className="flex items-center justify-between">
        <div className="step-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-washa-gold animate-pulse" />
          الخطوة ٤ من ٦
        </div>
      </div>

      <div className="text-center space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-4xl font-serif bg-gradient-to-l from-washa-gold via-washa-gold-light to-washa-gold bg-clip-text text-transparent"
        >
          التقنيات والأساليب الفنية
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-washa-text-sec text-lg"
        >
          اختر الأسلوب أو التقنية التي تريد أن يُنفذ بها تصميمك
        </motion.p>
      </div>

      {configLoading ? (
        <div className="rounded-3xl border border-washa-border/30 bg-washa-bg/40 p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-washa-gold" />
          <p className="mt-4 text-sm text-washa-text-sec">جاري تحميل الأساليب والتقنيات...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {configError ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {configError}
            </div>
          ) : null}

          {/* ── Tab Filter ── */}
          <div className="flex items-center justify-center gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 border',
                  tab === t.key
                    ? 'bg-washa-gold/15 border-washa-gold/40 text-washa-gold shadow-[0_0_15px_rgba(201,168,106,0.15)]'
                    : 'bg-white/[0.02] border-white/10 text-washa-text-sec hover:border-washa-gold/30 hover:text-washa-gold/80'
                )}
              >
                {t.label}
                <span className="mr-1.5 text-xs opacity-60">({t.count})</span>
              </button>
            ))}
          </div>

          {/* ── Card Grid ── */}
          <div className="grid gap-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((option, index) => {
              const isSelected = option.kind === 'style'
                ? state.styleId === option.id
                : state.techniqueId === option.id;

              return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.03, duration: 0.35 }}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'group relative h-52 overflow-hidden rounded-2xl border text-right transition-all duration-500',
                    isSelected
                      ? 'border-washa-gold shadow-[0_0_30px_rgba(201,168,106,0.3)] ring-2 ring-washa-gold ring-offset-2 ring-offset-washa-bg'
                      : 'border-white/10 hover:border-washa-gold/50 hover:shadow-[0_0_20px_rgba(201,168,106,0.15)]'
                  )}
                >
                  {/* Fallback pattern stays behind the artwork and appears if an image is missing or fails. */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-washa-surface via-washa-bg to-washa-surface">
                    {option.kind === 'style'
                      ? <Palette className="h-12 w-12 text-white/10" />
                      : <Brush className="h-12 w-12 text-white/10" />
                    }
                  </div>

                  {/* Background Image */}
                  {option.bgImage ? (
                    <img
                      src={option.bgImage}
                      alt={option.name}
                      className={cn(
                        "absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out",
                        isSelected ? "scale-105" : "group-hover:scale-110"
                      )}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : null}

                  {/* Gradient Overlay */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-t transition-opacity duration-500 group-hover:opacity-100",
                    option.gradient,
                    isSelected ? 'opacity-90' : 'opacity-80'
                  )} />

                  {/* Kind Badge */}
                  <div className={cn(
                    'absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md',
                    option.kind === 'style'
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-400/30'
                      : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                  )}>
                    {option.badgeIcon}
                    {option.badge}
                  </div>

                  {/* Selected Checkmark */}
                  {isSelected && (
                    <div className="absolute top-3 left-3 flex h-6 w-6 items-center justify-center rounded-full bg-washa-gold text-washa-bg shadow-lg">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Content */}
                  <div className="absolute inset-x-0 bottom-0 p-4 space-y-1">
                    <p className="text-base font-bold text-white leading-tight drop-shadow-md">
                      {option.name}
                    </p>
                    <p className="text-[11px] text-white/70 line-clamp-2 drop-shadow-md">
                      {option.description || (option.kind === 'style' ? 'اتجاه بصري مميز' : 'تقنية تنفيذ فنية')}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      </motion.div>
      <StepNavigationBar
        onBack={prevStep}
        onNext={nextStep}
        nextDisabled={(!state.styleId && !state.techniqueId) || configLoading}
      />
    </>
  );
}
