"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  CREATION_GARMENTS,
  CREATION_COLORS,
  CREATION_POSITIONS,
  type CreationGarmentId,
  type CreationColorId,
  type CreationPositionId,
} from "@/lib/design-creation";

interface CreationProductPreviewProps {
  garment: CreationGarmentId;
  colorId: CreationColorId;
  position: CreationPositionId;
  designImageUrl: string | null;
  isLoading?: boolean;
  className?: string;
}

export function CreationProductPreview({
  garment,
  colorId,
  position,
  designImageUrl,
  isLoading,
  className = "",
}: CreationProductPreviewProps) {
  const garmentMeta = CREATION_GARMENTS.find((g) => g.id === garment);
  const colorMeta = CREATION_COLORS.find((c) => c.id === colorId);
  const posMeta = CREATION_POSITIONS.find((p) => p.id === position);
  const area = posMeta?.area ?? { width: 0.35, height: 0.4, top: 0.22, left: 0.325 };

  // للبلوفر: صورة أمامية للصدر، خلفية للظهر
  const g = garmentMeta as
    | (typeof CREATION_GARMENTS)[number]
    | { mockupFront?: string; mockupBack?: string; mockupSrc: string };
  const mockupSrc =
    g && "mockupBack" in g && g.mockupBack && position === "back"
      ? g.mockupBack
      : (g && "mockupFront" in g && g.mockupFront ? g.mockupFront : g?.mockupSrc) ??
        "/mockups/tshirt.svg";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-surface border border-theme-soft ${className}`}
    >
      <motion.div
        layout
        className="relative w-full max-w-md aspect-[3/4] flex items-center justify-center"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
      >
        {/* موك أب القطعة — مع تلوين خفيف حسب اختيار المستخدم */}
        <div className="relative w-[85%] h-[90%] flex items-center justify-center drop-shadow-2xl">
          <div className="relative w-full h-full">
            <Image
              src={mockupSrc}
              alt={garmentMeta?.label ?? "قطعة"}
              fill
              className="object-contain drop-shadow-2xl"
              sizes="(max-width: 768px) 80vw, 400px"
            />

            {/* منطقة الطباعة */}
            <div
              className="absolute rounded-lg overflow-hidden bg-theme-subtle border border-gold/30"
              style={{
                width: `${area.width * 100}%`,
                height: `${area.height * 100}%`,
                top: `${area.top * 100}%`,
                left: `${area.left * 100}%`,
              }}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <motion.div
                    className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              )}
              {designImageUrl && !isLoading && (
                <motion.img
                  src={designImageUrl}
                  alt="التصميم"
                  className="w-full h-full object-contain"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                />
              )}
              {!designImageUrl && !isLoading && (
                <div className="w-full h-full flex items-center justify-center text-theme-faint text-sm">
                  التصميم سيظهر هنا
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-theme-faint text-xs font-medium">
          {garmentMeta?.label} — {colorMeta?.label}
        </div>
      </motion.div>
    </div>
  );
}
