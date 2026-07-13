import { useEffect, useMemo, useState, type ChangeEvent, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileImage,
  GalleryHorizontalEnd,
  ImageIcon,
  Loader2,
  Package2,
  Palette,
  PenLine,
  RefreshCcw,
  Ruler,
  Shirt,
  ShoppingBag,
  Sparkles,
  Type,
  Wand2,
} from 'lucide-react';
import { useDesign } from '../../context/DesignContext';
import { resolvePrintPlacementFromOption } from '../../lib/placement';
import { siteAsset } from '../../lib/assets';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import {
  CUSTOM_PALETTE_ID,
  CUSTOM_PALETTE_LABEL,
  type DesignMethod,
  type DesignState,
  type DtfStudioColorOption,
  type DtfStudioCreativeOption,
  type DtfStudioGarmentOption,
  type DtfStudioPaletteOption,
  type DtfStudioPositionOption,
  type DtfStudioSizeOption,
} from '../../types';

interface WashaDevStudioV2Props {
  onOpenGallery: () => void;
}

type WizardStepId = 'idea' | 'garment' | 'position' | 'style' | 'palette';
type StudioView = 'wizard' | 'generation';

const BRAND_MARK_SRC = 'header-logo-identity.png';
const CURRENT_APP_PATH = '/design/washa-ai/app';

const WIZARD_STEPS: { id: WizardStepId; label: string; eyebrow: string }[] = [
  { id: 'idea', label: 'الفكرة', eyebrow: '01' },
  { id: 'garment', label: 'القطعة', eyebrow: '02' },
  { id: 'position', label: 'الموضع', eyebrow: '03' },
  { id: 'style', label: 'الأسلوب', eyebrow: '04' },
  { id: 'palette', label: 'الألوان', eyebrow: '05' },
];

const METHOD_TABS: { id: DesignMethod; label: string; hint: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'text', label: 'وصف', hint: 'اكتب الفكرة', icon: Type },
  { id: 'image', label: 'صورة', hint: 'ارفع مرجعا', icon: ImageIcon },
  { id: 'calligraphy', label: 'خط', hint: 'اكتب عبارة', icon: PenLine },
];

const PROMPT_STARTERS = [
  'نمر عربي بأسلوب هندسي فاخر، خطوط حادة، تفاصيل ذهبية، وحضور قوي على قطعة داكنة',
  'شعار شخصي بسيط بحرف عربي واحد، توازن بين الخط الكوفي والملمس الحديث، واضح على القماش',
  'تصميم مستوحى من التراث النجدي بأسلوب معاصر، زخرفة نظيفة، ألوان محدودة وتباين قوي',
];

function assetUrl(path: string | null | undefined) {
  if (!path) return '';
  return siteAsset(path);
}

function referencePreview(state: DesignState) {
  if (!state.referenceImage || !state.referenceImageMimeType) return null;
  return `data:${state.referenceImageMimeType};base64,${state.referenceImage}`;
}

function resolveDefaultSize(garment: DtfStudioGarmentOption | null, colorId?: string | null) {
  if (!garment) return null;
  const orderable = garment.sizes.filter((size) => size.stockStatus !== 'out');
  return (
    orderable.find((size) => size.colorId === colorId) ||
    orderable.find((size) => size.colorId === null) ||
    orderable[0] ||
    garment.sizes[0] ||
    null
  );
}

function resolveGarmentPreview(
  state: DesignState,
  selectedGarment: DtfStudioGarmentOption | null,
  selectedColor: DtfStudioColorOption | null,
  selectedSize: DtfStudioSizeOption | null
) {
  const prefersBack = state.printPosition === 'back';
  const sizeImage = prefersBack
    ? selectedSize?.imageBackUrl || selectedSize?.imageFrontUrl
    : selectedSize?.imageFrontUrl || selectedSize?.imageBackUrl;
  return assetUrl(sizeImage || selectedColor?.imageUrl || selectedGarment?.imageUrl);
}

function getIdeaText(state: DesignState) {
  if (state.designMethod === 'calligraphy') return state.calligraphyText.trim();
  return state.prompt.trim();
}

function getPromptQuality(state: DesignState, selectedSize: DtfStudioSizeOption | null, selectedPalette: DtfStudioPaletteOption | null) {
  const idea = getIdeaText(state);
  let score = 0;

  if (state.designMethod === 'image' && state.referenceImage) score += 18;
  if (idea.length >= 18) score += 22;
  if (idea.length >= 55) score += 18;
  if (state.garmentId && state.garmentColorId && state.garmentSizeId) score += 14;
  if (state.styleId && state.techniqueId) score += 14;
  if (state.paletteId && (selectedPalette || state.paletteId === CUSTOM_PALETTE_ID)) score += 8;
  if (selectedSize?.stockStatus !== 'out') score += 6;

  return Math.min(100, score);
}

function getQualityLabel(score: number) {
  if (score >= 82) return 'واضحة وجاهزة';
  if (score >= 58) return 'جيدة وتحتاج لمسة';
  return 'أضف تفاصيل أكثر';
}

function normalizeIdeaText(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[.،؛:]+$/g, '')
    .trim();
}

