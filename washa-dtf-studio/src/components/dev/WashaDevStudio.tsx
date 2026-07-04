import { useMemo, useState, type ChangeEvent, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileImage,
  History,
  Image as ImageIcon,
  Loader2,
  Palette,
  PenLine,
  RotateCcw,
  Ruler,
  Shirt,
  ShoppingBag,
  Sparkles,
  Type,
  Wand2,
  X,
} from 'lucide-react';
import { useDesign } from '../../context/DesignContext';
import { siteAsset, studioAsset } from '../../lib/assets';
import { cn } from '../../lib/utils';
import {
  CUSTOM_PALETTE_ID,
  CUSTOM_PALETTE_LABEL,
  LIGHT_GARMENT_COLORS,
  type DesignMethod,
  type DtfStudioCreativeOption,
  type DtfStudioPaletteOption,
  type DtfStudioSizeOption,
  type PrintPosition,
} from '../../types';
import { resolvePrintPlacementFromOption } from '../../lib/placement';
import { enhanceDesignIdea } from '../../services/ideaEnhancerService';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface WashaDevStudioProps {
  onOpenGallery: () => void;
}

const BRAND_MARK_SRC = 'header-logo-identity.png';

const STEPS = [
  { num: 1, label: 'القطعة' },
  { num: 2, label: 'الفكرة' },
  { num: 3, label: 'المكان' },
  { num: 4, label: 'الأسلوب' },
  { num: 5, label: 'الألوان' },
  { num: 6, label: 'الطلب' },
];

const STEP_META = {
  1: {
    eyebrow: 'اختيار القطعة',
    title: 'اختر القطعة التي ستولد عليها تصميمك',
    subtitle: 'ابدأ من قالب حقيقي متاح في استوديو وشا، ثم اختر اللون والمقاس قبل الانتقال للفكرة.',
  },
  2: {
    eyebrow: 'مدخل الفكرة',
    title: 'ما الفكرة التي تريد أن ترتديها؟',
    subtitle: 'اكتب وصفا، ارفع صورة مرجعية، أو حوّل عبارة إلى مخطوطة فنية.',
  },
  3: {
    eyebrow: 'منطقة الطباعة',
    title: 'حدد مكان التصميم على القطعة',
    subtitle: 'اختر موضع الطباعة من الخيارات الفعلية المرتبطة بالمنتج والتسعير.',
  },
  4: {
    eyebrow: 'لغة التصميم',
    title: 'اختر الأسلوب والتقنية',
    subtitle: 'الأسلوب يحدد الشكل العام، والتقنية تحدد طريقة المعالجة الفنية للتصميم.',
  },
  5: {
    eyebrow: 'إخراج الطباعة',
    title: 'اختر الألوان وتفضيلات الإخراج',
    subtitle: 'اضبط لوحة الألوان وطلبات النظافة الطباعية قبل إرسال التصميم للتوليد.',
  },
  6: {
    eyebrow: 'النتيجة النهائية',
    title: 'راجع التصميم وأرسله للسلة',
    subtitle: '',
  },
} as const;

const IDEA_SUGGESTIONS = [
  'ذئب هندسي بخطوط حادة',
  'نخلة مجردة بلمسة ذهبية',
  'فراشة كونية ناعمة',
  'شعار عربي بسيط للصدر',
  'تراث نجدي بأسلوب معاصر',
  'موجة بحرية بخطوط نظيفة',
];

const CALLIGRAPHY_SUGGESTIONS = [
  'لا غالب إلا الله',
  'والفجر',
  'صبر جميل',
  'كن فيكون',
  'أنا من أنا',
  'ولكل وجهة',
];

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
};

function assetOrEmpty(path: string | null | undefined) {
  return path ? studioAsset(path) : '';
}

function getImagePreview(imageBase64: string | null, mimeType: string | null) {
  if (!imageBase64) return null;
  return `data:${mimeType || 'image/png'};base64,${imageBase64}`;
}

function getPositionFallback(position: PrintPosition | null | undefined) {
  return position === 'back' ? 'generated/washa_pos_back.png' : 'generated/washa_pos_front.png';
}

function getSizePreview(size: DtfStudioSizeOption | null, fallback: string | null | undefined, side: 'front' | 'back' = 'front') {
  if (side === 'back' && size?.imageBackUrl) return siteAsset(size.imageBackUrl);
  if (size?.imageFrontUrl) return siteAsset(size.imageFrontUrl);
  return fallback ? siteAsset(fallback) : '';
}

