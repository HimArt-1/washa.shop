"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Camera,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  DESIGN_STYLES,
  DESIGN_COLORS,
  type DesignMethodId,
  type DesignStyleId,
  type DesignColorId,
} from "@/lib/design-piece";

interface StepInputProps {
  method: DesignMethodId;
  // من صورة
  imagePreviewUrl: string | null;
  ideaText: string;
  onImageChange: (file: File | null, previewUrl: string | null) => void;
  onIdeaChange: (value: string) => void;
  // من نص
  textPrompt: string;
  onTextPromptChange: (value: string) => void;
  // مشترك
  styleId: DesignStyleId | null;
  colorIds: DesignColorId[];
  onStyleSelect: (id: DesignStyleId) => void;
  onColorToggle: (id: DesignColorId) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function StepInput({
  method,
  imagePreviewUrl,
  ideaText,
  onImageChange,
  onIdeaChange,
  textPrompt,
  onTextPromptChange,
  styleId,
  colorIds,
  onStyleSelect,
  onColorToggle,
  onBack,
  onGenerate,
  isGenerating,
}: StepInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      onImageChange(file, url);
    },
    [onImageChange]
  );

  const canGenerate =
    method === "from_text"
      ? textPrompt.trim().length >= 10 && styleId
      : imagePreviewUrl && ideaText.trim().length >= 5 && styleId;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-theme mb-1">
          {method === "from_image" ? "الصورة والفكرة" : "وصف التصميم"}
        </h2>
        <p className="text-theme-soft text-sm">
          {method === "from_image"
            ? "ارفع صورة أو التقطها واكتب ما تريد أن يصنعه الذكاء منها"
            : "اكتب وصفاً واضحاً للتصميم الذي تريده"}
        </p>
      </div>

      {method === "from_image" && (
        <>
          <div>
            <label className="block text-sm font-bold text-theme-strong mb-2">الصورة</label>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-gold/40 bg-theme-faint flex flex-col items-center justify-center gap-3 min-h-[140px] transition-colors"
              >
                <Upload className="w-10 h-10 text-theme-subtle" />
                <span className="text-sm text-theme-soft">رفع صورة</span>
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-gold/40 bg-theme-faint flex flex-col items-center justify-center gap-3 min-h-[140px] transition-colors"
              >
                <Camera className="w-10 h-10 text-theme-subtle" />
                <span className="text-sm text-theme-soft">التقاط صورة</span>
              </button>
            </div>
            {imagePreviewUrl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative mt-4 inline-block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="معاينة"
                  className="h-32 w-auto object-contain rounded-xl border border-theme-soft"
                />
                <button
                  type="button"
                  onClick={() => onImageChange(null, null)}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500/90 text-theme flex items-center justify-center hover:bg-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-theme-strong mb-2">الفكرة أو التوجيه</label>
            <textarea
              value={ideaText}
              onChange={(e) => onIdeaChange(e.target.value)}
              placeholder="مثال: حوّل هذه الصورة إلى تصميم تراثي بألوان ذهبية، مناسب للطباعة على تيشيرت..."
              className="w-full h-28 px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft text-theme placeholder:text-theme-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none"
              dir="rtl"
            />
          </div>
        </>
      )}

      {method === "from_text" && (
        <div>
          <label className="block text-sm font-bold text-theme-strong mb-2">وصف التصميم</label>
          <textarea
            value={textPrompt}
            onChange={(e) => onTextPromptChange(e.target.value)}
            placeholder="مثال: خيول عربية تركض في الصحراء عند غروب الشمس، بأسلوب خط عربي وزخارف تراثية، ألوان ذهبية وبنية..."
            className="w-full h-32 px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft text-theme placeholder:text-theme-faint focus:border-gold focus:ring-1 focus:ring-gold outline-none resize-none"
            dir="rtl"
          />
          <p className="text-xs text-theme-subtle mt-1">كلما كان الوصف أوضح، كانت النتيجة أفضل</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-theme-strong mb-3">النمط</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DESIGN_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStyleSelect(s.id)}
              className={`
                px-4 py-3 rounded-xl border-2 text-right text-sm font-medium transition-all
                ${styleId === s.id
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-theme-soft bg-theme-subtle text-theme-soft hover:border-gold/30"
                }
              `}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-theme-strong mb-3">الألوان (اختياري)</label>
        <div className="flex flex-wrap gap-2">
          {DESIGN_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onColorToggle(c.id)}
              title={c.label}
              className={`
                w-10 h-10 rounded-xl border-2 transition-all
                ${colorIds.includes(c.id) ? "border-gold scale-110 ring-2 ring-gold/30" : "border-white/20 hover:scale-105"}
              `}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="btn-secondary inline-flex items-center gap-2">
          <ChevronRight className="w-5 h-5" />
          السابق
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
          className="btn-gold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-bg border-t-current rounded-full"
              />
              جاري التوليد...
            </>
          ) : (
            <>
              <ImageIcon className="w-5 h-5" />
              ابدأ التصميم
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
