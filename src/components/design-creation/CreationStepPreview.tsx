"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CREATION_GARMENTS,
  CREATION_SIZES,
  getGarmentPrice,
  type DesignCreationState,
} from "@/lib/design-creation";
import { useCartStore } from "@/stores/cartStore";

interface CreationStepPreviewProps {
  state: DesignCreationState;
  creationPrices: { tshirt: number; hoodie: number; pullover: number };
  onBack: () => void;
  onOrder: () => void;
  set: <K extends keyof DesignCreationState>(
    key: K,
    value: DesignCreationState[K]
  ) => void;
}

export function CreationStepPreview({ state, creationPrices, onBack, onOrder, set }: CreationStepPreviewProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const toggleCart = useCartStore((s) => s.toggleCart);

  const garmentMeta = state.garment
    ? CREATION_GARMENTS.find((g) => g.id === state.garment)
    : null;
  const price = state.garment ? getGarmentPrice(state.garment, creationPrices) : 0;

  const handleOrder = () => {
    if (
      !state.garment ||
      !state.designImageUrl ||
      !state.size ||
      !garmentMeta
    ) return;

    const customId = `custom-${state.garment}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    addItem({
      id: customId,
      title: `${garmentMeta.label} مخصص — وشّى`,
      price,
      image_url: state.designImageUrl,
      artist_name: "تصميمك",
      size: state.size,
      type: "custom_design",
      customDesignUrl: state.designImageUrl,
      customGarment: state.garment,
      customPosition: state.position ?? "chest",
    });

    toggleCart(false);
    router.push("/checkout");
  };

  const canOrder =
    state.garment &&
    state.designImageUrl &&
    state.size &&
    garmentMeta;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold text-theme mb-1">معاينة التصميم</h2>
        <p className="text-theme-soft text-sm">تأكد من التصميم واختر المقاس ثم اطلب قطعتك</p>
      </div>

      <div>
        <label className="block text-sm font-bold text-theme-strong mb-2">المقاس</label>
        <div className="flex flex-wrap gap-2">
          {CREATION_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("size", s)}
              className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                state.size === s
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-theme-soft hover:border-gold/30 text-theme-strong"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {garmentMeta && (
        <div className="p-4 rounded-2xl bg-theme-subtle border border-theme-soft">
          <p className="text-sm text-theme-soft">
            {garmentMeta.label} — {price} ر.س
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleOrder}
          disabled={!canOrder}
          className="btn-gold w-full py-4 flex items-center justify-center gap-2 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingBag className="w-6 h-6" />
          اطلب الآن
        </button>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl border border-white/20 text-theme-strong hover:bg-theme-subtle"
        >
          <ChevronLeft className="w-4 h-4 inline ml-1" />
          تعديل التصميم
        </button>
      </div>
    </motion.div>
  );
}
