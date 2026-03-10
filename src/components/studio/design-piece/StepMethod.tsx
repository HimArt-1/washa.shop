"use client";

import { motion } from "framer-motion";
import { DESIGN_METHODS, type DesignMethodId } from "@/lib/design-piece";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function StepMethod({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected: DesignMethodId | null;
  onSelect: (id: DesignMethodId) => void;
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
        <h2 className="text-2xl font-bold text-theme mb-1">كيف تريد التصميم؟</h2>
        <p className="text-theme-soft text-sm">من صورة موجودة أو من وصف نصي</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {DESIGN_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={`
              relative p-8 rounded-2xl border-2 text-right transition-all duration-300
              flex flex-col items-start gap-4
              ${selected === m.id
                ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                : "border-theme-soft bg-theme-subtle hover:border-gold/30 hover:bg-theme-soft"
              }
            `}
          >
            <span className="text-4xl" aria-hidden>{m.icon}</span>
            <div>
              <div className="font-bold text-theme text-lg">{m.label}</div>
              <div className="text-sm text-theme-subtle mt-1">{m.description}</div>
            </div>
            {selected === m.id && (
              <motion.div
                layoutId="method-check"
                className="absolute top-4 left-4 w-7 h-7 rounded-full bg-gold flex items-center justify-center"
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
            التالي
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
