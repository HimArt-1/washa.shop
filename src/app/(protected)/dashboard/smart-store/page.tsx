import { SmartStoreClient } from "@/components/admin/SmartStoreClient";
import {
    getAllGarments,
    getAllColors,
    getAllSizes,
    getAllStyles,
    getAllArtStyles,
    getAllColorPackages,
    getAllStudioItems,
    getAllGarmentStudioMockups,
    getAllDesignPresets,
    getAllDesignCompatibilities,
} from "@/app/actions/smart-store";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "المتجر الذكي — لوحة الإدارة",
};

export default async function SmartStorePage() {
    const [garments, colors, sizes, styles, artStyles, colorPackages, studioItems, garmentStudioMockups, presets, compatibilities] = await Promise.all([
        getAllGarments(),
        getAllColors(),
        getAllSizes(),
        getAllStyles(),
        getAllArtStyles(),
        getAllColorPackages(),
        getAllStudioItems(),
        getAllGarmentStudioMockups(),
        getAllDesignPresets(),
        getAllDesignCompatibilities(),
    ]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-theme">المتجر الذكي</h1>
                <p className="text-theme-subtle mt-1">إدارة نافذتي WASHA STUDIO و WASHA AI من لوحة واحدة</p>
            </div>
            <SmartStoreClient
                garments={garments}
                colors={colors}
                sizes={sizes}
                styles={styles}
                artStyles={artStyles}
                colorPackages={colorPackages}
                studioItems={studioItems}
                garmentStudioMockups={garmentStudioMockups}
                presets={presets}
                compatibilities={compatibilities}
            />
        </div>
    );
}
