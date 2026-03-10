"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Lock, User } from "lucide-react";

export function DesignAccessDenied() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[60vh] flex items-center justify-center px-4"
    >
      <div className="max-w-lg w-full text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-8"
        >
          <Lock className="w-12 h-12 text-gold" />
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-bold text-theme mb-3">
          سجّل دخولك لتصمّم قطعتك
        </h1>
        <p className="text-theme-soft text-base leading-relaxed mb-8">
          سجّل حسابك مجاناً وابدأ بتصميم تيشيرت أو هودي بالذكاء الاصطناعي فوراً.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="btn-gold inline-flex items-center gap-2 justify-center"
          >
            <User className="w-5 h-5" />
            إنشاء حساب مجاني
          </Link>
          <Link
            href="/sign-in?redirect_url=/design"
            className="inline-flex items-center gap-2 justify-center px-6 py-3 text-theme-soft hover:text-gold border border-theme-soft hover:border-gold/20 rounded-xl transition-all text-sm font-medium"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
