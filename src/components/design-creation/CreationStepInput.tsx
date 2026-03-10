"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Upload,
  Camera,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  CREATION_DESIGN_METHODS,
  READY_TEXTS,
  CREATION_POSITIONS,
  type CreationDesignMethodId,
  type DesignCreationState,
} from "@/lib/design-creation";
import { DESIGN_STYLES } from "@/lib/design-piece";
import { generateDesignForPrint } from "@/app/actions/ai";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface CreationStepInputProps {
  method: CreationDesignMethodId;
  state: DesignCreationState;
  set: <K extends keyof DesignCreationState>(
    key: K,
    value: DesignCreationState[K]
  ) => void;
  studioArtworks?: Array<{ id: string; image_url: string; title?: string }>;
  exclusiveDesigns?: Array<{ id: string; title: string; description: string | null; image_url: string }>;
  onBack: () => void;
  onNext: () => void;
  onImageChange: (file: File | null, previewUrl: string | null) => void;
}

export function CreationStepInput({
  method,
  state,
  set,
  studioArtworks = [],
  exclusiveDesigns = [],
  onBack,
  onNext,
  onImageChange,
}: CreationStepInputProps) {
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

  const handleGenerate = useCallback(async () => {
    if (!state.garment || !state.position) return;

    set("isGenerating", true);
    set("error", null);

    try {
      let imageUrl: string | null = null;

      if (method === "ready_text") {
        const ready = READY_TEXTS.find((r) => r.id === state.readyTextId);
        if (!ready) return;
        const prompt = `Arabic typography design, modern style, elegant, text: "${ready.text}", ${ready.style}, print-ready, transparent or white background, high quality`;
        const result = await generateDesignForPrint({
          method: "from_text",
          prompt,
          styleId: "arabic_calligraphy",
        });
        imageUrl = result.success ? result.imageUrl ?? null : null;
        if (!result.success) set("error", result.error ?? "فشل التوليد");
      } else if (method === "from_studio" && state.studioDesignId) {
        // من الاستوديو: الصورة جاهزة، نستخدمها مباشرة
        // studioDesignId قد يكون رابط صورة — نحتاج تمريره من الصفحة
        // للآن نعتبر أن الصفحة ستُمرّر designImageUrl من مصدر خارجي
        set("error", "اختر تصميماً من المعرض");
      } else if (method === "from_text") {
        const prompt = state.textPrompt.trim();
        if (!prompt || prompt.length < 10 || !state.styleId) return;
        const style = DESIGN_STYLES.find((s) => s.id === state.styleId);
        const promptWithStyle = style ? `${style.prompt}. ${prompt}` : prompt;
        const result = await generateDesignForPrint({
          method: "from_text",
          prompt: promptWithStyle,
          styleId: state.styleId,
        });
        imageUrl = result.success ? result.imageUrl ?? null : null;
        if (!result.success) set("error", result.error ?? "فشل التوليد");
      } else if (method === "from_image") {
        if (!state.imageFile || !state.ideaText?.trim() || !state.styleId) return;
        const imageBase64 = await fileToBase64(state.imageFile);
        const style = DESIGN_STYLES.find((s) => s.id === state.styleId);
        const promptWithStyle = style
          ? `${style.prompt}. ${state.ideaText}`
          : state.ideaText;
        const result = await generateDesignForPrint({
          method: "from_image",
          prompt: promptWithStyle,
          styleId: state.styleId,
          imageBase64,
        });
        imageUrl = result.success ? result.imageUrl ?? null : null;
        if (!result.success) set("error", result.error ?? "فشل التوليد");
      } else if (method === "combine") {
        const text = state.combineTextId
          ? (READY_TEXTS.find((r) => r.id === state.combineTextId)?.text ?? state.combineTextCustom)
          : state.combineTextCustom.trim();
        if (!text || text.length < 2 || !state.styleId) {
          set("error", "اختر نصاً ونمطاً على الأقل");
          return;
        }
        let imageBase64: string | undefined;
        if (state.combineImageSource === "upload" && state.imageFile) {
          imageBase64 = await fileToBase64(state.imageFile);
        } else if (state.combineImageSource === "studio" && state.combineStudioId) {
          const art = studioArtworks.find((a) => a.id === state.combineStudioId);
          if (art?.image_url) {
            try {
              const res = await fetch(art.image_url);
              const blob = await res.blob();
              const reader = new FileReader();
              imageBase64 = await new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch {
              set("error", "فشل تحميل الصورة");
              return;
            }
          }
        }
        const style = DESIGN_STYLES.find((s) => s.id === state.styleId);
        const prompt = imageBase64
          ? `دمج النص العربي "${text}" مع هذه الصورة في تصميم طباعة متناسق. ${style?.prompt ?? ""}`
          : `Arabic typography design combining text: "${text}". ${style?.prompt ?? ""} Print-ready, elegant.`;
        const result = await generateDesignForPrint({
          method: imageBase64 ? "from_image" : "from_text",
          prompt,
          styleId: state.styleId,
          imageBase64: imageBase64 ?? undefined,
        });
        imageUrl = result.success ? result.imageUrl ?? null : null;
        if (!result.success) set("error", result.error ?? "فشل التوليد");
      }

      if (imageUrl) {
        set("designImageUrl", imageUrl);
        set("position", state.position ?? "chest");
        onNext();
      }
    } catch (err: any) {
      console.error("[Design] Generate error:", err);
      const msg = err?.message?.includes("Body exceeded")
        ? "حجم الصورة كبير جداً، جرّب صورة أصغر"
        : "حدث خطأ، جرّب مرة أخرى";
      set("error", msg);
    } finally {
      set("isGenerating", false);
    }
  }, [method, state, set, onNext, studioArtworks]);

  const handleReadyTextSelect = useCallback(
    (id: string) => {
      set("readyTextId", id);
    },
    [set]
  );

  const handleStudioSelect = useCallback(
    (artwork: { id: string; image_url: string }) => {
      set("studioDesignId", artwork.id);
      set("designImageUrl", artwork.image_url);
      set("position", state.position ?? "chest");
      onNext();
    },
    [set, state.position, onNext]
  );

  const handleExclusiveSelect = useCallback(
    (design: { id: string; image_url: string }) => {
      set("exclusiveDesignId", design.id);
      set("designImageUrl", design.image_url);
      set("position", state.position ?? "chest");
      onNext();
    },
    [set, state.position, onNext]
  );

  // exclusive_wusha — تصاميم وشّى الحصرية
  if (method === "exclusive_wusha") {
    const designs = exclusiveDesigns;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div>
          <h2 className="text-2xl font-bold text-theme mb-1">تصاميم وشّى الحصرية</h2>
          <p className="text-theme-soft text-sm">مطبوعات حصرية من تصاميم وشّى الخاصة — اختر التصميم الذي يعجبك</p>
        </div>
        <div>
          <label className="block text-sm font-bold text-theme-strong mb-2">موضع الطباعة</label>
          <div className="flex gap-2 mb-4">
            {CREATION_POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("position", p.id)}
                className={`px-4 py-2 rounded-xl border-2 text-sm ${
                  state.position === p.id ? "border-gold bg-gold/10" : "border-theme-soft"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {designs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
            {designs.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleExclusiveSelect(d)}
                className="relative aspect-square rounded-xl overflow-hidden border-2 border-theme-soft hover:border-gold/40 transition-colors group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.image_url} alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-bold text-theme truncate">{d.title}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-theme-subtle border border-theme-soft text-center">
            <span className="text-4xl">👑</span>
            <p className="mt-4 text-theme-soft">لا توجد تصاميم حصرية متاحة حالياً. جرّب طريقة أخرى.</p>
          </div>
        )}
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border border-white/20">
          رجوع
        </button>
      </motion.div>
    );
  }

  // ready_text
  if (method === "ready_text") {
    const canProceed = state.readyTextId && !state.isGenerating;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div>
          <h2 className="text-2xl font-bold text-theme mb-1">اختر النص</h2>
          <p className="text-theme-soft text-sm">كتابة جاهزة بأسلوب عربي حديث</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {READY_TEXTS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleReadyTextSelect(r.id)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                state.readyTextId === r.id
                  ? "border-gold bg-gold/10"
                  : "border-theme-soft hover:border-gold/30"
              }`}
            >
              <span className="text-xl font-arabic block">{r.text}</span>
              <span className="text-xs text-theme-subtle">{r.style}</span>
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-bold text-theme-strong mb-2">موضع الطباعة</label>
          <div className="flex gap-2">
            {CREATION_POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("position", p.id)}
                className={`px-4 py-2 rounded-xl border-2 text-sm ${
                  state.position === p.id ? "border-gold bg-gold/10" : "border-theme-soft"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border border-white/20">
            رجوع
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canProceed}
            className="btn-gold disabled:opacity-50"
          >
            {state.isGenerating ? "جاري التوليد..." : "توليد التصميم"}
          </button>
        </div>
      </motion.div>
    );
  }

  // from_studio — نعرض أعمالاً من المعرض (يُمرّر من الصفحة)
  if (method === "from_studio") {
    const artworks = studioArtworks;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div>
          <h2 className="text-2xl font-bold text-theme mb-1">اختر من الاستوديو</h2>
          <p className="text-theme-soft text-sm">تصاميم فنية من مكتبة وشّى</p>
        </div>
        <div>
          <label className="block text-sm font-bold text-theme-strong mb-2">موضع الطباعة</label>
          <div className="flex gap-2 mb-4">
            {CREATION_POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("position", p.id)}
                className={`px-4 py-2 rounded-xl border-2 text-sm ${
                  state.position === p.id ? "border-gold bg-gold/10" : "border-theme-soft"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {artworks.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {artworks.map((art: { id: string; image_url: string; title?: string }) => (
              <button
                key={art.id}
                type="button"
                onClick={() => handleStudioSelect(art)}
                className="aspect-square rounded-xl overflow-hidden border-2 border-theme-soft hover:border-gold/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={art.image_url} alt={art.title ?? ""} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-theme-subtle text-sm">لا توجد تصاميم متاحة حالياً. جرّب طريقة أخرى.</p>
        )}
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border border-white/20">
          رجوع
        </button>
      </motion.div>
    );
  }

  // from_text
  if (method === "from_text") {
    const canGenerate =
      state.textPrompt.trim().length >= 10 && state.styleId && !state.isGenerating;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div>
          <h2 className="text-2xl font-bold text-theme mb-1">وصف التصميم</h2>
          <p className="text-theme-soft text-sm">اكتب وصفاً واضحاً — الذكاء الاصطناعي سينفّذه</p>
        </div>
        <textarea
          value={state.textPrompt}
          onChange={(e) => set("textPrompt", e.target.value)}
          placeholder="مثال: خيول عربية تركض في الصحراء عند غروب الشمس، بأسلوب خط عربي وزخارف تراثية..."
          className="w-full h-32 px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft text-theme placeholder:text-theme-faint focus:border-gold outline-none resize-none"
          dir="rtl"
        />
        <div>
          <label className="block text-sm font-bold text-theme-strong mb-2">النمط</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DESIGN_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => set("styleId", s.id)}
                className={`px-4 py-3 rounded-xl border-2 text-sm ${
                  state.styleId === s.id ? "border-gold bg-gold/10" : "border-theme-soft"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-theme-strong mb-2">موضع الطباعة</label>
          <div className="flex gap-2">
            {CREATION_POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("position", p.id)}
                className={`px-4 py-2 rounded-xl border-2 text-sm ${
                  state.position === p.id ? "border-gold bg-gold/10" : "border-theme-soft"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border border-white/20">
            رجوع
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-gold disabled:opacity-50 inline-flex items-center gap-2"
          >
            {state.isGenerating ? (
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
                توليد التصميم
              </>
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  // from_image
  if (method === "from_image") {
    const canGenerate =
      state.imagePreviewUrl &&
      state.ideaText?.trim().length >= 5 &&
      state.styleId &&
      !state.isGenerating;
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-8"
      >
        <div>
          <h2 className="text-2xl font-bold text-theme mb-1">الصورة والفكرة</h2>
          <p className="text-theme-soft text-sm">ارفع صورة مرجعية واكتب ما تريد أن يصنعه الذكاء منها</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-gold/40 flex flex-col items-center gap-2"
          >
            <Upload className="w-10 h-10 text-theme-subtle" />
            <span className="text-sm">رفع صورة</span>
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-gold/40 flex flex-col items-center gap-2"
          >
            <Camera className="w-10 h-10 text-theme-subtle" />
            <span className="text-sm">التقاط</span>
          </button>
        </div>
        {state.imagePreviewUrl && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.imagePreviewUrl} alt="معاينة" className="h-32 w-auto object-contain rounded-xl border" />
            <button
              type="button"
              onClick={() => onImageChange(null, null)}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 text-theme flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div>
          <label className="block text-sm font-bold mb-2">التوجيه</label>
          <textarea
            value={state.ideaText ?? ""}
            onChange={(e) => set("ideaText", e.target.value)}
            placeholder="حوّل هذه الصورة إلى تصميم تراثي بألوان ذهبية..."
            className="w-full h-24 px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft"
            dir="rtl"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">النمط</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DESIGN_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => set("styleId", s.id)}
                className={`px-4 py-3 rounded-xl border-2 text-sm ${
                  state.styleId === s.id ? "border-gold bg-gold/10" : "border-theme-soft"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">موضع الطباعة</label>
          <div className="flex gap-2">
            {CREATION_POSITIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set("position", p.id)}
                className={`px-4 py-2 rounded-xl border-2 text-sm ${
                  state.position === p.id ? "border-gold bg-gold/10" : "border-theme-soft"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border border-white/20">
            رجوع
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="btn-gold disabled:opacity-50 inline-flex items-center gap-2"
          >
            {state.isGenerating ? "جاري التوليد..." : "توليد التصميم"}
          </button>
        </div>
      </motion.div>
    );
  }

  // combine — دمج نص + صورة
  const canCombine =
    ((state.combineTextId || state.combineTextCustom.trim().length >= 2) && state.styleId && !state.isGenerating);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-theme mb-1">دمج عناصر</h2>
        <p className="text-theme-soft text-sm">اجمع نصاً مع صورة لصناعة طباعة فريدة</p>
      </div>

      <div>
        <label className="block text-sm font-bold text-theme-strong mb-2">النص</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {READY_TEXTS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => set("combineTextId", state.combineTextId === r.id ? null : r.id)}
              className={`p-3 rounded-xl border-2 text-sm text-center ${
                state.combineTextId === r.id ? "border-gold bg-gold/10" : "border-theme-soft"
              }`}
            >
              <span className="font-arabic block">{r.text}</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={state.combineTextCustom}
          onChange={(e) => set("combineTextCustom", e.target.value)}
          placeholder="أو اكتب نصك..."
          className="w-full px-4 py-2.5 rounded-xl bg-theme-subtle border border-theme-soft text-theme"
          dir="rtl"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-theme-strong mb-2">صورة (اختياري)</label>
        <div className="flex gap-3 mb-3">
          <button
            type="button"
            onClick={() => set("combineImageSource", state.combineImageSource === "upload" ? null : "upload")}
            className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${
              state.combineImageSource === "upload" ? "border-gold bg-gold/10" : "border-theme-soft"
            }`}
          >
            <Upload className="w-8 h-8 text-theme-subtle" />
            <span className="text-xs">رفع صورة</span>
          </button>
          <button
            type="button"
            onClick={() => set("combineImageSource", state.combineImageSource === "studio" ? null : "studio")}
            className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${
              state.combineImageSource === "studio" ? "border-gold bg-gold/10" : "border-theme-soft"
            }`}
          >
            <ImageIcon className="w-8 h-8 text-theme-subtle" />
            <span className="text-xs">من الاستوديو</span>
          </button>
        </div>
        {state.combineImageSource === "upload" && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 rounded-xl border-2 border-dashed border-white/20 hover:border-gold/40"
            >
              {state.imagePreviewUrl ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.imagePreviewUrl} alt="" className="h-24 w-auto rounded-lg" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageChange(null, null);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-theme text-xs"
                  >
                    ×
                  </button>
                </div>
              ) : (
                "اضغط لاختيار صورة"
              )}
            </button>
          </>
        )}
        {state.combineImageSource === "studio" && (
          studioArtworks.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
            {studioArtworks.map((art) => (
              <button
                key={art.id}
                type="button"
                onClick={() => set("combineStudioId", state.combineStudioId === art.id ? null : art.id)}
                className={`aspect-square rounded-lg overflow-hidden border-2 ${
                  state.combineStudioId === art.id ? "border-gold" : "border-theme-soft"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={art.image_url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          ) : (
            <p className="text-theme-subtle text-sm py-4">لا توجد أعمال في الاستوديو — اختر رفع صورة أو تخطّ الصورة</p>
          )
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-theme-strong mb-2">النمط</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DESIGN_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => set("styleId", s.id)}
              className={`px-4 py-3 rounded-xl border-2 text-sm ${
                state.styleId === s.id ? "border-gold bg-gold/10" : "border-theme-soft"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-theme-strong mb-2">موضع الطباعة</label>
        <div className="flex gap-2">
          {CREATION_POSITIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set("position", p.id)}
              className={`px-4 py-2 rounded-xl border-2 text-sm ${
                state.position === p.id ? "border-gold bg-gold/10" : "border-theme-soft"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border border-white/20">
          رجوع
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canCombine}
          className="btn-gold disabled:opacity-50 inline-flex items-center gap-2"
        >
          {state.isGenerating ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-bg border-t-current rounded-full"
              />
              جاري الدمج...
            </>
          ) : (
            "دمج وتوليد التصميم"
          )}
        </button>
      </div>
    </motion.div>
  );
}
