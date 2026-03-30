import { DesignPieceWizard } from "@/components/studio/design-piece/DesignPieceWizard";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";
import { getDesignPieceDeniedVariant } from "@/lib/design-piece-access";
import { resolveDesignPiecePageState } from "@/lib/design-piece-runtime";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "تصميم قطعة — وشّى",
    description: "صمم رسمك أو صورتك على تيشيرت أو هودي أو سويت تيشيرت بمساعدة الذكاء الاصطناعي، وجّهز ملف PDF للطباعة",
};

export default async function DesignPiecePage() {
    const { access, showWizard } = await resolveDesignPiecePageState();

    return (
        <div className="h-full">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-theme">تصميم قطعة</h1>
                <p className="text-theme-soft mt-2">
                    {showWizard
                        ? "اختر القطعة، موضع الطباعة، وصف فكرتك أو ارفع صورة — ونولّد لك تصميماً جاهزاً للطباعة بدون خلفية"
                        : "أداة التصميم بالذكاء الاصطناعي وملفات PDF للطباعة"}
                </p>
            </div>

            {showWizard ? <DesignPieceWizard /> : <DesignPieceAccessDenied variant={getDesignPieceDeniedVariant(access.reason)} />}
        </div>
    );
}
