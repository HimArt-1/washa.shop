"use client";

import { motion } from "framer-motion";
import { PRINT_POSITIONS, type PrintPositionId } from "@/lib/design-piece";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function StepPosition({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected: PrintPositionId | null;
  onSelect: (id: PrintPositionId) => void;
  onBack: () => void;
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
        <h2 className="text-2xl font-bold text-theme mb-1">موضع الطباعة</h2>
        <p className="text-theme-soft text-sm">أين تريد ظهور التصميم على القطعة؟</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {PRINT_POSITIONS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={`
              relative p-5 rounded-2xl border-2 text-right transition-all duration-300
              ${selected === p.id
                ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                : "border-theme-soft bg-theme-subtle hover:border-gold/30 hover:bg-theme-soft"
              }
            `}
          >
            <div className="font-bold text-theme">{p.label}</div>
            <div className="text-xs text-theme-subtle mt-1">{p.description}</div>
            {selected === p.id && (
              <motion.div
                layoutId="position-check"
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

      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="btn-secondary inline-flex items-center gap-2">
          <ChevronRight className="w-5 h-5" />
          السابق
        </button>
        {selected && (
          <button type="button" onClick={onNext} className="btn-gold inline-flex items-center gap-2">
            التالي: طريقة التصميم
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
