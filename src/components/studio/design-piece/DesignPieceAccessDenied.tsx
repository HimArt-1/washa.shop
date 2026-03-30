"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Lock, Sparkles } from "lucide-react";

type DesignPieceAccessDeniedProps = {
    redirectUrl?: string;
    variant?: "auth" | "service_unavailable" | "identity_conflict";
};

const variantContent = {
    auth: {
        title: "سجّل دخولك لتصمّم قطعتك",
        description: "سجّل حسابك مجاناً وابدأ بتصميم تيشيرت أو هودي بالذكاء الاصطناعي فوراً.",
        primaryHref: (redirectUrl: string) => `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`,
        primaryLabel: "إنشاء حساب مجاني",
        primaryIcon: Sparkles,
        secondaryHref: (redirectUrl: string) => `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`,
        secondaryLabel: "تسجيل الدخول",
        secondaryIcon: ArrowLeft,
        cardClassName: "bg-gold/10 border-gold/20",
        iconClassName: "text-gold",
    },
    service_unavailable: {
        title: "خدمة التحقق غير متاحة مؤقتاً",
        description: "تعذر التحقق من صلاحية الوصول الآن بسبب مشكلة مؤقتة. حاول مجدداً بعد قليل.",
        primaryHref: (redirectUrl: string) => redirectUrl,
        primaryLabel: "إعادة المحاولة",
        primaryIcon: ArrowLeft,
        secondaryHref: () => "/design",
        secondaryLabel: "العودة",
        secondaryIcon: Sparkles,
        cardClassName: "bg-orange-500/10 border-orange-400/20",
        iconClassName: "text-orange-300",
    },
    identity_conflict: {
        title: "تعذر ربط حسابك تلقائياً",
        description: "هناك تعارض في ربط الهوية بالحساب الحالي. تواصل مع الدعم ليتم تصحيح الربط.",
        primaryHref: () => "/support",
        primaryLabel: "تواصل مع الدعم",
        primaryIcon: Sparkles,
        secondaryHref: () => "/design",
        secondaryLabel: "العودة",
        secondaryIcon: ArrowLeft,
        cardClassName: "bg-sky-500/10 border-sky-400/20",
        iconClassName: "text-sky-200",
    },
} as const;

export function DesignPieceAccessDenied({
    redirectUrl = "/design",
    variant = "auth",
}: DesignPieceAccessDeniedProps) {
    const content = variantContent[variant];
    const PrimaryIcon = content.primaryIcon;
    const SecondaryIcon = content.secondaryIcon;
    const Icon = variant === "auth" ? Lock : AlertTriangle;

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
                    className={`w-24 h-24 rounded-2xl border flex items-center justify-center mx-auto mb-8 ${content.cardClassName}`}
                >
                    <Icon className={`w-12 h-12 ${content.iconClassName}`} />
                </motion.div>

                <h1 className="text-2xl sm:text-3xl font-bold text-theme mb-3">
                    {content.title}
                </h1>
                <p className="text-theme-soft text-base leading-relaxed mb-8">
                    {content.description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        href={content.primaryHref(redirectUrl)}
                        className="btn-gold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <PrimaryIcon className="w-5 h-5" />
                        {content.primaryLabel}
                    </Link>
                    <Link
                        href={content.secondaryHref(redirectUrl)}
                        className="btn-secondary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                    >
                        <SecondaryIcon className="w-5 h-5" />
                        {content.secondaryLabel}
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}
