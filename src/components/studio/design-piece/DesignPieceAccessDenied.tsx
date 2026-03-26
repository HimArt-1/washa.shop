"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, ArrowLeft, Lock } from "lucide-react";

export function DesignPieceAccessDenied({ redirectUrl = "/design" }: { redirectUrl?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="min-h-[60vh] flex items-center justify-center px-4"
        >
            <div className="max-w-lg w-full text-center">
                {/* أيقونة */}
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

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}
                        className="btn-gold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <Sparkles className="w-5 h-5" />
                        إنشاء حساب مجاني
                    </Link>
                    <Link
                        href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
                        className="btn-secondary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        تسجيل الدخول
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
