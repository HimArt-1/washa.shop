import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";
import { WashaAiEntryGate } from "@/components/studio/washa-ai/WashaAiEntryGate";
import { getDesignPieceDeniedVariant } from "@/lib/design-piece-access";
import { isWashaAiRouteAvailable, resolveDesignPiecePageState } from "@/lib/design-piece-runtime";

export const metadata: Metadata = {
    title: "WASHA AI | وشّى",
    description: "صمّم قطعتك بالذكاء الاصطناعي — من الوصف إلى موكب DTF جاهز للطباعة في ثوانٍ.",
};

export default async function DesignDtfStudioEntryPage() {
    const { visibility, access, showWizard } = await resolveDesignPiecePageState({
        allowPublicAccess: true,
    });

    if (!isWashaAiRouteAvailable(visibility)) {
        redirect("/design");
    }

    const variant = getDesignPieceDeniedVariant(access.reason);

    // Show error state for service / identity issues
    if (variant === "service_unavailable" || variant === "identity_conflict") {
        return (
            <div className="min-h-[100dvh] px-4 py-10 sm:px-6" style={{ background: "linear-gradient(180deg, #FDFBF7, #FAF7F0)" }}>
                <DesignPieceAccessDenied
                    redirectUrl="/design/washa-ai"
                    variant={variant}
                />
            </div>
        );
    }

    // Always show the immersive landing page
    return <WashaAiEntryGate showWizard={showWizard} redirectUrl="/design/washa-ai/app" />;
}
