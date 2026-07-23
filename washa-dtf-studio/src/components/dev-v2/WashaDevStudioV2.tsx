import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Download,
  Feather,
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
  Zap,
} from 'lucide-react';
import { useDesign } from '../../context/DesignContext';
import BoardPreviewDisclosure from '../BoardPreviewDisclosure';
import { resolvePrintPlacementFromOption } from '../../lib/placement';
import { siteAsset } from '../../lib/assets';
import { cn } from '../../lib/utils';
import { enhanceDesignIdea } from '../../services/ideaEnhancerService';
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
  variant?: 'classic' | 'prompt-native';
}

type WizardStepId = 'idea' | 'garment' | 'position' | 'style' | 'palette';
type StudioView = 'wizard' | 'generation';
type GenerationAttemptStatus = 'idle' | 'running' | 'succeeded' | 'failed' | 'preview' | 'not_started';

const BRAND_MARK_SRC = 'header-logo-identity.png';
const CURRENT_APP_PATH = '/design/washa-ai/app';

const WIZARD_STEPS: { id: WizardStepId; label: string; eyebrow: string }[] = [
  { id: 'idea', label: 'الفكرة', eyebrow: '01' },
  { id: 'garment', label: 'القطعة', eyebrow: '02' },
  { id: 'position', label: 'الموضع', eyebrow: '03' },
  { id: 'style', label: 'الأسلوب', eyebrow: '04' },
  { id: 'palette', label: 'الألوان', eyebrow: '05' },
];

const PROMPT_NATIVE_PIPELINE = [
  { number: '01', title: 'أصل التصميم', meta: 'OPENAI · PNG', icon: FileImage },
  { number: '02', title: 'فحص الشفافية', meta: 'ALPHA GATE', icon: CheckCircle2 },
  { number: '03', title: 'الموكب الواقعي', meta: 'GEMINI', icon: Shirt },
] as const;

const METHOD_TABS: { id: DesignMethod; label: string; hint: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'text', label: 'وصف', hint: 'اكتب الفكرة', icon: Type },
  { id: 'image', label: 'صورة', hint: 'ارفع مرجعا', icon: ImageIcon },
  { id: 'calligraphy', label: 'خط', hint: 'اكتب عبارة', icon: PenLine },
];

const PROMPT_STARTERS = [
  {
    label: 'هيبة عربية',
    prompt: 'نمر عربي بأسلوب هندسي فاخر، خطوط حادة، تفاصيل ذهبية، ونظرة واثقة تحمل حضوراً قوياً',
  },
  {
    label: 'حرف شخصي',
    prompt: 'حرف عربي واحد بتكوين شخصي راقٍ، يوازن بين صرامة الخط الكوفي وملمس فني حديث',
  },
  {
    label: 'تراث معاصر',
    prompt: 'تكوين مستوحى من التراث النجدي بروح معاصرة، زخرفة نظيفة، ألوان محدودة، وتباين قوي',
  },
] as const;

const LEGACY_PROMPT_STARTERS = [
  'نمر عربي بأسلوب هندسي فاخر، خطوط حادة، تفاصيل ذهبية، وحضور قوي على قطعة داكنة',
  'شعار شخصي بسيط بحرف عربي واحد، توازن بين الخط الكوفي والملمس الحديث، واضح على القماش',
  'تصميم مستوحى من التراث النجدي بأسلوب معاصر، زخرفة نظيفة، ألوان محدودة وتباين قوي',
] as const;

const CREATIVE_DIRECTIONS = [
  {
    id: 'signature',
    label: 'فاخر متزن',
    hint: 'هدوء بصري وتفاصيل راقية',
    prompt: 'إحساس فاخر ومتزن، نقطة تركيز واثقة، مساحات سلبية محسوبة، وتفصيل دقيق يكتشفه المشاهد بعد النظرة الأولى',
    icon: Crown,
  },
  {
    id: 'bold',
    label: 'جريء نابض',
    hint: 'حركة قوية وحضور فوري',
    prompt: 'إحساس جريء ونابض، بطل بصري كبير، حركة قطرية واضحة، وتباين قوي يمنح الفكرة حضوراً فورياً',
    icon: Zap,
  },
  {
    id: 'poetic',
    label: 'حالِم شاعري',
    hint: 'ضوء ناعم ورمز ذو معنى',
    prompt: 'إحساس حالِم وشاعري، إيقاع انسيابي، ضوء ناعم، وتفصيل رمزي يمنح الفكرة عمقاً عاطفياً خاصاً',
    icon: Feather,
  },
] as const;

