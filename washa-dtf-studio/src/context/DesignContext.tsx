import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {useAuth} from '@clerk/clerk-react';
import {
  CUSTOM_PALETTE_ID,
  CUSTOM_PALETTE_LABEL,
  CUSTOM_PALETTE_PROMPT,
  FALLBACK_DTF_CONFIG,
  FALLBACK_PALETTE_PROMPTS,
  FALLBACK_STYLE_PROMPTS,
  FALLBACK_TECHNIQUE_PROMPTS,
  type DesignState,
  type DtfStudioColorOption,
  type DtfStudioConfig,
  type DtfStudioCreativeOption,
  type DtfStudioGarmentOption,
  type DtfStudioPaletteOption,
  type DtfStudioPositionOption,
  type DtfStudioSizeOption,
} from '../types';
import {
  generateMockup,
  getGeneratedPreviewUrl,
  getStructuredStudioError,
  isBoardPreviewResult,
  recomposeMockup,
  type GeneratedArtworkResult,
} from '../services/geminiService';
import { fetchDtfStudioConfig } from '../services/configService';
import { parseDataUrlParts, resizeDataUrl, stripDataUrlPrefix } from '../lib/image';
import {
  getPublicStudioErrorMessage,
  PUBLIC_EXTRACTION_ERROR,
  PUBLIC_GENERATION_ERROR,
  PUBLIC_SUBMIT_ERROR,
  type PublicStudioErrorScope,
} from '../lib/publicErrors';
import {
  buildWashaAiSignInUrl,
  buildWashaAiSignUpUrl,
  consumeWashaAiAuthDraft,
  fetchWashaAiSession,
  saveWashaAiAuthDraft,
  type WashaAiAuthIntent,
} from '../lib/authFlow';
import {
  findSupportedPrintOption,
  getPrintPlacementCopy,
  resolvePrintPlacementFromOption,
  resolvePrintPositionFromDesignPosition,
  resolvePrintSizeFromDesignPosition,
} from '../lib/placement';
import {
  clearStudioDraft,
  getHighestReachableStep,
  isStudioAppPath,
  readStudioStepFromUrl,
  reconcileAuthDraftState,
  syncStudioStepInUrl,
} from '../lib/studioDraft';
import { createEmptyGuidedIdeaBrief } from '../lib/ideaBuilder';
import {
  createArtworkFingerprint,
  createGenerationFingerprint,
  validateGeneratedImage,
} from '../lib/generationExperience';
import {
  StructuredRecoveryCoordinator,
  canBypassDisabledReadiness,
  resolveReadinessErrorDirective,
  type GenerationRetryIdentity,
  type StructuredRecoveryState,
} from '../lib/structuredErrorActions';

export interface OrderResult {
  itemTitle: string;
  price: number;
}

export type StructuredGenerationErrorState = StructuredRecoveryState;

interface GenerateOptions {
  promptOverride?: string;
  automaticRetryAttempt?: number;
  retryIdentity?: GenerationRetryIdentity;
}

interface DesignContextType {
  step: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  state: DesignState;
  updateState: (updates: Partial<DesignState>) => void;
  isGenerating: boolean;
  isExtracting: boolean;
  mockupImage: string | null;
  mockupState: DesignState | null;
  isMockupCurrent: boolean;
  extractedImage: string | null;
  generationResult: GeneratedArtworkResult | null;
  isBoardPreview: boolean;
  generationDisclaimer: 'preview_only' | null;
  error: string | null;
  structuredGenerationError: StructuredGenerationErrorState | null;
  isGenerationRetryBlocked: boolean;
  promptFieldError: boolean;
  promptFocusRequestId: number;
  isSubmittingOrder: boolean;
  orderResult: OrderResult | null;
  submitOrder: () => Promise<boolean>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGenerate: (options?: GenerateOptions) => Promise<void>;
  handleExtract: () => Promise<void>;
  handleDownload: (imageUrl: string, filename: string) => void;
  resetDesign: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toast: ToastState | null;
  clearToast: () => void;
  config: DtfStudioConfig | null;
  configLoading: boolean;
  configError: string | null;
  garmentOptions: DtfStudioGarmentOption[];
  colorOptions: DtfStudioColorOption[];
  sizeOptions: DtfStudioSizeOption[];
  styleOptions: DtfStudioCreativeOption[];
  techniqueOptions: DtfStudioCreativeOption[];
  paletteOptions: DtfStudioPaletteOption[];
  positionOptions: DtfStudioPositionOption[];
  selectedGarment: DtfStudioGarmentOption | null;
  selectedColor: DtfStudioColorOption | null;
  selectedSize: DtfStudioSizeOption | null;
  selectedStyle: DtfStudioCreativeOption | null;
  selectedTechnique: DtfStudioCreativeOption | null;
  selectedPalette: DtfStudioPaletteOption | null;
  authGateIntent: WashaAiAuthIntent | null;
  authGateNotice: string | null;
  closeAuthGate: () => void;
  continueAuthentication: (mode: 'sign-in' | 'sign-up') => void;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);
const REFERENCE_IMAGE_MAX_DIMENSION = 1200;
const REFERENCE_IMAGE_QUALITY = 0.76;
const REFERENCE_IMAGE_MAX_FILE_SIZE = 15 * 1024 * 1024;
const TRANSPARENT_REFERENCE_TYPES = new Set(['image/png', 'image/webp']);

