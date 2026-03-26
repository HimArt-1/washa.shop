import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DesignState,
  GarmentType,
  GarmentColor,
  DesignMethod,
  ArtisticStyle,
  Technique,
  ColorPalette,
  STYLE_PROMPTS,
  TECHNIQUE_PROMPTS,
  PALETTE_PROMPTS,
} from '../types';
import { generateMockup, extractDesign } from '../services/geminiService';

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
  referenceImage: null,
  referenceImageMimeType: null,
  style: 'ملصق (Sticker)',
  technique: 'رسم رقمي (Digital)',
  palette: 'نيون ساطع (Neon)',
};

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<DesignState>(INITIAL_STATE);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [mockupImage, setMockupImage] = useState<string | null>(null);
  const [extractedImage, setExtractedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

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
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        updateState({
          referenceImage: base64Data,
          referenceImageMimeType: file.type,
        });
        showToast('تم رفع الصورة بنجاح', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!state.prompt && !state.referenceImage) {
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
        state.referenceImageMimeType || undefined
      );

      if (mockup) {
        setMockupImage(mockup);
        showToast('تم توليد التصميم بنجاح! ✨', 'success');
      } else {
        setError('فشل في توليد الصورة. يرجى المحاولة مرة أخرى.');
        showToast('فشل في توليد الصورة', 'error');
      }
    } catch (err: any) {
      setError(
        err.message && err.message.includes("Requested entity was not found")
          ? 'تعذر الوصول إلى خدمة Gemini الحالية. تحقق من تهيئة المفتاح على الخادم.'
          : 'حدث خطأ أثناء التوليد. تأكد من إعدادات Gemini على الخادم.'
      );
      showToast('حدث خطأ أثناء التوليد', 'error');
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
    } catch (err: any) {
      setError(
        err.message && err.message.includes("Requested entity was not found")
          ? 'تعذر الوصول إلى خدمة Gemini الحالية. تحقق من تهيئة المفتاح على الخادم.'
          : 'حدث خطأ أثناء الاستخراج.'
      );
      showToast('حدث خطأ أثناء الاستخراج', 'error');
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

  const resetDesign = () => {
    setStep(1);
    setState(INITIAL_STATE);
    setMockupImage(null);
    setExtractedImage(null);
    setError(null);
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
