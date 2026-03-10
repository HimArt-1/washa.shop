"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
    Package, ShoppingBag, Settings, Palette, User, ArrowLeft,
    Sparkles, Brush, Star, ChevronLeft, Heart, CheckCircle2, Award
} from "lucide-react";
import { PushSubscribeButton } from "@/components/notifications/PushSubscribeButton";
import { OnboardingBanner } from "@/components/account/OnboardingBanner";

interface Props {
    profile: any;
    currentUser: {
        firstName: string | null;
        imageUrl: string;
    };
    roleLabel: string;
    isSubscriber: boolean;
    isArtist: boolean;
    isAdmin: boolean;
    visibility: { join_artist: boolean };
    applicationStatus: string | null;
    ordersCount: number;
}

export function AccountDashboardClient({
    profile,
    currentUser,
    roleLabel,
    isSubscriber,
    isArtist,
    isAdmin,
    visibility,
    applicationStatus,
    ordersCount
}: Props) {
    const links = [];

    if (isArtist) {
        links.push({
            title: "الاستوديو",
            description: "إدارة أعمالك الفنية",
            href: "/studio",
            icon: Palette,
            color: "from-pink-500/20 to-pink-600/10",
        });
    }

    links.push(
        {
            title: "صمّم قطعتك",
            description: "صمّم تيشيرت أو هودي بالذكاء الاصطناعي",
            href: "/design",
            icon: Sparkles,
            color: "from-gold/20 to-amber-600/10",
        },
        {
            title: "طلباتي",
            description: "تتبع حالة طلباتك",
            href: "/account/orders",
            icon: Package,
            badge: ordersCount || 0,
            color: "from-blue-500/20 to-blue-600/10",
        },
        {
            title: "المتجر",
            description: "تصفح المنتجات والأعمال",
            href: "/store",
            icon: ShoppingBag,
            color: "from-emerald-500/20 to-emerald-600/10",
        },
        {
            title: "محفوظاتي",
            description: "المنتجات المحفوظة",
            href: "/account/wishlist",
            icon: Heart,
            color: "from-red-500/20 to-red-600/10",
        },
        {
            title: "المعرض",
            description: "اكتشف أعمالاً فنية جديدة",
            href: "/gallery",
            icon: Brush,
            color: "from-purple-500/20 to-purple-600/10",
        },
        {
            title: "الإعدادات",
            description: "تعديل الملف الشخصي",
            href: "/account/settings",
            icon: Settings,
            color: "from-slate-500/20 to-slate-600/10",
        },
    );

    const calculateCompleteness = () => {
        if (!profile) return 0;
        let score = 0;
        if (profile.display_name) score += 20;
        if (profile.username) score += 20;
        if (profile.avatar_url || currentUser.imageUrl) score += 20;
        if (profile.bio) score += 20;
        if (profile.social_links && Object.values(profile.social_links).some(v => Boolean(v))) score += 20;
        return score;
    };

    const completeness = calculateCompleteness();

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    return (
        <div className="pt-8 pb-16">
            <div className="max-w-4xl mx-auto px-6">
                <OnboardingBanner />

                <motion.div variants={containerVariants} initial="hidden" animate="show">
                    {/* ─── Profile Header ─── */}
                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-theme-soft bg-surface shrink-0 relative group">
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 backdrop-blur-sm">
                                    <Link href="/account/settings" className="text-theme text-xs font-bold px-2 py-1 bg-white/20 rounded-lg backdrop-blur-md">تعديل</Link>
                                </div>
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt="" width={80} height={80} className="object-cover w-full h-full" />
                                ) : currentUser.imageUrl ? (
                                    <Image src={currentUser.imageUrl} alt="" width={80} height={80} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="w-full h-full bg-gold/20 flex items-center justify-center text-gold text-2xl font-bold">
                                        <User className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-theme">
                                    مرحباً، {profile?.display_name || currentUser.firstName || "مستخدم وشّى"}
                                </h1>
                                <p className="text-theme-faint text-sm mt-1">
                                    {roleLabel} · @{profile?.username || "user"}
                                </p>
                                <div className="mt-2">
                                    <PushSubscribeButton />
                                </div>
                            </div>
                        </div>

                        {/* Completeness Widget */}
                        <div className="p-4 rounded-2xl border border-theme-subtle bg-surface/30 flex items-center gap-4 w-full md:w-auto">
                            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-white/[0.05]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className={`${completeness === 100 ? "text-emerald-400" : "text-gold"}`} strokeDasharray={`${completeness}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-theme">
                                    {completeness}%
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-theme mb-0.5 flex items-center gap-1.5">
                                    {completeness === 100 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Award className="w-4 h-4 text-gold" />}
                                    اكتمال الملف الشخصي
                                </h3>
                                <p className="text-xs text-theme-subtle leading-snug">
                                    {completeness === 100 ? "كل شيء جاهز للبدء!" : "أكمل ملفك الشخصي لتحصل على تجربة أفضل"}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* ─── Join as Artist CTA (subscribers only, when enabled) ─── */}
                    {isSubscriber && !applicationStatus && visibility.join_artist && (
                        <motion.div variants={itemVariants}>
                            <Link href="/join" className="block mb-8 group">
                                <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-l from-gold/[0.06] via-gold/[0.03] to-transparent p-6 hover:border-gold/40 transition-all duration-500">
                                    <div className="absolute top-0 left-0 w-32 h-32 bg-gold/[0.05] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                                    <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                                                <Star className="w-7 h-7 text-gold" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-theme text-base mb-1">
                                                    انضم كفنان وشّاي
                                                </h3>
                                                <p className="text-theme-subtle text-sm leading-relaxed">
                                                    اعرض أعمالك، بِع تصاميمك، وانضم لمجتمع الفنانين
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronLeft className="w-5 h-5 text-gold/40 group-hover:text-gold group-hover:-translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    )}

                    {/* ─── Application Status (if pending/reviewing) ─── */}
                    {isSubscriber && applicationStatus && applicationStatus !== "accepted" && (
                        <motion.div variants={itemVariants} className="mb-8 rounded-2xl border border-theme-subtle bg-surface/30 p-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${applicationStatus === "pending" || applicationStatus === "reviewing"
                                    ? "bg-amber-500/10 border border-amber-500/20"
                                    : "bg-red-500/10 border border-red-500/20"
                                    }`}>
                                    <Star className={`w-6 h-6 ${applicationStatus === "pending" || applicationStatus === "reviewing"
                                        ? "text-amber-400"
                                        : "text-red-400"
                                        }`} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-theme text-sm">
                                        {applicationStatus === "pending" && "طلب الانضمام قيد المراجعة"}
                                        {applicationStatus === "reviewing" && "طلبك قيد المراجعة من الفريق"}
                                        {applicationStatus === "rejected" && "لم يتم قبول طلبك هذه المرة"}
                                    </h3>
                                    <p className="text-theme-faint text-xs mt-1">
                                        {applicationStatus === "rejected"
                                            ? "يمكنك إعادة التقديم لاحقاً بعد تطوير معرض أعمالك"
                                            : "سنخبرك فور اتخاذ القرار — شكراً لصبرك"
                                        }
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── Quick Links Grid ─── */}
                    <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {links.map((link) => (
                            <motion.div key={link.href} variants={itemVariants}>
                                <Link
                                    href={link.href}
                                    className="group block p-5 rounded-2xl border border-theme-subtle hover:border-gold/20 transition-all duration-500 bg-surface/30 hover:bg-surface/50 relative overflow-hidden h-full"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                    <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-theme-subtle flex items-center justify-center group-hover:bg-theme-soft transition-colors">
                                                <link.icon className="w-5 h-5 text-theme-subtle group-hover:text-gold transition-colors" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-theme text-sm flex items-center gap-2">
                                                    {link.title}
                                                    {link.badge !== undefined && link.badge > 0 && (
                                                        <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full">{link.badge}</span>
                                                    )}
                                                </h3>
                                                <p className="text-xs text-theme-faint mt-0.5">{link.description}</p>
                                            </div>
                                        </div>
                                        <ArrowLeft className="w-4 h-4 text-fg/10 group-hover:text-gold/40 transition-colors" />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