const EMPTY_STATE: DesignState = {
  garmentId: null,
  garmentType: '',
  garmentColorId: null,
  garmentColor: '',
  garmentColorHex: '#111111',
  garmentSizeId: null,
  garmentSize: '',
  designMethod: 'text',
  ideaEntryMode: 'guided',
  ideaBrief: createEmptyGuidedIdeaBrief(),
  ideaBriefPromptSource: '',
  designPosition: 'front_large',
  printOptionId: null,
  printPosition: 'chest',
  printSize: 'large',
  printPositionLabel: 'تصميم أمامي كبير',
  printScale: 100,
  printOffsetX: 0,
  printOffsetY: 0,
  prompt: '',
  calligraphyText: '',
  referenceImage: null,
  referenceImageMimeType: null,
  referenceImageMode: 'reinterpret',
  styleId: null,
  style: '',
  techniqueId: null,
  technique: '',
  paletteId: null,
  palette: '',
  customPalette: '',
  removeBackground: true,
  avoidHardEdges: true,
};

function getReadableErrorMessage(error: unknown, fallback: string, scope: PublicStudioErrorScope = 'general') {
  if (error instanceof Error) {
    const message = error.message.trim();
    return getPublicStudioErrorMessage(message, scope, fallback);
  }

  return fallback;
}

function getReferenceOutputMimeType(file: File, dataUrl: string) {
  const detectedMimeType = parseDataUrlParts(dataUrl)?.mimeType.toLowerCase() || file.type.toLowerCase();
  return TRANSPARENT_REFERENCE_TYPES.has(detectedMimeType) ? 'image/webp' : 'image/jpeg';
}

function isLikelyGenerationTimeout(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('انتهت مهلة') ||
    lower.includes('deadline exceeded') ||
    lower.includes('timed out') ||
    lower.includes('504')
  );
}

function isLikelyGenerationTimeoutError(error: unknown, message: string) {
  const status = (error as { status?: unknown })?.status;
  return status === 504 || isLikelyGenerationTimeout(message);
}

async function parseApiPayload(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return { error: getPublicStudioErrorMessage(text, 'submit', PUBLIC_SUBMIT_ERROR) };
}

function resolveDefaultSize(garment: DtfStudioGarmentOption | null, colorId?: string | null) {
  if (!garment) return null;
  const orderableSizes = garment.sizes.filter((size) => size.stockStatus !== 'out');
  return orderableSizes.find((size) => size.colorId === colorId) || orderableSizes.find((size) => size.colorId === null) || orderableSizes[0] || garment.sizes[0] || null;
}

