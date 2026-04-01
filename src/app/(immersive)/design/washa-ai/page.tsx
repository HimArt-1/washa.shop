import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";
import { getDesignPieceDeniedVariant } from "@/lib/design-piece-access";
import { resolveDesignPiecePageState } from "@/lib/design-piece-runtime";

export const metadata: Metadata = {
    title: "WASHA AI | وشّى",
    description: "استوديو DTF المطور لتوليد موكب الملابس واستخراج ملف DTF عالي الجودة داخل تجربة واحدة.",
};

export default async function DesignDtfStudioEntryPage() {
    const { visibility, access, showWizard } = await resolveDesignPiecePageState();

    if (!visibility.design_piece || visibility.design_piece_dtf_studio_switch === false) {
        redirect("/design");
    }

    if (showWizard) {
        redirect("/design/washa-ai/app");
    }

    return (
        <div className="min-h-[100dvh] bg-[#050505] px-4 py-10 text-theme sm:px-6">
            <DesignPieceAccessDenied
                redirectUrl="/design/washa-ai"
                variant={getDesignPieceDeniedVariant(access.reason)}
            />
        </div>
    );
}
