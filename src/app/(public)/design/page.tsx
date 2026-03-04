import { DesignYourPieceWizard } from "@/components/design-your-piece/DesignYourPieceWizard";
import {
    getActiveGarments,
    getDesignStyles,
    getArtStyles,
    getColorPackages,
    getStudioItems,
} from "@/app/actions/smart-store";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "صمّم قطعتك بنفسك — وشّى",
    description:
        "اختر قطعتك ولونها ومقاسها، حدد نمط التصميم وأسلوبه، ودعنا ننفذ طلبك. تجربة تصميم تفاعلية مميزة.",
};

export default async function DesignYourPiecePage() {
    const [garments, styles, artStyles, colorPackages, studioItems] = await Promise.all([
        getActiveGarments(),
        getDesignStyles(),
        getArtStyles(),
        getColorPackages(),
        getStudioItems(),
    ]);

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/[0.03] rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/[0.02] rounded-full blur-[150px]" />
            </div>
            <div className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                <DesignYourPieceWizard
                    garments={garments}
                    styles={styles}
                    artStyles={artStyles}
                    colorPackages={colorPackages}
                    studioItems={studioItems}
                />
            </div>
        </div>
    );
}
