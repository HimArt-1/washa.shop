import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Sparkles, Wand2 } from "lucide-react";
import { getPublicVisibility } from "@/app/actions/settings";
import { canAccessDesignPiece } from "@/app/actions/design-piece";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";

export const metadata: Metadata = {
    title: "استوديو DTF المطور | وشّى",
    description: "نسخة متقدمة من استوديو وشّى لتوليد موكب الملابس واستخراج ملف DTF عالي الجودة داخل تجربة واحدة.",
};

export default async function DesignDtfStudioPage() {
    const visibility = await getPublicVisibility();

    if (!visibility.design_piece || visibility.design_piece_dtf_studio_switch === false) {
        redirect("/design");
    }

    const { allowed } = await canAccessDesignPiece();

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-[12%] h-[30rem] w-[30rem] rounded-full bg-sky-500/[0.08] blur-[160px]" />
                <div className="absolute bottom-[-8%] right-[10%] h-[26rem] w-[26rem] rounded-full bg-gold/[0.08] blur-[160px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-100">
                            <Wand2 className="h-3.5 w-3.5" />
                            النموذج الاصطناعي المطور
                        </div>
                        <h1 className="mt-4 text-3xl font-bold text-theme sm:text-4xl">WASHA DTF Studio داخل وشّى</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-theme-subtle sm:text-base">
                            هذا المسار مخصص للتصميم السريع المتقدم: توليد موكب واقعي للقطعة، ثم استخراج ملف DTF نظيف وجاهز للطباعة من نفس الشاشة.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-100">موكب + استخراج DTF</span>
                            <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-bold text-gold">Gemini مدمج داخل وشّى</span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-theme-subtle">أفضل للمخرجات السريعة الجاهزة للطباعة</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/design"
                            className="inline-flex items-center gap-2 rounded-full border border-theme-soft bg-theme-faint px-4 py-2 text-sm font-bold text-theme transition-colors hover:border-gold/30 hover:text-gold"
                        >
                            <ArrowRight className="h-4 w-4" />
                            العودة إلى صمم قطعتك
                        </Link>
                        {visibility.design_piece_ai_switch !== false ? (
                            <Link
                                href="/design/ai"
                                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 transition-colors hover:border-emerald-300/35 hover:bg-emerald-500/15"
                            >
                                <Sparkles className="h-4 w-4" />
                                فتح النموذج الجديد السابق
                            </Link>
                        ) : null}
                    </div>
                </div>

                {allowed ? (
                    <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,10,10,0.94))] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
                            <span className="h-3 w-3 rounded-full bg-rose-400/70" />
                            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                            <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
                            <div className="mr-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-theme-subtle">
                                /design/dtf-studio/app
                            </div>
                        </div>
                        <iframe
                            src="/design/dtf-studio/app"
                            title="WASHA DTF Studio"
                            className="block h-[calc(100vh-14rem)] min-h-[900px] w-full bg-black"
                        />
                    </div>
                ) : (
                    <DesignPieceAccessDenied redirectUrl="/design/dtf-studio" />
                )}
            </div>
        </div>
    );
}