function cleanOptionName(value: string | null | undefined) {
  return (value || '').replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

function getPublicStyleMood(selectedStyle: DtfStudioCreativeOption | null) {
  const name = selectedStyle?.name || '';
  if (/أنمي|Anime|مانغا/i.test(name)) return 'بطابع أنمي حيوي وتعبيرات واضحة';
  if (/ملصق|Sticker/i.test(name)) return 'بأسلوب ملصق مرح وحدود واضحة';
  if (/بوب|Pop/i.test(name)) return 'بطابع بوب آرت جريء ومبهج';
  if (/جرافيتي|Graffiti/i.test(name)) return 'بروح شارع حرة وحركة قوية';
  if (/خطوط|Line/i.test(name)) return 'بخطوط نظيفة وتفاصيل قليلة ومدروسة';
  if (/هندسي|Geometric/i.test(name)) return 'بتكوين هندسي متوازن وحاد';
  if (/بكسل|Pixel/i.test(name)) return 'بطابع ألعاب قديمة وتفاصيل مربعة لطيفة';
  if (/فينتيج|Vintage/i.test(name)) return 'بإحساس كلاسيكي دافئ';
  if (/سايبر|Cyber/i.test(name)) return 'بإضاءة مستقبلية وتفاصيل تقنية';
  if (/بسيط|Minimal/i.test(name)) return 'بشكل بسيط وواضح من أول نظرة';
  if (/ثلاثي|3D/i.test(name)) return 'بإحساس مجسم وعمق ناعم';
  return 'بتفاصيل واضحة وشخصية بصرية مميزة';
}

function getPublicPaletteMood(state: DesignState, selectedPalette: DtfStudioPaletteOption | null) {
  if (state.paletteId === CUSTOM_PALETTE_ID && state.customPalette?.trim()) {
    return `مع ألوان مستوحاة من ${normalizeIdeaText(state.customPalette)}`;
  }

  const name = selectedPalette?.name || state.palette || '';
  if (!name || /تلقائي|Auto/i.test(name)) return '';
  if (/نيون|Neon/i.test(name)) return 'مع ألوان نيون مشرقة ولمسات مضيئة';
  if (/باستيل|Pastel/i.test(name)) return 'مع ألوان باستيل ناعمة ومريحة';
  if (/أحادي|Monochrome/i.test(name)) return 'بتدرجات أحادية أنيقة وواضحة';
  if (/ترابية|Earth/i.test(name)) return 'مع ألوان ترابية دافئة وطبيعية';
  if (/ريترو|Retro|80/i.test(name)) return 'مع ألوان ريترو حيوية';
  if (/فيبور|Vapor/i.test(name)) return 'مع ألوان حالمة مستوحاة من الفيبورويف';
  return '';
}

function inferCreativeScene(idea: string) {
  const value = idea.toLowerCase();

  if (idea.length > 130) return idea;
  if (/ديناصور/.test(value)) {
    return 'ديناصور مرح يرقص في غابة كثيفة مليئة بالأشجار العالية، وخلفه شلالات واسعة ورذاذ ماء مضيء، يضحك بحماس وحوله حركة مبهجة تجعل المشهد مليئا بالطاقة والفرح';
  }
  if (/نمر|أسد|فهد/.test(value)) {
    return `${idea} في مشهد قوي وسط طبيعة برية، بنظرة واثقة وحركة ديناميكية وتفاصيل تمنح الشخصية حضورا فاخرا`;
  }
  if (/ذئب/.test(value)) {
    return `${idea} تحت ضوء قمر هادئ، وسط جبال بعيدة ونسيم ليلي، بتعبير حاد وشعور بالقوة والحرية`;
  }
  if (/صقر|نسر|طائر/.test(value)) {
    return `${idea} يحلق في سماء واسعة فوق أفق مضيء، مع جناحين مفرودين وحركة تمنح التصميم إحساسا بالعزة والانطلاق`;
  }
  if (/سيارة|دراجة|محرك/.test(value)) {
    return `${idea} في مشهد سريع مليء بالحركة، مع خطوط انسيابية وانعكاسات ضوء تمنح التصميم طاقة عصرية`;
  }
  if (/قهوة|كوب|مقهى/.test(value)) {
    return `${idea} داخل أجواء دافئة وهادئة، مع تفاصيل بخار ناعمة ولمسات مريحة تعطي التصميم طابعا أنيقا`;
  }
  if (/وردة|زهرة|نبات/.test(value)) {
    return `${idea} بتكوين نباتي غني، أوراق متداخلة وتفاصيل ناعمة تمنح التصميم إحساسا طبيعيا وراقيا`;
  }
  if (/بحر|موج|سمك|حوت/.test(value)) {
    return `${idea} وسط مشهد بحري عميق، أمواج ناعمة وفقاعات وضوء منعكس يضيفان إحساسا بالحركة والانتعاش`;
  }
  if (/فضاء|كوكب|رائد|نجوم/.test(value)) {
    return `${idea} في فضاء واسع مليء بالنجوم والكواكب البعيدة، مع إضاءة حالمة وشعور بالمغامرة`;
  }

  return `${idea} في مشهد غني وواضح، مع خلفية مناسبة للفكرة وتفاصيل تمنحها حياة وشخصية وحركة بصرية جذابة`;
}

function composeCustomerFacingPromptV2({
  state,
  selectedStyle,
  selectedPalette,
}: {
  state: DesignState;
  selectedStyle: DtfStudioCreativeOption | null;
  selectedPalette: DtfStudioPaletteOption | null;
}) {
  if (state.designMethod === 'image' && !state.prompt.trim() && state.referenceImage) {
    return 'حوّل الصورة المرجعية إلى تصميم بصري أنيق وواضح، مع تبسيط التفاصيل المزدحمة وإبراز الفكرة الرئيسية بشكل جذاب ومتوازن.';
  }

  if (state.designMethod === 'calligraphy') {
    const text = normalizeIdeaText(state.calligraphyText);
    return `مخطوطة عربية لعبارة "${text}" بتكوين متوازن وحروف واضحة، مع حركة انسيابية ولمسة فنية تجعل العبارة تبدو فاخرة وسهلة القراءة.`;
  }

  const idea = normalizeIdeaText(state.prompt);
  const scene = inferCreativeScene(idea);
  const styleMood = getPublicStyleMood(selectedStyle);
  const paletteMood = getPublicPaletteMood(state, selectedPalette);

  return `${[scene, styleMood, paletteMood].filter(Boolean).join('، ').replace(/\s+/g, ' ').trim()}.`;
}

function stockLabel(size: DtfStudioSizeOption | null) {
  if (!size) return 'غير محدد';
  if (size.stockStatus === 'out') return 'غير متوفر';
  if (size.stockStatus === 'low') return 'كمية محدودة';
  if (typeof size.availableQuantity === 'number') return `${size.availableQuantity} متاح`;
  return 'متاح';
}

function ChoiceButton({
  active,
  children,
  onClick,
  disabled,
  className,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative rounded-2xl border p-3 text-right transition duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-washa-gold bg-washa-gold text-washa-bg shadow-[0_16px_34px_rgba(154,123,61,0.16)]'
          : 'border-washa-border/70 bg-washa-bg text-washa-text hover:border-washa-gold/50 hover:bg-washa-ivory',
        className
      )}
    >
      {active ? (
        <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-washa-bg text-washa-gold">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
      {children}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-washa-bg/70 px-3 py-2">
      <p className="text-[10px] font-bold text-washa-text-faint">{label}</p>
      <div className="mt-1 text-sm font-black leading-6 text-washa-text">{value || 'غير محدد'}</div>
    </div>
  );
}

function StepIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-black text-washa-gold">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-black leading-tight text-washa-text sm:text-4xl">{title}</h2>
      <p className="mt-3 max-w-[56ch] text-sm font-medium leading-7 text-washa-text-sec sm:text-base">{body}</p>
    </div>
  );
}

