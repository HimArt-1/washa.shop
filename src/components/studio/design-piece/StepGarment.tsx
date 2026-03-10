"use client";

import { motion } from "framer-motion";
import { GARMENTS, type GarmentId } from "@/lib/design-piece";
import { ChevronLeft } from "lucide-react";

export function StepGarment({
  selected,
  onSelect,
  onNext,
}: {
  selected: GarmentId | null;
  onSelect: (id: GarmentId) => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-theme mb-1">اختر القطعة</h2>
        <p className="text-theme-soft text-sm">حدد نوع الملابس التي تريد الطباعة عليها</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {GARMENTS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.id)}
            className={`
              relative p-6 rounded-2xl border-2 text-right transition-all duration-300
              flex flex-col items-center gap-4
              ${selected === g.id
                ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                : "border-theme-soft bg-theme-subtle hover:border-gold/30 hover:bg-theme-soft"
              }
            `}
          >
            <span className="text-5xl" aria-hidden>{g.icon}</span>
            <div className="w-full">
              <div className="font-bold text-theme">{g.label}</div>
              <div className="text-xs text-theme-subtle mt-0.5">{g.description}</div>
            </div>
            {selected === g.id && (
              <motion.div
                layoutId="garment-check"
                className="absolute top-3 left-3 w-6 h-6 rounded-full bg-gold flex items-center justify-center"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <span className="text-bg text-sm">✓</span>
              </motion.div>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start"
        >
          <button
            type="button"
            onClick={onNext}
            className="btn-gold inline-flex items-center gap-2"
          >
            التالي: موضع الطباعة
            <ChevronLeft className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