type CreativeDirection = (typeof CREATIVE_DIRECTIONS)[number];

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
  creativeDirection,
}: {
  state: DesignState;
  selectedStyle: DtfStudioCreativeOption | null;
  selectedPalette: DtfStudioPaletteOption | null;
  creativeDirection: CreativeDirection | null;
}) {
  if (state.designMethod === 'image' && !state.prompt.trim() && state.referenceImage) {
    return creativeDirection
      ? `حوّل الصورة المرجعية إلى تصميم بصري أنيق وواضح، مع الحفاظ على هوية العنصر الرئيسي وتبسيط التفاصيل المزدحمة، ${creativeDirection.prompt}.`
      : 'حوّل الصورة المرجعية إلى تصميم بصري أنيق وواضح، مع تبسيط التفاصيل المزدحمة وإبراز الفكرة الرئيسية بشكل جذاب ومتوازن.';
  }

  if (state.designMethod === 'calligraphy') {
    const text = normalizeIdeaText(state.calligraphyText);
    if (!creativeDirection) {
      return `مخطوطة عربية لعبارة "${text}" بتكوين متوازن وحروف واضحة، مع حركة انسيابية ولمسة فنية تجعل العبارة تبدو فاخرة وسهلة القراءة.`;
    }
    const enhancedDirection = state.prompt.trim()
      ? normalizeIdeaText(state.prompt)
      : `مخطوطة عربية لعبارة "${text}" بتكوين متوازن وحروف واضحة وحركة انسيابية`;
    return `${enhancedDirection}، ${creativeDirection.prompt}، مع الحفاظ على العبارة كما كُتبت حرفياً ومن دون إضافة نص آخر.`;
  }

  const idea = normalizeIdeaText(state.prompt);
  const scene = inferCreativeScene(idea);
  const styleMood = getPublicStyleMood(selectedStyle);
  const paletteMood = getPublicPaletteMood(state, selectedPalette);

  return `${[
    scene,
    styleMood,
    paletteMood,
    creativeDirection?.prompt,
    creativeDirection ? 'بتسلسل بصري واضح وحواف نظيفة وتفاصيل مقصودة تمنح العمل شخصية خاصة من النظرة الأولى' : null,
  ].filter(Boolean).join('، ').replace(/\s+/g, ' ').trim()}.`;
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

function CreativeOptionGrid({
  options,
  selectedId,
  onSelect,
  fallbackDescription,
  showImages = false,
}: {
  options: DtfStudioCreativeOption[];
  selectedId: string | null;
  onSelect: (option: DtfStudioCreativeOption) => void;
  fallbackDescription: string;
  showImages?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {options.map((option) => {
        const active = selectedId === option.id;
        const image = assetUrl(option.imageUrl);
        return (
          <ChoiceButton
            key={option.id}
            active={active}
            onClick={() => onSelect(option)}
            className={showImages ? 'min-h-[116px]' : 'min-h-[94px]'}
          >
            {showImages && image ? <img src={image} alt="" className={cn('mb-3 h-16 w-full rounded-xl border object-cover', active ? 'border-white/20' : 'border-washa-border')} /> : null}
            <p className="font-black">{cleanOptionName(option.name)}</p>
            <p className={cn('mt-2 line-clamp-2 text-xs font-bold leading-5', active ? 'text-washa-bg/70' : 'text-washa-text-sec')}>
              {option.description || fallbackDescription}
            </p>
          </ChoiceButton>
        );
      })}
    </div>
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

export default function WashaDevStudioV2({ onOpenGallery, variant = 'classic' }: WashaDevStudioV2Props) {
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
    isMockupCurrent,
    extractedImage,
    generationAttemptOutcome,
    error,
    orderResult,
    isBoardPreview,
    generationDisclaimer,
  } = useDesign();

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [studioView, setStudioView] = useState<StudioView>('wizard');
  const [dragging, setDragging] = useState(false);
  const [resultAssetView, setResultAssetView] = useState<'mockup' | 'artwork'>('mockup');
  const [creativeDirectionId, setCreativeDirectionId] = useState<CreativeDirection['id']>('signature');
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false);
  const enhancementRequestVersionRef = useRef(0);
  const [ideaEnhancement, setIdeaEnhancement] = useState<{
    beforePrompt: string;
    beforeIdea: string;
    enhancedPrompt: string;
    provider: string | null;
  } | null>(null);
  const isPromptNative = variant === 'prompt-native';
  const generationAttemptStatus: GenerationAttemptStatus = isGenerating ? 'running' : generationAttemptOutcome ?? 'idle';
  const selectedCreativeDirection = CREATIVE_DIRECTIONS.find((direction) => direction.id === creativeDirectionId) || CREATIVE_DIRECTIONS[0];

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
  const basePromptQuality = useMemo(
    () => getPromptQuality(state, selectedSize, selectedPalette),
    [selectedPalette, selectedSize, state]
  );
  const promptQuality = Math.min(100, basePromptQuality + (ideaEnhancement ? 8 : 0));
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

  const invalidatePendingEnhancement = () => {
    enhancementRequestVersionRef.current += 1;
    if (isEnhancingIdea) setIsEnhancingIdea(false);
  };

  const handleSelectCreativeDirection = (directionId: CreativeDirection['id']) => {
    if (directionId === creativeDirectionId) return;
    invalidatePendingEnhancement();
    if (ideaEnhancement) {
      updateState({ prompt: ideaEnhancement.beforePrompt });
      setIdeaEnhancement(null);
    }
    setCreativeDirectionId(directionId);
  };

  const handleSelectDesignMethod = (designMethod: DesignMethod) => {
    if (!isPromptNative) {
      updateState({ designMethod });
      return;
    }

    invalidatePendingEnhancement();
    const restoredPrompt = ideaEnhancement?.beforePrompt ?? state.prompt;
    updateState({
      designMethod,
      prompt: designMethod === 'calligraphy' ? '' : restoredPrompt,
    });
    setIdeaEnhancement(null);
  };

  const handleCalligraphyTextChange = (value: string) => {
    invalidatePendingEnhancement();
    updateState({
      calligraphyText: value,
      ...(ideaEnhancement ? { prompt: ideaEnhancement.beforePrompt } : {}),
    });
    if (ideaEnhancement) setIdeaEnhancement(null);
  };

  const handleReferenceImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    invalidatePendingEnhancement();
    if (ideaEnhancement) {
      updateState({ prompt: ideaEnhancement.beforePrompt });
      setIdeaEnhancement(null);
    }
    handleImageUpload(event);
  };

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

  const handleImprovePrompt = async () => {
    const sourceIdea = state.designMethod === 'calligraphy'
      ? state.calligraphyText.trim()
      : state.prompt.trim();
    if (sourceIdea.length < 2 || isEnhancingIdea) {
      if (state.designMethod === 'image' && state.referenceImage && !sourceIdea) {
        showToast('أضف وصفاً قصيراً للصورة ليتمكن الذكاء الاصطناعي من تطويرها', 'info');
      }
      return;
    }

    if (!isPromptNative) {
      const nextPrompt = composeCustomerFacingPromptV2({
        state,
        selectedStyle,
        selectedPalette,
        creativeDirection: null,
      });
      updateState({ prompt: nextPrompt });
      showToast('تم تحسين الوصف', 'success');
      return;
    }

    setIsEnhancingIdea(true);
    const requestVersion = enhancementRequestVersionRef.current + 1;
    enhancementRequestVersionRef.current = requestVersion;
    try {
      const result = await enhanceDesignIdea({
        idea: sourceIdea,
        garmentType: state.garmentType || null,
        style: selectedStyle?.name || state.style || null,
        technique: selectedTechnique?.name || state.technique || null,
        palette: state.paletteId === CUSTOM_PALETTE_ID
          ? state.customPalette || null
          : selectedPalette?.name || state.palette || null,
        surface: 'dev-v3',
        creativeDirection: selectedCreativeDirection.prompt,
      }, { allowLocalFallback: false });

      if (!result.enhancedIdea || requestVersion !== enhancementRequestVersionRef.current) return;
      setIdeaEnhancement({
        beforePrompt: state.prompt,
        beforeIdea: sourceIdea,
        enhancedPrompt: result.enhancedIdea,
        provider: result.provider || null,
      });
      updateState({ prompt: result.enhancedIdea });
      showToast(
        result.provider === 'gemini'
          ? 'تم تحسين الفكرة بالذكاء الاصطناعي عبر المسار الاحتياطي'
          : 'تمت صياغة رؤية فنية جديدة بواسطة OpenAI',
        'success'
      );
    } catch {
      if (requestVersion === enhancementRequestVersionRef.current) {
        showToast('تعذر تحسين الفكرة بالذكاء الاصطناعي الآن. حاول مجدداً.', 'error');
      }
    } finally {
      if (requestVersion === enhancementRequestVersionRef.current) {
        setIsEnhancingIdea(false);
      }
    }
  };

  const handleRestoreIdea = () => {
    if (!ideaEnhancement) return;
    updateState({ prompt: ideaEnhancement.beforePrompt });
    setIdeaEnhancement(null);
    showToast('تمت استعادة الوصف السابق', 'info');
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
    creativeDirection: isPromptNative ? selectedCreativeDirection : null,
  });

  const runGenerationAttempt = async () => {
    if (!canGenerate) return;
    await handleGenerate({ promptOverride: getGenerationPromptOverride() });
  };

  const handleGenerateFromWizard = () => {
    if (!canGenerate) return;
    setResultAssetView('mockup');
    setStudioView('generation');
    void runGenerationAttempt();
  };

  const handleRetryGenerate = () => {
    if (!canGenerate) return;
    setResultAssetView('mockup');
    void runGenerationAttempt();
  };

  const handleEditStep = (index: number) => {
    setStudioView('wizard');
    setActiveStepIndex(Math.max(0, Math.min(WIZARD_STEPS.length - 1, index)));
  };

  const handleStartOver = () => {
    resetDesign();
    setCreativeDirectionId('signature');
    setIdeaEnhancement(null);
    setResultAssetView('mockup');
    setActiveStepIndex(0);
    setStudioView('wizard');
  };

  const renderIdeaStep = () => (
    <div className="space-y-7">
      <StepIntro
        eyebrow={isPromptNative ? 'ابدأ بالإحساس' : 'ابدأ من الفكرة'}
        title={isPromptNative ? 'قل لنا الفكرة، واختر كيف تريد أن تُشعَر.' : 'اكتب ما تتخيله، وسنحوّله إلى وصف أوضح.'}
        body={isPromptNative
          ? 'اكتبها ببساطة؛ V3 سيحافظ على معناها ثم يحولها إلى توجيه فني غني بالتكوين والضوء والتفصيل الخاص.'
          : 'لا تحتاج لصياغة مثالية. اكتب الفكرة ببساطة، ثم استخدم تحسين الوصف إذا أردت صياغة أغنى وأكثر تصويراً.'}
      />

      {isPromptNative ? <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-washa-text">الإحساس الإبداعي</p>
            <p className="mt-1 text-xs font-bold text-washa-text-faint">اختيار واحد يضبط شخصية التصميم بالكامل.</p>
          </div>
          <span className="rounded-full bg-[#C9A84C]/12 px-3 py-1.5 text-[10px] font-black text-[#715618]">خطوة ذكية</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CREATIVE_DIRECTIONS.map((direction) => {
            const active = direction.id === creativeDirectionId;
            const Icon = direction.icon;
            return (
              <button
                key={direction.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectCreativeDirection(direction.id)}
                className={cn(
                  'group min-h-[104px] rounded-[20px] border p-3 text-right transition duration-200 active:scale-[0.985] sm:min-h-[112px] sm:rounded-[22px] sm:p-4',
                  active
                    ? 'border-[#C9A84C] bg-[#1A1A1A] text-white shadow-[0_16px_36px_rgba(26,26,26,0.14)]'
                    : 'border-washa-border/70 bg-white/70 text-washa-text hover:border-[#C9A84C]/60 hover:bg-white'
                )}
              >
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-2xl', active ? 'bg-[#C9A84C] text-[#1A1A1A]' : 'bg-washa-surface text-[#715618]')}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xs font-black sm:text-sm">{direction.label}</p>
                <p className={cn('mt-1 hidden text-[11px] font-bold leading-5 sm:block', active ? 'text-white/62' : 'text-washa-text-faint')}>{direction.hint}</p>
              </button>
            );
          })}
        </div>
      </div> : null}

      <div className="grid grid-cols-3 gap-2 rounded-[22px] border border-washa-border/60 bg-washa-bg p-2">
        {METHOD_TABS.map(({ id, label, hint, icon: Icon }) => {
          const active = state.designMethod === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectDesignMethod(id)}
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
                onChange={(event) => {
                  invalidatePendingEnhancement();
                  updateState({ prompt: event.target.value });
                  if (ideaEnhancement && event.target.value !== ideaEnhancement.enhancedPrompt) setIdeaEnhancement(null);
                }}
                placeholder={isPromptNative ? 'مثال: صقر يحلق فوق جبال العلا عند الغروب' : 'مثال: ديناصور يرقص'}
                className="min-h-[260px] resize-none rounded-[28px] border-washa-border/70 bg-washa-bg p-6 text-lg leading-9 text-washa-text placeholder:text-washa-text-faint focus-visible:ring-washa-gold/40"
                maxLength={620}
              />
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-washa-text-faint">
                <span>{getQualityLabel(promptQuality)}</span>
                <span>{state.prompt.length}/620</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {isPromptNative
                ? PROMPT_STARTERS.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => {
                        invalidatePendingEnhancement();
                        updateState({ prompt: starter.prompt });
                        setIdeaEnhancement(null);
                      }}
                      className="group inline-flex items-center gap-2 rounded-full border border-washa-border bg-washa-ivory px-3 py-2 text-xs font-bold text-washa-text-sec transition hover:border-[#C9A84C] hover:text-washa-text active:scale-[0.985]"
                    >
                      <Sparkles className="h-3 w-3 text-[#C9A84C]" />
                      {starter.label}
                    </button>
                  ))
                : LEGACY_PROMPT_STARTERS.map((starter) => (
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
                handleReferenceImageUpload(syntheticEvent);
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
              <input type="file" accept="image/*" className="sr-only" onChange={handleReferenceImageUpload} />
            </label>
            <Textarea
              value={state.prompt}
              onChange={(event) => {
                invalidatePendingEnhancement();
                updateState({ prompt: event.target.value });
                if (ideaEnhancement && event.target.value !== ideaEnhancement.enhancedPrompt) setIdeaEnhancement(null);
              }}
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
                onChange={(event) => handleCalligraphyTextChange(event.target.value)}
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

      {ideaEnhancement ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[26px] border border-[#C9A84C]/35 bg-[linear-gradient(135deg,rgba(201,168,76,0.13),rgba(255,255,255,0.78))]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C9A84C]/18 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-black text-[#715618]">
              <CheckCircle2 className="h-4 w-4" />
              رؤية فنية محسّنة فعلياً
            </p>
            <span className="rounded-full bg-white/75 px-2.5 py-1 text-[9px] font-black tracking-[0.12em] text-washa-text-sec" dir="ltr">
              {ideaEnhancement.provider === 'gemini' ? 'GEMINI FALLBACK' : 'OPENAI'}
            </span>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <p className="text-[10px] font-black text-washa-text-faint">الفكرة الأصلية</p>
              <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-washa-text-sec">{ideaEnhancement.beforeIdea}</p>
            </div>
            <Button variant="ghost" onClick={handleRestoreIdea} className="h-10 gap-2 rounded-xl px-3 text-xs">
              <RefreshCcw className="h-3.5 w-3.5" />
              استعادة الأصل
            </Button>
          </div>
        </motion.div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-[26px] border border-washa-border/70 bg-washa-bg p-3">
        <Button
          variant="gold"
          onClick={() => void handleImprovePrompt()}
          disabled={isPromptNative
            ? isEnhancingIdea || !hasIdea
            : !hasIdea}
          className={cn(
            'h-12 gap-2 rounded-2xl px-5',
            isPromptNative ? 'min-w-[184px] bg-[#1A1A1A] text-white hover:bg-[#342D25]' : ''
          )}
        >
          {isEnhancingIdea
            ? <Loader2 className="h-4 w-4 animate-spin text-[#C9A84C]" />
            : <Wand2 className={cn('h-4 w-4', isPromptNative ? 'text-[#C9A84C]' : '')} />}
          {isPromptNative
            ? isEnhancingIdea ? 'يصوغ الرؤية الفنية...' : ideaEnhancement ? 'تحسين مرة أخرى' : 'تحسين بالذكاء الاصطناعي'
            : 'تحسين الوصف'}
        </Button>
        <div className="min-w-[180px] flex-1">
          <div className="flex items-center justify-between text-xs font-bold text-washa-text-sec">
            <span>{ideaEnhancement ? 'جاهزية الرؤية الفنية' : 'وضوح الفكرة'}</span>
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
        title={isPromptNative ? 'ثلاثة اختيارات، في مكان واحد.' : 'حدد القطعة واللون والمقاس.'}
        body={isPromptNative
          ? 'اختر القطعة أولاً، وسنرتب لك ألوانها ومقاساتها المتاحة مباشرة من الكتالوج الفعلي.'
          : 'هذه الخيارات مرتبطة بالكتالوج الفعلي، لذلك تظهر النتيجة على قطعة يمكن طلبها لاحقا.'}
      />

      {isPromptNative && selectedGarment ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-[#C9A84C]/[0.24] bg-[#C9A84C]/[0.08] px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#1A1A1A] text-[#C9A84C]"><Check className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-[#715618]">اختيارك الحالي</p>
            <p className="truncate text-sm font-black text-washa-text">
              {cleanOptionName(selectedGarment.name)}
              {selectedColor ? ` · ${cleanOptionName(selectedColor.name)}` : ''}
              {selectedSize ? ` · ${selectedSize.name}` : ''}
            </p>
          </div>
          <span className="rounded-full bg-white/70 px-3 py-1.5 text-[10px] font-black text-washa-text-sec">{stockLabel(selectedSize)}</span>
        </div>
      ) : null}

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
        title={isPromptNative ? 'أين تريد أن تقع النظرة أولاً؟' : 'اختر مكان ظهور التصميم.'}
        body={isPromptNative
          ? 'اختر الموضع بصرياً؛ سنستخدمه لضبط حجم التكوين واتجاهه قبل بناء الموكب.'
          : 'اختيار الموضع يساعد على ضبط التكوين قبل التوليد حتى تكون النتيجة أقرب لما تتوقعه.'}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {positionOptions.map((position) => {
          const active = state.printOptionId === position.id;
          const image = assetUrl(position.imageUrl);
          return (
            <ChoiceButton key={position.id} active={active} onClick={() => handleSelectPosition(position)} className={isPromptNative ? 'min-h-[154px]' : 'min-h-[118px]'}>
              {isPromptNative ? <div className="flex items-center gap-3">
                <span className={cn('flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border', active ? 'border-white/20 bg-white/10' : 'border-washa-border bg-washa-ivory')}>
                  {image ? <img src={image} alt="" className="h-full w-full object-contain p-1.5" /> : <Shirt className="h-7 w-7 opacity-55" />}
                </span>
                <div>
                  <p className="text-base font-black">{cleanOptionName(position.name)}</p>
                  <p className={cn('mt-2 text-xs font-bold leading-6', active ? 'text-washa-bg/75' : 'text-washa-text-sec')}>
                    {position.description || (position.price > 0 ? `${position.price.toFixed(2)} ر.س` : 'مناسب للتصميم الرئيسي')}
                  </p>
                </div>
              </div> : <>
                <p className="text-lg font-black">{cleanOptionName(position.name)}</p>
                <p className={cn('mt-2 text-xs font-bold leading-6', active ? 'text-washa-bg/75' : 'text-washa-text-sec')}>
                  {position.description || (position.price > 0 ? `${position.price.toFixed(2)} ر.س` : 'مناسب للتصميم الرئيسي')}
                </p>
              </>}
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
        title={isPromptNative ? 'اختر الشكل، ثم اللمسة.' : 'اختر الأسلوب وطريقة المعالجة.'}
        body={isPromptNative
          ? 'الأسلوب يحدد الشخصية العامة، والمعالجة تضبط الخامة والحواف. يكفي اختيار بطاقة واحدة من كل مجموعة.'
          : 'هذه الخطوة تحدد شخصية التصميم: هل يبدو كملصق، رسم رقمي، خط بسيط، أو طابع آخر.'}
      />

      {isPromptNative ? <div className="rounded-[24px] border border-[#C9A84C]/[0.22] bg-[#1A1A1A] px-4 py-3 text-white">
        <p className="text-[10px] font-black text-[#C9A84C]">البصمة التي نبني عليها</p>
        <p className="mt-1 text-sm font-black">{selectedCreativeDirection.label} · {selectedCreativeDirection.hint}</p>
      </div> : null}

      <div className="grid gap-7 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-black text-washa-text">
              <Sparkles className="h-4 w-4 text-washa-gold" />
              الأسلوب
            </p>
            <span className="text-xs font-bold text-washa-text-faint">{styleOptions.length} خيار</span>
          </div>
          <CreativeOptionGrid
            options={styleOptions}
            selectedId={state.styleId}
            onSelect={(style) => updateState({ styleId: style.id, style: style.name })}
            fallbackDescription="أسلوب بصري يناسب الفكرة"
            showImages={isPromptNative}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-black text-washa-text">
              <Wand2 className="h-4 w-4 text-washa-gold" />
              المعالجة
            </p>
            <span className="text-xs font-bold text-washa-text-faint">{techniqueOptions.length} خيار</span>
          </div>
          <CreativeOptionGrid
            options={techniqueOptions}
            selectedId={state.techniqueId}
            onSelect={(technique) => updateState({ techniqueId: technique.id, technique: technique.name })}
            fallbackDescription="معالجة فنية نظيفة وواضحة"
            showImages={isPromptNative}
          />
        </div>
      </div>
    </div>
  );

  const renderPaletteStep = () => (
    <div className="space-y-7">
      <StepIntro
        eyebrow="ألوان التصميم"
        title={isPromptNative ? 'اختر المزاج اللوني، لا كل لون بمفرده.' : 'اختر لوحة ألوان تناسب الفكرة.'}
        body={isPromptNative
          ? 'كل لوحة منسقة مسبقاً لتبقى النتيجة متناغمة. اختر تلقائياً إن أردت أن يقرر المحرك بحسب الفكرة ولون القطعة.'
          : 'يمكنك ترك الألوان تلقائية أو اختيار طابع محدد. إن أردت لوحة خاصة، اكتبها بنفسك.'}
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
            {isPromptNative && palette.description ? (
              <p className={cn('mt-1 line-clamp-1 text-[10px] font-bold', state.paletteId === palette.id ? 'text-washa-bg/65' : 'text-washa-text-faint')}>{palette.description}</p>
            ) : null}
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
    const hasCurrentFinalDesign = hasFinalDesign && (!isPromptNative || isMockupCurrent);
    const isArtworkView = isPromptNative && resultAssetView === 'artwork' && Boolean(extractedImage);
    const displayImage = isArtworkView ? extractedImage : mockupImage || previewImage;
    const generationAttemptFailed = isPromptNative && generationAttemptStatus === 'failed';
    const generationAttemptNotStarted = isPromptNative && generationAttemptStatus === 'not_started';
    const needsCurrentGeneration = !hasFinalDesign || generationAttemptNotStarted || (isPromptNative && !isMockupCurrent);
    const resultTitle = isGenerating
      ? isPromptNative ? 'محرك V3 يبني النتيجة الآن.' : 'نجهز التصميم الآن.'
      : generationAttemptFailed
        ? 'لم تكتمل المحاولة الأخيرة.'
        : generationAttemptNotStarted
          ? 'لم تبدأ محاولة جديدة.'
        : hasCurrentFinalDesign
          ? isBoardPreview ? 'المعاينة المبدئية جاهزة.' : isPromptNative ? 'اكتمل أصل التصميم والموكب.' : 'التصميم جاهز.'
          : hasFinalDesign
            ? 'النتيجة السابقة محفوظة.'
          : 'جاهز لتوليد النتيجة.';
    const resultBody = isGenerating
      ? isPromptNative
        ? 'ينشئ OpenAI ملف الطباعة الشفاف أولاً، ثم يتحقق النظام من قناة Alpha قبل أن يركّبه Gemini على القطعة المختارة.'
        : 'نرتب الفكرة والقطعة والموضع في نتيجة واحدة قابلة للطلب.'
      : generationAttemptFailed
        ? hasFinalDesign
          ? 'تعذرت المحاولة الجديدة، لذلك أبقينا النتيجة السابقة متاحة للمراجعة. يمكنك إعادة المحاولة أو تعديل التوجيه.'
          : 'يمكنك إعادة التوليد من هنا أو الرجوع لتعديل أي اختيار.'
        : generationAttemptNotStarted
          ? hasFinalDesign
            ? 'لم يبدأ طلب جديد، والنتيجة السابقة ما زالت متاحة للمراجعة. حاول مجدداً عندما تصبح الخدمة جاهزة.'
            : 'لم يبدأ طلب التوليد. راجع التنبيه الظاهر ثم حاول مجدداً.'
        : hasCurrentFinalDesign
          ? isBoardPreview
            ? 'راجع معاينة اللوحة؛ المقاسات والتفاصيل النهائية يؤكدها فريق خدمة العملاء.'
            : isPromptNative
              ? 'راجع الموكب الواقعي وأصل الطباعة الشفاف، ثم اعتمد التصميم أو عدّل توجيهك.'
              : 'راجع التصميم النهائي، ثم أضفه للسلة أو عدّل الاختيارات قبل الاعتماد.'
          : hasFinalDesign
            ? 'هذه النتيجة تخص اختيارات سابقة. ولّد الاختيارات الحالية قبل اعتماد الطلب.'
          : 'يمكنك إعادة التوليد من هنا أو الرجوع لتعديل أي اختيار.';

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(340px,0.58fr)]">
        <section className="overflow-hidden rounded-[34px] bg-washa-text p-3 text-washa-bg shadow-[0_28px_90px_rgba(31,25,16,0.22)] sm:p-4">
          <div className="flex items-center justify-between gap-3 px-2 pb-4">
            <div>
              <p className="text-xs font-black text-washa-gold-light">{isPromptNative ? 'مسار أصل الطباعة' : 'واجهة التوليد'}</p>
              <p className="mt-1 text-lg font-black">{isArtworkView ? 'أصل الطباعة الشفاف' : hasFinalDesign ? isBoardPreview ? 'معاينة مبدئية' : isPromptNative ? isMockupCurrent ? 'الموكب الواقعي' : 'الموكب السابق' : 'النتيجة النهائية' : 'لوحة التكوين'}</p>
            </div>
            <span className="rounded-2xl border border-washa-bg/10 bg-washa-bg/10 px-3 py-2 text-xs font-black text-washa-bg/80">
              {isGenerating ? 'قيد التوليد' : isArtworkView ? 'PNG · ALPHA VERIFIED' : hasFinalDesign ? isBoardPreview ? 'للمراجعة فقط' : isPromptNative ? isMockupCurrent ? 'GEMINI COMPOSITE' : 'نتيجة سابقة' : 'جاهز للسلة' : 'بانتظار النتيجة'}
            </span>
          </div>

          {isPromptNative && hasFinalDesign && extractedImage ? (
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-[18px] border border-washa-bg/10 bg-washa-bg/10 p-1" aria-label="نوع ملف النتيجة">
              <button
                type="button"
                onClick={() => setResultAssetView('mockup')}
                className={cn('h-10 rounded-[14px] text-xs font-black transition', resultAssetView === 'mockup' ? 'bg-washa-bg text-washa-text' : 'text-washa-bg/65 hover:text-washa-bg')}
              >
                الموكب الواقعي
              </button>
              <button
                type="button"
                onClick={() => setResultAssetView('artwork')}
                className={cn('h-10 rounded-[14px] text-xs font-black transition', resultAssetView === 'artwork' ? 'bg-washa-bg text-washa-text' : 'text-washa-bg/65 hover:text-washa-bg')}
              >
                أصل الطباعة PNG
              </button>
            </div>
          ) : null}

          <div
            className={cn('relative aspect-[4/5] overflow-hidden rounded-[30px] border border-washa-bg/10', isArtworkView ? 'bg-[#E8E6DF]' : 'bg-[#13241F]')}
            style={isArtworkView ? { backgroundImage: 'linear-gradient(45deg, rgba(20,54,47,.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(20,54,47,.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(20,54,47,.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(20,54,47,.08) 75%)', backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px', backgroundSize: '24px 24px' } : undefined}
          >
            {displayImage ? (
              <img
                src={displayImage}
                alt={isArtworkView ? 'أصل الطباعة الشفاف بصيغة PNG' : hasFinalDesign ? isBoardPreview ? 'معاينة مبدئية للوحة التصميم' : 'التصميم النهائي على القطعة' : 'القطعة المختارة قبل التوليد'}
                className={cn('h-full w-full object-contain', isArtworkView ? 'p-8 sm:p-12' : hasFinalDesign ? 'object-cover' : 'p-5')}
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

          <BoardPreviewDisclosure visible={isBoardPreview || generationDisclaimer === 'preview_only'} />

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
              {generationAttemptFailed ? (
                <Button
                  variant="gold"
                  disabled={!canGenerate}
                  onClick={handleRetryGenerate}
                  className="h-14 w-full gap-2 rounded-2xl text-base"
                >
                  <RefreshCcw className="h-5 w-5" />
                  إعادة التوليد
                </Button>
              ) : needsCurrentGeneration ? (
                <Button
                  variant="gold"
                  disabled={!canGenerate}
                  onClick={handleRetryGenerate}
                  className="h-14 w-full gap-2 rounded-2xl text-base"
                >
                  {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                  {hasFinalDesign ? 'توليد الاختيارات الحالية' : 'توليد التصميم'}
                </Button>
              ) : !isBoardPreview ? (
                <Button
                  variant="gold"
                  disabled={isSubmittingOrder}
                  onClick={() => void submitOrder()}
                  className="h-14 w-full gap-2 rounded-2xl bg-washa-text text-washa-bg hover:bg-washa-gold-deep"
                >
                  {isSubmittingOrder ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBag className="h-5 w-5" />}
                  إضافة للسلة وإتمام الطلب
                </Button>
              ) : null}

              {hasFinalDesign ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {!isBoardPreview && !isPromptNative ? (
                    <Button variant="outline" disabled={isExtracting} onClick={() => void handleExtract()} className="h-12 gap-2 rounded-2xl">
                      {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      استخراج التصميم
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={() => handleDownload(mockupImage!, isBoardPreview ? 'washa-board-preview.webp' : 'washa-ai-mockup.png')} className="h-12 gap-2 rounded-2xl">
                    <Download className="h-4 w-4" />
                    تحميل المعاينة
                  </Button>
                </div>
              ) : null}

              {extractedImage && !isBoardPreview ? (
                <Button
                  variant="outline"
                  onClick={() => handleDownload(extractedImage, isPromptNative ? 'washa-ai-native-print.png' : 'washa-ai-print.png')}
                  className="h-12 w-full gap-2 rounded-2xl"
                >
                  <Download className="h-4 w-4" />
                  {isPromptNative ? 'تحميل أصل الطباعة PNG' : 'تحميل ملف الطباعة'}
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

  const promptNativeTheme = {
    '--color-washa-bg': '#F8F5EF',
    '--color-washa-surface': '#F0EBE1',
    '--color-washa-elevated': '#E6DED0',
    '--color-washa-border': 'rgba(61, 49, 33, 0.16)',
    '--color-washa-gold': '#76591F',
    '--color-washa-gold-light': '#C9A84C',
    '--color-washa-gold-deep': '#6F5625',
    '--color-washa-ivory': '#FFFDF9',
    '--color-washa-text': '#1D1B17',
    '--color-washa-text-sec': '#625C53',
    '--color-washa-text-faint': '#716A60',
  } as CSSProperties;

  const completedWizardSteps = [hasIdea, hasGarment, Boolean(state.printOptionId), hasStyle, hasPalette];
  const pipelineRunning = generationAttemptStatus === 'running' || isGenerating;
  const pipelineFailed = generationAttemptStatus === 'failed';
  const pipelineNotStarted = generationAttemptStatus === 'not_started';
  const pipelineStale = studioView === 'generation' && Boolean(mockupImage) && !isMockupCurrent;
  const pipelineUnavailable = studioView === 'generation' && !pipelineRunning && (generationAttemptStatus === 'preview' || generationAttemptStatus === 'idle' && isBoardPreview);
  const promptNativeComplete = studioView === 'generation'
    && !pipelineRunning
    && !pipelineFailed
    && !pipelineNotStarted
    && !pipelineUnavailable
    && !pipelineStale
    && isMockupCurrent
    && Boolean(mockupImage && extractedImage);
  const pipelineProgress = studioView === 'wizard' || pipelineRunning || pipelineUnavailable || pipelineFailed || pipelineNotStarted || pipelineStale ? 0 : promptNativeComplete ? 3 : extractedImage ? 2 : 0;
  const pipelineStatusLabel = pipelineRunning
    ? 'محرك V3 يعمل'
    : pipelineUnavailable
      ? 'معاينة بديلة للمراجعة'
      : pipelineFailed
        ? 'تعذرت المحاولة الأخيرة'
        : pipelineNotStarted
          ? 'لم تبدأ محاولة جديدة'
          : pipelineStale
            ? 'بانتظار توليد الاختيارات الحالية'
            : promptNativeComplete
              ? 'اكتمل محرك V3'
              : 'محرك V3 جاهز';

  if (isPromptNative) {
    return (
      <div
        dir="rtl"
        style={promptNativeTheme}
        className="relative min-h-[100dvh] overflow-x-hidden bg-washa-bg text-washa-text selection:bg-washa-gold selection:text-white"
      >
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_84%_4%,rgba(201,168,76,0.14),transparent_26%),radial-gradient(circle_at_8%_82%,rgba(29,27,23,0.06),transparent_32%)]" />
        <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(29,27,23,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(29,27,23,0.45)_1px,transparent_1px)] [background-size:48px_48px]" />

        <header className="sticky top-0 z-40 border-b border-washa-border bg-washa-bg/90 backdrop-blur-2xl">
          <div className="mx-auto flex h-[76px] w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1A1A1A] shadow-[0_14px_28px_rgba(26,26,26,0.2)]">
                <img src={siteAsset(BRAND_MARK_SRC)} alt="وشّى" className="h-full w-full object-contain p-2" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="whitespace-nowrap text-sm font-black leading-none text-[#1A1A1A] min-[360px]:text-lg sm:text-xl" dir="ltr">WASHA AI</p>
                  <span className="inline-flex h-5 items-center rounded-full border border-[#C9A84C]/35 bg-[#C9A84C]/12 px-1.5 text-[9px] font-black tracking-[0.12em] text-[#715618] min-[360px]:h-6 min-[360px]:px-2 min-[360px]:text-[10px]" dir="ltr">V3</span>
                </div>
                <p className="mt-1 hidden text-[11px] font-bold text-washa-text-sec sm:block">مختبر التصميم الذكي · من الفكرة إلى أصل طباعة حقيقي</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={CURRENT_APP_PATH}
                aria-label="العودة إلى WASHA AI"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-washa-border bg-white/70 px-3 text-xs font-black text-washa-text-sec transition hover:border-[#C9A84C]/50 hover:text-washa-text active:scale-[0.98]"
              >
                <ArrowRight className="h-4 w-4" />
                <span className="hidden sm:inline">العودة</span>
              </a>
              <button
                type="button"
                onClick={onOpenGallery}
                aria-label="فتح تصاميمي"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1A1A1A] px-3.5 text-xs font-black text-white shadow-[0_10px_24px_rgba(26,26,26,0.16)] transition hover:bg-[#342D25] active:scale-[0.98] sm:px-4"
              >
                <GalleryHorizontalEnd className="h-4 w-4 text-[#C9A84C]" />
                <span className="hidden sm:inline">تصاميمي</span>
              </button>
            </div>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[1440px] px-3 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-10 lg:pb-16">
          <section className="mb-4 overflow-hidden rounded-[26px] bg-[#1A1A1A] text-white shadow-[0_18px_50px_rgba(26,26,26,0.16)] sm:mb-6" aria-label="محرك إنتاج WASHA AI V3" aria-live="polite">
            <div className="grid lg:grid-cols-[minmax(220px,0.62fr)_minmax(0,1.38fr)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 lg:border-b-0 lg:border-l lg:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {isGenerating ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9A84C] opacity-50" /> : null}
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#C9A84C]" />
                    </span>
                    <p className="text-xs font-black text-white">{pipelineStatusLabel}</p>
                  </div>
                  <p className="mt-1 text-[10px] font-bold text-white/48" dir="ltr">PROMPT-NATIVE PIPELINE</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/60">3 مراحل</span>
              </div>

              <div className="grid grid-cols-3 divide-x-reverse divide-x divide-white/10">
                {PROMPT_NATIVE_PIPELINE.map(({ number, title, meta, icon: Icon }, index) => {
                  const complete = index < pipelineProgress;
                  const active = !pipelineUnavailable && !pipelineFailed && !pipelineNotStarted && !pipelineStale && pipelineProgress < PROMPT_NATIVE_PIPELINE.length && index === pipelineProgress;
                  return (
                    <div key={number} aria-current={active ? 'step' : undefined} className="relative flex min-w-0 items-center gap-2 px-2 py-3.5 sm:gap-3 sm:px-4">
                      <span className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors sm:h-9 sm:w-9',
                        complete ? 'border-[#C9A84C] bg-[#C9A84C] text-[#1A1A1A]' : active ? 'border-[#C9A84C]/60 bg-[#C9A84C]/12 text-[#C9A84C]' : 'border-white/10 bg-white/[0.04] text-white/35'
                      )}>
                        {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <p className={cn('truncate text-[10px] font-black sm:text-xs', complete || active ? 'text-white' : 'text-white/60')}>{title}</p>
                        <p className={cn('mt-0.5 hidden truncate text-[9px] font-bold tracking-[0.08em] sm:block', complete || active ? 'text-[#C9A84C]' : 'text-white/55')} dir="ltr">{number} · {meta}</p>
                        <span className="sr-only">{pipelineUnavailable ? 'لم تنفذ في المعاينة البديلة' : pipelineFailed ? 'تعذرت في المحاولة الأخيرة' : pipelineNotStarted ? 'لم تبدأ محاولة جديدة' : pipelineStale ? 'بانتظار توليد الاختيارات الحالية' : complete ? 'مكتملة' : active ? 'المرحلة الحالية' : 'بانتظار التنفيذ'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {studioView === 'wizard' ? (
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
              <aside className="self-start overflow-hidden rounded-[28px] border border-washa-border bg-white/76 shadow-[0_18px_50px_rgba(56,43,20,0.06)] backdrop-blur-xl lg:sticky lg:top-[100px]">
                <div className="hidden border-b border-washa-border px-5 py-5 lg:block">
                  <p className="text-[10px] font-black tracking-[0.16em] text-[#715618]" dir="ltr">DESIGN DIRECTION</p>
                  <p className="mt-2 text-xl font-black text-[#1A1A1A]">ابنِ فكرتك بدقة.</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-washa-text-sec">كل اختيار يضيف توجيهاً واضحاً لمحرك التصميم.</p>
                </div>

                <nav className="grid grid-cols-5 gap-1 p-2 lg:block lg:space-y-1 lg:p-3" aria-label="خطوات تصميم V3">
                  {WIZARD_STEPS.map((step, index) => {
                    const active = index === activeStepIndex;
                    const complete = completedWizardSteps[index] && index < activeStepIndex;
                    const disabled = index > activeStepIndex + 1 || (index === activeStepIndex + 1 && !stepCanContinue);
                    return (
                      <button
                        key={step.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleStepClick(index)}
                        aria-current={active ? 'step' : undefined}
                        className={cn(
                          'group flex min-h-[62px] min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 text-center transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-35 lg:min-h-[56px] lg:w-full lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-right',
                          active ? 'bg-[#1A1A1A] text-white shadow-[0_10px_24px_rgba(26,26,26,0.14)]' : 'text-washa-text-sec hover:bg-washa-surface hover:text-washa-text'
                        )}
                      >
                        <span className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black tabular-nums',
                          active ? 'border-[#C9A84C] bg-[#C9A84C] text-[#1A1A1A]' : complete ? 'border-[#C9A84C]/35 bg-[#C9A84C]/12 text-[#715618]' : 'border-washa-border bg-white/60 text-washa-text-faint'
                        )}>
                          {complete ? <Check className="h-3 w-3" strokeWidth={3} /> : step.eyebrow}
                        </span>
                        <span className="w-full truncate text-[10px] font-black sm:text-xs lg:w-auto lg:text-sm">{step.label}</span>
                        {active ? <span className="mr-auto hidden h-1.5 w-1.5 rounded-full bg-[#C9A84C] lg:block" /> : null}
                      </button>
                    );
                  })}
                </nav>

                <div className="hidden border-t border-washa-border p-4 lg:block">
                  <div className="rounded-[20px] bg-washa-surface px-4 py-3">
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="text-washa-text-sec">جاهزية التوجيه</span>
                      <span className="text-[#715618]">{promptQuality}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                      <motion.div className="h-full rounded-full bg-[#C9A84C]" animate={{ width: `${promptQuality}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                    </div>
                  </div>
                </div>
              </aside>

              <div className="min-w-0">
                <motion.section
                  layout
                  className="min-h-[620px] overflow-hidden rounded-[30px] border border-washa-border bg-washa-ivory/92 p-5 shadow-[0_24px_70px_rgba(56,43,20,0.08)] sm:p-7 lg:min-h-[680px] lg:p-10"
                >
                  <div className="mb-7 flex items-center justify-between border-b border-washa-border pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black tracking-[0.16em] text-[#715618]" dir="ltr">STEP {activeStep.eyebrow}</span>
                      <span className="h-1 w-1 rounded-full bg-washa-text-faint" />
                      <span className="text-xs font-black text-washa-text-sec">{activeStep.label}</span>
                    </div>
                    <span className="text-[10px] font-bold text-washa-text-faint">{activeStepIndex + 1} / {WIZARD_STEPS.length}</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {renderStepContent()}
                    </motion.div>
                  </AnimatePresence>
                </motion.section>

                <div className="sticky bottom-3 z-20 mt-4 flex items-center justify-between gap-2 rounded-[24px] border border-washa-border bg-washa-bg/90 p-2.5 shadow-[0_18px_50px_rgba(26,26,26,0.12)] backdrop-blur-2xl sm:p-3">
                  <Button variant="ghost" onClick={goBack} disabled={activeStepIndex === 0} className="h-12 gap-2 rounded-2xl px-3 sm:px-5">
                    <ArrowRight className="h-4 w-4" />
                    <span className="hidden sm:inline">السابق</span>
                  </Button>
                  <div className="hidden text-center sm:block">
                    <p className="text-xs font-black text-washa-text">{activeStep.label}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-washa-text-faint">خطوة {activeStepIndex + 1} من {WIZARD_STEPS.length}</p>
                  </div>
                  <Button
                    variant="gold"
                    disabled={isLastWizardStep ? !canGenerate : !stepCanContinue}
                    onClick={isLastWizardStep ? handleGenerateFromWizard : goNext}
                    className="h-12 min-w-[148px] gap-2 rounded-2xl bg-[#1A1A1A] px-5 text-white hover:bg-[#3A3128] disabled:bg-washa-elevated disabled:text-washa-text-faint sm:min-w-[170px]"
                  >
                    {isLastWizardStep ? <><span>توليد التصميم</span><Wand2 className="h-4 w-4 text-[#C9A84C]" /></> : <><span>التالي</span><ArrowLeft className="h-4 w-4 text-[#C9A84C]" /></>}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <motion.section
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden rounded-[32px] border border-washa-border bg-washa-ivory/92 p-4 shadow-[0_24px_70px_rgba(56,43,20,0.1)] sm:p-6 lg:p-8"
            >
              {renderGenerationView()}
            </motion.section>
          )}
        </main>
      </div>
    );
  }

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
