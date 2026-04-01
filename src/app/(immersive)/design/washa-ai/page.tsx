import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";
import { WashaAiEntryGate } from "@/components/studio/washa-ai/WashaAiEntryGate";
import { getDesignPieceDeniedVariant } from "@/lib/design-piece-access";
import { resolveDesignPiecePageState } from "@/lib/design-piece-runtime";

export const metadata: Metadata = {
    title: "WASHA AI | وشّى",
    description: "صمّم قطعتك بالذكاء الاصطناعي — من الوصف إلى موكب DTF جاهز للطباعة في ثوانٍ.",
};

export default async function DesignDtfStudioEntryPage() {
    const { visibility, access, showWizard } = await resolveDesignPiecePageState();

    if (!visibility.design_piece || visibility.design_piece_dtf_studio_switch === false) {
        redirect("/design");
    }

    if (showWizard) {
        redirect("/design/washa-ai/app");
    }

    const variant = getDesignPieceDeniedVariant(access.reason);

    // Full immersive landing for unauthenticated visitors
    if (variant === "auth") {
        return <WashaAiEntryGate redirectUrl="/design/washa-ai" />;
    }

    // Simple error state for service / identity issues
    return (
        <div className="min-h-[100dvh] bg-[#050505] px-4 py-10 text-theme sm:px-6">
            <DesignPieceAccessDenied
                redirectUrl="/design/washa-ai"
                variant={variant}
            />
        </div>
    );
}
