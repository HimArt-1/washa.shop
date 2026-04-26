import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublicVisibility } from "@/app/actions/settings";
import { isWashaAiRouteAvailable } from "@/lib/design-piece-runtime";
import { DesignWorkspaceHub } from "@/components/design-your-piece/DesignWorkspaceHub";
import {
    getActiveGarments,
    getDesignStyles,
    getArtStyles,
    getColorPackages,
    getStudioItems,
    getAllGarmentStudioMockups,
    getDesignPresets,
    getDesignCompatibilities,
} from "@/app/actions/smart-store";

export const metadata: Metadata = {
    title: "صمّم قطعتك | وشّى",
    description: "اختر بين WASHA AI للتوليد السريع، أو طلب مسبق تفصيلي يتابعه فريق التصميم.",
};

export default async function DesignYourPieceHubPage() {
    const visibility = await getPublicVisibility();
    if (!visibility.design_piece) {
        redirect("/");
    }

    const washaAiAvailable = isWashaAiRouteAvailable(visibility);

    const [garments, styles, artStyles, colorPackages, studioItems, garmentStudioMockups, presets, compatibilities] = await Promise.all([
        getActiveGarments(),
        getDesignStyles(),
        getArtStyles(),
        getColorPackages(),
        getStudioItems(),
        getAllGarmentStudioMockups(),
        getDesignPresets(),
        getDesignCompatibilities(),
    ]);

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/[0.03] rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/[0.02] rounded-full blur-[150px]" />
            </div>
            <div className="relative z-10 py-10 px-4 sm:py-14 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                <DesignWorkspaceHub
                    washaAiAvailable={washaAiAvailable}
                    garments={garments}
                    styles={styles}
                    artStyles={artStyles}
                    colorPackages={colorPackages}
                    studioItems={studioItems}
                    garmentStudioMockups={garmentStudioMockups}
                    presets={presets}
                    compatibilities={compatibilities}
                />
            </div>
        </div>
    );
}
