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
  type DtfStudioSizeOption,
} from '../types';
import { generateMockup, extractDesign } from '../services/geminiService';
import { fetchDtfStudioConfig } from '../services/configService';
import { resizeDataUrl, stripDataUrlPrefix } from '../lib/image';

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

const EMPTY_STATE: DesignState = {
  garmentId: null,
  garmentType: '',
  garmentColorId: null,
  garmentColor: '',
  garmentColorHex: '#111111',
  garmentSizeId: null,
  garmentSize: '',
  designMethod: 'text',
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

async function parseApiPayload(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return { error: text || `HTTP ${response.status}` };
}

function resolveDefaultSize(garment: DtfStudioGarmentOption | null, colorId?: string | null) {
  if (!garment) return null;
  return garment.sizes.find((size) => size.colorId === colorId) || garment.sizes.find((size) => size.colorId === null) || garment.sizes[0] || null;
}

function buildInitialState(config: DtfStudioConfig): DesignState {
  const garment = config.garments[0] || null;
  const color = garment?.colors[0] || null;
  const size = resolveDefaultSize(garment, color?.id || null);
  const style = config.styles[0] || null;
  const technique = config.techniques[0] || null;
  const palette = config.palettes[0] || null;

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
          if (current.garmentId || current.styleId || current.techniqueId || current.paletteId) {
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
          if (current.garmentId || current.styleId || current.techniqueId || current.paletteId) {
            return current;
          }
          return buildInitialState(FALLBACK_DTF_CONFIG);
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
    () => sizeOptions.find((item) => item.id === state.garmentSizeId) || sizeOptions[0] || null,
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
      const nextSize = sizeOptions.find((item) => item.id === current.garmentSizeId) || resolveDefaultSize(selectedGarment, nextColor?.id || null);

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

  const nextStep = () => setStep((value) => Math.min(4, value + 1));
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
            outputMimeType: 'image/jpeg',
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

    if (state.paletteId === CUSTOM_PALETTE_ID && !state.customPalette.trim()) {
      setError('يرجى كتابة وصف لوحة الألوان المخصصة.');
      showToast('اكتب وصف لوحة الألوان المخصصة قبل التوليد', 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMockupImage(null);
    setExtractedImage(null);
    setStep(4);

    try {
      const palettePrompt = state.paletteId === CUSTOM_PALETTE_ID
        ? (state.customPalette || CUSTOM_PALETTE_PROMPT)
        : selectedPalette?.prompt || FALLBACK_PALETTE_PROMPTS[state.palette] || state.palette;

      const mockup = await generateMockup(
        state.garmentType,
        state.garmentColor,
        state.prompt,
        selectedTechnique?.prompt || FALLBACK_TECHNIQUE_PROMPTS[state.technique] || state.technique,
        selectedStyle?.prompt || FALLBACK_STYLE_PROMPTS[state.style] || state.style,
        palettePrompt,
        state.referenceImage || undefined,
        state.referenceImageMimeType || undefined,
        state.designMethod === 'calligraphy' ? state.calligraphyText : undefined,
        {
          removeBackground: state.removeBackground,
          avoidHardEdges: state.avoidHardEdges,
        }
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
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExtract = async () => {
    if (!mockupImage) return;

    setIsExtracting(true);
    setError(null);

    try {
      const [header, data] = mockupImage.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      const extracted = await extractDesign(data, mimeType);

      if (extracted) {
        setExtractedImage(extracted);
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

      try {
        // Compress the images to WebP before sending to prevent 413 Content Too Large from Serverless Functions
        const compressedMockup = await resizeDataUrl(mockupImage, {
          maxDimension: 2048,
          quality: 0.8,
          outputMimeType: 'image/webp'
        });
        submitMockupBg = compressedMockup.dataUrl;

        if (extractedImage) {
          const compressedExtracted = await resizeDataUrl(extractedImage, {
            maxDimension: 2048,
            quality: 0.8,
            outputMimeType: 'image/webp'
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
          styleId: state.styleId,
          style: state.style,
          techniqueId: state.techniqueId,
          technique: state.technique,
          paletteId: state.paletteId,
          palette: state.palette,
          customPalette: state.paletteId === CUSTOM_PALETTE_ID ? state.customPalette || null : null,
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
