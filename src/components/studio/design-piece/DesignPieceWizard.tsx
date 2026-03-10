"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
  DesignPieceState,
  INITIAL_DESIGN_STATE,
  DESIGN_PIECE_STEPS_COUNT,
  DESIGN_STYLES,
  type GarmentId,
  type PrintPositionId,
  type DesignMethodId,
  type DesignStyleId,
  type DesignColorId,
} from "@/lib/design-piece";
import { generateDesignForPrint } from "@/app/actions/ai";
import { downloadDesignAsPdf } from "@/lib/download-design";
import { StepGarment } from "./StepGarment";
import { StepPosition } from "./StepPosition";
import { StepMethod } from "./StepMethod";
import { StepInput } from "./StepInput";
import { StepResult } from "./StepResult";
import { DesignPiecePreview } from "./DesignPiecePreview";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DesignPieceWizard() {
  const [state, setState] = useState<DesignPieceState>(INITIAL_DESIGN_STATE);

  const set = useCallback(<K extends keyof DesignPieceState>(key: K, value: DesignPieceState[K]) => {
    setState((prev) => ({ ...prev, [key]: value, error: null }));
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, DESIGN_PIECE_STEPS_COUNT) }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!state.styleId || !state.garment || !state.position) return;

    const prompt =
      state.method === "from_text"
        ? state.textPrompt.trim()
        : state.ideaText.trim();
    if (!prompt) return;

    set("isGenerating", true);
    set("error", null);

    try {
      let imageBase64: string | null = null;
      if (state.method === "from_image" && state.imageFile) {
        imageBase64 = await fileToBase64(state.imageFile);
      }

      const style = DESIGN_STYLES.find((s) => s.id === state.styleId);
      const promptWithStyle = style ? `${style.prompt}. ${prompt}` : prompt;

      const result = await generateDesignForPrint({
        method: state.method!,
        prompt: promptWithStyle,
        styleId: state.styleId,
        colorIds: state.colorIds.length ? state.colorIds : undefined,
        imageBase64: imageBase64 ?? undefined,
      });

      if (result.success && result.imageUrl) {
        set("generatedImageUrl", result.imageUrl);
        set("step", 5);
      } else {
        set("error", result.error ?? "حدث خطأ غير متوقع");
      }
    } catch (err) {
      set("error", "فشل التوليد، جرّب مرة أخرى");
    } finally {
      set("isGenerating", false);
    }
  }, [state.method, state.styleId, state.textPrompt, state.ideaText, state.imageFile, state.colorIds, state.garment, state.position, set]);

  const handleDownloadPdf = useCallback(async () => {
    if (!state.generatedImageUrl) return;
    await downloadDesignAsPdf(state.generatedImageUrl, "وشى-تصميم");
  }, [state.generatedImageUrl]);

  const handleStartOver = useCallback(() => {
    setState({
      ...INITIAL_DESIGN_STATE,
      step: 1,
    });
  }, []);

  const handleImageChange = useCallback((file: File | null, previewUrl: string | null) => {
    setState((prev) => {
      if (prev.imagePreviewUrl) URL.revokeObjectURL(prev.imagePreviewUrl);
      return { ...prev, imageFile: file, imagePreviewUrl: previewUrl };
    });
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[calc(100vh-140px)]">
      {/* ─── لوحة الخطوات ─── */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col">
        <div className="rounded-2xl border border-theme-soft bg-theme-faint p-6 sm:p-8 overflow-y-auto max-h-[calc(100vh-180px)]">
          <AnimatePresence mode="wait">
            {state.step === 1 && (
              <StepGarment
                key="step1"
                selected={state.garment}
                onSelect={(id) => set("garment", id)}
                onNext={goNext}
              />
            )}
            {state.step === 2 && (
              <StepPosition
                key="step2"
                selected={state.position}
                onSelect={(id) => set("position", id)}
                onBack={goBack}
                onNext={goNext}
              />
            )}
            {state.step === 3 && (
              <StepMethod
                key="step3"
                selected={state.method}
                onSelect={(id) => set("method", id)}
                onBack={goBack}
                onNext={goNext}
              />
            )}
            {state.step === 4 && (
              <StepInput
                key="step4"
                method={state.method!}
                imagePreviewUrl={state.imagePreviewUrl}
                ideaText={state.ideaText}
                onImageChange={handleImageChange}
                onIdeaChange={(v) => set("ideaText", v)}
                textPrompt={state.textPrompt}
                onTextPromptChange={(v) => set("textPrompt", v)}
                styleId={state.styleId}
                colorIds={state.colorIds}
                onStyleSelect={(id) => set("styleId", id)}
                onColorToggle={(id) => {
                  setState((prev) => ({
                    ...prev,
                    colorIds: prev.colorIds.includes(id)
                      ? prev.colorIds.filter((c) => c !== id)
                      : [...prev.colorIds, id],
                  }));
                }}
                onBack={goBack}
                onGenerate={handleGenerate}
                isGenerating={state.isGenerating}
              />
            )}
            {state.step === 5 && state.garment && state.position && (
              <StepResult
                key="step5"
                garment={state.garment}
                position={state.position}
                generatedImageUrl={state.generatedImageUrl}
                isGenerating={state.isGenerating}
                error={state.error}
                onDownloadPdf={handleDownloadPdf}
                onStartOver={handleStartOver}
              />
            )}
          </AnimatePresence>
        </div>

        {/* شريط تقدم */}
        <div className="mt-6 flex gap-2">
          {Array.from({ length: DESIGN_PIECE_STEPS_COUNT }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i + 1 <= state.step ? "bg-gold" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ─── المعاينة الحية ─── */}
      <div className="lg:col-span-7 xl:col-span-8 flex items-center justify-center">
        {state.garment && state.position ? (
          <DesignPiecePreview
            garment={state.garment}
            position={state.position}
            designImageUrl={state.step >= 5 ? state.generatedImageUrl : null}
            isLoading={state.isGenerating}
            className="w-full min-h-[400px]"
          />
        ) : (
          <div className="w-full max-w-md aspect-[3/4] rounded-2xl bg-surface border border-theme-soft flex items-center justify-center text-theme-faint">
            <p className="text-center px-6">اختر القطعة وموضع الطباعة لرؤية المعاينة</p>
          </div>
        )}
      </div>
    </div>
  );
}
