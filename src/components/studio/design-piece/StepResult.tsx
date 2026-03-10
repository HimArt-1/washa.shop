"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, RotateCcw } from "lucide-react";
import { DesignPiecePreview } from "./DesignPiecePreview";
import type { GarmentId, PrintPositionId } from "@/lib/design-piece";

interface StepResultProps {
  garment: GarmentId;
  position: PrintPositionId;
  generatedImageUrl: string | null;
  isGenerating: boolean;
  error: string | null;
  onDownloadPdf: () => Promise<void>;
  onStartOver: () => void;
}

export function StepResult({
  garment,
  position,
  generatedImageUrl,
  isGenerating,
  error,
  onDownloadPdf,
  onStartOver,
}: StepResultProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await onDownloadPdf();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-theme mb-1">معاينة التصميم</h2>
        <p className="text-theme-soft text-sm">
          التصميم جاهز للطباعة بدون خلفية. حمّل ملف PDF بجودة عالية للطباعة
        </p>
      </div>

      <DesignPiecePreview
        garment={garment}
        position={position}
        designImageUrl={generatedImageUrl}
        isLoading={isGenerating}
        className="min-h-[380px]"
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {generatedImageUrl && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4"
        >
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="btn-gold inline-flex items-center gap-2 disabled:opacity-70"
          >
            {downloading ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-bg border-t-current rounded-full"
                />
                جاري التحضير...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                تحميل PDF للطباعة
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            تصميم جديد
          </button>
        </motion.div>
      )}

      {isGenerating && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gold/10 border border-gold/20 text-gold">
          <motion.div
            className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span>نموذجنا يعمل على توليد التصميم ووضعه على القطعة...</span>
        </div>
      )}
    </motion.div>
  );
}