function DevHeader({ onOpenGallery }: WashaDevStudioProps) {
  const { step } = useDesign();
  const currentStep = STEPS.find((item) => item.num === step) || STEPS[0];

  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-[#c9a84c24] bg-[#FAF8F4]/92 backdrop-blur-2xl">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <button
          onClick={onOpenGallery}
          className="inline-flex items-center gap-2 rounded-full border border-[#c9a84c24] bg-white/70 px-3 py-2 text-xs font-bold text-[#8B7A5E] transition hover:border-[#C9A84C]/45 hover:text-[#1A1A1A] active:scale-[0.98]"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">الأرشيف</span>
        </button>

        <nav className="hidden items-start md:flex" aria-label="خطوات التصميم">
          {STEPS.map((item, index) => {
            const isActive = step === item.num;
            const isDone = step > item.num;
            return (
              <div key={item.num} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      'relative flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition-all duration-300',
                      isActive || isDone
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-white shadow-[0_10px_26px_rgba(201,168,76,0.24)]'
                        : 'border-[#C9A84C]/25 bg-white/50 text-[#C9A84C]/60'
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" strokeWidth={3} /> : item.num}
                    {isActive ? (
                      <span className="absolute inset-[-7px] rounded-full border border-[#C9A84C]/25 motion-safe:animate-ping" />
                    ) : null}
                  </div>
                  <span className={cn('text-[10px] font-bold', isActive || isDone ? 'text-[#C9A84C]' : 'text-[#8B7A5E]/55')}>
                    {item.label}
                  </span>
                </div>
                {index < STEPS.length - 1 ? (
                  <div className="mx-1 mt-4 h-px w-8 bg-[#C9A84C]/20 lg:w-14">
                    <div className={cn('h-full bg-[#C9A84C] transition-all duration-500', isDone ? 'w-full' : 'w-0')} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="flex flex-1 justify-center px-3 md:hidden">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#C9A84C]/20 bg-white/70 px-3 py-2 text-xs font-black text-[#8B7A5E] shadow-[0_10px_26px_rgba(26,26,26,0.05)]">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#C9A84C] px-2 text-white">{step}</span>
            <span className="truncate">{currentStep.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden border-r border-[#C9A84C]/24 pr-3 text-left sm:block">
            <p className="text-[10px] font-bold tracking-[0.24em] text-[#8B7A5E]">DEV STUDIO</p>
            <p className="text-[11px] font-semibold text-[#8B7A5E]/70">WASHA AI dev</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#1A1A1A] shadow-[0_14px_28px_rgba(26,26,26,0.18)]">
            <img src={siteAsset(BRAND_MARK_SRC)} alt="وشى" className="h-full w-full object-contain p-2" />
          </div>
        </div>
      </div>
    </header>
  );
}

function PageIntro() {
  const { step } = useDesign();
  const meta = STEP_META[step as keyof typeof STEP_META] || STEP_META[1];

  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 bg-white/60 px-4 py-2 text-[11px] font-black text-[#C9A84C]">
        <Sparkles className="h-3.5 w-3.5" />
        {meta.eyebrow}
      </div>
      <h1 className="text-balance font-alnaseeb text-3xl font-black leading-[1.35] text-[#1A1A1A] sm:text-5xl">
        {meta.title}
      </h1>
      {meta.subtitle ? (
        <p className="mx-auto mt-4 max-w-[62ch] text-pretty text-sm leading-7 text-[#8B7A5E] sm:text-base">
          {meta.subtitle}
        </p>
      ) : null}
    </div>
  );
}

function DevFrame({ children }: { children: ReactNode }) {
  return (
    <motion.div
      key="dev-step-frame"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto mt-6 w-full max-w-[1180px] sm:mt-10"
    >
      {children}
    </motion.div>
  );
}

function EmptyAsset({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#C9A84C]/24 bg-[#FAF8F4] text-[#8B7A5E]">
      <Shirt className="h-8 w-8 text-[#C9A84C]/55" strokeWidth={1.7} />
      <span className="text-xs font-bold">{label}</span>
    </div>
  );
}

function StepGarmentDev() {
  const {
    state,
    updateState,
    configLoading,
    configError,
    garmentOptions,
    selectedSize,
    sizeOptions,
  } = useDesign();

  const selectGarment = (garment: (typeof garmentOptions)[number]) => {
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
  };

  return (
    <DevFrame>
      {configError ? (
        <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {configError}
        </div>
      ) : null}

      {configLoading ? (
        <div className="grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-[360px] rounded-3xl bg-white/75 p-5">
              <div className="h-52 rounded-2xl animate-shimmer" />
              <div className="mt-6 h-5 w-2/3 rounded-full animate-shimmer" />
              <div className="mt-4 h-4 w-1/2 rounded-full animate-shimmer" />
            </div>
          ))}
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {garmentOptions.map((garment, index) => {
            const active = state.garmentId === garment.id;
            const preview = active
              ? getSizePreview(selectedSize, garment.imageUrl)
              : assetOrEmpty(garment.imageUrl);

            return (
              <motion.article
                key={garment.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                role={active ? undefined : 'button'}
                tabIndex={active ? -1 : 0}
                aria-selected={active}
                onClick={() => {
                  if (!active) selectGarment(garment);
                }}
                onKeyDown={(event) => {
                  if (active) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectGarment(garment);
                  }
                }}
                className={cn(
                  'group relative overflow-hidden rounded-[28px] border bg-white p-5 text-right transition-all duration-300',
                  active
                    ? 'md:col-span-2 xl:col-span-2 border-[#C9A84C] shadow-[0_22px_60px_rgba(201,168,76,0.14)] ring-4 ring-[#C9A84C]/12'
                    : 'cursor-pointer border-transparent shadow-[0_12px_34px_rgba(26,26,26,0.06)] hover:-translate-y-1 hover:border-[#C9A84C]/30 active:scale-[0.99]'
                )}
              >
                {active ? (
                  <span className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-[#C9A84C] px-3 py-2 text-xs font-black text-white shadow-[0_8px_18px_rgba(201,168,76,0.24)]">
                    <Check className="h-4 w-4" strokeWidth={3} />
                    مختارة الآن
                  </span>
                ) : null}

                <div className={cn(active ? 'grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]' : '')}>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#F2EFE8]">
                    {preview ? (
                      <img
                        src={preview}
                        alt={garment.name}
                        className="h-full w-full object-contain object-center"
                      />
                    ) : (
                      <EmptyAsset label="لا توجد صورة" />
                    )}
                  </div>

                  <div className={cn(active ? 'flex flex-col' : 'mt-5')}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={cn('font-alnaseeb font-black text-[#1A1A1A]', active ? 'text-3xl leading-tight sm:text-4xl' : 'text-2xl')}>
                          {garment.name}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#8B7A5E]">
                          {active
                            ? `${state.garmentColor || 'اختر اللون'} · ${state.garmentSize || 'اختر المقاس'}`
                            : `${garment.colors.length} ألوان · ${garment.sizes.length} مقاسات`}
                        </p>
                      </div>
                      {!active ? (
                        <div className="flex -space-x-2 space-x-reverse pt-1">
                          {garment.colors.slice(0, 4).map((color) => (
                            <span
                              key={color.id}
                              className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: color.hexCode }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {active ? (
                      <div className="mt-6 space-y-5">
                        <div>
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-black text-[#8B7A5E]">لون القطعة</span>
                            <span className="text-xs font-bold text-[#C9A84C]">{garment.colors.length} متاح</span>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {garment.colors.map((color) => {
                              const on = state.garmentColorId === color.id;
                              return (
                                <button
                                  key={color.id}
                                  type="button"
                                  onClick={() => {
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
                                  }}
                                  title={color.name}
                                  className={cn(
                                    'relative h-11 w-11 rounded-full border-2 transition-all hover:scale-105 active:scale-[0.96]',
                                    on ? 'border-[#C9A84C] ring-4 ring-[#C9A84C]/14' : 'border-[#E5DCC8]'
                                  )}
                                  style={{ backgroundColor: color.hexCode }}
                                >
                                  {on ? (
                                    <Check
                                      className={cn(
                                        'absolute inset-0 m-auto h-5 w-5',
                                        LIGHT_GARMENT_COLORS.includes(color.name) ? 'text-[#1A1A1A]' : 'text-white'
                                      )}
                                      strokeWidth={3}
                                    />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-black text-[#8B7A5E]">المقاس</span>
                            <Ruler className="h-4 w-4 text-[#C9A84C]" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {sizeOptions.map((size) => {
                              const on = state.garmentSizeId === size.id;
                              const out = size.stockStatus === 'out';
                              return (
                                <button
                                  key={size.id}
                                  type="button"
                                  disabled={out}
                                  onClick={() => updateState({ garmentSizeId: size.id, garmentSize: size.name })}
                                  className={cn(
                                    'rounded-2xl border px-3 py-3 text-center text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
                                    on ? 'border-[#C9A84C] bg-[#C9A84C] text-white' : 'border-[#E9DFC9] bg-[#FAF8F4] text-[#1A1A1A] hover:border-[#C9A84C]/45'
                                  )}
                                >
                                  {size.name}
                                  {size.stockStatus === 'low' ? <span className="block text-[10px] opacity-70">محدود</span> : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </section>
      )}
      {selectedSize?.stockStatus === 'out' ? (
        <p className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          المقاس المحدد غير متوفر حاليا. اختر مقاسا آخر للمتابعة.
        </p>
      ) : null}
    </DevFrame>
  );
}

function StepIdeaDev() {
  const { state, updateState, handleImageUpload, showToast } = useDesign();
  const [dragging, setDragging] = useState(false);
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);
  const referencePreview = getImagePreview(state.referenceImage, state.referenceImageMimeType);

  const handleEnhanceIdea = async () => {
    const idea = state.prompt.trim();
    if (!idea || isEnhancingIdea) return;

    setIsEnhancingIdea(true);
    try {
      const result = await enhanceDesignIdea({
        idea,
        garmentType: state.garmentType,
        style: state.style,
        technique: state.technique,
        palette: state.palette,
      });

      if (result.enhancedIdea) {
        updateState({ prompt: result.enhancedIdea });
        showToast(result.source === 'ai' ? 'تم تحسين الوصف بالذكاء الاصطناعي' : 'تم تحسين الوصف محلياً', result.source === 'ai' ? 'success' : 'info');
      }
    } catch {
      showToast('تعذر تحسين الوصف الآن', 'error');
    } finally {
      setIsEnhancingIdea(false);
    }
  };

  const tabs: { id: DesignMethod; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { id: 'text', label: 'وصف الفكرة', icon: Type },
    { id: 'image', label: 'صورة مرجعية', icon: ImageIcon },
    { id: 'calligraphy', label: 'مخطوطة', icon: PenLine },
  ];

  return (
    <DevFrame>
      <div className="rounded-[30px] border border-[#C9A84C]/18 bg-white shadow-[0_18px_55px_rgba(26,26,26,0.06)]">
        <div className="flex flex-wrap gap-2 border-b border-[#C9A84C]/12 p-4">
          {tabs.map(({ id, label, icon: Icon }) => {
            const on = state.designMethod === id;
            return (
              <button
                key={id}
                onClick={() => updateState({ designMethod: id })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition active:scale-[0.98]',
                  on ? 'bg-[#C9A84C] text-white shadow-[0_10px_22px_rgba(201,168,76,0.18)]' : 'bg-[#FAF8F4] text-[#8B7A5E] hover:text-[#1A1A1A]'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="p-5 sm:p-7">
          <AnimatePresence mode="wait">
            {state.designMethod === 'text' ? (
              <motion.div key="text" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-black text-[#1A1A1A]">وصف التصميم</label>
                  <Textarea
                    value={state.prompt}
                    onChange={(event) => updateState({ prompt: event.target.value })}
                    placeholder="مثال: ذئب هندسي بخطوط حادة يرمز للقوة والصمود، بألوان داكنة وذهبية"
                    className="min-h-[210px] resize-none rounded-3xl border-[#C9A84C]/20 bg-[#FAF8F4] p-6 text-base leading-8 text-[#1A1A1A] focus-visible:ring-[#C9A84C]/35"
                    maxLength={420}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleEnhanceIdea}
                      disabled={!state.prompt.trim() || isEnhancingIdea}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-4 py-2 text-sm font-black text-[#9A7B3D] transition hover:border-[#C9A84C]/45 hover:bg-[#C9A84C]/15 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isEnhancingIdea ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {isEnhancingIdea ? 'جاري التحسين' : 'حسّن الفكرة'}
                    </button>
                    <p className="text-left text-xs font-bold text-[#8B7A5E]">{state.prompt.length}/420</p>
                  </div>
                </div>
                <SuggestionRail
                  title="أفكار ملهمة"
                  items={IDEA_SUGGESTIONS}
                  active={state.prompt}
                  onPick={(value) => updateState({ prompt: value })}
                />
              </motion.div>
            ) : null}

            {state.designMethod === 'image' ? (
              <motion.div key="image" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                <label
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const file = event.dataTransfer.files?.[0];
                    if (!file) return;
                    const syntheticEvent = { target: { files: [file] } } as unknown as ChangeEvent<HTMLInputElement>;
                    handleImageUpload(syntheticEvent);
                  }}
                  className={cn(
                    'flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed bg-[#FAF8F4] p-8 text-center transition',
                    dragging ? 'border-[#C9A84C] ring-4 ring-[#C9A84C]/10' : 'border-[#C9A84C]/24 hover:border-[#C9A84C]/45'
                  )}
                >
                  {referencePreview ? (
                    <div className="relative h-52 w-52 overflow-hidden rounded-3xl border border-[#C9A84C]/20 bg-white shadow-[0_14px_34px_rgba(26,26,26,0.08)]">
                      <img src={referencePreview} alt="الصورة المرجعية" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#C9A84C] shadow-[0_12px_24px_rgba(26,26,26,0.06)]">
                      <FileImage className="h-7 w-7" strokeWidth={1.7} />
                    </span>
                  )}
                  <div>
                    <p className="font-black text-[#1A1A1A]">اسحب الصورة هنا أو اختر ملفا</p>
                    <p className="mt-2 text-xs font-bold text-[#8B7A5E]">PNG, JPG, WEBP حتى 10MB</p>
                  </div>
                  <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
                </label>
                <Textarea
                  value={state.prompt}
                  onChange={(event) => updateState({ prompt: event.target.value })}
                  placeholder="اختياري: اكتب توجيها يساعد الذكاء الاصطناعي على فهم الصورة"
                  className="min-h-[110px] resize-none rounded-3xl border-[#C9A84C]/20 bg-white p-5 text-sm leading-7"
                />
              </motion.div>
            ) : null}

            {state.designMethod === 'calligraphy' ? (
              <motion.div key="calligraphy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                <Textarea
                  value={state.calligraphyText}
                  onChange={(event) => updateState({ calligraphyText: event.target.value })}
                  placeholder="اكتب الكلمة أو العبارة"
                  className="min-h-[180px] resize-none rounded-3xl border-[#C9A84C]/20 bg-[#FAF8F4] p-7 text-center font-alnaseeb text-3xl leading-[1.7] text-[#1A1A1A]"
                  maxLength={80}
                  dir="auto"
                />
                <p className="text-left text-xs font-bold text-[#8B7A5E]">{state.calligraphyText.length}/80</p>
                <SuggestionRail
                  title="عبارات مقترحة"
                  items={CALLIGRAPHY_SUGGESTIONS}
                  active={state.calligraphyText}
                  onPick={(value) => updateState({ calligraphyText: value })}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </DevFrame>
  );
}

function SuggestionRail({
  title,
  items,
  active,
  onPick,
}: {
  title: string;
  items: string[];
  active: string;
  onPick: (value: string) => void;
}) {
  return (
    <div className="rounded-3xl border border-[#C9A84C]/14 bg-[#FAF8F4] p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-black text-[#1A1A1A]">{title}</span>
        <Wand2 className="h-4 w-4 text-[#C9A84C]" />
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onPick(item)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-bold transition active:scale-[0.98]',
              active === item ? 'border-[#C9A84C] bg-white text-[#C9A84C]' : 'border-[#C9A84C]/18 bg-white/50 text-[#8B7A5E] hover:text-[#1A1A1A]'
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPositionDev() {
  const { state, updateState, positionOptions, selectedGarment, selectedSize } = useDesign();
  const selectedOption = positionOptions.find((item) => item.id === state.printOptionId) || positionOptions[0] || null;
  const selectedPlacement = resolvePrintPlacementFromOption(selectedOption);
  const getPositionPreview = (
    position: (typeof positionOptions)[number] | null,
    placement = resolvePrintPlacementFromOption(position)
  ) => assetOrEmpty(position?.imageUrl) || studioAsset(getPositionFallback(placement.printPosition));
  const fallbackSide = selectedPlacement.printPosition === 'back' ? 'back' : 'front';
  const previewImage = getPositionPreview(selectedOption, selectedPlacement) || getSizePreview(selectedSize, selectedGarment?.imageUrl, fallbackSide);

  return (
    <DevFrame>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-[30px] border border-[#C9A84C]/18 bg-white p-5 shadow-[0_18px_55px_rgba(26,26,26,0.06)] sm:p-7">
          <div className="relative overflow-hidden rounded-[26px] bg-[#F2EFE8]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(201,168,76,0.14),transparent_45%)]" />
            <div className="relative mx-auto flex min-h-[440px] max-w-[560px] items-center justify-center p-8">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={selectedOption?.name || 'معاينة موضع الطباعة'}
                  data-testid="print-position-preview-image"
                  className="max-h-[390px] w-full object-contain drop-shadow-[0_20px_34px_rgba(26,26,26,0.14)]"
                />
              ) : (
                <EmptyAsset label="لا توجد معاينة" />
              )}
              <div className={cn(
                'absolute rounded-3xl border-2 border-dashed border-[#C9A84C] bg-[#C9A84C]/12 shadow-[0_0_0_8px_rgba(201,168,76,0.06)]',
                selectedPlacement.printPosition === 'back'
                  ? 'top-[30%] h-28 w-32'
                  : selectedPlacement.printSize === 'small'
                    ? selectedPlacement.printPosition === 'shoulder_left'
                      ? 'right-[56%] top-[27%] h-16 w-16'
                      : 'left-[56%] top-[27%] h-16 w-16'
                    : 'top-[31%] h-28 w-32'
              )}>
                <span className="absolute inset-0 m-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C] text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-[30px] border border-[#C9A84C]/18 bg-white p-5 shadow-[0_18px_55px_rgba(26,26,26,0.06)] sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-black text-[#1A1A1A]">مواقع الطباعة</span>
            <span className="rounded-full bg-[#FAF8F4] px-3 py-1 text-xs font-bold text-[#C9A84C]">{positionOptions.length} خيارات</span>
          </div>
          <div className="grid gap-3">
            {positionOptions.map((position, index) => {
              const placement = resolvePrintPlacementFromOption(position);
              const active = state.printOptionId === position.id;
              const image = getPositionPreview(position, placement);
              return (
                <motion.button
                  key={position.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.28 }}
                  onClick={() => updateState({
                    designPosition: placement.designPosition,
                    printOptionId: position.id,
                    printPosition: placement.printPosition,
                    printSize: placement.printSize,
                    printPositionLabel: position.name,
                  })}
                  className={cn(
                    'grid grid-cols-[92px_1fr] gap-4 rounded-3xl border p-3 text-right transition active:scale-[0.99]',
                    active ? 'border-[#C9A84C] bg-[#C9A84C]/8 ring-4 ring-[#C9A84C]/10' : 'border-[#E9DFC9] bg-[#FAF8F4] hover:border-[#C9A84C]/40'
                  )}
                >
                  <div className="h-24 overflow-hidden rounded-2xl bg-white">
                    <img src={image} alt={position.name} data-position-option-image={position.id} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex min-w-0 flex-col justify-center">
                    <p className="font-black text-[#1A1A1A]">{position.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8B7A5E]">{position.description || 'موضع طباعة جاهز للتطبيق على القطعة.'}</p>
                    <p className="mt-2 text-xs font-black text-[#C9A84C]">{typeof position.price === 'number' && position.price > 0 ? `${position.price} ر.س` : 'ضمن السعر'}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>
      </div>
    </DevFrame>
  );
}

function CreativeCard({
  option,
  active,
  image,
  label,
  icon: Icon,
  onClick,
  index,
}: {
  option: DtfStudioCreativeOption;
  active: boolean;
  image: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.28 }}
      onClick={onClick}
      className={cn(
        'group relative min-h-[220px] overflow-hidden rounded-[26px] border text-right transition active:scale-[0.99]',
        active ? 'border-[#C9A84C] shadow-[0_18px_42px_rgba(201,168,76,0.14)] ring-4 ring-[#C9A84C]/12' : 'border-transparent shadow-[0_12px_34px_rgba(26,26,26,0.06)] hover:border-[#C9A84C]/32'
      )}
    >
      <div className="absolute inset-0 bg-[#1A1A1A]">
        {image ? (
          <img
            src={image}
            alt={option.name}
            className="h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.05]"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        ) : null}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/45 to-transparent" />
      <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-xl">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {active ? (
        <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C] text-white">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-lg font-black text-white">{option.name}</p>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/72">{option.description || 'اختيار بصري مناسب للتوليد والطباعة.'}</p>
      </div>
    </motion.button>
  );
}

function StepArtStyleDev() {
  const { state, updateState, styleOptions, techniqueOptions, configLoading, configError } = useDesign();

  return (
    <DevFrame>
      {configError ? (
        <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {configError}
        </div>
      ) : null}
      {configLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-52 rounded-[26px] animate-shimmer" />)}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-alnaseeb text-2xl font-black text-[#1A1A1A]">الأسلوب الفني</h2>
              <span className="text-xs font-black text-[#C9A84C]">{styleOptions.length} أساليب</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {styleOptions.map((option, index) => (
                <CreativeCard
                  key={option.id}
                  option={option}
                  active={state.styleId === option.id}
                  image={assetOrEmpty(option.imageUrl) || studioAsset(STYLE_THUMBNAILS[option.name] || '')}
                  label="أسلوب"
                  icon={Palette}
                  index={index}
                  onClick={() => updateState({ styleId: option.id, style: option.name })}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-alnaseeb text-2xl font-black text-[#1A1A1A]">تقنية التنفيذ</h2>
              <span className="text-xs font-black text-[#C9A84C]">{techniqueOptions.length} تقنيات</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {techniqueOptions.map((option, index) => (
                <CreativeCard
                  key={option.id}
                  option={option}
                  active={state.techniqueId === option.id}
                  image={assetOrEmpty(option.imageUrl) || studioAsset(TECHNIQUE_THUMBNAILS[option.name] || '')}
                  label="تقنية"
                  icon={Wand2}
                  index={index}
                  onClick={() => updateState({ techniqueId: option.id, technique: option.name })}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </DevFrame>
  );
}

function PaletteCard({
  palette,
  active,
  onClick,
  index,
}: {
  palette: DtfStudioPaletteOption;
  active: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.28 }}
      onClick={onClick}
      className={cn(
        'rounded-[26px] border bg-white p-5 text-right shadow-[0_12px_34px_rgba(26,26,26,0.05)] transition active:scale-[0.99]',
        active ? 'border-[#C9A84C] ring-4 ring-[#C9A84C]/12' : 'border-transparent hover:border-[#C9A84C]/32'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2 space-x-reverse">
          {palette.colors.slice(0, 4).map((color, colorIndex) => (
            <span
              key={`${palette.id}-${color.hex}-${colorIndex}`}
              className="h-11 w-11 rounded-2xl border-2 border-white shadow-sm"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
        {active ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C] text-white"><Check className="h-4 w-4" strokeWidth={3} /></span> : null}
      </div>
      <p className="mt-5 text-lg font-black text-[#1A1A1A]">{palette.name}</p>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#8B7A5E]">{palette.description || 'لوحة ألوان مهيأة للطباعة.'}</p>
    </motion.button>
  );
}

function ToggleOutput({
  checked,
  title,
  description,
  onClick,
}: {
  checked: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-[24px] border p-5 text-right transition active:scale-[0.99]',
        checked ? 'border-[#C9A84C] bg-[#C9A84C]/8' : 'border-[#E9DFC9] bg-white'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-black text-[#1A1A1A]">{title}</p>
          <p className="mt-2 text-xs leading-6 text-[#8B7A5E]">{description}</p>
        </div>
        <span className={cn('relative mt-1 h-7 w-12 rounded-full transition', checked ? 'bg-[#C9A84C]' : 'bg-[#E6DDCA]')}>
          <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all', checked ? 'right-6' : 'right-1')} />
        </span>
      </div>
    </button>
  );
}

function StepPaletteDev() {
  const { state, updateState, paletteOptions, configLoading, configError } = useDesign();
  const customSelected = state.paletteId === CUSTOM_PALETTE_ID;

  return (
    <DevFrame>
      {configError ? (
        <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {configError}
        </div>
      ) : null}
      {configLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-44 rounded-[26px] animate-shimmer" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paletteOptions.map((palette, index) => (
                <PaletteCard
                  key={palette.id}
                  palette={palette}
                  active={state.paletteId === palette.id}
                  index={index}
                  onClick={() => updateState({ paletteId: palette.id, palette: palette.name, customPalette: '' })}
                />
              ))}
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: paletteOptions.length * 0.035, duration: 0.28 }}
                onClick={() => updateState({ paletteId: CUSTOM_PALETTE_ID, palette: CUSTOM_PALETTE_LABEL })}
                className={cn(
                  'flex min-h-[176px] flex-col justify-center rounded-[26px] border p-5 text-right shadow-[0_12px_34px_rgba(26,26,26,0.05)] transition active:scale-[0.99]',
                  customSelected ? 'border-[#C9A84C] bg-[#C9A84C]/8 ring-4 ring-[#C9A84C]/12' : 'border-dashed border-[#C9A84C]/26 bg-white hover:border-[#C9A84C]/50'
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[conic-gradient(from_120deg,#C9A84C,#4A6FA5,#5B8B6F,#C97878,#C9A84C)] text-white shadow-sm">
                  <Palette className="h-5 w-5" />
                </span>
                <p className="mt-5 text-lg font-black text-[#1A1A1A]">لوحة مخصصة</p>
                <p className="mt-2 text-xs leading-5 text-[#8B7A5E]">اكتب ألوانك أو اختر اتجاهك اللوني الخاص.</p>
              </motion.button>
            </div>

            {customSelected ? (
              <Textarea
                value={state.customPalette || ''}
                onChange={(event) => updateState({ customPalette: event.target.value })}
                placeholder="مثال: ذهبي مطفي، فحمي، أبيض عاجي، لمسة خضراء"
                className="min-h-[120px] resize-none rounded-[26px] border-[#C9A84C]/20 bg-white p-5 text-sm leading-7"
              />
            ) : null}
          </section>

          <aside className="space-y-4 rounded-[30px] border border-[#C9A84C]/18 bg-white p-6 shadow-[0_18px_55px_rgba(26,26,26,0.06)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-[#1A1A1A]">تفضيلات الإخراج</span>
              <Wand2 className="h-5 w-5 text-[#C9A84C]" />
            </div>
            <ToggleOutput
              checked={state.removeBackground}
              title="بدون خلفية"
              description="يمنع أي مربع لوني خلف التصميم حتى تظهر الطباعة مباشرة على القماش."
              onClick={() => updateState({ removeBackground: !state.removeBackground })}
            />
            <ToggleOutput
              checked={state.avoidHardEdges}
              title="حواف نظيفة"
              description="يمنع القصات المربعة أو الحواف القسرية إلا إذا كانت جزءا من الفكرة."
              onClick={() => updateState({ avoidHardEdges: !state.avoidHardEdges })}
            />
            <div className="rounded-3xl bg-[#FAF8F4] p-5">
              <p className="text-xs font-black text-[#8B7A5E]">جاهزية التوليد</p>
              <p className="mt-2 text-sm font-black text-[#1A1A1A]">{state.style || 'أسلوب'} · {state.technique || 'تقنية'} · {state.palette || 'ألوان'}</p>
            </div>
          </aside>
        </div>
      )}
    </DevFrame>
  );
}

function StepResultDev() {
  const {
    mockupImage,
    isGenerating,
    error,
    state,
    handleDownload,
    setStep,
    resetDesign,
    submitOrder,
    isSubmittingOrder,
    orderResult,
  } = useDesign();
  const [lightbox, setLightbox] = useState(false);
  const [submittingTried, setSubmittingTried] = useState(false);

  return (
    <DevFrame>
      <AnimatePresence>
        {lightbox && mockupImage ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#11100E]/90 p-4 backdrop-blur-xl"
            onClick={() => setLightbox(false)}
          >
            <button
              onClick={() => setLightbox(false)}
              className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={mockupImage} alt="معاينة التصميم بالحجم الكامل" className="max-h-[88dvh] max-w-[92vw] rounded-[28px] object-contain shadow-2xl" onClick={(event) => event.stopPropagation()} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isGenerating ? (
        <div className="rounded-[34px] border border-[#C9A84C]/18 bg-[#1A1A1A] p-8 text-center text-white shadow-[0_28px_80px_rgba(26,26,26,0.25)] sm:p-12">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10">
            <Loader2 className="h-10 w-10 animate-spin text-[#C9A84C]" />
          </div>
          <h2 className="mt-8 font-alnaseeb text-3xl font-black text-[#C9A84C] sm:text-4xl">يتم الآن نسج التصميم</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/62">WASHA AI يحول اختياراتك إلى موكب حقيقي جاهز للمراجعة والطباعة.</p>
          <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-4">
            {['تحليل الفكرة', 'تطبيق الأسلوب', 'ضبط الطباعة', 'مراجعة الجودة'].map((label, index) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <div className="mx-auto mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full bg-[#C9A84C]"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.16, ease: 'easeInOut' }}
                  />
                </div>
                <p className="text-xs font-bold text-white/74">{label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error && !isGenerating && !mockupImage ? (
        <div className="rounded-[30px] border border-red-200 bg-white p-8 text-center shadow-[0_18px_55px_rgba(26,26,26,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500">
            <X className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-black text-[#1A1A1A]">تعذر توليد التصميم</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#8B7A5E]">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => setStep(5)} className="rounded-2xl">تعديل الخيارات</Button>
            <Button variant="gold" onClick={resetDesign} className="rounded-2xl">بدء جديد</Button>
          </div>
        </div>
      ) : null}

      {orderResult && !isGenerating ? (
        <div className="rounded-[30px] border border-[#C9A84C]/20 bg-white p-8 text-center shadow-[0_18px_55px_rgba(26,26,26,0.06)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C9A84C]/12 text-[#C9A84C]">
            <Check className="h-7 w-7" strokeWidth={3} />
          </div>
          <h2 className="mt-5 text-2xl font-black text-[#1A1A1A]">تمت إضافة التصميم إلى السلة</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#8B7A5E]">{orderResult.itemTitle}</p>
          <p className="mt-4 text-xl font-black text-[#C9A84C]">{orderResult.price.toFixed(2)} ر.س</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="/checkout" className="inline-flex h-12 items-center justify-center rounded-xl bg-[#C9A84C] px-8 text-base font-black text-white shadow-[0_12px_24px_rgba(201,168,76,0.18)]">
              إتمام الطلب
            </a>
            <Button variant="outline" onClick={resetDesign} className="rounded-2xl">تصميم جديد</Button>
          </div>
        </div>
      ) : null}

      {mockupImage && !isGenerating && !orderResult ? (
        <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
          <aside className="order-2 space-y-4 rounded-[30px] border border-[#C9A84C]/16 bg-white p-5 shadow-[0_18px_55px_rgba(26,26,26,0.06)] lg:order-1">
            <p className="text-sm font-black text-[#1A1A1A]">ملخص التصميم</p>
            {[
              ['القطعة', state.garmentType],
              ['اللون', state.garmentColor],
              ['المقاس', state.garmentSize],
              ['المكان', state.printPositionLabel || state.designPosition],
              ['الأسلوب', state.style],
              ['التقنية', state.technique],
              ['الألوان', state.palette],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#FAF8F4] px-4 py-3">
                <p className="text-[11px] font-black text-[#8B7A5E]">{label}</p>
                <p className="mt-1 text-sm font-black text-[#1A1A1A]">{value || 'غير محدد'}</p>
              </div>
            ))}
          </aside>

          <section className="order-1 self-start overflow-hidden rounded-[34px] border border-[#C9A84C]/18 bg-white shadow-[0_28px_80px_rgba(92,72,32,0.16)] lg:order-2">
            <button onClick={() => setLightbox(true)} className="block w-full bg-[#F3EFE7]">
              <img src={mockupImage} alt="نتيجة WASHA AI" className="aspect-square w-full object-cover sm:aspect-[4/3]" />
            </button>
            <div className="flex flex-wrap-reverse items-center justify-between gap-3 border-t border-[#C9A84C]/14 bg-[#FAF8F4] p-4 text-[#1A1A1A] sm:p-5">
              <p className="text-sm font-bold text-[#8B7A5E]">قطعتك بتوقيعك جاهزة للطلب</p>
              <Button variant="outline" onClick={() => handleDownload(mockupImage, 'washa-ai-mockup.png')} className="gap-2 rounded-2xl border-[#C9A84C]/24 bg-white/70 text-[#1A1A1A] hover:bg-[#C9A84C]/10">
                <Download className="h-4 w-4" />
                تحميل
              </Button>
            </div>
          </section>

          <aside className="order-3 space-y-4 rounded-[30px] border border-[#C9A84C]/16 bg-white p-5 shadow-[0_18px_55px_rgba(26,26,26,0.06)]">
            <p className="text-sm font-black text-[#1A1A1A]">الإجراءات</p>
            <Button
              variant="gold"
              onClick={async () => {
                setSubmittingTried(true);
                await submitOrder();
              }}
              disabled={isSubmittingOrder}
              className="h-14 w-full gap-2 rounded-2xl text-base"
            >
              {isSubmittingOrder ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
              إضافة إلى السلة
            </Button>
            <Button variant="outline" onClick={() => setStep(5)} className="h-12 w-full gap-2 rounded-2xl">
              <ArrowRight className="h-4 w-4" />
              تعديل الخيارات
            </Button>
            <Button variant="ghost" onClick={resetDesign} className="h-12 w-full gap-2 rounded-2xl">
              <RotateCcw className="h-4 w-4" />
              تصميم جديد
            </Button>
            {submittingTried && error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700">{error}</p>
            ) : null}
          </aside>
        </div>
      ) : null}
    </DevFrame>
  );
}

function FooterControls() {
  const {
    step,
    setStep,
    state,
    selectedSize,
    configLoading,
    handleGenerate,
    isGenerating,
  } = useDesign();

  const canContinue = useMemo(() => {
    if (configLoading || isGenerating) return false;
    if (step === 1) return Boolean(state.garmentId && state.garmentColorId && state.garmentSizeId && selectedSize?.stockStatus !== 'out');
    if (step === 2) {
      if (state.designMethod === 'calligraphy') return Boolean(state.calligraphyText.trim());
      return Boolean(state.prompt.trim() || state.referenceImage);
    }
    if (step === 4) return Boolean(state.styleId && state.techniqueId);
    if (step === 5) return Boolean(state.paletteId && (state.paletteId !== CUSTOM_PALETTE_ID || state.customPalette?.trim()));
    return true;
  }, [configLoading, isGenerating, selectedSize?.stockStatus, state, step]);

  if (step === 6) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#C9A84C]/14 bg-[#FAF8F4]/94 px-4 py-4 backdrop-blur-2xl"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-center gap-2 sm:gap-3">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} className="h-12 shrink-0 gap-2 rounded-2xl px-3 sm:px-5">
            <ArrowRight className="h-4 w-4" />
            <span className="hidden sm:inline">العودة</span>
          </Button>
        ) : null}
        <Button
          variant="gold"
          disabled={!canContinue}
          onClick={() => {
            if (step === 5) {
              void handleGenerate();
              return;
            }
            setStep(Math.min(6, step + 1));
          }}
          className="h-[52px] flex-1 gap-2 rounded-full px-5 text-base disabled:opacity-40 sm:min-w-[190px] sm:flex-none sm:px-8"
        >
          {step === 5 ? (
            <>
              توليد التصميم
              <Wand2 className="h-4 w-4" />
            </>
          ) : (
            <>
              التالي
              <ArrowLeft className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function CurrentStep() {
  const { step } = useDesign();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
        {step === 1 ? <StepGarmentDev /> : null}
        {step === 2 ? <StepIdeaDev /> : null}
        {step === 3 ? <StepPositionDev /> : null}
        {step === 4 ? <StepArtStyleDev /> : null}
        {step === 5 ? <StepPaletteDev /> : null}
        {step === 6 ? <StepResultDev /> : null}
      </motion.div>
    </AnimatePresence>
  );
}

export default function WashaDevStudio({ onOpenGallery }: WashaDevStudioProps) {
  return (
    <div dir="rtl" className="min-h-[100dvh] overflow-x-hidden bg-[#FAF8F4] text-[#1A1A1A]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(201,168,76,0.12),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(139,122,94,0.10),transparent_34%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(26,26,26,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,0.45)_1px,transparent_1px)] [background-size:48px_48px]" />
      <DevHeader onOpenGallery={onOpenGallery} />
      <main className="relative px-3 pb-36 pt-7 sm:px-6 sm:pb-32 sm:pt-10 lg:px-10">
        <PageIntro />
        <CurrentStep />
      </main>
      <FooterControls />
    </div>
  );
}