function isSizeOrderable(size: DtfStudioSizeOption | null | undefined) {
  return Boolean(size && size.stockStatus !== 'out');
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function buildInitialState(config: DtfStudioConfig): DesignState {
  const style = config.styles[0] || null;
  const technique = config.techniques[0] || null;
  const palette = config.palettes[0] || null;
  const printOption = findSupportedPrintOption(config.positions);
  const placement = resolvePrintPlacementFromOption(printOption);
  const placementCopy = getPrintPlacementCopy(placement.printPosition, placement.printSize);

  return {
    ...EMPTY_STATE,
    styleId: style?.id || null,
    style: style?.name || '',
    techniqueId: technique?.id || null,
    technique: technique?.name || '',
    paletteId: palette?.id || null,
    palette: palette?.name || '',
    designPosition: placement.designPosition,
    printOptionId: printOption?.id ?? null,
    printPosition: placement.printPosition,
    printSize: placement.printSize,
    printPositionLabel: placementCopy.title,
  };
}

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const {getToken, isLoaded: authLoaded, isSignedIn} = useAuth();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<DesignState>(EMPTY_STATE);
  const [config, setConfig] = useState<DtfStudioConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [mockupState, setMockupState] = useState<DesignState | null>(null);
  const [extractedImage, setExtractedImage] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<GeneratedArtworkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [structuredGenerationError, setStructuredGenerationError] =
    useState<StructuredGenerationErrorState | null>(null);
  const [promptFieldError, setPromptFieldError] = useState(false);
  const [promptFocusRequestId, setPromptFocusRequestId] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [pendingGenerateAfterAuth, setPendingGenerateAfterAuth] = useState(false);
  const [authGateIntent, setAuthGateIntent] = useState<WashaAiAuthIntent | null>(null);
  const [authGateNotice, setAuthGateNotice] = useState<string | null>(null);
  const [studioReady, setStudioReady] = useState(false);
  const restoredAuthDraftRef = useRef(false);
  const generationInFlightRef = useRef(false);
  const generationRetryRef = useRef<{ fingerprint: string; requestId: string } | null>(null);
  const handleGenerateRef = useRef<(options?: GenerateOptions) => Promise<void>>(
    async () => undefined
  );
  const structuredRecoveryRef = useRef<StructuredRecoveryCoordinator | null>(null);
  if (structuredRecoveryRef.current === null) {
    structuredRecoveryRef.current = new StructuredRecoveryCoordinator({
      getCurrentIdentity: () => generationRetryRef.current,
      isGenerationInFlight: () => generationInFlightRef.current,
      clearRetryIdentity: () => {
        generationRetryRef.current = null;
      },
      onPromptFocus: () => {
        setPromptFieldError(true);
        setPromptFocusRequestId((current) => current + 1);
        setStep(2);
      },
      onRetry: (retry) => {
        void handleGenerateRef.current({
          promptOverride: retry.promptOverride,
          automaticRetryAttempt: retry.automaticRetryAttempt,
          retryIdentity: retry.retryIdentity,
        });
      },
      onStateChange: setStructuredGenerationError,
    });
  }
  const isGenerationRetryBlocked =
    structuredRecoveryRef.current.isManualRetryBlocked();
  const isMockupCurrent = Boolean(
    mockupImage && mockupState && createGenerationFingerprint(mockupState) === createGenerationFingerprint(state)
  );

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const cancelStructuredRecovery = useCallback(() => {
    structuredRecoveryRef.current?.cancel();
  }, []);

  useEffect(() => () => {
    structuredRecoveryRef.current?.dispose();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      setConfigLoading(true);
      setConfigError(null);

      try {
        const loadedConfig = await fetchDtfStudioConfig();
        if (cancelled) return;
        setConfig(loadedConfig);
        setState((current) => {
          // Only preserve current selections if every set ID actually exists in the
          // freshly loaded config. Fake fallback IDs (e.g. 'garment-tshirt') won't
          // be found, so state will be rebuilt with real DB IDs.
          const inList = (id: string | null, list: { id: string }[]) =>
            !id || list.some((x) => x.id === id);
          const selectionsAreValid =
            inList(current.garmentId, loadedConfig.garments) &&
            inList(current.styleId, loadedConfig.styles) &&
            inList(current.techniqueId, loadedConfig.techniques) &&
            inList(current.paletteId, loadedConfig.palettes) &&
            inList(current.printOptionId, loadedConfig.positions);
          if (selectionsAreValid && (current.garmentId || current.styleId || current.techniqueId || current.paletteId || current.printOptionId)) {
            return current;
          }
          return buildInitialState(loadedConfig);
        });
      } catch (loadError) {
        if (cancelled) return;
        const message = getReadableErrorMessage(loadError, 'تعذر تحميل خيارات الاستوديو الإنتاجية حالياً.');
        setConfig(null);
        setConfigError(message);
      } finally {
        if (!cancelled) {
          setConfigLoading(false);
        }
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const garmentOptions = useMemo(() => config?.garments ?? [], [config]);
  const styleOptions = useMemo(() => config?.styles ?? [], [config]);
  const techniqueOptions = useMemo(() => config?.techniques ?? [], [config]);
  const paletteOptions = useMemo(() => config?.palettes ?? [], [config]);
  const positionOptions = useMemo(() => config?.positions ?? [], [config]);

  const selectedGarment = useMemo(
    () => garmentOptions.find((item) => item.id === state.garmentId) || null,
    [garmentOptions, state.garmentId]
  );

  const colorOptions = useMemo(
    () => selectedGarment?.colors ?? [],
    [selectedGarment]
  );

  const selectedColor = useMemo(
    () => colorOptions.find((item) => item.id === state.garmentColorId) || colorOptions[0] || null,
    [colorOptions, state.garmentColorId]
  );

  const sizeOptions = useMemo(() => {
    if (!selectedGarment) return [];
    const filtered = selectedGarment.sizes.filter((item) => item.colorId === null || item.colorId === selectedColor?.id);
    return filtered.length > 0 ? filtered : selectedGarment.sizes;
  }, [selectedColor?.id, selectedGarment]);

  const selectedSize = useMemo(
    () => {
      const current = sizeOptions.find((item) => item.id === state.garmentSizeId);
      if (isSizeOrderable(current)) return current || null;
      return sizeOptions.find((item) => item.stockStatus !== 'out') || current || sizeOptions[0] || null;
    },
    [sizeOptions, state.garmentSizeId]
  );

  const selectedStyle = useMemo(
    () => styleOptions.find((item) => item.id === state.styleId) || styleOptions[0] || null,
    [styleOptions, state.styleId]
  );

  const selectedTechnique = useMemo(
    () => techniqueOptions.find((item) => item.id === state.techniqueId) || techniqueOptions[0] || null,
    [techniqueOptions, state.techniqueId]
  );

  const selectedPalette = useMemo(
    () => paletteOptions.find((item) => item.id === state.paletteId) || paletteOptions[0] || null,
    [paletteOptions, state.paletteId]
  );

  useEffect(() => {
    if (!selectedGarment) return;
    setState((current) => {
      const nextColor = colorOptions.find((item) => item.id === current.garmentColorId) || colorOptions[0] || null;
      const currentSize = sizeOptions.find((item) => item.id === current.garmentSizeId);
      const nextSize = isSizeOrderable(currentSize) ? currentSize : resolveDefaultSize(selectedGarment, nextColor?.id || null);

      return {
        ...current,
        garmentId: selectedGarment.id,
        garmentType: selectedGarment.name,
        garmentColorId: nextColor?.id || null,
        garmentColor: nextColor?.name || '',
        garmentColorHex: nextColor?.hexCode || '#111111',
        garmentSizeId: nextSize?.id || null,
        garmentSize: nextSize?.name || '',
      };
    });
  }, [colorOptions, selectedGarment, sizeOptions]);

  useEffect(() => {
    if (!selectedStyle) return;
    setState((current) => ({ ...current, styleId: selectedStyle.id, style: selectedStyle.name }));
  }, [selectedStyle]);

  useEffect(() => {
    if (!selectedTechnique) return;
    setState((current) => ({ ...current, techniqueId: selectedTechnique.id, technique: selectedTechnique.name }));
  }, [selectedTechnique]);

  useEffect(() => {
    if (!selectedPalette) return;
    setState((current) => {
      if (current.paletteId === CUSTOM_PALETTE_ID) return current;
      return { ...current, paletteId: selectedPalette.id, palette: selectedPalette.name };
    });
  }, [selectedPalette]);

  const updateState = (updates: Partial<DesignState>) => {
    structuredRecoveryRef.current?.invalidate();
    if ('prompt' in updates || 'calligraphyText' in updates) {
      setPromptFieldError(false);
    }
    setState((prev) => ({
      ...prev,
      ...updates,
      removeBackground: true,
      avoidHardEdges: true,
    }));
  };

  const nextStep = () => setStep((value) => Math.min(6, value + 1));
  const prevStep = () => setStep((value) => Math.max(1, value - 1));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('الملف المختار ليس صورة صالحة.');
        showToast('اختر صورة بصيغة PNG أو JPG أو WebP', 'error');
        return;
      }
      if (file.size > REFERENCE_IMAGE_MAX_FILE_SIZE) {
        setError('حجم الصورة أكبر من الحد المسموح.');
        showToast('اختر صورة أصغر من 15 ميجابايت', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const resized = await resizeDataUrl(base64String, {
            maxDimension: REFERENCE_IMAGE_MAX_DIMENSION,
            quality: REFERENCE_IMAGE_QUALITY,
            outputMimeType: getReferenceOutputMimeType(file, base64String),
          });

          updateState({
            referenceImage: stripDataUrlPrefix(resized.dataUrl),
            referenceImageMimeType: resized.mimeType,
          });
          showToast('تم رفع الصورة وتجهيزها بنجاح', 'success');
        } catch (uploadError) {
          console.error('Failed to process uploaded image:', uploadError);
          setError('تعذر تجهيز الصورة المرجعية. حاول بصورة أصغر.');
          showToast('تعذر تجهيز الصورة المرجعية', 'error');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const requireAuthenticatedAction = useCallback(async (intent: WashaAiAuthIntent) => {
    if (!authLoaded) {
      const message = 'تعذّر التحقق من جلسة الدخول مؤقتاً.';
      setError(message);
      showToast(message, 'error');
      return false;
    }

    if (isSignedIn) {
      return true;
    }

    const draft = saveWashaAiAuthDraft(state, intent, intent === 'submit' ? mockupImage : null);
    if (!draft.saved) {
      const message = 'تعذر حفظ التصميم في هذا المتصفح. أبقِ الصفحة مفتوحة وجرّب مرة أخرى بعد تفريغ مساحة التخزين.';
      setError(message);
      showToast(message, 'error');
      return false;
    }
    const referenceNote = draft.referenceImageOmitted
      ? ' لم نستطع حفظ الصورة المرجعية محلياً؛ ستحتاج رفعها مجدداً بعد الرجوع.'
      : '';
    const resultNote = draft.resultOmitted
      ? ' سنعيد توليد النتيجة بعد الدخول لأن حجمها أكبر من مساحة الحفظ المحلية.'
      : ' تصميمك الحالي محفوظ وسيعود معك بعد الدخول.';

    setAuthGateNotice(`${resultNote}${referenceNote}`.trim());
    setAuthGateIntent(intent);
    return false;
  }, [authLoaded, isSignedIn, mockupImage, showToast, state]);

  const closeAuthGate = useCallback(() => {
    setAuthGateIntent(null);
    setAuthGateNotice(null);
  }, []);

  const continueAuthentication = useCallback((mode: 'sign-in' | 'sign-up') => {
    const intent = authGateIntent ?? 'submit';
    const draft = saveWashaAiAuthDraft(state, intent, intent === 'submit' ? mockupImage : null);
    if (!draft.saved) {
      const message = 'تعذر حفظ التصميم قبل الانتقال. أبقِ الصفحة مفتوحة وحاول بعد تفريغ مساحة التخزين.';
      setAuthGateNotice(message);
      setError(message);
      showToast(message, 'error');
      return;
    }
    const url = mode === 'sign-up' ? buildWashaAiSignUpUrl() : buildWashaAiSignInUrl();
    window.location.assign(url);
  }, [authGateIntent, mockupImage, showToast, state]);

  const handleGenerate = useCallback(async (options: GenerateOptions = {}) => {
    const isAutomaticRetry = typeof options.automaticRetryAttempt === 'number';
    const canRetryExpiredReadiness = canBypassDisabledReadiness({
      isAutomaticRetry,
      currentError: structuredGenerationError
        ? {
            code: structuredGenerationError.code,
            retryRemainingMs: structuredGenerationError.retryRemainingMs,
          }
        : null,
    });
    if (
      !isAutomaticRetry
      && structuredGenerationError?.userAction === 'wait_and_retry'
      && structuredGenerationError.retryRemainingMs > 0
    ) {
      return;
    }
    if (!isAutomaticRetry) {
      cancelStructuredRecovery();
    }
    if (generationInFlightRef.current || isGenerating) return;
    if (
      config?.generation?.enabled === false
      && !canRetryExpiredReadiness
    ) {
      const legacyMessage =
        config.generation.message || 'خدمة التوليد غير متاحة حالياً.';
      if (config.features?.structuredUserActionsEnabled === true) {
        const readiness = resolveReadinessErrorDirective({
          code: config.generation.code,
          message: legacyMessage,
          retryAfterSeconds: config.generation.retryAfterSeconds,
        });
        structuredRecoveryRef.current?.showState({
          code: readiness.code,
          userAction: readiness.userAction,
          requestId: null,
          retryRemainingMs: readiness.retryAfterMs ?? 0,
        });
        setError(readiness.message);
        showToast(readiness.message, 'error');
        return;
      }
      const message = legacyMessage;
      setError(message);
      showToast(message, 'error');
      return;
    }
    if (state.designMethod === 'calligraphy') {
      if (!state.calligraphyText.trim()) {
        setError('يرجى كتابة الجملة أو النص المراد تحويله لمخطوطة');
        showToast('يرجى كتابة النص المراد تصميمه', 'error');
        return;
      }
    } else if (!state.prompt && !state.referenceImage) {
      setError('يرجى إدخال وصف أو رفع صورة مرجعية');
      showToast('يرجى إدخال وصف أو رفع صورة مرجعية', 'error');
      return;
    }

    if (!state.garmentType || !state.garmentColor || !state.garmentSize || !state.style || !state.technique || !state.paletteId) {
      setError('إعدادات القطعة أو النمط غير مكتملة.');
      showToast('أكمل القطعة واللون والمقاس والأسلوب قبل التوليد', 'error');
      return;
    }

    if (selectedSize?.stockStatus === 'out') {
      setError('المقاس المحدد غير متوفر حالياً.');
      showToast('اختر مقاساً متوفراً قبل المتابعة', 'error');
      return;
    }

    if (state.paletteId === CUSTOM_PALETTE_ID && !state.customPalette?.trim()) {
      setError('يرجى كتابة وصف لوحة الألوان المخصصة.');
      showToast('اكتب وصف لوحة الألوان المخصصة قبل التوليد', 'error');
      return;
    }

    generationInFlightRef.current = true;
    const authenticated = await requireAuthenticatedAction('generate');
    if (!authenticated) {
      generationInFlightRef.current = false;
      return;
    }

    let sessionToken: string | null = null;
    try {
      sessionToken = await getToken({skipCache: true});
    } catch {
      const message = 'تعذّر التحقق من جلسة الدخول مؤقتاً.';
      setError(message);
      showToast(message, 'error');
      generationInFlightRef.current = false;
      return;
    }
    if (!sessionToken) {
      const message = 'تعذّر التحقق من جلسة الدخول مؤقتاً.';
      setError(message);
      showToast(message, 'error');
      generationInFlightRef.current = false;
      return;
    }

    setIsGenerating(true);
    setError(null);

    const primaryGenerationResult = isBoardPreviewResult(generationResult)
      ? null
      : generationResult;
    const canRecompose = Boolean(
      primaryGenerationResult
      && mockupState
      && !options.promptOverride?.trim()
      && createArtworkFingerprint(mockupState) === createArtworkFingerprint(state)
    );
    setExtractedImage(null);
    setStep(6);
    const currentGenerationFingerprint = createGenerationFingerprint(state);
    const generationRequestId =
      generationRetryRef.current?.fingerprint === currentGenerationFingerprint
        ? generationRetryRef.current.requestId
        : crypto.randomUUID();
    if (!canRecompose) {
      generationRetryRef.current = {
        fingerprint: currentGenerationFingerprint,
        requestId: generationRequestId,
      };
    }

    const palettePrompt = state.paletteId === CUSTOM_PALETTE_ID
      ? (state.customPalette || CUSTOM_PALETTE_PROMPT)
      : selectedPalette?.prompt || FALLBACK_PALETTE_PROMPTS[state.palette] || state.palette;
    const techniquePrompt = selectedTechnique?.prompt || FALLBACK_TECHNIQUE_PROMPTS[state.technique] || state.technique;
    const stylePrompt = selectedStyle?.prompt || FALLBACK_STYLE_PROMPTS[state.style] || state.style;
    const effectivePrintPosition = state.printPosition ?? resolvePrintPositionFromDesignPosition(state.designPosition);
    const effectivePrintSize = state.printSize ?? resolvePrintSizeFromDesignPosition(state.designPosition);
    const generationPrompt = state.designMethod === 'calligraphy'
      ? state.prompt
      : (options.promptOverride?.trim() || state.prompt);

    const runGenerate = async (referenceImageBase64?: string, referenceImageMimeType?: string) => generateMockup(
      state.garmentType,
      state.garmentColor,
      generationPrompt,
      techniquePrompt,
      stylePrompt,
      palettePrompt,
      referenceImageBase64,
      referenceImageMimeType,
      state.designMethod === 'calligraphy' ? state.calligraphyText : undefined,
      {
        removeBackground: state.removeBackground,
        avoidHardEdges: state.avoidHardEdges,
        designPosition: state.designPosition,
        printPosition: effectivePrintPosition,
        printSize: effectivePrintSize,
        printPositionLabel: state.printPositionLabel ?? undefined,
        garmentColorHex: state.garmentColorHex,
        garmentId: state.garmentId,
        colorId: state.garmentColorId,
        sizeId: state.garmentSizeId,
        printScale: state.printScale,
        printOffsetX: state.printOffsetX,
        printOffsetY: state.printOffsetY,
        referenceImageMode: state.referenceImageMode,
        sessionToken,
        requestId: generationRequestId,
      }
    );

    try {
      const generationPreferences = {
        removeBackground: state.removeBackground,
        avoidHardEdges: state.avoidHardEdges,
        designPosition: state.designPosition,
        printPosition: effectivePrintPosition,
        printSize: effectivePrintSize,
        printPositionLabel: state.printPositionLabel ?? undefined,
        garmentColorHex: state.garmentColorHex,
        garmentId: state.garmentId,
        colorId: state.garmentColorId,
        sizeId: state.garmentSizeId,
        printScale: state.printScale,
        printOffsetX: state.printOffsetX,
        printOffsetY: state.printOffsetY,
        referenceImageMode: state.referenceImageMode,
        sessionToken,
        requestId: generationRequestId,
      };
      const generated = canRecompose
        ? await recomposeMockup(
            primaryGenerationResult!,
            state.garmentType,
            state.garmentColor,
            techniquePrompt,
            stylePrompt,
            palettePrompt,
            state.designMethod === 'calligraphy' ? state.calligraphyText : undefined,
            generationPreferences,
          )
        : await runGenerate(
            state.referenceImage || undefined,
            state.referenceImageMimeType || undefined
          );

      const generatedPreviewUrl = generated ? getGeneratedPreviewUrl(generated) : null;
      const validation = await validateGeneratedImage(generatedPreviewUrl);
      if (validation.valid && generated) {
        if (canRecompose) {
          cancelStructuredRecovery();
        } else {
          structuredRecoveryRef.current?.complete();
        }
        setPromptFieldError(false);
        setGenerationResult(generated);
        setMockupImage(generatedPreviewUrl);
        setMockupState({ ...state });
        setExtractedImage(isBoardPreviewResult(generated) ? null : generated.masterAssetUrl);
        showToast('تم توليد التصميم بنجاح', 'success');
      } else {
        setError('لم تصل صورة صالحة من خدمة التوليد. نتيجتك السابقة محفوظة ويمكنك إعادة المحاولة.');
        showToast('لم تصل صورة صالحة؛ أعد المحاولة', 'error');
      }
    } catch (generationError) {
      // نفاد الحصة ليس خطأً — نافذة الرصيد اللطيفة تتكفّل به (حدث washa:quota-exceeded).
      // نُخفي الرسالة الخام (بما فيها trace id) ولا نضع حالة خطأ في الواجهة.
      const errorCode = (generationError as { data?: { code?: string } })?.data?.code;
      const guestFailure = (generationError as { data?: { guest?: boolean } })?.data?.guest === true;
      if (errorCode === 'quota_exceeded' || errorCode === 'audience_disabled') {
        cancelStructuredRecovery();
        setStep(5);
        setExtractedImage(null);
        setError(null);
        if (guestFailure) {
          const draft = saveWashaAiAuthDraft(state, 'generate');
          if (!draft.saved) {
            const message = 'وصلت إلى حد تجربة الزائر، وتعذر حفظ اختياراتك في المتصفح. أبقِ الصفحة مفتوحة ثم سجّل الدخول من صفحة أخرى.';
            setError(message);
            showToast(message, 'error');
            return;
          }
          setAuthGateNotice(
            draft.referenceImageOmitted
              ? 'حفظنا اختياراتك، وستحتاج إعادة رفع الصورة المرجعية بعد الدخول.'
              : 'حفظنا اختياراتك. سجّل الدخول أو أنشئ حسابًا لمتابعة التوليد.'
          );
          setAuthGateIntent('generate');
        }
        return;
      }

      const structuredError = getStructuredStudioError(generationError);
      if (
        config?.features?.structuredUserActionsEnabled === true
        && structuredError
      ) {
        const automaticRetryAttempt = options.automaticRetryAttempt ?? 0;
        const retryIdentity = options.retryIdentity ?? {
          fingerprint: currentGenerationFingerprint,
          requestId: generationRequestId,
        };
        const directive = structuredRecoveryRef.current?.apply({
          payload: structuredError,
          automaticRetryAttempt,
          retryIdentity,
          promptOverride: options.promptOverride,
          autoRetryQuotaSafe:
            config.features?.autoRetryQuotaSafeEnabled === true,
        });
        setError(structuredError.message);
        showToast(structuredError.message, 'error');

        if (directive?.showAuthentication) {
          const draft = saveWashaAiAuthDraft(state, 'generate');
          setAuthGateNotice(
            draft.saved
              ? 'انتهت جلسة الدخول. حفظنا اختياراتك لتتمكن من المتابعة بعد تسجيل الدخول.'
              : 'انتهت جلسة الدخول. سجّل الدخول مجددًا، وأبقِ هذه الصفحة مفتوحة للحفاظ على اختياراتك.'
          );
          setAuthGateIntent('generate');
          return;
        }

        return;
      }

      const message = getReadableErrorMessage(generationError, PUBLIC_GENERATION_ERROR, 'generation');

      const timeoutHint = isLikelyGenerationTimeoutError(generationError, message)
        ? ' جرّب وصفًا أقصر أو صورة مرجعية أصغر ثم أعد المحاولة.'
        : '';
      const finalMessage = `${message}${timeoutHint}`;
      setError(finalMessage);
      showToast(finalMessage, 'error');
    } finally {
      setIsGenerating(false);
      generationInFlightRef.current = false;
    }
  }, [
    config?.generation,
    config?.features?.autoRetryQuotaSafeEnabled,
    config?.features?.structuredUserActionsEnabled,
    cancelStructuredRecovery,
    generationResult,
    getToken,
    isGenerating,
    mockupState,
    requireAuthenticatedAction,
    selectedGarment,
    selectedPalette,
    selectedSize?.stockStatus,
    selectedStyle,
    selectedTechnique,
    showToast,
    state,
    structuredGenerationError,
  ]);

  useEffect(() => {
    handleGenerateRef.current = handleGenerate;
  }, [handleGenerate]);

  useEffect(() => {
    if (!authLoaded || restoredAuthDraftRef.current || configLoading || !config) return;
    restoredAuthDraftRef.current = true;

    clearStudioDraft();
    const draft = consumeWashaAiAuthDraft();
    if (!draft) {
      const initialState = buildInitialState(config);

      const requestedStep = readStudioStepFromUrl();
      if (requestedStep) {
        setStep(Math.min(requestedStep, getHighestReachableStep(initialState)));
      }

      setStudioReady(true);
      return;
    }
    let cancelled = false;
    const restoredAuthState = reconcileAuthDraftState(
      draft.state,
      config,
      buildInitialState(config),
      draft.referenceImageOmitted,
    );

    const restoredMockup = draft.intent === 'submit' ? draft.mockupImage : null;
    setState(restoredAuthState);
    setMockupImage(restoredMockup);
    setMockupState(restoredMockup ? restoredAuthState : null);
    setExtractedImage(null);
    setOrderResult(null);
    setError(null);

    if (draft.intent === 'generate') {
      if (draft.referenceImageOmitted && restoredAuthState.designMethod === 'image' && !restoredAuthState.prompt.trim()) {
        setStep(2);
        setStudioReady(true);
        showToast('استرجعنا اختياراتك، لكن أعد رفع الصورة المرجعية قبل التوليد.', 'info');
        return () => {
          cancelled = true;
        };
      }

      setStep(5);
    } else if (restoredMockup) {
      setStep(6);
    } else {
      setStep(5);
    }
    setStudioReady(true);

    const restoredMessage = draft.intent === 'generate'
      ? 'استرجعنا اختياراتك. يمكنك متابعة التصميم كزائر.'
      : restoredMockup
        ? 'استرجعنا تصميمك ونتيجته. يمكنك الآن اعتماده وإضافته إلى السلة.'
        : 'استرجعنا اختياراتك. أعد التوليد ثم اعتمد التصميم.';
    const authenticatedMessage = draft.intent === 'generate'
      ? 'تم استرجاع اختياراتك بعد تسجيل الدخول. يبدأ التوليد الآن.'
      : 'تم استرجاع اختياراتك بعد تسجيل الدخول. سنعيد توليد التصميم بحسابك قبل إضافته للسلة.';

    async function continueAfterConfirmedAuth() {
      try {
        const sessionToken = isSignedIn
          ? await getToken({skipCache: true})
          : null;
        const session = await fetchWashaAiSession(sessionToken);
        if (cancelled) return;

        if (session.authenticated && session.canGenerate && (draft?.intent === 'generate' || !restoredMockup)) {
          setPendingGenerateAfterAuth(true);
          showToast(authenticatedMessage, 'info');
          return;
        }
      } catch {
        // Restoring the draft should not force auth or block entry to the studio.
      }

      if (!cancelled) {
        showToast(restoredMessage, 'info');
      }
    }

    void continueAfterConfirmedAuth();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, config, configLoading, getToken, isSignedIn, showToast]);

  useEffect(() => {
    if (!studioReady || !isStudioAppPath(window.location.pathname)) return;
    syncStudioStepInUrl(step);
  }, [step, studioReady]);

  useEffect(() => {
    if (!pendingGenerateAfterAuth) return;

    const timer = window.setTimeout(() => {
      setPendingGenerateAfterAuth(false);
      void handleGenerate();
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [handleGenerate, pendingGenerateAfterAuth]);

  const handleExtract = async () => {
    if (!generationResult || isBoardPreviewResult(generationResult)) return;

    setIsExtracting(true);
    setError(null);

    try {
      setExtractedImage(generationResult.masterAssetUrl);
      showToast('ملف التصميم الأصلي جاهز للطباعة', 'success');
    } catch (extractError) {
      const message = getReadableErrorMessage(extractError, PUBLIC_EXTRACTION_ERROR, 'extraction');
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('جاري تحميل الملف...', 'success');
  };

  const submitOrder = async (): Promise<boolean> => {
    if (!mockupImage || !generationResult || isBoardPreviewResult(generationResult)) {
      return false;
    }

    if (!isMockupCurrent) {
      const message = 'هذه النتيجة تخص إعدادات سابقة. أعد التوليد بالإعدادات الحالية قبل إضافتها إلى السلة.';
      setError(message);
      showToast(message, 'error');
      return false;
    }

    if (configError && config === FALLBACK_DTF_CONFIG) {
      const msg = 'لا يمكن إضافة التصميم للسلة حالياً. حاول تحديث الصفحة بعد قليل.';
      setError(msg);
      showToast(msg, 'error');
      return false;
    }

    const canSubmitWithAccount = await requireAuthenticatedAction('submit');
    if (!canSubmitWithAccount) {
      return false;
    }

    setIsSubmittingOrder(true);
    setError(null);

    try {
      const res = await fetch('/api/washa-dtf-studio/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentId: state.garmentId,
          garmentType: state.garmentType,
          colorId: state.garmentColorId,
          garmentColor: state.garmentColor,
          colorHex: state.garmentColorHex,
          sizeId: state.garmentSizeId,
          garmentSize: state.garmentSize,
          designMethod: state.designMethod,
          prompt: state.prompt,
          calligraphyText: state.calligraphyText || undefined,
          styleId: isUuid(state.styleId) ? state.styleId : null,
          style: state.style,
          techniqueId: isUuid(state.techniqueId) ? state.techniqueId : null,
          technique: state.technique,
          paletteId: state.paletteId === CUSTOM_PALETTE_ID || isUuid(state.paletteId) ? state.paletteId : null,
          palette: state.palette,
          customPalette: state.paletteId === CUSTOM_PALETTE_ID ? state.customPalette || null : null,
          printOptionId: state.printOptionId,
          printPosition: state.printPosition ?? resolvePrintPositionFromDesignPosition(state.designPosition),
          printSize: state.printSize ?? resolvePrintSizeFromDesignPosition(state.designPosition),
          printPositionLabel: state.printPositionLabel,
          designRequestId: generationResult.designRequestId,
          masterAssetId: generationResult.masterAssetId,
          masterChecksum: generationResult.masterChecksum,
          placementData: generationResult.placement,
        }),
      });

      const data = await parseApiPayload(res);

      if (!res.ok || data.error) {
        throw new Error(data.error || 'فشل إرسال الطلب');
      }

      const cartItem = data.cartItem;
      if (!cartItem || typeof cartItem !== 'object') {
        throw new Error('تعذر تجهيز التصميم للسلة');
      }

      const result: OrderResult = {
        itemTitle: cartItem.title || 'تصميم DTF مخصص',
        price: Number(cartItem.price || 0),
      };
      setOrderResult(result);

      try {
        const cartKey = 'wusha-cart-storage';
        const raw = localStorage.getItem(cartKey);
        const cartState = raw ? JSON.parse(raw) : { state: { items: [], coupon: null } };
        if (!cartState.state) cartState.state = { items: [], coupon: null };
        if (!Array.isArray(cartState.state.items)) cartState.state.items = [];

        cartState.state.items = cartState.state.items.filter(
          (item: { id: string }) => item.id !== cartItem.id
        );
        cartState.state.items.push(cartItem);

        localStorage.setItem(cartKey, JSON.stringify(cartState));
        localStorage.setItem('wusha-open-cart', '1');
      } catch {
        // Non-fatal — the user can still retry and the design itself is preserved locally.
      }

      showToast('تمت إضافة التصميم إلى السلة بنجاح', 'success');
      return true;
    } catch (submitError) {
      const msg = getReadableErrorMessage(submitError, PUBLIC_SUBMIT_ERROR, 'submit');
      setError(msg);
      showToast(msg, 'error');
      return false;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const resetDesign = () => {
    structuredRecoveryRef.current?.invalidate();
    clearStudioDraft();
    setStep(1);
    setState(config ? buildInitialState(config) : EMPTY_STATE);
    setMockupImage(null);
    setMockupState(null);
    setExtractedImage(null);
    setGenerationResult(null);
    setError(null);
    setPromptFieldError(false);
    setOrderResult(null);
  };

  const isBoardPreview = isBoardPreviewResult(generationResult);
  const generationDisclaimer = isBoardPreview ? 'preview_only' as const : null;

  return (
    <DesignContext.Provider
      value={{
        step,
        setStep,
        nextStep,
        prevStep,
        state,
        updateState,
        isGenerating,
        isExtracting,
        mockupImage,
        mockupState,
        isMockupCurrent,
        extractedImage,
        generationResult,
        isBoardPreview,
        generationDisclaimer,
        error,
        structuredGenerationError,
        isGenerationRetryBlocked,
        promptFieldError,
        promptFocusRequestId,
        isSubmittingOrder,
        orderResult,
        submitOrder,
        handleImageUpload,
        handleGenerate,
        handleExtract,
        handleDownload,
        resetDesign,
        showToast,
        toast,
        clearToast,
        config,
        configLoading,
        configError,
        garmentOptions,
        colorOptions,
        sizeOptions,
        positionOptions,
        styleOptions,
        techniqueOptions,
        paletteOptions,
        selectedGarment,
        selectedColor,
        selectedSize,
        selectedStyle,
        selectedTechnique,
        selectedPalette,
        authGateIntent,
        authGateNotice,
        closeAuthGate,
        continueAuthentication,
      }}
    >
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const context = useContext(DesignContext);
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
}
