import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
import { generateMockup, extractDesign } from '../services/geminiService';
import { fetchDtfStudioConfig } from '../services/configService';
import { makeEdgeBackgroundTransparent, parseDataUrlParts, resizeDataUrl, stripDataUrlPrefix } from '../lib/image';
import {
  resolvePrintPlacementFromOption,
  resolvePrintPositionFromDesignPosition,
  resolvePrintSizeFromDesignPosition,
} from '../lib/placement';

export interface OrderResult {
  itemTitle: string;
  price: number;
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
  extractedImage: string | null;
  error: string | null;
  isSubmittingOrder: boolean;
  orderResult: OrderResult | null;
  submitOrder: () => Promise<boolean>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGenerate: () => Promise<void>;
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
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);
const REFERENCE_IMAGE_MAX_DIMENSION = 1200;
const REFERENCE_IMAGE_QUALITY = 0.76;
const GARMENT_REFERENCE_MAX_DIMENSION = 1280;
const GARMENT_REFERENCE_QUALITY = 0.82;
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
  designPosition: 'front_large',
  printOptionId: null,
  printPosition: 'chest',
  printSize: 'large',
  printPositionLabel: 'تصميم أمامي كبير',
  prompt: '',
  calligraphyText: '',
  referenceImage: null,
  referenceImageMimeType: null,
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

function getReadableErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
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

async function parseApiPayload(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return { error: text || `HTTP ${response.status}` };
}

function resolveOperationalGarmentReference(
  garment: DtfStudioGarmentOption | null,
  printPosition: DesignState['printPosition']
) {
  if (!garment) return null;
  const frontUrl = garment.aiReferenceFrontUrl?.trim() || '';
  const backUrl = garment.aiReferenceBackUrl?.trim() || '';
  const side: 'front' | 'back' = printPosition === 'back' ? 'back' : 'front';
  const url = side === 'back' ? (backUrl || frontUrl) : (frontUrl || backUrl);
  return url ? { url, side } : null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة مرجع القطعة'));
    reader.readAsDataURL(blob);
  });
}

