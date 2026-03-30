import { redirect } from "next/navigation";
import { DesignPieceWizard } from "@/components/studio/design-piece/DesignPieceWizard";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";
import { canAccessDesignPiece } from "@/app/actions/design-piece";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "تصميم قطعة — وشّى",
    description: "صمم رسمك أو صورتك على تيشيرت أو هودي أو سويت تيشيرت بمساعدة الذكاء الاصطناعي، وجّهز ملف PDF للطباعة",
};

export default async function DesignPiecePage() {
    const access = await canAccessDesignPiece();

    if (!access.allowed) {
        const deniedVariant =
            access.reason === "supabase_error"
                ? "service_unavailable"
                : access.reason === "identity_conflict"
                  ? "identity_conflict"
                  : "auth";

        return (
            <div className="h-full">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-theme">تصميم قطعة</h1>
                    <p className="text-theme-soft mt-2">
                        أداة التصميم بالذكاء الاصطناعي وملفات PDF للطباعة
                    </p>
                </div>
                <DesignPieceAccessDenied variant={deniedVariant} />
            </div>
        );
    }

    return (
        <div className="h-full">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-theme">تصميم قطعة</h1>
                <p className="text-theme-soft mt-2">
                    اختر القطعة، موضع الطباعة، وصف فكرتك أو ارفع صورة — ونولّد لك تصميماً جاهزاً للطباعة بدون خلفية
                </p>
            </div>

            <DesignPieceWizard />
        </div>
    );
}
