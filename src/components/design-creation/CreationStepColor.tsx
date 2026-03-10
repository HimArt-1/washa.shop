"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { CREATION_COLORS, type CreationColorId } from "@/lib/design-creation";

export function CreationStepColor({
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  selected: CreationColorId | null;
  onSelect: (id: CreationColorId) => void;
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
        <h2 className="text-2xl font-bold text-theme mb-1">اختر اللون</h2>
        <p className="text-theme-soft text-sm">لوحة ألوان احترافية — هوية سعودية معاصرة</p>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {CREATION_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`
              relative aspect-square rounded-xl border-2 transition-all duration-300
              flex flex-col items-center justify-center gap-1
              ${
                selected === c.id
                  ? "border-gold ring-2 ring-gold/30 scale-105"
                  : "border-theme-soft hover:border-gold/40"
              }
            `}
            style={{ backgroundColor: c.hex }}
            title={c.label}
          >
            {(c.id === "white" || c.id === "sand") && (
              <span className="absolute inset-0 rounded-xl border border-white/20" />
            )}
            <span
              className={`text-xs font-medium ${
                c.id === "white" || c.id === "sand" ? "text-ink" : "text-theme"
              }`}
              style={{
                textShadow:
                  c.id === "white" || c.id === "sand"
                    ? "none"
                    : "0 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              {c.label}
            </span>
            {selected === c.id && (
              <motion.div
                layoutId="creation-color-check"
                className="absolute top-1 right-1 w-4 h-4 rounded-full bg-gold flex items-center justify-center"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <span className="text-bg text-[10px]">✓</span>
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
            التالي: طريقة التصميم
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