async function loadOperationalGarmentReference(reference: { url: string; side: 'front' | 'back' } | null) {
  if (!reference) return null;

  try {
    const url = new URL(reference.url, window.location.origin).toString();
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (blob.type && !/^image\/(png|jpe?g|webp)$/i.test(blob.type)) return null;

    const dataUrl = await blobToDataUrl(blob);
    const resized = await resizeDataUrl(dataUrl, {
      maxDimension: GARMENT_REFERENCE_MAX_DIMENSION,
      quality: GARMENT_REFERENCE_QUALITY,
      outputMimeType: 'image/jpeg',
    });

    return {
      base64: stripDataUrlPrefix(resized.dataUrl),
      mimeType: resized.mimeType,
      side: reference.side,
    };
  } catch (error) {
    console.warn('Failed to load operational garment reference', error);
    return null;
  }
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
  const garment = config.garments[0] || null;
  const color = garment?.colors[0] || null;
  const size = resolveDefaultSize(garment, color?.id || null);
  const style = config.styles[0] || null;
  const technique = config.techniques[0] || null;
  const palette = config.palettes[0] || null;
  const printOption = config.positions[0] || null;
  const placement = resolvePrintPlacementFromOption(printOption);

  return {
    ...EMPTY_STATE,
    garmentId: garment?.id || null,
    garmentType: garment?.name || '',
    garmentColorId: color?.id || null,
    garmentColor: color?.name || '',
    garmentColorHex: color?.hexCode || '#111111',
    garmentSizeId: size?.id || null,
    garmentSize: size?.name || '',
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
    printPositionLabel: printOption?.name ?? 'تصميم أمامي كبير',
  };
}

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<DesignState>(EMPTY_STATE);
  const [config, setConfig] = useState<DtfStudioConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [extractedImage, setExtractedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
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
        const message = getReadableErrorMessage(loadError, 'تعذر تحميل إعدادات استوديو DTF. تم تشغيل الوضع الاحتياطي.');
        setConfig(FALLBACK_DTF_CONFIG);
        setConfigError(message);
        setState((current) => {
          // Don't initialise with fallback IDs if user already has real selections
          const inFallback = (id: string | null, list: { id: string }[]) =>
            !id || list.some((x) => x.id === id);
          const hasRealSelections =
            (current.garmentId || current.styleId || current.techniqueId || current.paletteId) &&
            !inFallback(current.garmentId, FALLBACK_DTF_CONFIG.garments);
          if (hasRealSelections) return current;
          if (!current.garmentId && !current.styleId && !current.techniqueId && !current.paletteId) {
            return buildInitialState(FALLBACK_DTF_CONFIG);
          }
          return current;
        });
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
    () => garmentOptions.find((item) => item.id === state.garmentId) || garmentOptions[0] || null,
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
    setState((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep((value) => Math.min(6, value + 1));
  const prevStep = () => setStep((value) => Math.max(1, value - 1));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const handleGenerate = async () => {
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

    if (state.paletteId === CUSTOM_PALETTE_ID && !state.customPalette.trim()) {
      setError('يرجى كتابة وصف لوحة الألوان المخصصة.');
      showToast('اكتب وصف لوحة الألوان المخصصة قبل التوليد', 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMockupImage(null);
    setExtractedImage(null);
    setStep(6);

    const palettePrompt = state.paletteId === CUSTOM_PALETTE_ID
      ? (state.customPalette || CUSTOM_PALETTE_PROMPT)
      : selectedPalette?.prompt || FALLBACK_PALETTE_PROMPTS[state.palette] || state.palette;
    const techniquePrompt = selectedTechnique?.prompt || FALLBACK_TECHNIQUE_PROMPTS[state.technique] || state.technique;
    const stylePrompt = selectedStyle?.prompt || FALLBACK_STYLE_PROMPTS[state.style] || state.style;
    const effectivePrintPosition = state.printPosition ?? resolvePrintPositionFromDesignPosition(state.designPosition);
    const effectivePrintSize = state.printSize ?? resolvePrintSizeFromDesignPosition(state.designPosition);
    const garmentReference = await loadOperationalGarmentReference(
      resolveOperationalGarmentReference(selectedGarment, effectivePrintPosition)
    );

    const runGenerate = async (referenceImageBase64?: string, referenceImageMimeType?: string) => generateMockup(
      state.garmentType,
      state.garmentColor,
      state.prompt,
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
        garmentReferenceImageBase64: garmentReference?.base64,
        garmentReferenceImageMimeType: garmentReference?.mimeType,
        garmentReferenceSide: garmentReference?.side,
      }
    );

    try {
      const mockup = await runGenerate(
        state.referenceImage || undefined,
        state.referenceImageMimeType || undefined
      );

      if (mockup) {
        setMockupImage(mockup);
        showToast('تم توليد التصميم بنجاح! ✨', 'success');
      } else {
        setError('فشل في توليد الصورة. يرجى المحاولة مرة أخرى.');
        showToast('فشل في توليد الصورة', 'error');
      }
    } catch (generationError) {
      const message = getReadableErrorMessage(generationError, 'حدث خطأ أثناء التوليد. تأكد من إعدادات Gemini على الخادم.');
      const canRetryWithLighterReference = Boolean(
        isLikelyGenerationTimeout(message) &&
        state.referenceImage &&
        state.referenceImageMimeType
      );

      if (canRetryWithLighterReference) {
        try {
          showToast('الخادم بطيء الآن؛ نجرب نسخة أخف من الصورة المرجعية...', 'info');
          const compressedReference = await resizeDataUrl(
            `data:${state.referenceImageMimeType};base64,${state.referenceImage}`,
            {
              maxDimension: 768,
              quality: 0.62,
              outputMimeType: 'image/webp',
            }
          );
          const lighterRef = stripDataUrlPrefix(compressedReference.dataUrl);
          const retryMockup = await runGenerate(lighterRef, compressedReference.mimeType);
          if (retryMockup) {
            setMockupImage(retryMockup);
            showToast('تم التوليد بعد ضغط الصورة المرجعية ✅', 'success');
            return;
          }
        } catch {
          // fallback to original error message below
        }
      }

      const timeoutHint = isLikelyGenerationTimeout(message)
        ? ' جرّب وصفًا أقصر أو صورة مرجعية أصغر ثم أعد المحاولة.'
        : '';
      const finalMessage = `${message}${timeoutHint}`;
      setError(finalMessage);
      showToast(finalMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtract = async () => {
    if (!mockupImage) return;

    setIsExtracting(true);
    setError(null);

    try {
      const parts = parseDataUrlParts(mockupImage);
      if (!parts) {
        setError('صورة الموكب غير صالحة. أعد التوليد ثم حاول الاستخراج.');
        showToast('صورة الموكب غير صالحة', 'error');
        return;
      }

      const extracted = await extractDesign(parts.base64, parts.mimeType);

      if (extracted) {
        const printReady = await makeEdgeBackgroundTransparent(extracted).catch(() => null);
        setExtractedImage(printReady?.dataUrl ?? extracted);
        showToast('تم استخراج التصميم بنجاح! 🎨', 'success');
      } else {
        setError('فشل في استخراج التصميم.');
        showToast('فشل في استخراج التصميم', 'error');
      }
    } catch (extractError) {
      const message = getReadableErrorMessage(extractError, 'حدث خطأ أثناء الاستخراج.');
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
    if (!mockupImage) return false;

    setIsSubmittingOrder(true);
    setError(null);

    try {
      let submitMockupBg = mockupImage;
      let submitExtractedBg = extractedImage;

      if (!submitExtractedBg) {
        showToast('جاري تجهيز التصميم للطباعة عالية الجودة...', 'info');
        try {
          const parts = parseDataUrlParts(mockupImage);
          if (parts) {
            submitExtractedBg = await extractDesign(parts.base64, parts.mimeType);
            if (submitExtractedBg) {
              const printReady = await makeEdgeBackgroundTransparent(submitExtractedBg).catch(() => null);
              submitExtractedBg = printReady?.dataUrl ?? submitExtractedBg;
            }
            if (submitExtractedBg) setExtractedImage(submitExtractedBg);
          }
        } catch (err) {
          console.warn('Could not extract design automatically', err);
        }
      }

      try {
        // Keep the mockup compact, but preserve the extracted DTF as transparent PNG.
        const compressedMockup = await resizeDataUrl(mockupImage, {
          maxDimension: 2048,
          quality: 0.8,
          outputMimeType: 'image/webp'
        });
        submitMockupBg = compressedMockup.dataUrl;

        if (submitExtractedBg) {
          const compressedExtracted = await resizeDataUrl(submitExtractedBg, {
            maxDimension: 4096,
            quality: 1,
            outputMimeType: 'image/png'
          });
          submitExtractedBg = compressedExtracted.dataUrl;
        }
      } catch (err) {
        console.warn('Could not compress images, sending original...', err);
      }

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
          mockupDataUrl: submitMockupBg,
          extractedDataUrl: submitExtractedBg || null,
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
      const msg = getReadableErrorMessage(submitError, 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
      setError(msg);
      showToast(msg, 'error');
      return false;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const resetDesign = () => {
    setStep(1);
    setState(config ? buildInitialState(config) : EMPTY_STATE);
    setMockupImage(null);
    setExtractedImage(null);
    setError(null);
    setOrderResult(null);
  };

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
        extractedImage,
        error,
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
