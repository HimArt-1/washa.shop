import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicVisibility } from "@/app/actions/settings";
import { canAccessDesignPiece } from "@/app/actions/design-piece";
import { DesignPieceAccessDenied } from "@/components/studio/design-piece/DesignPieceAccessDenied";

export const metadata: Metadata = {
    title: "استوديو DTF المطور | وشّى",
    description: "نسخة متقدمة من استوديو وشّى لتوليد موكب الملابس واستخراج ملف DTF عالي الجودة داخل تجربة واحدة.",
};

export default async function DesignDtfStudioEntryPage() {
    const visibility = await getPublicVisibility();

    if (!visibility.design_piece || visibility.design_piece_dtf_studio_switch === false) {
        redirect("/design");
    }

    const { allowed } = await canAccessDesignPiece();

    if (allowed) {
        redirect("/design/dtf-studio/app");
    }

    return (
        <div className="min-h-[100dvh] bg-[#050505] px-4 py-10 text-theme sm:px-6">
            <DesignPieceAccessDenied redirectUrl="/design/dtf-studio" />
        </div>
    );
}
