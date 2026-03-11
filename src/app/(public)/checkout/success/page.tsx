"use client";

import { useEffect, useState, Suspense } from "react";
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
  const [isVerifying, setIsVerifying] = useState(true);

  const sessionId = searchParams.get("session_id");
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    // Basic verification just ensures we arrived here from Stripe
    if (!sessionId) {
      router.push("/cart");
      return;
    }

    // Fire confetti
    CanvasConfetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#CAA052', '#866B36', '#ffffff']
    });

    // Clear the cart securely since checkout originated here
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
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-8 select-none">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-32 h-32 bg-gold/10 rounded-full flex items-center justify-center border-4 border-gold/20 relative"
      >
        <div className="absolute inset-0 bg-gold/5 rounded-full animate-ping" />
        <CheckCircle2 className="w-16 h-16 text-gold relative z-10" />
      </motion.div>

      <div className="space-y-4 max-w-lg">
        <h1 className="text-4xl md:text-5xl font-black text-theme-strong tracking-wide drop-shadow-md pb-2 bg-gradient-to-r from-gold via-yellow-200 to-gold bg-clip-text text-transparent">
          تم استلام طلبك بنجاح!
        </h1>
        <p className="text-theme-subtle text-lg leading-relaxed">
          شكرًا لثقتك بوشّى. تم تأكيد الدفع وجاري تجهيز تحفتك الفنية.
          <br className="hidden md:block" />
          يمكنك متابعة حالة الطلب من خلال لوحة التحكم الخاصة بك.
        </p>
        
        {orderId && (
            <div className="mt-4 inline-flex items-center gap-2 bg-theme-faint border border-white/5 py-2 px-6 rounded-full">
                <span className="text-theme-subtle text-sm">رقم المعاملة:</span>
                <span className="font-mono text-gold font-bold">{orderId.slice(0, 8).toUpperCase()}</span>
            </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8 w-full max-w-md">
        <Link href="/account/orders" className="flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full btn-gold py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
          >
            متابعة الطلب
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </Link>
        
        <Link href="/gallery" className="flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-theme-surface border border-white/10 hover:border-gold/50 hover:bg-theme-faint text-theme-strong py-4 px-6 rounded-2xl font-bold transition-colors"
          >
            مواصلة التسوق
          </motion.button>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="w-full overflow-hidden bg-theme-bg relative pt-24 pb-12" dir="rtl">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />

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
