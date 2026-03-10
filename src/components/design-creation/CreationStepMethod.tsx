"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import {
  CREATION_DESIGN_METHODS,
  type CreationDesignMethodId,
} from "@/lib/design-creation";

export function CreationStepMethod({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected: CreationDesignMethodId | null;
  onSelect: (id: CreationDesignMethodId) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-theme mb-1">كيف تريد التصميم؟</h2>
        <p className="text-theme-soft text-sm">اختر الطريقة المناسبة لإبداعك</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CREATION_DESIGN_METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={`
              relative p-5 rounded-2xl border-2 text-right transition-all duration-300
              flex items-start gap-4
              ${
                selected === m.id
                  ? "border-gold bg-gold/10 shadow-lg shadow-gold/10"
                  : "border-theme-soft bg-theme-subtle hover:border-gold/30 hover:bg-theme-soft"
              }
            `}
          >
            <span className="text-3xl" aria-hidden>
              {m.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-theme">{m.label}</div>
              <div className="text-xs text-theme-subtle mt-0.5">{m.description}</div>
            </div>
            {selected === m.id && (
              <motion.div
                layoutId="creation-method-check"
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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-white/20 text-theme-strong hover:bg-theme-subtle"
        >
          رجوع
        </button>
        {selected && (
          <button
            type="button"
            onClick={onNext}
            className="btn-gold inline-flex items-center gap-2"
          >
            التالي
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
