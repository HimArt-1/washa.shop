"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useTrackEvent } from "@/components/ops/EventTracker";
import { pixelPurchase } from "@/lib/meta-pixel";
import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cartStore";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import CanvasConfetti from "canvas-confetti";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearCart } = useCartStore();
  const trackEvent = useTrackEvent();
  const trackedRef = useRef(false);
  const [isVerifying, setIsVerifying] = useState(true);

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    // Basic verification just ensures we arrived here from Stripe
    if (!sessionId) {
      router.push("/checkout");
      return;
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      CanvasConfetti({
        particleCount: 70,
        spread: 72,
        origin: { y: 0.62 },
        colors: ["#a78343", "#68483b", "#f4efe7"],
      });
    }

    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("checkout_complete", { metadata: { orderId: orderId ?? undefined } });
      pixelPurchase({ orderId: orderId ?? "unknown", value: 0 });
    }
    clearCart();
    setIsVerifying(false);
  }, [sessionId, router, clearCart]);

  if (isVerifying) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-gold" />
        <h2 className="text-xl font-bold text-theme-strong">جاري التحقق من نجاح العملية...</h2>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-8 p-6 text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative flex h-24 w-24 items-center justify-center rounded-[1.5rem] border border-gold/20 bg-gold/10"
      >
        <CheckCircle2 className="relative z-10 h-12 w-12 text-gold" />
      </motion.div>

      <div className="space-y-4 max-w-lg">
        <h1 className="pb-2 text-4xl font-black text-theme-strong md:text-5xl">
          تم استلام طلبك
        </h1>
        <p className="text-theme-subtle text-lg leading-relaxed">
          شكرًا لثقتك بوشّى. تم تأكيد الدفع وجاري تجهيز تحفتك الفنية.
          <br className="hidden md:block" />
          يمكنك متابعة حالة الطلب من خلال لوحة التحكم الخاصة بك.
        </p>
        
        {orderId && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-theme-subtle bg-theme-faint px-6 py-2">
                <span className="text-theme-subtle text-sm">رقم المعاملة:</span>
                <span className="font-mono text-gold font-bold">{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8 w-full max-w-md">
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link href="/account/orders" className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 font-bold">
            متابعة الطلب
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
        
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Link href="/store" className="flex w-full items-center justify-center rounded-xl border border-theme-soft bg-theme-surface px-6 py-4 font-bold text-theme-strong transition-colors hover:border-gold/50 hover:bg-theme-faint">
            مواصلة التسوق
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="w-full overflow-hidden bg-theme-bg relative pt-24 pb-12" dir="rtl">
        <Suspense fallback={
            <div className="min-h-[70vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-gold" />
            </div>
        }>
            <CheckoutSuccessContent />
        </Suspense>
    </main>
  );
}
