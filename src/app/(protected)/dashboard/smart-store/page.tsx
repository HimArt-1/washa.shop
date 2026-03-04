import { SmartStoreClient } from "@/components/admin/SmartStoreClient";
import {
    getAllGarments,
    getAllColors,
    getAllSizes,
    getAllStyles,
    getAllArtStyles,
    getAllColorPackages,
} from "@/app/actions/smart-store";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "المتجر الذكي — لوحة الإدارة",
};

export default async function SmartStorePage() {
    const [garments, colors, sizes, styles, artStyles, colorPackages] = await Promise.all([
        getAllGarments(),
        getAllColors(),
        getAllSizes(),
        getAllStyles(),
        getAllArtStyles(),
        getAllColorPackages(),
    ]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-fg">المتجر الذكي</h1>
                <p className="text-fg/50 mt-1">إدارة قطع ومراحل &quot;صمم قطعتك بنفسك&quot;</p>
            </div>
            <SmartStoreClient
                garments={garments}
                colors={colors}
                sizes={sizes}
                styles={styles}
                artStyles={artStyles}
                colorPackages={colorPackages}
            />
        </div>
    );
}
