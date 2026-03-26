import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles, ArrowRight } from "lucide-react";
import { getPublicVisibility } from "@/app/actions/settings";
import { canAccessDesignPiece } from "@/app/actions/design-piece";
import { DesignPieceWizard } from "@/components/studio/design-piece/DesignPieceWizard";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";

export const metadata: Metadata = {
    title: "النموذج الجديد للتصميم | وشّى",
    description: "انتقل إلى تجربة التصميم الجديدة بالذكاء الاصطناعي داخل وشّى وأنشئ تصورك مباشرة على القطعة.",
};

export default async function DesignAiPage() {
    const visibility = await getPublicVisibility();

    if (!visibility.design_piece || visibility.design_piece_ai_switch === false) {
        redirect("/design");
    }

    const { allowed } = await canAccessDesignPiece();

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-emerald-500/[0.05] blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-gold/[0.04] blur-[150px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            النموذج الجديد
                        </div>
                        <h1 className="mt-4 text-3xl font-bold text-theme sm:text-4xl">تصميم ذكي مباشر على القطعة</h1>
                        <p className="mt-2 max-w-2xl text-sm text-theme-subtle sm:text-base">
                            ارفع صورة أو اكتب الفكرة، ثم دع المحرك الجديد يولّد لك تصورًا جاهزًا للمعاينة والطباعة.
                        </p>
                    </div>

                    <Link
                        href="/design"
                        className="inline-flex items-center gap-2 rounded-full border border-theme-soft bg-theme-faint px-4 py-2 text-sm font-bold text-theme transition-colors hover:border-gold/30 hover:text-gold"
                    >
                        <ArrowRight className="h-4 w-4" />
                        العودة إلى النموذج الأساسي
                    </Link>
                </div>

                {allowed ? <DesignPieceWizard /> : <DesignPieceAccessDenied redirectUrl="/design/ai" />}
            </div>
        </div>
    );
}
