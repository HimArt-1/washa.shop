import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles, ArrowRight, Wand2, Bot, ShieldCheck, Palette } from "lucide-react";
import { DesignPieceWizard } from "@/components/studio/design-piece/DesignPieceWizard";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";
import { getDesignPieceDeniedVariant } from "@/lib/design-piece-access";
import { resolveDesignPiecePageState } from "@/lib/design-piece-runtime";

export const metadata: Metadata = {
    title: "WASHA STUDIO | وشّى",
    description: "انتقل إلى تجربة WASHA STUDIO للتصميم الذكي داخل وشّى وأنشئ تصورك مباشرة على القطعة.",
};

export default async function DesignAiPage() {
    const { visibility, access, showWizard } = await resolveDesignPiecePageState();

    if (!visibility.design_piece || visibility.design_piece_ai_switch === false) {
        redirect("/design");
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-emerald-500/[0.05] blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-gold/[0.04] blur-[150px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 rounded-3xl border border-emerald-400/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(14,165,233,0.10),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_80px_-40px_rgba(16,185,129,0.65)] sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-100">
                            <Sparkles className="h-3.5 w-3.5" />
                            WASHA AI EXPERIENCE
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                href="/design"
                                className="inline-flex items-center gap-2 rounded-full border border-theme-soft bg-theme-faint px-4 py-2 text-sm font-bold text-theme transition-colors hover:border-gold/30 hover:text-gold"
                            >
                                <ArrowRight className="h-4 w-4" />
                                العودة إلى النموذج الأساسي
                            </Link>
                            {visibility.design_piece_dtf_studio_switch !== false ? (
                                <Link
                                    href="/design/dtf-studio"
                                    className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-100 transition-colors hover:border-sky-300/35 hover:bg-sky-500/15"
                                >
                                    <Wand2 className="h-4 w-4" />
                                    فتح WASHA AI
                                </Link>
                            ) : null}
                        </div>
                    </div>
                    <h1 className="mt-5 bg-gradient-to-l from-emerald-200 via-cyan-100 to-theme bg-clip-text text-3xl font-black text-transparent sm:text-5xl">
                        WASHA STUDIO
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-theme sm:text-base">
                        مساحة تصميم ذكية بمستوى احترافي: تصف فكرتك أو ترفع مرجعك، ثم يقوم المحرك بتحويلها إلى تصور جاهز على القطعة مع مخرجات نظيفة مناسبة للمراجعة والتنفيذ.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold text-theme">
                            <Bot className="h-3.5 w-3.5 text-emerald-300" />
                            توليد ذكي موجه
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold text-theme">
                            <Palette className="h-3.5 w-3.5 text-cyan-300" />
                            أساليب وبالِت احترافية
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold text-theme">
                            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
                            تجهيز واضح قبل الطباعة
                        </span>
                    </div>
                </div>

                {showWizard ? (
                    <DesignPieceWizard />
                ) : (
                    <DesignPieceAccessDenied
                        redirectUrl="/design/ai"
                        variant={getDesignPieceDeniedVariant(access.reason)}
                    />
                )}
            </div>
        </div>
    );
}
