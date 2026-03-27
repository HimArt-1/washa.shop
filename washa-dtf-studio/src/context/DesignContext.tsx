import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  DesignState,
  STYLE_PROMPTS,
  TECHNIQUE_PROMPTS,
  PALETTE_PROMPTS,
} from '../types';
import { generateMockup, extractDesign } from '../services/geminiService';
import { resizeDataUrl, stripDataUrlPrefix } from '../lib/image';

export interface OrderResult {
  orderId: string;
  orderNumber: number;
}

interface DesignContextType {
  // Wizard state
  step: number;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Design state
  state: DesignState;
  updateState: (updates: Partial<DesignState>) => void;

  // Generation
  isGenerating: boolean;
  isExtracting: boolean;
  mockupImage: string | null;
  extractedImage: string | null;
  error: string | null;

  // Order submission
  isSubmittingOrder: boolean;
  orderResult: OrderResult | null;
  submitOrder: () => Promise<boolean>;

  // Actions
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGenerate: () => Promise<void>;
  handleExtract: () => Promise<void>;
  handleDownload: (imageUrl: string, filename: string) => void;
  resetDesign: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;

  // Toast
  toast: ToastState | null;
  clearToast: () => void;
}

export interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

const INITIAL_STATE: DesignState = {
  garmentType: 'تيشيرت',
  garmentColor: 'أسود',
  designMethod: 'text',
  prompt: '',
  calligraphyText: '',
  referenceImage: null,
  referenceImageMimeType: null,
  style: 'ملصق (Sticker)',
  technique: 'رسم رقمي (Digital)',
  palette: 'نيون ساطع (Neon)',
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

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<DesignState>(INITIAL_STATE);

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

  const updateState = (updates: Partial<DesignState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep(s => Math.min(4, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          const resized = await resizeDataUrl(base64String, {
            maxDimension: 1400,
            quality: 0.8,
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

    setIsGenerating(true);
    setError(null);
    setMockupImage(null);
    setExtractedImage(null);
    setStep(4);

    try {
      // Determine the palette prompt: if 'Custom', use the user's input; otherwise use the preset
      const palettePrompt = state.palette === 'تخصيص... (Custom)'
        ? (state.customPalette || 'custom colors')
        : PALETTE_PROMPTS[state.palette];

      const mockup = await generateMockup(
        state.garmentType,
        state.garmentColor,
        state.prompt,
        TECHNIQUE_PROMPTS[state.technique],
        STYLE_PROMPTS[state.style],
        palettePrompt,
        state.referenceImage || undefined,
        state.referenceImageMimeType || undefined,
        state.designMethod === 'calligraphy' ? state.calligraphyText : undefined
      );

      if (mockup) {
        setMockupImage(mockup);
        showToast('تم توليد التصميم بنجاح! ✨', 'success');
      } else {
        setError('فشل في توليد الصورة. يرجى المحاولة مرة أخرى.');
        showToast('فشل في توليد الصورة', 'error');
      }
    } catch (error) {
      const message = getReadableErrorMessage(error, 'حدث خطأ أثناء التوليد. تأكد من إعدادات Gemini على الخادم.');
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
    } catch (error) {
      const message = getReadableErrorMessage(error, 'حدث خطأ أثناء الاستخراج.');
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
      const res = await fetch('/api/washa-dtf-studio/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentType: state.garmentType,
          garmentColor: state.garmentColor,
          designMethod: state.designMethod,
          prompt: state.prompt,
          calligraphyText: state.calligraphyText || undefined,
          style: state.style,
          technique: state.technique,
          palette: state.palette,
          mockupDataUrl: mockupImage,
          extractedDataUrl: extractedImage || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'فشل إرسال الطلب');
      }

      const result: OrderResult = { orderId: data.orderId, orderNumber: data.orderNumber };
      setOrderResult(result);

      // ── Push to cart (shared localStorage with Next.js app) ──
      try {
        const cartKey = 'wusha-cart-storage';
        const raw = localStorage.getItem(cartKey);
        const cartState = raw ? JSON.parse(raw) : { state: { items: [], coupon: null } };
        if (!cartState.state) cartState.state = { items: [], coupon: null };
        if (!Array.isArray(cartState.state.items)) cartState.state.items = [];

        // Use the Supabase URL returned from the API (not the raw base64)
        const imageUrl = data.mockupUrl || '';

        const cartItem = {
          id: `dtf-order-${data.orderNumber}`,
          title: `تصميم DTF مخصص — ${state.garmentType} ${state.garmentColor}`,
          price: 0,
          image_url: imageUrl,
          artist_name: 'وشّى DTF Studio',
          quantity: 1,
          size: null,
          type: 'custom_design' as const,
          maxQuantity: 1,
          customDesignUrl: imageUrl,
          customGarment: state.garmentType,
          customPosition: 'chest',
        };

        // Remove duplicate if same order number exists
        cartState.state.items = cartState.state.items.filter(
          (item: { id: string }) => item.id !== cartItem.id
        );
        cartState.state.items.push(cartItem);

        localStorage.setItem(cartKey, JSON.stringify(cartState));
        localStorage.setItem('wusha-open-cart', '1');
      } catch {
        // Non-fatal — order was still saved
      }

      showToast(`تم إرسال طلبك بنجاح! رقم الطلب: #${data.orderNumber}`, 'success');
      return true;
    } catch (err) {
      const msg = getReadableErrorMessage(err, 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.');
      setError(msg);
      showToast(msg, 'error');
      return false;
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const resetDesign = () => {
    setStep(1);
    setState(INITIAL_STATE);
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