export default function WashaDevStudioV2({ onOpenGallery }: WashaDevStudioV2Props) {
  const {
    state,
    updateState,
    configLoading,
    configError,
    garmentOptions,
    colorOptions,
    sizeOptions,
    styleOptions,
    techniqueOptions,
    paletteOptions,
    positionOptions,
    selectedGarment,
    selectedColor,
    selectedSize,
    selectedStyle,
    selectedTechnique,
    selectedPalette,
    handleImageUpload,
    handleGenerate,
    handleExtract,
    handleDownload,
    resetDesign,
    submitOrder,
    showToast,
    isGenerating,
    isExtracting,
    isSubmittingOrder,
    mockupImage,
    extractedImage,
    error,
    orderResult,
  } = useDesign();

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [studioView, setStudioView] = useState<StudioView>('wizard');
  const [dragging, setDragging] = useState(false);

  const activeStep = WIZARD_STEPS[activeStepIndex];
  const isLastWizardStep = activeStepIndex === WIZARD_STEPS.length - 1;
  const referenceImage = referencePreview(state);
  const previewImage = mockupImage || resolveGarmentPreview(state, selectedGarment, selectedColor, selectedSize);
  const selectedPosition = useMemo(
    () => positionOptions.find((position) => position.id === state.printOptionId) || positionOptions[0] || null,
    [positionOptions, state.printOptionId]
  );

  const hasIdea = state.designMethod === 'calligraphy'
    ? Boolean(state.calligraphyText.trim())
    : Boolean(state.prompt.trim() || state.referenceImage);
  const promptQuality = useMemo(
    () => getPromptQuality(state, selectedSize, selectedPalette),
    [selectedPalette, selectedSize, state]
  );
  const hasGarment = Boolean(state.garmentId && state.garmentColorId && state.garmentSizeId && selectedSize?.stockStatus !== 'out');
  const hasStyle = Boolean(state.styleId && state.techniqueId);
  const hasPalette = Boolean(state.paletteId && (state.paletteId !== CUSTOM_PALETTE_ID || state.customPalette?.trim()));
  const canGenerate = Boolean(
    hasIdea &&
    hasGarment &&
    state.printOptionId &&
    hasStyle &&
    hasPalette &&
    !configLoading &&
    !isGenerating
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeStepIndex, studioView]);

  const stepCanContinue = useMemo(() => {
    if (activeStep.id === 'idea') return hasIdea;
    if (activeStep.id === 'garment') return hasGarment;
    if (activeStep.id === 'position') return Boolean(state.printOptionId);
    if (activeStep.id === 'style') return hasStyle;
    if (activeStep.id === 'palette') return hasPalette;
    return false;
  }, [activeStep.id, hasGarment, hasIdea, hasPalette, hasStyle, state.printOptionId]);

  const handleSelectGarment = (garment: DtfStudioGarmentOption) => {
    const color = garment.colors[0] || null;
    const size = resolveDefaultSize(garment, color?.id || null);
    updateState({
      garmentId: garment.id,
      garmentType: garment.name,
      garmentColorId: color?.id || null,
      garmentColor: color?.name || '',
      garmentColorHex: color?.hexCode || '#111111',
      garmentSizeId: size?.id || null,
      garmentSize: size?.name || '',
    });
  };

  const handleSelectColor = (color: DtfStudioColorOption) => {
    const size = resolveDefaultSize(selectedGarment, color.id);
    updateState({
      garmentColorId: color.id,
      garmentColor: color.name,
      garmentColorHex: color.hexCode,
      garmentSizeId: size?.id || null,
      garmentSize: size?.name || '',
    });
  };

  const handleSelectPosition = (position: DtfStudioPositionOption) => {
    const placement = resolvePrintPlacementFromOption(position);
    updateState({
      printOptionId: position.id,
      printPosition: placement.printPosition,
      printSize: placement.printSize,
      designPosition: placement.designPosition,
      printPositionLabel: position.name,
    });
  };

  const handleImprovePrompt = () => {
    const nextPrompt = composeCustomerFacingPromptV2({
      state,
      selectedStyle,
      selectedPalette,
    });
    updateState({ prompt: nextPrompt });
    showToast('تم تحسين الوصف', 'success');
  };

  const goNext = () => {
    if (!stepCanContinue) return;
    setActiveStepIndex((index) => Math.min(WIZARD_STEPS.length - 1, index + 1));
  };

  const goBack = () => {
    setActiveStepIndex((index) => Math.max(0, index - 1));
  };

  const handleStepClick = (index: number) => {
    if (index <= activeStepIndex || (index === activeStepIndex + 1 && stepCanContinue)) {
      setActiveStepIndex(index);
    }
  };

  const getGenerationPromptOverride = () => composeCustomerFacingPromptV2({
    state,
    selectedStyle,
    selectedPalette,
  });

  const handleGenerateFromWizard = () => {
    if (!canGenerate) return;
    setStudioView('generation');
    void handleGenerate({ promptOverride: getGenerationPromptOverride() });
  };

  const handleRetryGenerate = () => {
    if (!canGenerate) return;
    void handleGenerate({ promptOverride: getGenerationPromptOverride() });
  };

  const handleEditStep = (index: number) => {
    setStudioView('wizard');
    setActiveStepIndex(Math.max(0, Math.min(WIZARD_STEPS.length - 1, index)));
  };

  const handleStartOver = () => {
    resetDesign();
    setActiveStepIndex(0);
    setStudioView('wizard');
  };

  const renderIdeaStep = () => (
    <div className="space-y-7">
      <StepIntro
        eyebrow="ابدأ من الفكرة"
        title="اكتب ما تتخيله، وسنحوّله إلى وصف أوضح."
        body="لا تحتاج لصياغة مثالية. اكتب الفكرة ببساطة، ثم استخدم تحسين الوصف إذا أردت صياغة أغنى وأكثر تصويراً."
      />

      <div className="grid grid-cols-3 gap-2 rounded-[22px] border border-washa-border/60 bg-washa-bg p-2">
        {METHOD_TABS.map(({ id, label, hint, icon: Icon }) => {
          const active = state.designMethod === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => updateState({ designMethod: id })}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-center transition active:scale-[0.985]',
                active ? 'bg-washa-text text-washa-bg' : 'text-washa-text-sec hover:bg-washa-ivory hover:text-washa-text'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-black">{label}</span>
              <span className={cn('text-[10px] font-bold', active ? 'text-washa-bg/70' : 'text-washa-text-faint')}>{hint}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {state.designMethod === 'text' ? (
          <motion.div key="text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-black text-washa-text">وصف الفكرة</label>
              <Textarea
                value={state.prompt}
                onChange={(event) => updateState({ prompt: event.target.value })}
                placeholder="مثال: ديناصور يرقص"
                className="min-h-[260px] resize-none rounded-[28px] border-washa-border/70 bg-washa-bg p-6 text-lg leading-9 text-washa-text placeholder:text-washa-text-faint focus-visible:ring-washa-gold/40"
                maxLength={620}
              />
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-washa-text-faint">
                <span>{getQualityLabel(promptQuality)}</span>
                <span>{state.prompt.length}/620</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROMPT_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => updateState({ prompt: starter })}
                  className="rounded-full border border-washa-border bg-washa-ivory px-3 py-2 text-xs font-bold text-washa-text-sec transition hover:border-washa-gold/50 hover:text-washa-gold active:scale-[0.985]"
                >
                  {starter.slice(0, 48)}...
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        {state.designMethod === 'image' ? (
          <motion.div key="image" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
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
                'flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed bg-washa-bg p-6 text-center transition',
                dragging ? 'border-washa-gold ring-4 ring-washa-gold/10' : 'border-washa-border hover:border-washa-gold/60'
              )}
            >
              {referenceImage ? (
                <img src={referenceImage} alt="الصورة المرجعية" className="h-44 w-44 rounded-3xl border border-washa-border bg-washa-ivory object-cover p-1 shadow-[0_14px_32px_rgba(154,123,61,0.12)]" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-washa-ivory text-washa-gold shadow-[0_12px_24px_rgba(154,123,61,0.1)]">
                  <FileImage className="h-7 w-7" />
                </span>
              )}
              <div>
                <p className="font-black text-washa-text">اختر صورة مرجعية</p>
                <p className="mt-1 text-xs font-bold text-washa-text-sec">يمكنك إضافة وصف قصير يساعد على فهم المطلوب.</p>
              </div>
              <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
            </label>
            <Textarea
              value={state.prompt}
              onChange={(event) => updateState({ prompt: event.target.value })}
              placeholder="اكتب توجيها اختياريا للصورة"
              className="min-h-[112px] resize-none rounded-[22px] border-washa-border bg-washa-ivory p-4 leading-7"
            />
          </motion.div>
        ) : null}

        {state.designMethod === 'calligraphy' ? (
          <motion.div key="calligraphy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-black text-washa-text">النص أو العبارة</label>
              <Textarea
                value={state.calligraphyText}
                onChange={(event) => updateState({ calligraphyText: event.target.value })}
                placeholder="اكتب العبارة هنا"
                className="min-h-[250px] resize-none rounded-[28px] border-washa-border bg-washa-bg p-7 text-center font-arsenica text-3xl leading-[1.7] text-washa-text"
                maxLength={90}
                dir="auto"
              />
              <p className="text-left text-xs font-bold text-washa-text-faint">{state.calligraphyText.length}/90</p>
            </div>
            {state.prompt ? (
              <div className="rounded-2xl border border-washa-border bg-washa-ivory px-4 py-3 text-sm font-bold leading-7 text-washa-text-sec">
                {state.prompt}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-3 rounded-[26px] border border-washa-border/70 bg-washa-bg p-3">
        <Button variant="gold" onClick={handleImprovePrompt} disabled={!hasIdea} className="h-12 gap-2 rounded-2xl px-5">
          <Wand2 className="h-4 w-4" />
          تحسين الوصف
        </Button>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center justify-between text-xs font-bold text-washa-text-sec">
            <span>وضوح الفكرة</span>
            <span>{promptQuality}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-washa-elevated">
            <motion.div
              className="h-full rounded-full bg-washa-gold"
              initial={false}
              animate={{ width: `${promptQuality}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderGarmentStep = () => (
    <div className="space-y-8">
      <StepIntro
        eyebrow="اختر القطعة"
        title="حدد القطعة واللون والمقاس."
        body="هذه الخيارات مرتبطة بالكتالوج الفعلي، لذلك تظهر النتيجة على قطعة يمكن طلبها لاحقا."
      />

      {configLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-3xl bg-washa-bg" />
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-black text-washa-text">
                <Package2 className="h-4 w-4 text-washa-gold" />
                القطعة
              </p>
          <span className="text-xs font-bold text-washa-text-faint">{garmentOptions.length} خيار</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {garmentOptions.map((garment) => {
                const active = state.garmentId === garment.id;
                const image = assetUrl(garment.imageUrl);
                return (
                  <ChoiceButton key={garment.id} active={active} onClick={() => handleSelectGarment(garment)} className="min-h-[150px]">
                    <div className="flex h-full flex-col gap-3">
                      <div className={cn('flex h-20 items-center justify-center rounded-2xl border', active ? 'border-washa-bg/25 bg-washa-bg/10' : 'border-washa-border bg-washa-ivory')}>
                        {image ? <img src={image} alt={garment.name} className="h-full w-full object-contain p-2" /> : <Shirt className="h-8 w-8 opacity-60" />}
                      </div>
                      <div>
                <p className="font-black leading-tight">{cleanOptionName(garment.name)}</p>
                        <p className={cn('mt-1 text-xs font-bold', active ? 'text-washa-bg/70' : 'text-washa-text-faint')}>
                          {garment.colors.length} لون، {garment.sizes.length} مقاس
                        </p>
                      </div>
                    </div>
                  </ChoiceButton>
                );
              })}
            </div>
          </div>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-black text-washa-text">
                  <Palette className="h-4 w-4 text-washa-gold" />
                  اللون
                </p>
                <span className="text-xs font-bold text-washa-text-faint">{colorOptions.length} لون</span>
              </div>
              {colorOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => {
                    const active = state.garmentColorId === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleSelectColor(color)}
                        title={color.name}
                        className={cn(
                          'flex h-12 min-w-12 items-center gap-2 rounded-2xl border px-2 text-xs font-black transition active:scale-[0.985]',
                          active ? 'border-washa-gold bg-washa-gold text-washa-bg' : 'border-washa-border bg-washa-ivory text-washa-text hover:border-washa-gold/50'
                        )}
                      >
                        <span className="h-7 w-7 rounded-xl border border-black/10 shadow-inner" style={{ backgroundColor: color.hexCode }} />
                <span className="max-w-[86px] truncate">{cleanOptionName(color.name)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-washa-border bg-washa-bg px-4 py-5 text-sm font-bold text-washa-text-faint">لا توجد ألوان لهذه القطعة.</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-black text-washa-text">
                  <Ruler className="h-4 w-4 text-washa-gold" />
                  المقاس
                </p>
                <span className="text-xs font-bold text-washa-text-faint">{stockLabel(selectedSize)}</span>
              </div>
              {sizeOptions.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {sizeOptions.map((size) => {
                    const active = state.garmentSizeId === size.id;
                    return (
                      <ChoiceButton
                        key={size.id}
                        active={active}
                        disabled={size.stockStatus === 'out'}
                        onClick={() => updateState({ garmentSizeId: size.id, garmentSize: size.name })}
                        className="min-h-[76px] text-center"
                      >
                        <span className="block text-lg font-black">{size.name}</span>
                        <span className={cn('mt-1 block text-[10px] font-bold', active ? 'text-washa-bg/70' : 'text-washa-text-faint')}>{stockLabel(size)}</span>
                      </ChoiceButton>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-washa-border bg-washa-bg px-4 py-5 text-sm font-bold text-washa-text-faint">لا توجد مقاسات لهذه القطعة.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderPositionStep = () => (
    <div className="space-y-7">
      <StepIntro
        eyebrow="مكان التصميم"
        title="اختر مكان ظهور التصميم."
        body="اختيار الموضع يساعد على ضبط التكوين قبل التوليد حتى تكون النتيجة أقرب لما تتوقعه."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {positionOptions.map((position) => {
          const active = state.printOptionId === position.id;
          return (
            <ChoiceButton key={position.id} active={active} onClick={() => handleSelectPosition(position)} className="min-h-[118px]">
                <p className="text-lg font-black">{cleanOptionName(position.name)}</p>
              <p className={cn('mt-2 text-xs font-bold leading-6', active ? 'text-washa-bg/75' : 'text-washa-text-sec')}>
                {position.description || (position.price > 0 ? `${position.price.toFixed(2)} ر.س` : 'مناسب للتصميم الرئيسي')}
              </p>
            </ChoiceButton>
          );
        })}
      </div>
    </div>
  );

  const renderStyleStep = () => (
    <div className="space-y-8">
      <StepIntro
        eyebrow="الطابع الفني"
        title="اختر الأسلوب وطريقة المعالجة."
        body="هذه الخطوة تحدد شخصية التصميم: هل يبدو كملصق، رسم رقمي، خط بسيط، أو طابع آخر."
      />

      <div className="grid gap-7 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-black text-washa-text">
              <Sparkles className="h-4 w-4 text-washa-gold" />
              الأسلوب
            </p>
            <span className="text-xs font-bold text-washa-text-faint">{styleOptions.length} خيار</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {styleOptions.map((style) => (
              <ChoiceButton
                key={style.id}
                active={state.styleId === style.id}
                onClick={() => updateState({ styleId: style.id, style: style.name })}
                className="min-h-[94px]"
              >
                <p className="font-black">{cleanOptionName(style.name)}</p>
                <p className={cn('mt-2 line-clamp-2 text-xs font-bold leading-5', state.styleId === style.id ? 'text-washa-bg/70' : 'text-washa-text-sec')}>
                  {style.description || 'أسلوب بصري يناسب الفكرة'}
                </p>
              </ChoiceButton>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-black text-washa-text">
              <Wand2 className="h-4 w-4 text-washa-gold" />
              المعالجة
            </p>
            <span className="text-xs font-bold text-washa-text-faint">{techniqueOptions.length} خيار</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {techniqueOptions.map((technique) => (
              <ChoiceButton
                key={technique.id}
                active={state.techniqueId === technique.id}
                onClick={() => updateState({ techniqueId: technique.id, technique: technique.name })}
                className="min-h-[94px]"
              >
                <p className="font-black">{cleanOptionName(technique.name)}</p>
                <p className={cn('mt-2 line-clamp-2 text-xs font-bold leading-5', state.techniqueId === technique.id ? 'text-washa-bg/70' : 'text-washa-text-sec')}>
                  {technique.description || 'معالجة فنية نظيفة وواضحة'}
                </p>
              </ChoiceButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPaletteStep = () => (
    <div className="space-y-7">
      <StepIntro
        eyebrow="ألوان التصميم"
        title="اختر لوحة ألوان تناسب الفكرة."
        body="يمكنك ترك الألوان تلقائية أو اختيار طابع محدد. إن أردت لوحة خاصة، اكتبها بنفسك."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {paletteOptions.map((palette) => (
          <ChoiceButton
            key={palette.id}
            active={state.paletteId === palette.id}
            onClick={() => updateState({ paletteId: palette.id, palette: palette.name })}
            className="min-h-[116px]"
          >
            <p className="font-black">{cleanOptionName(palette.name)}</p>
            <div className="mt-4 flex gap-1.5">
              {palette.colors.slice(0, 6).map((color) => (
                <span key={`${palette.id}-${color.hex}`} className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} title={color.name} />
              ))}
            </div>
          </ChoiceButton>
        ))}
        <ChoiceButton
          active={state.paletteId === CUSTOM_PALETTE_ID}
          onClick={() => updateState({ paletteId: CUSTOM_PALETTE_ID, palette: CUSTOM_PALETTE_LABEL })}
          className="min-h-[116px]"
        >
          <p className="font-black">لوحة خاصة</p>
          <p className={cn('mt-2 text-xs font-bold leading-6', state.paletteId === CUSTOM_PALETTE_ID ? 'text-washa-bg/70' : 'text-washa-text-sec')}>
            اكتب الألوان التي تتخيلها
          </p>
        </ChoiceButton>
      </div>

      {state.paletteId === CUSTOM_PALETTE_ID ? (
        <div className="space-y-2">
          <label className="block text-sm font-black text-washa-text">وصف الألوان</label>
          <Textarea
            value={state.customPalette || ''}
            onChange={(event) => updateState({ customPalette: event.target.value })}
            placeholder="مثال: أسود فحمي، أخضر عميق، ذهبي مطفي"
            className="min-h-[112px] resize-none rounded-[22px] border-washa-border bg-washa-bg p-4 leading-7"
          />
        </div>
      ) : null}
    </div>
  );

  const renderGenerationView = () => {
    const hasFinalDesign = Boolean(mockupImage);
    const displayImage = mockupImage || previewImage;
    const resultTitle = isGenerating
      ? 'نجهز التصميم الآن.'
      : hasFinalDesign
        ? 'التصميم جاهز.'
        : error
          ? 'لم يكتمل التوليد.'
          : 'جاهز لتوليد النتيجة.';
    const resultBody = isGenerating
      ? 'نرتب الفكرة والقطعة والموضع في نتيجة واحدة قابلة للطلب.'
      : hasFinalDesign
        ? 'راجع التصميم النهائي، ثم أضفه للسلة أو عدّل الاختيارات قبل الاعتماد.'
        : 'يمكنك إعادة التوليد من هنا أو الرجوع لتعديل أي اختيار.';

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(340px,0.58fr)]">
        <section className="overflow-hidden rounded-[34px] bg-washa-text p-3 text-washa-bg shadow-[0_28px_90px_rgba(31,25,16,0.22)] sm:p-4">
          <div className="flex items-center justify-between gap-3 px-2 pb-4">
            <div>
              <p className="text-xs font-black text-washa-gold">واجهة التوليد</p>
              <p className="mt-1 text-lg font-black">{hasFinalDesign ? 'النتيجة النهائية' : 'لوحة التكوين'}</p>
            </div>
            <span className="rounded-2xl border border-washa-bg/10 bg-washa-bg/10 px-3 py-2 text-xs font-black text-washa-bg/80">
              {isGenerating ? 'قيد التوليد' : hasFinalDesign ? 'جاهز للسلة' : 'بانتظار النتيجة'}
            </span>
          </div>

          <div className="relative aspect-[4/5] overflow-hidden rounded-[30px] border border-washa-bg/10 bg-[#17130E]">
            {displayImage ? (
              <img
                src={displayImage}
                alt={hasFinalDesign ? 'التصميم النهائي على القطعة' : 'القطعة المختارة قبل التوليد'}
                className={cn('h-full w-full object-contain', hasFinalDesign ? 'object-cover' : 'p-5')}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-washa-bg/60">
                <Shirt className="h-12 w-12" />
                <p className="text-sm font-black">ستظهر النتيجة هنا</p>
              </div>
            )}

            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col justify-end bg-[#17130E]/86 p-5 text-washa-bg backdrop-blur-md">
                <div className="mb-auto mt-6 w-full space-y-3">
                  <div className="h-3 w-3/4 animate-pulse rounded-full bg-washa-bg/30" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-washa-bg/20" />
                </div>
                <div className="rounded-[24px] border border-washa-bg/10 bg-washa-bg/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-black">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري توليد التصميم
                  </p>
                  <div className="mt-4 grid gap-2">
                    <div className="h-2 animate-pulse rounded-full bg-washa-gold/70" />
                    <div className="h-2 w-2/3 animate-pulse rounded-full bg-washa-bg/20" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-5">
          <StepIntro eyebrow="النتيجة" title={resultTitle} body={resultBody} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <SummaryRow label="الفكرة" value={getIdeaText(state) || 'غير محددة'} />
            <SummaryRow label="القطعة" value={`${cleanOptionName(state.garmentType) || 'غير محددة'}${state.garmentColor ? `، ${cleanOptionName(state.garmentColor)}` : ''}`} />
            <SummaryRow label="المقاس" value={state.garmentSize || 'غير محدد'} />
            <SummaryRow label="الموضع" value={cleanOptionName(state.printPositionLabel || selectedPosition?.name) || 'غير محدد'} />
            <SummaryRow label="الأسلوب" value={cleanOptionName(state.style) || 'غير محدد'} />
            <SummaryRow label="الألوان" value={state.paletteId === CUSTOM_PALETTE_ID ? state.customPalette || 'لوحة خاصة' : cleanOptionName(state.palette) || 'غير محددة'} />
          </div>

          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">{error}</p> : null}
          {configError ? <p className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-bold leading-6 text-orange-700">{configError}</p> : null}

          <div className="rounded-[28px] border border-washa-border bg-washa-ivory p-3 shadow-[0_16px_46px_rgba(154,123,61,0.08)]">
            <div className="grid gap-3">
              {!hasFinalDesign ? (
                <Button
                  variant="gold"
                  disabled={!canGenerate}
                  onClick={handleRetryGenerate}
                  className="h-14 w-full gap-2 rounded-2xl text-base"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                  {error ? 'إعادة التوليد' : 'توليد التصميم'}
                </Button>
              ) : (
                <Button
                  variant="gold"
                  disabled={isSubmittingOrder}
                  onClick={() => void submitOrder()}
                  className="h-14 w-full gap-2 rounded-2xl bg-washa-text text-washa-bg hover:bg-washa-gold-deep"
                >
                  {isSubmittingOrder ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
                  إضافة للسلة وإتمام الطلب
                </Button>
              )}

              {hasFinalDesign ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <Button variant="outline" disabled={isExtracting} onClick={() => void handleExtract()} className="h-12 gap-2 rounded-2xl">
                    {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    استخراج التصميم
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload(mockupImage!, 'washa-ai-mockup.png')} className="h-12 gap-2 rounded-2xl">
                    <Download className="h-4 w-4" />
                    تحميل المعاينة
                  </Button>
                </div>
              ) : null}

              {extractedImage ? (
                <Button
                  variant="outline"
                  onClick={() => handleDownload(extractedImage, 'washa-ai-print.png')}
                  className="h-12 w-full gap-2 rounded-2xl"
                >
                  <Download className="h-4 w-4" />
                  تحميل ملف الطباعة
                </Button>
              ) : null}

              <div className="grid gap-2 border-t border-washa-border/70 pt-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                <Button variant="outline" disabled={isGenerating} onClick={() => handleEditStep(0)} className="h-11 gap-2 rounded-2xl">
                  <PenLine className="h-4 w-4" />
                  تعديل الفكرة
                </Button>
                <Button variant="outline" disabled={isGenerating} onClick={() => handleEditStep(WIZARD_STEPS.length - 1)} className="h-11 gap-2 rounded-2xl">
                  <Palette className="h-4 w-4" />
                  تعديل الاختيارات
                </Button>
                <Button variant="ghost" disabled={isGenerating} onClick={handleStartOver} className="h-11 gap-2 rounded-2xl text-washa-text-sec">
                  <RefreshCcw className="h-4 w-4" />
                  بدء جديد
                </Button>
              </div>
            </div>
          </div>

          {orderResult ? (
            <div className="rounded-2xl border border-washa-gold/25 bg-washa-gold/10 px-4 py-3 text-washa-gold-deep">
              <p className="flex items-center gap-2 text-sm font-black">
                <CheckCircle2 className="h-4 w-4" />
                تمت إضافة التصميم للسلة
              </p>
              <p className="mt-1 text-xs font-bold leading-6">{orderResult.itemTitle}، {orderResult.price.toFixed(2)} ر.س</p>
            </div>
          ) : null}
        </section>
      </div>
    );
  };

  const renderStepContent = () => {
    if (activeStep.id === 'idea') return renderIdeaStep();
    if (activeStep.id === 'garment') return renderGarmentStep();
    if (activeStep.id === 'position') return renderPositionStep();
    if (activeStep.id === 'style') return renderStyleStep();
    if (activeStep.id === 'palette') return renderPaletteStep();
    return renderIdeaStep();
  };

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-washa-bg text-washa-text selection:bg-washa-gold selection:text-washa-bg">
      <header className="sticky top-0 z-40 border-b border-washa-border/60 bg-washa-bg/92 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-20 w-full max-w-[1380px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-washa-border bg-washa-ivory shadow-[0_12px_26px_rgba(154,123,61,0.08)]">
              <img src={siteAsset(BRAND_MARK_SRC)} alt="وشّى" className="h-full w-full object-contain px-1.5 py-2" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-black leading-none text-washa-text sm:text-2xl">وشّى AI</p>
              <p className="mt-1 text-xs font-bold text-washa-text-sec">صمم قطعتك بخطوات واضحة.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={CURRENT_APP_PATH}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-washa-border bg-washa-ivory px-3 text-sm font-black text-washa-text-sec transition hover:border-washa-gold/50 hover:text-washa-gold active:scale-[0.985]"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              العودة
            </a>
            <button
              type="button"
              onClick={onOpenGallery}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-washa-text px-4 text-sm font-black text-washa-bg transition hover:bg-washa-gold-deep active:scale-[0.985]"
            >
              <GalleryHorizontalEnd className="h-4 w-4" />
              تصاميمي
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1380px] px-4 py-5 sm:px-6">
        {studioView === 'wizard' ? (
          <>
            <nav className="mb-5" aria-label="خطوات التصميم">
              <div className="grid grid-cols-3 gap-2 rounded-[26px] border border-washa-border/70 bg-washa-surface/80 p-2 sm:grid-cols-5">
                {WIZARD_STEPS.map((step, index) => {
                  const active = index === activeStepIndex;
                  const complete = index < activeStepIndex;
                  const disabled = index > activeStepIndex + 1 || (index === activeStepIndex + 1 && !stepCanContinue);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleStepClick(index)}
                      className={cn(
                        'flex h-11 items-center justify-center gap-2 rounded-2xl px-2 text-sm font-black transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 sm:px-4',
                        active
                          ? 'bg-washa-gold text-washa-bg shadow-[0_12px_24px_rgba(154,123,61,0.14)]'
                          : complete
                            ? 'bg-washa-ivory text-washa-gold'
                            : 'text-washa-text-sec hover:bg-washa-ivory hover:text-washa-text'
                      )}
                    >
                      <span className={cn('tabular-nums', active ? 'text-washa-bg/75' : 'text-washa-text-faint')}>{step.eyebrow}</span>
                      <span className="truncate">{step.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <section>
              <motion.section
                layout
                className="min-h-[620px] overflow-hidden rounded-[34px] border border-washa-border bg-washa-ivory/86 p-5 shadow-[0_24px_70px_rgba(154,123,61,0.08)] sm:p-7 lg:p-9"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {renderStepContent()}
                  </motion.div>
                </AnimatePresence>
              </motion.section>
            </section>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-[26px] border border-washa-border bg-washa-surface/86 p-3">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={activeStepIndex === 0}
                className="h-12 gap-2 rounded-2xl px-4"
              >
                <ArrowRight className="h-4 w-4" />
                السابق
              </Button>

              <div className="hidden text-center text-xs font-bold text-washa-text-faint sm:block">
                {activeStep.eyebrow} من {WIZARD_STEPS.length.toString().padStart(2, '0')}
              </div>

              <Button
                variant="gold"
                disabled={isLastWizardStep ? !canGenerate : !stepCanContinue}
                onClick={isLastWizardStep ? handleGenerateFromWizard : goNext}
                className="h-12 min-w-[150px] gap-2 rounded-2xl px-5"
              >
                {isLastWizardStep ? (
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
          </>
        ) : (
          <motion.section
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-[34px] border border-washa-border bg-washa-ivory/88 p-4 shadow-[0_24px_70px_rgba(154,123,61,0.08)] sm:p-6 lg:p-8"
          >
            {renderGenerationView()}
          </motion.section>
        )}
      </main>
    </div>
  );
}
