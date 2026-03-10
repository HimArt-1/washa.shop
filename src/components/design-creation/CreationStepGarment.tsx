"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { CREATION_GARMENTS, type CreationGarmentId } from "@/lib/design-creation";

export function CreationStepGarment({
  selected,
  onSelect,
  onNext,
}: {
  selected: CreationGarmentId | null;
  onSelect: (id: CreationGarmentId) => void;
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
        <p className="text-theme-soft text-sm">هودي أو تيشيرت — ابدأ بتحديد ما تريد تصميمه</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CREATION_GARMENTS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g.id)}
            className={`
              relative p-6 rounded-2xl border-2 text-right transition-all duration-300
              flex flex-col items-center gap-4
              ${
                selected === g.id
                  ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                  : "border-theme-soft bg-theme-subtle hover:border-gold/30 hover:bg-theme-soft"
              }
            `}
          >
            <span className="text-5xl" aria-hidden>
              {g.icon}
            </span>
            <div className="w-full">
              <div className="font-bold text-theme">{g.label}</div>
            </div>
            {selected === g.id && (
              <motion.div
                layoutId="creation-garment-check"
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
            التالي: اختيار اللون
            <ChevronLeft className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
