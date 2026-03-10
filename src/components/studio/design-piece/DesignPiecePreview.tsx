"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { GarmentId, PrintPositionId } from "@/lib/design-piece";
import { PRINT_POSITIONS, GARMENTS } from "@/lib/design-piece";

interface DesignPiecePreviewProps {
  garment: GarmentId;
  position: PrintPositionId;
  designImageUrl: string | null;
  isLoading?: boolean;
  className?: string;
}

export function DesignPiecePreview({
  garment,
  position,
  designImageUrl,
  isLoading,
  className = "",
}: DesignPiecePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pos = PRINT_POSITIONS.find((p) => p.id === position);
  const area = pos?.area ?? { width: 0.35, height: 0.4, top: 0.22, left: 0.325 };

  const garmentMeta = GARMENTS.find((g) => g.id === garment);
  const garmentLabel = garmentMeta?.label ?? "قطعة";
  const mockupSrc = garmentMeta?.mockupSrc ?? "/mockups/tshirt.svg";

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-surface border border-theme-soft ${className}`}
    >
      <motion.div
        layout
        className="relative w-full max-w-md aspect-[3/4] flex items-center justify-center"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
      >
        {/* موك أب القطعة — SVG من /public/mockups */}
        <div className="relative w-[85%] h-[90%] flex items-center justify-center drop-shadow-2xl">
          <div className="relative w-full h-full">
            <Image
              src={mockupSrc}
              alt={garmentLabel}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 80vw, 400px"
              priority
            />

            {/* منطقة الطباعة — تُرسم فوق الموك أب */}
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

        {/* تسمية القطعة */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-theme-faint text-xs font-medium">
          {garmentLabel}
        </div>
      </motion.div>
    </div>
  );
}
