"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
  DesignCreationState,
  INITIAL_CREATION_STATE,
  CREATION_STEPS_COUNT,
  DEFAULT_CREATION_PRICES,
  type CreationGarmentId,
  type CreationColorId,
  type CreationDesignMethodId,
  type CreationPositionId,
} from "@/lib/design-creation";
import { CreationStepGarment } from "./CreationStepGarment";
import { CreationStepColor } from "./CreationStepColor";
import { CreationStepMethod } from "./CreationStepMethod";
import { CreationStepInput } from "./CreationStepInput";
import { CreationStepPreview } from "./CreationStepPreview";
import { CreationProductPreview } from "./CreationProductPreview";

interface DesignCreationWizardProps {
  studioArtworks?: Array<{ id: string; image_url: string; title?: string }>;
  exclusiveDesigns?: Array<{ id: string; title: string; description: string | null; image_url: string }>;
  creationPrices?: { tshirt: number; hoodie: number; pullover: number };
}

export function DesignCreationWizard({ studioArtworks = [], exclusiveDesigns = [], creationPrices }: DesignCreationWizardProps) {
  const [state, setState] = useState<DesignCreationState>(INITIAL_CREATION_STATE);

  const set = useCallback(
    <K extends keyof DesignCreationState>(key: K, value: DesignCreationState[K]) => {
      setState((prev) => ({ ...prev, [key]: value, error: null }));
    },
    []
  );

  const goNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: Math.min(prev.step + 1, CREATION_STEPS_COUNT),
    }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 overflow-y-auto max-h-[calc(100vh-180px)] min-h-[420px]">
          <AnimatePresence mode="sync">
            {state.step === 1 && (
              <CreationStepGarment
                key="step1"
                selected={state.garment}
                onSelect={(id) => set("garment", id)}
                onNext={goNext}
              />
            )}
            {state.step === 2 && (
              <CreationStepColor
                key="step2"
                selected={state.colorId}
                onSelect={(id) => set("colorId", id)}
                onBack={goBack}
                onNext={goNext}
              />
            )}
            {state.step === 3 && (
              <CreationStepMethod
                key="step3"
                selected={state.method}
                onSelect={(id) => set("method", id)}
                onBack={goBack}
                onNext={goNext}
              />
            )}
            {state.step === 4 && (
              <CreationStepInput
                key="step4"
                method={state.method!}
                state={state}
                set={set}
                studioArtworks={studioArtworks}
                exclusiveDesigns={exclusiveDesigns}
                onBack={goBack}
                onNext={goNext}
                onImageChange={handleImageChange}
              />
            )}
            {state.step === 5 && (
              <CreationStepPreview
                key="step5"
                state={state}
                creationPrices={creationPrices ?? DEFAULT_CREATION_PRICES}
                onBack={goBack}
                onOrder={goNext}
                set={set}
              />
            )}
          </AnimatePresence>
        </div>

        {/* شريط التقدم */}
        <div className="mt-6 flex gap-2">
          {Array.from({ length: CREATION_STEPS_COUNT }).map((_, i) => (
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
        {state.garment && state.colorId ? (
          <CreationProductPreview
            garment={state.garment}
            colorId={state.colorId}
            position={state.position ?? "chest"}
            designImageUrl={state.designImageUrl}
            isLoading={state.isGenerating}
            className="w-full min-h-[400px]"
          />
        ) : (
          <div className="w-full max-w-md aspect-[3/4] rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-fg/30">
            <p className="text-center px-6">اختر القطعة واللون لرؤية المعاينة</p>
          </div>
        )}
      </div>
    </div>
  );
}
